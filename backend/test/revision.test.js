// Tests de la revisión de facturas (#19): ver, corregir, confirmar, reabrir, borrar y categorías.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { arrancar, crearCliente } from './ayuda.js';
import { db } from '../src/core/db.js';

let servidor;
let lucia;
let pablo;

async function registrar(nombre, email, actividad) {
  const cliente = crearCliente(servidor.url);
  await cliente.post('/api/auth/registro', { nombre, email, password: '12345678' });
  const { rows: [usuario] } = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);
  if (actividad) {
    await db.query(
      `INSERT INTO perfiles_fiscales (usuario_id, nif, direccion, actividad, regimen_iva)
       VALUES ($1, '12345678Z', 'Calle Mayor 1', $2, 'general')`,
      [usuario.id, actividad],
    );
  }
  return { cliente, id: usuario.id };
}

async function crearFactura(usuarioId, datos = {}) {
  const { rows: [original] } = await db.query(
    `INSERT INTO originales (usuario_id, nombre_archivo, tipo_mime, tamano, contenido)
     VALUES ($1, 'ticket.pdf', 'application/pdf', 4, $2) RETURNING id`,
    [usuarioId, Buffer.from('%PDF')],
  );
  const { rows: [factura] } = await db.query(
    `INSERT INTO facturas (usuario_id, original_id, estado, fecha, hora, emisor, total, total_eur, moneda,
                           base_imponible, cuota_iva, datos_ia)
     VALUES ($1, $2, $3, '2026-10-20', '10:30', $4, 121, 121, 'EUR', 100, 21, '{"emisor":"Movistar"}') RETURNING id`,
    [usuarioId, original.id, datos.estado ?? 'pendiente', datos.emisor ?? 'Movistar'],
  );
  await db.query('INSERT INTO factura_iva (factura_id, base, tipo, cuota) VALUES ($1, 100, 21, 21)', [factura.id]);
  return { id: factura.id, originalId: original.id };
}

before(async () => {
  servidor = await arrancar();
  lucia = await registrar('Lucía', 'lucia@revision.es', 'diseno');
  pablo = await registrar('Pablo', 'pablo@revision.es', 'abogacia');
});
after(async () => { await servidor.cerrar(); });

test('GET /:id trae la factura con líneas de IVA, avisos, historial y original', async () => {
  const { id } = await crearFactura(lucia.id);
  await db.query(`INSERT INTO avisos (usuario_id, tipo, factura_id, clave) VALUES ($1, 'sin_nif', $2, $3)`, [lucia.id, id, `f${id}`]);

  const { estado, datos } = await lucia.cliente.get(`/api/facturas/${id}`);
  assert.equal(estado, 200);
  assert.equal(datos.emisor, 'Movistar');
  assert.equal(datos.leida_por_ia, true);
  assert.equal(datos.datos_ia, undefined, 'no hace falta mandar la respuesta entera de la IA');
  assert.deepEqual(datos.lineas_iva.map(({ base, tipo, cuota }) => ({ base, tipo, cuota })), [{ base: 100, tipo: 21, cuota: 21 }]);
  assert.deepEqual(datos.avisos.map((a) => a.tipo), ['sin_nif']);
  assert.deepEqual(datos.cambios, []);
  assert.equal(datos.original.tipo_mime, 'application/pdf');
});

test('nadie ve ni toca la factura de otro (RF-09)', async () => {
  const { id } = await crearFactura(lucia.id);
  assert.equal((await pablo.cliente.get(`/api/facturas/${id}`)).estado, 404);
  assert.equal((await pablo.cliente.patch(`/api/facturas/${id}`, { emisor: 'X' })).estado, 404);
  assert.equal((await pablo.cliente.post(`/api/facturas/${id}/confirmar`)).estado, 404);
  assert.equal((await pablo.cliente.delete(`/api/facturas/${id}`)).estado, 404);
  assert.equal((await lucia.cliente.get(`/api/facturas/${id}`)).datos.emisor, 'Movistar');
});

