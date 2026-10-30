// Tests de avisos (#21): pantalla, cerrar, avisos por tiempo y email.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { arrancar, crearCliente } from './ayuda.js';
import { db } from '../src/core/db.js';
import { crearAviso, TIPOS_AVISO } from '../src/core/avisos.js';
import {
  avisarPendientes, avisarTrimestre, enviarAvisosPorEmail, proximoPlazo,
} from '../src/modulos/avisos/servicio.js';

let servidor;
let lucia;
let pablo;

async function registrar(nombre, email) {
  const cliente = crearCliente(servidor.url);
  await cliente.post('/api/auth/registro', { nombre, email, password: '12345678' });
  const { rows: [usuario] } = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);
  return { cliente, id: usuario.id };
}

async function crearFactura(usuarioId, { estado = 'pendiente', emisor = 'Repsol', total = 41.32, haceDias = 0 } = {}) {
  const { rows: [f] } = await db.query(
    `INSERT INTO facturas (usuario_id, estado, emisor, total, moneda, total_eur, creado_en)
     VALUES ($1, $2, $3, $4, 'EUR', $4, now() - make_interval(days => $5)) RETURNING id`,
    [usuarioId, estado, emisor, total, haceDias],
  );
  return f.id;
}

const avisosDe = async (cliente, estado = 'abierto') => {
  const { estado: codigo, datos } = await cliente.get(`/api/avisos?estado=${estado}`);
  assert.equal(codigo, 200, JSON.stringify(datos));
  return datos.avisos;
};
const borrarAvisos = () => db.query('DELETE FROM avisos');

before(async () => {
  servidor = await arrancar();
  lucia = await registrar('Lucía', 'lucia@avisos.es');
  pablo = await registrar('Pablo', 'pablo@avisos.es');
});
after(async () => { await servidor.cerrar(); });

test('la lista trae la factura, el texto en los dos idiomas y adónde lleva', async () => {
  await borrarAvisos();
  const facturaId = await crearFactura(lucia.id, { emisor: 'Repsol', total: 41.32 });
  await crearAviso({ usuarioId: lucia.id, tipo: TIPOS_AVISO.SIN_NIF, facturaId });
  await crearAviso({ usuarioId: lucia.id, tipo: TIPOS_AVISO.SIN_LEER, clave: '2026-10' });
  await crearAviso({ usuarioId: pablo.id, tipo: TIPOS_AVISO.SIN_LEER, clave: '2026-10' });

  const avisos = await avisosDe(lucia.cliente);
  assert.equal(avisos.length, 2, 'solo los suyos');
  const sinNif = avisos.find((a) => a.tipo === 'sin_nif');
  assert.equal(sinNif.factura.id, facturaId);
  assert.equal(sinNif.factura.emisor, 'Repsol');
  assert.equal(sinNif.importante, true);
  assert.equal(sinNif.destino, `/app/factura?id=${facturaId}`);
  assert.match(sinNif.textos.es.texto, /Repsol \(41,32\s€\).*Pide la factura completa/);
  assert.match(sinNif.textos.en.texto, /Repsol \(€41\.32\)/);

  const sinLeer = avisos.find((a) => a.tipo === 'sin_leer');
  assert.equal(sinLeer.importante, false);
  assert.equal(sinLeer.destino, '/app/suscripcion');
});

test('todos los tipos de aviso tienen texto en es y en', async () => {
  await borrarAvisos();
  const facturaId = await crearFactura(lucia.id);
  for (const tipo of Object.values(TIPOS_AVISO)) {
    await crearAviso({ usuarioId: lucia.id, tipo, facturaId, clave: `prueba-${tipo}`, datos: { plazo: '2027-01-30', trimestre: 4 } });
  }
  const avisos = await avisosDe(lucia.cliente);
  assert.equal(avisos.length, Object.values(TIPOS_AVISO).length);
  for (const a of avisos) {
    for (const idioma of ['es', 'en']) {
      const { titulo, texto, accion } = a.textos[idioma];
      assert.ok(titulo && texto && accion && titulo !== a.tipo, `${a.tipo} en ${idioma}`);
      assert.doesNotMatch(texto, /undefined|null|NaN/, `${a.tipo} en ${idioma}`);
    }
  }
});

