// Tests de las comprobaciones automáticas y los duplicados (#20).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { arrancar, crearCliente } from './ayuda.js';
import { db } from '../src/core/db.js';
import { comprobarFactura } from '../src/modulos/facturas/comprobaciones.js';

const NIF_PROPIO = '12345678Z';
let servidor;
let lucia;
let pablo;
let minuto = 0;

async function registrar(nombre, email) {
  const cliente = crearCliente(servidor.url);
  await cliente.post('/api/auth/registro', { nombre, email, password: '12345678' });
  const { rows: [usuario] } = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);
  await db.query(
    `INSERT INTO perfiles_fiscales (usuario_id, nif, direccion, actividad, regimen_iva)
     VALUES ($1, $2, 'Calle Mayor 1', 'diseno', 'general')`,
    [usuario.id, NIF_PROPIO],
  );
  return { cliente, id: usuario.id };
}

// Una factura que cuadra y va a nombre del usuario. Cada una se "sube" un minuto después.
async function crearFactura(usuarioId, cambios = {}) {
  const f = {
    estado: 'pendiente', fecha: '2026-10-20', hora: '10:30', emisor: 'Movistar', nif_emisor: 'A82018474',
    nif_receptor: NIF_PROPIO, numero: 'TF-1', base: 100, cuota: 21, total: 121, ...cambios,
  };
  minuto += 1;
  const { rows: [factura] } = await db.query(
    `INSERT INTO facturas (usuario_id, estado, fecha, hora, emisor, nif_emisor, nif_receptor, numero,
                           base_imponible, cuota_iva, total, total_eur, creado_en)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, '2026-10-20T08:00:00Z'::timestamptz + make_interval(mins => $12))
     RETURNING id`,
    [usuarioId, f.estado, f.fecha, f.hora, f.emisor, f.nif_emisor, f.nif_receptor, f.numero, f.base, f.cuota, f.total, minuto],
  );
  return factura.id;
}

const tipos = (avisos) => avisos.map((a) => a.tipo).sort();
const comprobar = async (id) => tipos(await comprobarFactura(id));

before(async () => {
  servidor = await arrancar();
  lucia = await registrar('Lucía', 'lucia@comprobaciones.es');
  pablo = await registrar('Pablo', 'pablo@comprobaciones.es');
});
after(async () => { await servidor.cerrar(); });

test('una factura correcta no tiene avisos', async () => {
  assert.deepEqual(await comprobar(await crearFactura(lucia.id, { numero: 'OK-1' })), []);
});

test('RF-27: total que cuadra, que no cuadra y tolerancia de 2 céntimos', async () => {
  assert.deepEqual(await comprobar(await crearFactura(lucia.id, { numero: 'C-1', total: 121.02 })), []);
  const id = await crearFactura(lucia.id, { numero: 'C-2', total: 130 });
  assert.deepEqual(await comprobar(id), ['total_no_cuadra']);
  const { rows: [aviso] } = await db.query(`SELECT datos FROM avisos WHERE factura_id = $1 AND tipo = 'total_no_cuadra'`, [id]);
  assert.equal(aviso.datos.diferencia, -9);
  // Sin líneas de IVA no se puede comprobar: no salta.
  assert.deepEqual(await comprobar(await crearFactura(lucia.id, { numero: 'C-3', base: null, cuota: null })), []);
});

test('al corregir el total desde la revisión, el aviso se cierra solo', async () => {
  const id = await crearFactura(lucia.id, { numero: 'C-4', total: 130 });
  await comprobarFactura(id);
  const corregida = await lucia.cliente.patch(`/api/facturas/${id}`, { total: 121 });
  assert.equal(corregida.estado, 200);
  assert.deepEqual(corregida.datos.avisos, []);
  const { rows } = await db.query(`SELECT estado, cerrado_en FROM avisos WHERE factura_id = $1`, [id]);
  assert.equal(rows[0].estado, 'cerrado');
  assert.ok(rows[0].cerrado_en);
});

test('RF-28: NIF del receptor propio, ajeno y ausente', async () => {
  assert.deepEqual(await comprobar(await crearFactura(lucia.id, { numero: 'N-1', nif_receptor: 'es-12345678-z' })), [], 'mismo NIF escrito distinto');
  assert.deepEqual(await comprobar(await crearFactura(lucia.id, { numero: 'N-2', nif_receptor: 'B12345674' })), ['otro_nif']);
  assert.deepEqual(await comprobar(await crearFactura(lucia.id, { numero: 'N-3', nif_receptor: null })), ['sin_nif']);
  assert.deepEqual(await comprobar(await crearFactura(lucia.id, { numero: 'N-4', nif_emisor: null })), ['sin_nif']);

  // Al poner el NIF bueno se cierran los dos.
  const id = await crearFactura(lucia.id, { numero: 'N-5', nif_receptor: 'B12345674' });
  await comprobarFactura(id);
  const { datos } = await lucia.cliente.patch(`/api/facturas/${id}`, { nif_receptor: NIF_PROPIO });
  assert.deepEqual(tipos(datos.avisos), []);
});

test('RF-35: duplicado con número (NIF del emisor + número + total)', async () => {
  const original = await crearFactura(lucia.id, { numero: 'D-1' });
  const repetida = await crearFactura(lucia.id, { numero: 'd-1 ', nif_emisor: 'A-82018474' });
  assert.deepEqual(await comprobar(original), [], 'la primera no es la repetida');
  assert.deepEqual(await comprobar(repetida), ['duplicado']);
  const { rows: [f] } = await db.query('SELECT duplicado_de FROM facturas WHERE id = $1', [repetida]);
  assert.equal(f.duplicado_de, original);

  // Con otro total ya no es la misma.
  assert.deepEqual(await comprobar(await crearFactura(lucia.id, { numero: 'D-1', total: 121.5, cuota: 21.5 })), []);
  // Las de otro usuario no cuentan.
  assert.deepEqual(await comprobar(await crearFactura(pablo.id, { numero: 'D-1' })), []);
});

