// Tests del panel (#22): las cifras cuadran con las facturas confirmadas.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { arrancar, crearCliente } from './ayuda.js';
import { db } from '../src/core/db.js';
import { rangoPeriodo } from '../src/modulos/panel/cifras.js';

let servidor;
let lucia;
let pablo;
const categoria = {};

async function registrar(nombre, email) {
  const cliente = crearCliente(servidor.url);
  await cliente.post('/api/auth/registro', { nombre, email, password: '12345678' });
  const { rows: [usuario] } = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);
  return { cliente, id: usuario.id };
}

async function crearFactura(usuarioId, f) {
  const { rows: [factura] } = await db.query(
    `INSERT INTO facturas (usuario_id, estado, fecha, emisor, total, moneda, tipo_cambio, total_eur, cuota_iva, categoria_id, evento_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
    [usuarioId, f.estado ?? 'confirmada', f.fecha, f.emisor ?? 'Emisor', f.total, f.moneda ?? 'EUR', f.cambio ?? null,
      f.total_eur ?? f.total, f.cuota ?? 0, f.categoria ? categoria[f.categoria] : null, f.evento ?? null],
  );
  return factura.id;
}

async function crearEvento(usuarioId, titulo, cliente) {
  const { rows: [evento] } = await db.query(
    `INSERT INTO eventos (usuario_id, google_id, titulo, inicio, fin, cliente)
     VALUES ($1, $2, $3, '2026-10-05T10:00:00Z', '2026-10-05T11:00:00Z', $4) RETURNING id`,
    [usuarioId, `g-${titulo}`, titulo, cliente],
  );
  return evento.id;
}

before(async () => {
  servidor = await arrancar();
  lucia = await registrar('Lucía', 'lucia@panel.es');
  pablo = await registrar('Pablo', 'pablo@panel.es');
  const { rows } = await db.query('SELECT id, clave FROM categorias WHERE usuario_id IS NULL');
  for (const c of rows) categoria[c.clave] = c.id;

  const reunion = await crearEvento(lucia.id, 'Reunión con Alba', 'Estudio Alba');
  const rodaje = await crearEvento(lucia.id, 'Rodaje Nike', null);

  // Octubre de 2026 (T4).
  await crearFactura(lucia.id, { fecha: '2026-10-02', total: 121, cuota: 21, categoria: 'software', evento: reunion });
  await crearFactura(lucia.id, { fecha: '2026-10-15', total: 50, cuota: 8.68, categoria: 'telefono', evento: rodaje });
  await crearFactura(lucia.id, { fecha: '2026-10-28', total: 29, cuota: 2.64, categoria: 'software' });
  // En dólares: el IVA se pasa a euros con su tipo de cambio.
  await crearFactura(lucia.id, { fecha: '2026-10-20', total: 100, moneda: 'USD', cambio: 0.9, total_eur: 90, cuota: 10 });
  // Pendientes y sin leer no cuentan (RF-48).
  await crearFactura(lucia.id, { fecha: '2026-10-10', total: 1000, cuota: 210, estado: 'pendiente', categoria: 'equipos' });
  await crearFactura(lucia.id, { fecha: '2026-10-11', total: 500, estado: 'pendiente' });
  // Septiembre (T3) y año anterior.
  await crearFactura(lucia.id, { fecha: '2026-09-10', total: 200, cuota: 34.71, categoria: 'viajes' });
  await crearFactura(lucia.id, { fecha: '2025-11-03', total: 300, cuota: 52.07 });
  // De otro usuario: nunca cuenta.
  await crearFactura(pablo.id, { fecha: '2026-10-05', total: 9999, cuota: 999 });

  await db.query(`INSERT INTO avisos (usuario_id, tipo, clave) VALUES ($1, 'trimestre', '2026-T4')`, [lucia.id]);
});
after(async () => { await servidor.cerrar(); });

const panel = async (cliente, consulta) => {
  const { estado, datos } = await cliente.get(`/api/panel${consulta}`);
  assert.equal(estado, 200, JSON.stringify(datos));
  return datos;
};

test('mes: número, gasto, comparación y categorías de las confirmadas', async () => {
  const datos = await panel(lucia.cliente, '?periodo=mes&fecha=2026-10-30');
  assert.deepEqual([datos.periodo.desde, datos.periodo.hasta], ['2026-10-01', '2026-10-31']);
  assert.equal(datos.numFacturas, 4);
  assert.equal(datos.gastoTotal, 290); // 121 + 50 + 29 + 90
  assert.equal(datos.gastoAnterior, 200); // septiembre
  assert.equal(datos.variacion, 45);
  assert.deepEqual(datos.porCategoria.map((c) => [c.clave, c.total, c.num]), [
    ['software', 150, 2], [null, 90, 1], ['telefono', 50, 1],
  ]);
});

test('IVA soportado del trimestre, en euros (RF-45)', async () => {
  const datos = await panel(lucia.cliente, '?periodo=mes&fecha=2026-10-30');
  assert.deepEqual([datos.trimestre.anio, datos.trimestre.trimestre, datos.trimestre.plazo], [2026, 4, '2027-01-30']);
  assert.equal(datos.ivaSoportadoTrimestre, 41.32); // 21 + 8,68 + 2,64 + 10 × 0,9
  const t3 = await panel(lucia.cliente, '?periodo=trimestre&fecha=2026-08-01');
  assert.equal(t3.ivaSoportadoTrimestre, 34.71);
});

test('trimestre y año', async () => {
  const t4 = await panel(lucia.cliente, '?periodo=trimestre&fecha=2026-11-15');
  assert.deepEqual([t4.periodo.desde, t4.periodo.hasta], ['2026-10-01', '2026-12-31']);
  assert.equal(t4.gastoTotal, 290);
  assert.equal(t4.gastoAnterior, 200);

  const anio = await panel(lucia.cliente, '?periodo=anio&fecha=2026-05-01');
  assert.equal(anio.numFacturas, 5);
  assert.equal(anio.gastoTotal, 490);
  assert.equal(anio.gastoAnterior, 300);
});

test('una factura pendiente no cambia las cifras (RF-48)', async () => {
  const antes = await panel(lucia.cliente, '?periodo=mes&fecha=2026-10-30');
  await crearFactura(lucia.id, { fecha: '2026-10-29', total: 777, cuota: 77, estado: 'pendiente', categoria: 'software' });
  const despues = await panel(lucia.cliente, '?periodo=mes&fecha=2026-10-30');
  for (const campo of ['numFacturas', 'gastoTotal', 'ivaSoportadoTrimestre', 'porCategoria', 'porCliente']) {
    assert.deepEqual(despues[campo], antes[campo], campo);
  }
  assert.equal(despues.pendientes, antes.pendientes + 1);
});

test('pendientes, avisos abiertos y días para el cierre (RF-46)', async () => {
  const datos = await panel(lucia.cliente, '?periodo=mes&fecha=2026-10-30');
  assert.ok(datos.pendientes >= 2);
  assert.equal(datos.avisosAbiertos, 1);
  assert.equal(typeof datos.diasCierreTrimestre, 'number');
  assert.ok(datos.diasCierreTrimestre >= 0 && datos.diasCierreTrimestre <= 110);
  assert.match(datos.cierre.plazo, /^\d{4}-\d{2}-\d{2}$/);
});

test('gasto por cliente o proyecto a partir de los eventos (RF-47)', async () => {
  const datos = await panel(lucia.cliente, '?periodo=mes&fecha=2026-10-30');
  assert.deepEqual(datos.porCliente.map((c) => [c.cliente, c.total]), [['Estudio Alba', 121], ['Rodaje Nike', 50]]);
  const sinCalendario = await panel(pablo.cliente, '?periodo=mes&fecha=2026-10-30');
  assert.deepEqual(sinCalendario.porCliente, []);
});

test('cada uno ve solo lo suyo y sin facturas todo sale a cero', async () => {
  const datos = await panel(pablo.cliente, '?periodo=mes&fecha=2026-10-30');
  assert.equal(datos.gastoTotal, 9999);
  const vacio = await panel(lucia.cliente, '?periodo=mes&fecha=2020-01-15');
  assert.equal(vacio.numFacturas, 0);
  assert.equal(vacio.gastoTotal, 0);
  assert.equal(vacio.variacion, null);
  assert.deepEqual(vacio.porCategoria, []);
});

test('periodo o fecha mal escritos dan 400, y sin sesión 401', async () => {
  assert.equal((await lucia.cliente.get('/api/panel?periodo=semana')).estado, 400);
  assert.equal((await lucia.cliente.get('/api/panel?fecha=30/10/2026')).estado, 400);
  assert.equal((await crearCliente(servidor.url).get('/api/panel')).estado, 401);
  assert.equal((await lucia.cliente.get('/api/panel')).estado, 200, 'sin parámetros: este mes');
});

test('rangos de periodo y del anterior, también al cambiar de año', () => {
  assert.deepEqual(rangoPeriodo('mes', '2026-01-20'), {
    desde: '2026-01-01', hasta: '2026-01-31', anterior: { desde: '2025-12-01', hasta: '2025-12-31' },
  });
  assert.deepEqual(rangoPeriodo('mes', '2028-03-01').anterior, { desde: '2028-02-01', hasta: '2028-02-29' });
  assert.deepEqual(rangoPeriodo('trimestre', '2026-02-10').anterior, { desde: '2025-10-01', hasta: '2025-12-31' });
  assert.deepEqual(rangoPeriodo('anio', '2026-06-30'), {
    desde: '2026-01-01', hasta: '2026-12-31', anterior: { desde: '2025-01-01', hasta: '2025-12-31' },
  });
});