test('cerrar un aviso: pasa a cerrados y el contador baja', async () => {
  await borrarAvisos();
  const id = await crearAviso({ usuarioId: lucia.id, tipo: TIPOS_AVISO.SIN_LEER, clave: 'mes' });
  await crearAviso({ usuarioId: lucia.id, tipo: TIPOS_AVISO.CORREO_NO_AUTORIZADO, clave: 'remitente:x@x.es', datos: { remitente: 'x@x.es' } });
  assert.equal(Number((await lucia.cliente.get('/api/avisos/contador')).datos.abiertos), 2);

  const { estado, datos } = await lucia.cliente.post(`/api/avisos/${id}/cerrar`);
  assert.equal(estado, 200);
  assert.equal(datos.abiertos, 1);
  assert.equal(Number((await lucia.cliente.get('/api/avisos/contador')).datos.abiertos), 1);
  assert.equal((await avisosDe(lucia.cliente)).length, 1);
  const cerrados = await avisosDe(lucia.cliente, 'cerrado');
  assert.deepEqual(cerrados.map((a) => a.id), [id]);
  assert.ok(cerrados[0].cerrado_en);

  assert.equal((await lucia.cliente.post(`/api/avisos/${id}/cerrar`)).estado, 409, 'ya estaba cerrado');
  assert.equal((await pablo.cliente.post(`/api/avisos/${id}/cerrar`)).estado, 404, 'no es suyo');
  assert.equal((await lucia.cliente.post('/api/avisos/abc/cerrar')).estado, 400);
});

test('estado mal escrito da 400 y sin sesión 401', async () => {
  assert.equal((await lucia.cliente.get('/api/avisos?estado=todos')).estado, 400);
  assert.equal((await crearCliente(servidor.url).get('/api/avisos')).estado, 401);
  assert.equal((await crearCliente(servidor.url).post('/api/avisos/1/cerrar')).estado, 401);
});

test('una factura pendiente desde hace 8 días genera el aviso, una de 3 no (RF-42)', async () => {
  await borrarAvisos();
  const vieja = await crearFactura(lucia.id, { haceDias: 8 });
  const nueva = await crearFactura(lucia.id, { haceDias: 3 });
  const confirmada = await crearFactura(lucia.id, { haceDias: 30, estado: 'confirmada' });

  await avisarPendientes();
  const ids = (await avisosDe(lucia.cliente)).filter((a) => a.tipo === 'pendiente_revisar').map((a) => a.factura.id);
  assert.ok(ids.includes(vieja));
  assert.ok(!ids.includes(nueva));
  assert.ok(!ids.includes(confirmada));
  const aviso = (await avisosDe(lucia.cliente)).find((a) => a.factura?.id === vieja);
  assert.match(aviso.textos.es.texto, /lleva 8 días sin confirmar/);

  // Si lo descarta, no vuelve a salir en la siguiente vuelta.
  await lucia.cliente.post(`/api/avisos/${aviso.id}/cerrar`);
  await avisarPendientes();
  assert.ok(!(await avisosDe(lucia.cliente)).some((a) => a.factura?.id === vieja));
});

test('los días del aviso de pendientes salen de Ajustes', async () => {
  await borrarAvisos();
  await db.query('UPDATE ajustes SET dias_aviso_pendiente = 10 WHERE usuario_id = $1', [pablo.id]);
  const ocho = await crearFactura(pablo.id, { haceDias: 8 });
  const doce = await crearFactura(pablo.id, { haceDias: 12 });
  await avisarPendientes();
  const ids = (await avisosDe(pablo.cliente)).map((a) => a.factura?.id);
  assert.ok(!ids.includes(ocho));
  assert.ok(ids.includes(doce));
});

test('próximo plazo: el del trimestre pasado hasta que vence', () => {
  assert.deepEqual(proximoPlazo('2026-10-30'), { anio: 2026, trimestre: 4, plazo: '2027-01-30' });
  assert.deepEqual(proximoPlazo('2027-01-15'), { anio: 2026, trimestre: 4, plazo: '2027-01-30' });
  assert.deepEqual(proximoPlazo('2027-01-31'), { anio: 2027, trimestre: 1, plazo: '2027-04-20' });
  assert.deepEqual(proximoPlazo('2026-04-20'), { anio: 2026, trimestre: 1, plazo: '2026-04-20' });
  assert.deepEqual(proximoPlazo('2026-07-05'), { anio: 2026, trimestre: 2, plazo: '2026-07-20' });
});

test('aviso de trimestre cuando faltan los días de Ajustes o menos', async () => {
  await borrarAvisos();
  await db.query('UPDATE ajustes SET dias_aviso_trimestre = 15 WHERE usuario_id = $1', [lucia.id]);
  await db.query('UPDATE ajustes SET dias_aviso_trimestre = 5 WHERE usuario_id = $1', [pablo.id]);

  await avisarTrimestre('2027-01-01'); // faltan 29 días: a nadie
  assert.equal((await avisosDe(lucia.cliente)).length, 0);

  await avisarTrimestre('2027-01-20'); // faltan 10: a Lucía (15) sí, a Pablo (5) no
  const [aviso] = await avisosDe(lucia.cliente);
  assert.equal(aviso.tipo, 'trimestre');
  assert.equal(aviso.clave, '2026-T4');
  assert.equal(aviso.importante, true);
  assert.match(aviso.textos.es.texto, /4T/);
  assert.equal((await avisosDe(pablo.cliente)).length, 0);

  await avisarTrimestre('2027-01-21'); // no se duplica
  assert.equal((await avisosDe(lucia.cliente)).length, 1);

  // Pasado el plazo se cierra solo.
  await avisarTrimestre('2027-02-10');
  assert.equal((await avisosDe(lucia.cliente)).length, 0);
});

