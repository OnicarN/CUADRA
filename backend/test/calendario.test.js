// Tests de Google Calendar (#16). Google se sustituye por una versión falsa en memoria.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { arrancar, crearCliente } from './ayuda.js';
import { db } from '../src/core/db.js';
import { config } from '../src/config.js';
import { usarGoogle } from '../src/modulos/calendario/google.js';
import { sincronizar, proximasFechas, esViajeOReunion } from '../src/modulos/calendario/servicio.js';

let servidor;
let enGoogle;    // eventos que "hay" en su Google Calendar
let guardados;   // eventos que Cuadra ha creado en Google
let borrados;
const credenciales = { ...config.google };

before(async () => {
  servidor = await arrancar();
  config.google.clientId = 'cliente-prueba';
  config.google.clientSecret = 'secreto-prueba';
  usarGoogle({
    canjearCodigo: async (codigo) => ({ refreshToken: `refresh-${codigo}`, email: 'yo@gmail.com' }),
    tokenDeAcceso: async () => 'token',
    revocar: async () => {},
    listarEventos: async () => enGoogle,
    guardarEvento: async (_token, evento) => { guardados.push(evento); },
    borrarEvento: async (_token, id) => { borrados.push(id); },
  });
});
after(async () => {
  usarGoogle(null);
  Object.assign(config.google, credenciales);
  await servidor.cerrar();
});
beforeEach(() => { enGoogle = []; guardados = []; borrados = []; });

const dia = (dias) => new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);
const momento = (dias, hora) => `${dia(dias)}T${hora}:00+01:00`;

let contador = 0;
async function nuevoUsuario() {
  contador += 1;
  const cliente = crearCliente(servidor.url);
  const { datos } = await cliente.post('/api/auth/registro', { nombre: 'Prueba', email: `cal${contador}@prueba.es`, password: '12345678' });
  return { cliente, id: datos.id };
}

async function conectar(usuarioId) {
  await db.query("INSERT INTO calendario_conexiones (usuario_id, email_google, refresh_token) VALUES ($1, 'yo@gmail.com', 'r')", [usuarioId]);
}

async function factura(usuarioId, fecha) {
  const { rows: [f] } = await db.query(
    "INSERT INTO facturas (usuario_id, fecha, emisor, total) VALUES ($1, $2::text::date, 'Restaurante', 30) RETURNING id",
    [usuarioId, fecha],
  );
  return f.id;
}

test('conectar: redirige a Google y la vuelta guarda la conexión (RF-54)', async () => {
  const cliente = crearCliente(servidor.url);
  // Registro a mano para tener la cookie de sesión y seguir las redirecciones nosotros.
  const registro = await fetch(`${servidor.url}/api/auth/registro`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: 'Prueba', email: 'conectar@prueba.es', password: '12345678' }),
  });
  const cookie = registro.headers.get('set-cookie').split(';')[0];
  await cliente.post('/api/auth/entrar', { email: 'conectar@prueba.es', password: '12345678' });
  const sinRedirigir = async (ruta, cookies) => fetch(servidor.url + ruta, { redirect: 'manual', headers: { cookie: cookies } });

  const ida = await sinRedirigir('/api/calendario/conectar', cookie);
  assert.equal(ida.status, 302);
  const destino = new URL(ida.headers.get('location'));
  assert.equal(destino.host, 'accounts.google.com');
  assert.match(destino.searchParams.get('scope'), /calendar\.events/);
  assert.equal(destino.searchParams.get('access_type'), 'offline');
  const estado = destino.searchParams.get('state');
  const cookieEstado = ida.headers.get('set-cookie').split(';')[0];

  const malo = await sinRedirigir(`/api/calendario/callback?code=abc&state=otro`, `${cookie}; ${cookieEstado}`);
  assert.equal(malo.headers.get('location'), '/app/calendario?error=google');

  const vuelta = await sinRedirigir(`/api/calendario/callback?code=abc&state=${estado}`, `${cookie}; ${cookieEstado}`);
  assert.equal(vuelta.headers.get('location'), '/app/calendario?conectado=1');

  const { datos } = await cliente.get('/api/calendario');
  assert.equal(datos.conectado, true);
  assert.equal(datos.email_google, 'yo@gmail.com');

  assert.equal((await cliente.delete('/api/calendario')).estado, 204);
  assert.equal((await cliente.get('/api/calendario')).datos.conectado, false);
});