test('PATCH corrige campos, recalcula importes y deja rastro de cada cambio', async () => {
  const { id } = await crearFactura(lucia.id);
  const { estado, datos } = await lucia.cliente.patch(`/api/facturas/${id}`, {
    emisor: 'Telefónica', nif_emisor: 'a82018474', hora: '10:30',
    lineas_iva: [{ base: '41,32', tipo: 21 }, { base: 10, tipo: 10, cuota: 1 }],
  });
  assert.equal(estado, 200, JSON.stringify(datos));
  assert.equal(datos.emisor, 'Telefónica');
  assert.equal(datos.nif_emisor, 'A82018474');
  assert.equal(datos.base_imponible, 51.32);
  assert.equal(datos.cuota_iva, 9.68); // 8,68 + 1
  assert.equal(datos.lineas_iva.length, 2);

  const campos = datos.cambios.map((c) => c.campo).sort();
  assert.deepEqual(campos, ['emisor', 'lineas_iva', 'nif_emisor'], 'la hora no ha cambiado, así que no se apunta');
  const emisor = datos.cambios.find((c) => c.campo === 'emisor');
  assert.equal(emisor.accion, 'editar');
  assert.equal(emisor.valor_anterior, 'Movistar');
  assert.equal(emisor.valor_nuevo, 'Telefónica');
});

test('el total en euros se recalcula con el tipo de cambio (RF-25)', async () => {
  const { id } = await crearFactura(lucia.id);
  let { datos } = await lucia.cliente.patch(`/api/facturas/${id}`, { moneda: 'usd', total: 100, tipo_cambio: '0,9' });
  assert.equal(datos.moneda, 'USD');
  assert.equal(datos.total_eur, 90);
  ({ datos } = await lucia.cliente.patch(`/api/facturas/${id}`, { moneda: 'EUR' }));
  assert.equal(datos.total_eur, 100);
  assert.equal(datos.tipo_cambio, null);
});

test('PATCH rechaza datos mal escritos', async () => {
  const { id } = await crearFactura(lucia.id);
  for (const cuerpo of [{ fecha: '31/12/2026' }, { total: 'mucho' }, { moneda: 'euros' }, { hora: '25:00' },
    { lineas_iva: [{ tipo: 21 }] }, { tipo_cambio: 0 }, {}]) {
    assert.equal((await lucia.cliente.patch(`/api/facturas/${id}`, cuerpo)).estado, 400, JSON.stringify(cuerpo));
  }
});

test('una confirmada no se puede editar ni borrar, tampoco por API (RF-32, RF-34)', async () => {
  const { id } = await crearFactura(lucia.id);
  await db.query(
    `INSERT INTO avisos (usuario_id, tipo, factura_id, clave) VALUES ($1, 'pendiente_revisar', $2, $3)`,
    [lucia.id, id, `f${id}`],
  );
  const confirmada = await lucia.cliente.post(`/api/facturas/${id}/confirmar`);
  assert.equal(confirmada.estado, 200);
  assert.equal(confirmada.datos.estado, 'confirmada');
  assert.ok(confirmada.datos.confirmada_en);
  assert.deepEqual(confirmada.datos.avisos, [], 'se cierra el aviso de pendiente de revisar');

  assert.equal((await lucia.cliente.patch(`/api/facturas/${id}`, { emisor: 'Otro' })).estado, 409);
  assert.equal((await lucia.cliente.delete(`/api/facturas/${id}`)).estado, 409);
  assert.equal((await lucia.cliente.post(`/api/facturas/${id}/confirmar`)).estado, 409);
  assert.equal((await lucia.cliente.get(`/api/facturas/${id}`)).datos.emisor, 'Movistar');
});