test('RF-35: duplicado de un ticket sin número (emisor + fecha + hora + total)', async () => {
  const ticket = { numero: null, emisor: 'Repsol Estación 4521', fecha: '2026-10-21', hora: '09:15' };
  const original = await crearFactura(lucia.id, ticket);
  const repetida = await crearFactura(lucia.id, { ...ticket, emisor: 'repsol estación 4521' });
  assert.deepEqual(await comprobar(repetida), ['duplicado']);
  const { rows: [f] } = await db.query('SELECT duplicado_de FROM facturas WHERE id = $1', [repetida]);
  assert.equal(f.duplicado_de, original);
  // Mismo sitio otro día u otra hora: no es duplicado.
  assert.deepEqual(await comprobar(await crearFactura(lucia.id, { ...ticket, hora: '18:00' })), []);
  assert.deepEqual(await comprobar(await crearFactura(lucia.id, { ...ticket, fecha: '2026-10-22' })), []);
});

test('al corregir el número de un duplicado deja de serlo', async () => {
  await crearFactura(lucia.id, { numero: 'E-1' });
  const repetida = await crearFactura(lucia.id, { numero: 'E-1' });
  await comprobarFactura(repetida);
  const { datos } = await lucia.cliente.patch(`/api/facturas/${repetida}`, { numero: 'E-2' });
  assert.equal(datos.duplicado_de, null);
  assert.deepEqual(tipos(datos.avisos), []);
});

test('RF-36: guardar igualmente cierra el aviso y no vuelve a preguntar', async () => {
  const original = await crearFactura(lucia.id, { numero: 'G-1' });
  const repetida = await crearFactura(lucia.id, { numero: 'G-1' });
  await comprobarFactura(repetida);

  const guardada = await lucia.cliente.post(`/api/facturas/${repetida}/duplicado`, { accion: 'guardar' });
  assert.equal(guardada.estado, 200);
  const { datos } = await lucia.cliente.get(`/api/facturas/${repetida}`);
  assert.equal(datos.duplicado_aceptado, true);
  assert.equal(datos.duplicado_de, null);
  assert.deepEqual(tipos(datos.avisos), []);
  assert.deepEqual(await comprobar(repetida), [], 'aunque se vuelva a comprobar');

  // Una tercera igual se compara con la original, no con la que se aceptó.
  const tercera = await crearFactura(lucia.id, { numero: 'G-1' });
  await comprobarFactura(tercera);
  const { rows: [f] } = await db.query('SELECT duplicado_de FROM facturas WHERE id = $1', [tercera]);
  assert.equal(f.duplicado_de, original);
});

test('RF-36: descartar borra la repetida, pero nunca una confirmada', async () => {
  const original = await crearFactura(lucia.id, { numero: 'X-1' });
  const repetida = await crearFactura(lucia.id, { numero: 'X-1' });
  await comprobarFactura(repetida);
  const descartada = await lucia.cliente.post(`/api/facturas/${repetida}/duplicado`, { accion: 'descartar' });
  assert.equal(descartada.estado, 200);
  assert.deepEqual(descartada.datos, { borrada: true, duplicado_de: original });
  assert.equal((await lucia.cliente.get(`/api/facturas/${repetida}`)).estado, 404);
  assert.equal((await lucia.cliente.get(`/api/facturas/${original}`)).estado, 200);

  await crearFactura(lucia.id, { numero: 'X-2' });
  const confirmada = await crearFactura(lucia.id, { numero: 'X-2', estado: 'confirmada' });
  await comprobarFactura(confirmada);
  assert.equal((await lucia.cliente.post(`/api/facturas/${confirmada}/duplicado`, { accion: 'descartar' })).estado, 409);
});

test('POST /:id/duplicado valida la acción, el dueño y que sea un duplicado', async () => {
  await crearFactura(lucia.id, { numero: 'V-1' });
  const repetida = await crearFactura(lucia.id, { numero: 'V-1' });
  await comprobarFactura(repetida);
  assert.equal((await lucia.cliente.post(`/api/facturas/${repetida}/duplicado`, { accion: 'borrar' })).estado, 400);
  assert.equal((await pablo.cliente.post(`/api/facturas/${repetida}/duplicado`, { accion: 'guardar' })).estado, 404);
  const normal = await crearFactura(lucia.id, { numero: 'V-2' });
  assert.equal((await lucia.cliente.post(`/api/facturas/${normal}/duplicado`, { accion: 'guardar' })).estado, 409);
});

test('una factura sin leer o que la IA no pudo leer no genera avisos', async () => {
  const sinLeer = await crearFactura(lucia.id, { estado: 'sin_leer', numero: null, emisor: null, nif_emisor: null, nif_receptor: null, total: null, base: null, cuota: null });
  assert.deepEqual(await comprobar(sinLeer), []);
  const vacia = await crearFactura(lucia.id, { numero: null, emisor: null, nif_emisor: null, nif_receptor: null, total: null, base: null, cuota: null });
  assert.deepEqual(await comprobar(vacia), []);
  assert.deepEqual(await comprobarFactura(999999), []);
});