test('email: un solo email por usuario con todos sus avisos nuevos (RF-41)', async () => {
  await borrarAvisos();
  const facturaId = await crearFactura(lucia.id, { emisor: 'Renfe', total: 55 });
  await crearAviso({ usuarioId: lucia.id, tipo: TIPOS_AVISO.SIN_NIF, facturaId });
  await crearAviso({ usuarioId: lucia.id, tipo: TIPOS_AVISO.SIN_LEER, clave: 'mes' });
  await crearAviso({ usuarioId: pablo.id, tipo: TIPOS_AVISO.SIN_LEER, clave: 'mes' });
  await db.query("UPDATE usuarios SET idioma = 'en' WHERE id = $1", [pablo.id]);

  const enviados = [];
  await enviarAvisosPorEmail({ enviar: async (email) => { enviados.push(email); } });
  assert.equal(enviados.length, 2);
  const paraLucia = enviados.find((e) => e.para === 'lucia@avisos.es');
  assert.equal(paraLucia.asunto, 'Tienes 2 avisos nuevos en Cuadra');
  assert.match(paraLucia.texto, /Renfe/);
  assert.match(paraLucia.texto, new RegExp(`/app/factura\\?id=${facturaId}`));
  assert.match(paraLucia.html, /<a href="http/);
  const paraPablo = enviados.find((e) => e.para === 'pablo@avisos.es');
  assert.equal(paraPablo.asunto, 'You have a new alert in Cuadra');

  // Ya están marcados: la siguiente vuelta no manda nada.
  enviados.length = 0;
  await enviarAvisosPorEmail({ enviar: async (email) => { enviados.push(email); } });
  assert.equal(enviados.length, 0);
});

test('email: si desactivo un tipo en Ajustes, no me llega', async () => {
  await borrarAvisos();
  await db.query("UPDATE ajustes SET avisos_sin_email = ARRAY['sin_leer'] WHERE usuario_id = $1", [lucia.id]);
  await crearAviso({ usuarioId: lucia.id, tipo: TIPOS_AVISO.SIN_LEER, clave: 'mes' });
  const enviados = [];
  await enviarAvisosPorEmail({ enviar: async (email) => { enviados.push(email); } });
  assert.equal(enviados.length, 0);

  await crearAviso({ usuarioId: lucia.id, tipo: TIPOS_AVISO.CORREO_NO_AUTORIZADO, clave: 'r', datos: { remitente: 'otro@x.es' } });
  await enviarAvisosPorEmail({ enviar: async (email) => { enviados.push(email); } });
  assert.equal(enviados.length, 1);
  assert.match(enviados[0].texto, /otro@x\.es/);
  assert.doesNotMatch(enviados[0].texto, /sin leer/i);
  await db.query("UPDATE ajustes SET avisos_sin_email = '{}' WHERE usuario_id = $1", [lucia.id]);
});

test('email: si falla el envío se reintenta en la siguiente vuelta', async () => {
  await borrarAvisos();
  await crearAviso({ usuarioId: lucia.id, tipo: TIPOS_AVISO.SIN_LEER, clave: 'mes' });
  const original = console.error;
  console.error = () => {};
  try {
    await enviarAvisosPorEmail({ enviar: async () => { throw new Error('SMTP caído'); } });
  } finally {
    console.error = original;
  }
  const enviados = [];
  await enviarAvisosPorEmail({ enviar: async (email) => { enviados.push(email); } });
  assert.equal(enviados.length, 1);
});

test('los que cuestan dinero salen primero', async () => {
  await borrarAvisos();
  await crearAviso({ usuarioId: lucia.id, tipo: TIPOS_AVISO.SIN_LEER, clave: 'mes' });
  await crearAviso({ usuarioId: lucia.id, tipo: TIPOS_AVISO.TRIMESTRE, clave: '2026-T4', datos: { trimestre: 4, plazo: '2027-01-30' } });
  await crearAviso({ usuarioId: lucia.id, tipo: TIPOS_AVISO.CORREO_NO_AUTORIZADO, clave: 'r' });
  const tipos = (await avisosDe(lucia.cliente)).map((a) => a.tipo);
  assert.deepEqual(tipos, ['trimestre', 'correo_no_autorizado', 'sin_leer']);
});