test('reabrir vuelve a pendiente y deja rastro con fecha (RF-33)', async () => {
  const { id } = await crearFactura(lucia.id, { estado: 'confirmada' });
  assert.equal((await lucia.cliente.post(`/api/facturas/${id}/reabrir`)).estado, 200);
  const { datos } = await lucia.cliente.get(`/api/facturas/${id}`);
  assert.equal(datos.estado, 'pendiente');
  assert.equal(datos.confirmada_en, null);
  assert.equal(datos.cambios[0].accion, 'reabrir');
  assert.ok(!Number.isNaN(Date.parse(datos.cambios[0].creado_en)));

  // Ya está pendiente: reabrir otra vez no tiene sentido.
  assert.equal((await lucia.cliente.post(`/api/facturas/${id}/reabrir`)).estado, 409);
  // Y ahora sí se puede corregir.
  assert.equal((await lucia.cliente.patch(`/api/facturas/${id}`, { emisor: 'Vodafone' })).estado, 200);
});

test('borrar una pendiente o sin leer quita también su original (RF-34)', async () => {
  for (const estado of ['pendiente', 'sin_leer']) {
    const { id, originalId } = await crearFactura(lucia.id, { estado });
    assert.equal((await lucia.cliente.delete(`/api/facturas/${id}`)).estado, 204);
    assert.equal((await lucia.cliente.get(`/api/facturas/${id}`)).estado, 404);
    const { rows } = await db.query('SELECT id FROM originales WHERE id = $1', [originalId]);
    assert.equal(rows.length, 0);
  }
});

test('una sin leer no se puede editar ni confirmar', async () => {
  const { id } = await crearFactura(lucia.id, { estado: 'sin_leer' });
  assert.equal((await lucia.cliente.patch(`/api/facturas/${id}`, { emisor: 'X' })).estado, 409);
  assert.equal((await lucia.cliente.post(`/api/facturas/${id}/confirmar`)).estado, 409);
});

test('las categorías se adaptan a la actividad y se pueden crear propias (RF-26)', async () => {
  const deLucia = (await lucia.cliente.get('/api/categorias')).datos.map((c) => c.clave);
  assert.ok(deLucia.includes('material_diseno'), 'diseño ve la suya');
  assert.ok(!deLucia.includes('cuotas'), 'diseño no ve la de colegios profesionales');
  assert.ok(deLucia.includes('otros'), 'las generales salen siempre');
  const dePablo = (await pablo.cliente.get('/api/categorias')).datos.map((c) => c.clave);
  assert.ok(dePablo.includes('cuotas'));
  assert.ok(!dePablo.includes('material_diseno'));

  const creada = await lucia.cliente.post('/api/categorias', { nombre: '  Coworking  ' });
  assert.equal(creada.estado, 201);
  assert.equal(creada.datos.nombre, 'Coworking');
  assert.equal(creada.datos.propia, true);
  assert.equal((await lucia.cliente.post('/api/categorias', { nombre: 'coworking' })).estado, 409);
  assert.equal((await lucia.cliente.post('/api/categorias', { nombre: 'Otros' })).estado, 409);
  assert.equal((await lucia.cliente.post('/api/categorias', { nombre: ' ' })).estado, 400);
  assert.ok(!(await pablo.cliente.get('/api/categorias')).datos.some((c) => c.nombre === 'Coworking'), 'la de Lucía no la ve Pablo');

  // Se puede poner en una factura suya, pero Pablo no puede usar la de Lucía.
  const { id } = await crearFactura(lucia.id);
  const puesta = await lucia.cliente.patch(`/api/facturas/${id}`, { categoria_id: creada.datos.id });
  assert.equal(puesta.datos.categoria.nombre, 'Coworking');
  const dePabloFactura = await crearFactura(pablo.id);
  assert.equal((await pablo.cliente.patch(`/api/facturas/${dePabloFactura.id}`, { categoria_id: creada.datos.id })).estado, 400);
});

test('siguiente pendiente apunta a otra factura pendiente del mismo usuario', async () => {
  const { id } = await crearFactura(pablo.id);
  const { datos } = await pablo.cliente.get(`/api/facturas/${id}`);
  assert.ok(datos.siguiente_pendiente === null || datos.siguiente_pendiente !== id);
  if (datos.siguiente_pendiente) {
    const otra = await pablo.cliente.get(`/api/facturas/${datos.siguiente_pendiente}`);
    assert.equal(otra.datos.estado, 'pendiente');
  }
});