test('sin la función calendario en el plan no se puede conectar', async () => {
  const { cliente, id } = await nuevoUsuario();
  await db.query("UPDATE suscripciones SET plan = 'gratis', estado = 'activa' WHERE usuario_id = $1", [id]);
  const { datos } = await cliente.get('/api/calendario');
  assert.equal(datos.disponible, false);
  await conectar(id);
  const ajustes = await cliente.put('/api/calendario/ajustes', { fechas_fiscales: ['303'], dias_antelacion: 7 });
  assert.equal(ajustes.estado, 403);
  assert.deepEqual((await cliente.get(`/api/calendario/sugerencias?factura=1`)).datos, []);
});

test('sincroniza eventos y sugiere el de la fecha de la factura; aceptar la asocia (RF-55)', async () => {
  const { cliente, id } = await nuevoUsuario();
  await conectar(id);
  enGoogle = [
    { id: 'reunion', summary: 'Reunión con Alba', start: { dateTime: momento(-5, '13:00') }, end: { dateTime: momento(-5, '15:00') } },
    { id: 'viaje', summary: 'Viaje a Bilbao', start: { date: dia(-12) }, end: { date: dia(-9) } },
    { id: 'borrado', status: 'cancelled', summary: 'x', start: { date: dia(-5) }, end: { date: dia(-4) } },
    { id: 'cuadra3032026t3', summary: 'Plazo 303', start: { date: dia(-5) }, end: { date: dia(-4) } },
  ];
  const comida = await factura(id, dia(-5));
  const hotel = await factura(id, dia(-10));
  const otra = await factura(id, dia(-30));
  await sincronizar(id);

  const { rows: eventos } = await db.query('SELECT google_id FROM eventos WHERE usuario_id = $1 ORDER BY google_id', [id]);
  assert.deepEqual(eventos.map((e) => e.google_id), ['reunion', 'viaje']);

  const sugerencias = (await cliente.get(`/api/calendario/sugerencias?factura=${comida}`)).datos;
  assert.deepEqual(sugerencias.map((s) => s.titulo), ['Reunión con Alba']);
  assert.deepEqual((await cliente.get(`/api/calendario/sugerencias?factura=${hotel}`)).datos.map((s) => s.titulo), ['Viaje a Bilbao']);
  assert.deepEqual((await cliente.get(`/api/calendario/sugerencias?factura=${otra}`)).datos, []);

  const evento = sugerencias[0].evento_id;
  assert.equal((await cliente.post(`/api/calendario/sugerencias/${comida}/${evento}`, { aceptar: true })).estado, 200);
  const { rows: [f] } = await db.query('SELECT evento_id FROM facturas WHERE id = $1', [comida]);
  assert.equal(f.evento_id, evento);
  assert.deepEqual((await cliente.get(`/api/calendario/sugerencias?factura=${comida}`)).datos, []);

  // Rechazar: no vuelve a salir.
  const viaje = (await cliente.get(`/api/calendario/sugerencias?factura=${hotel}`)).datos[0].evento_id;
  await cliente.post(`/api/calendario/sugerencias/${hotel}/${viaje}`, { aceptar: false });
  assert.deepEqual((await cliente.get(`/api/calendario/sugerencias?factura=${hotel}`)).datos, []);
});

test('no se puede responder a sugerencias de otro usuario', async () => {
  const a = await nuevoUsuario();
  const b = await nuevoUsuario();
  await conectar(a.id);
  enGoogle = [{ id: 'r', summary: 'Reunión', start: { dateTime: momento(-3, '10:00') }, end: { dateTime: momento(-3, '11:00') } }];
  const f = await factura(a.id, dia(-3));
  await sincronizar(a.id);
  const [s] = (await a.cliente.get(`/api/calendario/sugerencias?factura=${f}`)).datos;
  assert.equal((await b.cliente.post(`/api/calendario/sugerencias/${f}/${s.evento_id}`, { aceptar: true })).estado, 404);
  assert.deepEqual((await b.cliente.get(`/api/calendario/sugerencias?factura=${f}`)).datos, []);
});

