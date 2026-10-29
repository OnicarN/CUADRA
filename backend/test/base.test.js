// Tests de la base: arranque, registro, sesión y validaciones compartidas.
// Cada uno añade sus tests en un archivo propio: test/<modulo>.test.js
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { arrancar, crearCliente } from './ayuda.js';
import { nifValido } from '../src/core/validacion.js';
import { plazoPresentacion, rangoTrimestre } from '../src/core/fiscal.js';

let servidor;
before(async () => { servidor = await arrancar(); });
after(async () => { await servidor.cerrar(); });

test('la API responde', async () => {
  const { estado, datos } = await crearCliente(servidor.url).get('/api/salud');
  assert.equal(estado, 200);
  assert.equal(datos.ok, true);
});

test('registro, sesión y salir', async () => {
  const cliente = crearCliente(servidor.url);
  assert.equal((await cliente.get('/api/auth/yo')).estado, 401);

  const registro = await cliente.post('/api/auth/registro', { nombre: 'Ana', email: 'ana@prueba.es', password: '12345678' });
  assert.equal(registro.estado, 201);
  assert.equal(registro.datos.perfil_completo, false);
  assert.match(registro.datos.correo_cuadra, /@/);

  const yo = await cliente.get('/api/auth/yo');
  assert.equal(yo.datos.email, 'ana@prueba.es');

  const repetido = await crearCliente(servidor.url).post('/api/auth/registro', { nombre: 'Ana', email: 'ana@prueba.es', password: '12345678' });
  assert.equal(repetido.estado, 409);

  const uso = await cliente.get('/api/suscripcion');
  assert.equal(uso.datos.enPrueba, true);

  await cliente.post('/api/auth/salir');
  assert.equal((await cliente.get('/api/auth/yo')).estado, 401);

  const entrar = await cliente.post('/api/auth/entrar', { email: 'ana@prueba.es', password: '12345678' });
  assert.equal(entrar.estado, 200);
});

test('las rutas privadas piden sesión', async () => {
  const cliente = crearCliente(servidor.url);
  for (const ruta of ['/api/facturas', '/api/perfil', '/api/avisos/contador', '/api/panel']) {
    assert.equal((await cliente.get(ruta)).estado, 401, ruta);
  }
});

test('validación de NIF, NIE y CIF', () => {
  assert.ok(nifValido('12345678Z'));
  assert.ok(nifValido('x1234567l'));
  assert.ok(nifValido('B12345674'));
  assert.ok(nifValido('ES-12345678Z'));
  assert.ok(!nifValido('12345678A'));
  assert.ok(!nifValido(''));
});

test('fechas fiscales', () => {
  assert.deepEqual(rangoTrimestre(2026, 4), { desde: '2026-10-01', hasta: '2026-12-31' });
  assert.equal(plazoPresentacion(2026, 1), '2026-04-20');
  assert.equal(plazoPresentacion(2026, 4), '2027-01-30');
});