test('avisa de una reunión pasada sin ticket, no de un evento cualquiera', async () => {
  const { id } = await nuevoUsuario();
  await conectar(id);
  enGoogle = [
    { id: 'r', summary: 'Comida con cliente', start: { dateTime: momento(-6, '14:00') }, end: { dateTime: momento(-6, '16:00') } },
    { id: 'g', summary: 'Gimnasio', start: { dateTime: momento(-6, '19:00') }, end: { dateTime: momento(-6, '20:00') } },
    { id: 'h', summary: 'Llamada', location: 'Madrid', start: { dateTime: momento(-1, '09:00') }, end: { dateTime: momento(-1, '10:00') } },
  ];
  await sincronizar(id);
  const { rows } = await db.query("SELECT datos FROM avisos WHERE usuario_id = $1 AND tipo = 'evento_sin_ticket'", [id]);
  assert.deepEqual(rows.map((r) => r.datos.titulo), ['Comida con cliente']); // la de ayer aún tiene margen
  assert.equal(esViajeOReunion({ titulo: 'Gimnasio', ubicacion: 'Calle Mayor' }), true);
});

test('apunta las fechas de Hacienda y borra las que se quitan (RF-56)', async () => {
  const { cliente, id } = await nuevoUsuario();
  await conectar(id);
  assert.equal((await cliente.put('/api/calendario/ajustes', { fechas_fiscales: ['patata'], dias_antelacion: 7 })).estado, 400);
  assert.equal((await cliente.put('/api/calendario/ajustes', { fechas_fiscales: ['303'], dias_antelacion: 40 })).estado, 400);

  assert.equal((await cliente.put('/api/calendario/ajustes', { fechas_fiscales: ['303', 'trimestre'], dias_antelacion: 5 })).estado, 200);
  const del303 = guardados.filter((e) => e.id.startsWith('cuadra303'));
  assert.ok(del303.length >= 4);
  assert.match(del303[0].summary, /modelo 303/);
  assert.deepEqual(del303[0].reminders.overrides[0], { method: 'popup', minutes: 5 * 24 * 60 });
  assert.ok(guardados.every((e) => /^[a-v0-9]{5,}$/.test(e.id)), 'ids válidos para Google');

  await cliente.put('/api/calendario/ajustes', { fechas_fiscales: ['trimestre'], dias_antelacion: 5 });
  assert.ok(borrados.length >= 4 && borrados.every((b) => b.startsWith('cuadra303')));
  const { datos } = await cliente.get('/api/calendario');
  assert.deepEqual(datos.fechas_fiscales, ['trimestre']);
});

test('proximasFechas: plazos del 303 a partir de hoy', () => {
  const fechas = proximasFechas(['303'], '2026-10-30');
  assert.deepEqual(fechas.map((f) => f.fecha), ['2027-01-30', '2027-04-20', '2027-07-20', '2027-10-20']);
  assert.equal(fechas[0].id, 'cuadra3032026t4');
  assert.deepEqual(proximasFechas(['trimestre'], '2026-04-10').map((f) => f.fecha).slice(0, 2), ['2026-06-30', '2026-09-30']);
});

test('simular: calendario de prueba en local con sugerencia para su factura', async () => {
  const { cliente, id } = await nuevoUsuario();
  const f = await factura(id, dia(-3));
  assert.equal((await cliente.post('/api/calendario/simular')).estado, 200);
  assert.equal((await cliente.get('/api/calendario')).datos.conectado, true);
  const [s] = (await cliente.get(`/api/calendario/sugerencias?factura=${f}`)).datos;
  assert.equal(s.titulo, 'Reunión con cliente (prueba)');
  const { rows } = await db.query("SELECT datos FROM avisos WHERE usuario_id = $1 AND tipo = 'evento_sin_ticket'", [id]);
  assert.equal(rows[0].datos.titulo, 'Comida con Alba (prueba)');
  assert.equal((await cliente.put('/api/calendario/ajustes', { fechas_fiscales: ['303'], dias_antelacion: 3 })).estado, 200);
  assert.equal(guardados.length, 0); // no llama a Google
  assert.equal((await cliente.delete('/api/calendario')).estado, 204);
});
