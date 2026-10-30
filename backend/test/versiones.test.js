// Tests de la versión de empresa y la personal (#50).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { arrancar, crearCliente } from './ayuda.js';
import { db } from '../src/core/db.js';
import { crearAviso, TIPOS_AVISO } from '../src/core/avisos.js';
import { comprobarFactura } from '../src/modulos/facturas/comprobaciones.js';
import { calcularImpresos } from '../src/modulos/panel/impresos.js';

let servidor;
let lucia;
let pablo;
const NIF = '12345678Z';

async function registrar(nombre, email) {
  const cliente = crearCliente(servidor.url);
  await cliente.post('/api/auth/registro', { nombre, email, password: '12345678' });
  const { rows: [usuario] } = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);
  return { cliente, id: usuario.id };
}

// La versión la pone el trigger según la versión actual del usuario.
async function crearFactura(usuarioId, f = {}) {
  const { rows: [factura] } = await db.query(
    `INSERT INTO facturas (usuario_id, estado, fecha, emisor, nif_emisor, nif_receptor, base_imponible, cuota_iva, total, total_eur, moneda)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $10) RETURNING id, version`,
    [usuarioId, f.estado ?? 'confirmada', f.fecha ?? '2026-10-10', f.emisor ?? 'Emisor', f.nif_emisor ?? null, f.nif_receptor ?? null,
      f.base ?? null, f.cuota ?? null, f.total ?? 10, f.moneda ?? 'EUR'],
  );
  if (f.lineas) {
    for (const l of f.lineas) {
      await db.query('INSERT INTO factura_iva (factura_id, base, tipo, cuota) VALUES ($1, $2, $3, $4)', [factura.id, l.base, l.tipo, l.cuota]);
    }
  }
  return factura;
}

const cambiar = (cliente, version) => cliente.put('/api/versiones/actual', { version });

before(async () => {
  servidor = await arrancar();
  lucia = await registrar('Lucía', 'lucia@versiones.es');
  pablo = await registrar('Pablo', 'pablo@versiones.es');
  await db.query(
    `INSERT INTO perfiles_fiscales (usuario_id, nif, direccion, actividad, regimen_iva) VALUES ($1, $2, 'Calle 1', 'diseno', 'general')`,
    [lucia.id, NIF],
  );
});
after(async () => { await servidor.cerrar(); });

test('por defecto es empresa; se cambia y se guarda el presupuesto', async () => {
  assert.deepEqual((await lucia.cliente.get('/api/versiones')).datos, { actual: 'empresa', personal: { presupuesto_mensual: null } });
  const { estado, datos } = await cambiar(lucia.cliente, 'personal');
  assert.equal(estado, 200);
  assert.equal(datos.actual, 'personal');
  assert.equal((await cambiar(lucia.cliente, 'otra')).estado, 400);

  const guardado = await lucia.cliente.put('/api/versiones/personal', { presupuesto_mensual: '350,5' });
  assert.equal(guardado.datos.personal.presupuesto_mensual, 350.5);
  assert.equal(guardado.datos.actual, 'personal', 'no cambia la versión');
  assert.equal((await lucia.cliente.put('/api/versiones/personal', { presupuesto_mensual: -3 })).estado, 400);
  assert.equal((await lucia.cliente.put('/api/versiones/personal', { presupuesto_mensual: '' })).datos.personal.presupuesto_mensual, null);
  assert.equal((await crearCliente(servidor.url).get('/api/versiones')).estado, 401);
  await cambiar(lucia.cliente, 'empresa');
});

test('las facturas nuevas van a la versión en la que está y cada una ve las suyas', async () => {
  const deEmpresa = await crearFactura(lucia.id, { emisor: 'Adobe' });
  await cambiar(lucia.cliente, 'personal');
  const personal = await crearFactura(lucia.id, { emisor: 'Mercadona' });
  assert.equal(deEmpresa.version, 'empresa');
  assert.equal(personal.version, 'personal');

  const emisores = async () => (await lucia.cliente.get('/api/facturas')).datos.facturas.map((f) => f.emisor);
  assert.ok((await emisores()).includes('Mercadona'));
  assert.ok(!(await emisores()).includes('Adobe'));
  await cambiar(lucia.cliente, 'empresa');
  assert.ok((await emisores()).includes('Adobe'));
  assert.ok(!(await emisores()).includes('Mercadona'));
  // Pablo nunca ha cambiado: todo lo suyo es de empresa.
  assert.equal((await crearFactura(pablo.id)).version, 'empresa');
});

test('en la personal no se avisa del NIF ni del IVA, pero sí de los duplicados', async () => {
  await cambiar(lucia.cliente, 'personal');
  const ticket = await crearFactura(lucia.id, { emisor: 'Bar Pepe', total: 12.5, fecha: '2026-10-11' });
  assert.deepEqual((await comprobarFactura(ticket.id)).map((a) => a.tipo), []);
  const repetido = await crearFactura(lucia.id, { emisor: 'Bar Pepe', total: 12.5, fecha: '2026-10-11' });
  assert.deepEqual((await comprobarFactura(repetido.id)).map((a) => a.tipo), ['duplicado']);

  await cambiar(lucia.cliente, 'empresa');
  const deEmpresa = await crearFactura(lucia.id, { emisor: 'Bar Pepe', total: 12.5, fecha: '2026-10-11' });
  const tipos = (await comprobarFactura(deEmpresa.id)).map((a) => a.tipo);
  assert.ok(tipos.includes('sin_nif'));
  assert.ok(!tipos.includes('duplicado'), 'no se compara con las de la otra versión');
});

test('avisos y contador: cada versión los suyos y el del trimestre solo en empresa', async () => {
  await db.query('DELETE FROM avisos WHERE usuario_id = $1', [lucia.id]);
  const deEmpresa = await crearFactura(lucia.id, { estado: 'pendiente' });
  await cambiar(lucia.cliente, 'personal');
  const personal = await crearFactura(lucia.id, { estado: 'pendiente' });
  await crearAviso({ usuarioId: lucia.id, tipo: TIPOS_AVISO.PENDIENTE_REVISAR, facturaId: deEmpresa.id });
  await crearAviso({ usuarioId: lucia.id, tipo: TIPOS_AVISO.PENDIENTE_REVISAR, facturaId: personal.id });
  await crearAviso({ usuarioId: lucia.id, tipo: TIPOS_AVISO.TRIMESTRE, clave: '2026-T4', datos: { trimestre: 4, plazo: '2027-01-30' } });
  await crearAviso({ usuarioId: lucia.id, tipo: TIPOS_AVISO.SIN_LEER, clave: 'mes' });

  const ver = async () => {
    const lista = (await lucia.cliente.get('/api/avisos')).datos.avisos;
    const { abiertos } = (await lucia.cliente.get('/api/avisos/contador')).datos;
    assert.equal(abiertos, lista.length, 'el contador coincide con la lista');
    return lista.map((a) => a.factura?.id ?? a.tipo).sort();
  };
  assert.deepEqual(await ver(), [personal.id, 'sin_leer'].sort());
  await cambiar(lucia.cliente, 'empresa');
  assert.deepEqual(await ver(), [deEmpresa.id, 'sin_leer', 'trimestre'].sort());
});

test('panel personal: gasto y presupuesto, sin IVA ni impresos', async () => {
  await cambiar(pablo.cliente, 'personal');
  await pablo.cliente.put('/api/versiones/personal', { presupuesto_mensual: 300 });
  await crearFactura(pablo.id, { fecha: '2026-10-03', total: 120 });
  await crearFactura(pablo.id, { fecha: '2026-10-20', total: 60 });
  await crearFactura(pablo.id, { fecha: '2026-10-21', total: 999, estado: 'pendiente' });

  const { datos } = await pablo.cliente.get('/api/panel?periodo=mes&fecha=2026-10-25');
  assert.equal(datos.version, 'personal');
  assert.equal(datos.gastoTotal, 180);
  assert.equal(datos.numFacturas, 2);
  assert.deepEqual(datos.presupuesto, { total: 300, mensual: 300, restante: 120 });
  assert.equal(datos.diasPeriodo, 31);
  assert.equal(datos.ivaSoportadoTrimestre, undefined);
  assert.equal(datos.impresos, undefined);
  assert.equal(datos.pendientes, 1);

  const trimestre = (await pablo.cliente.get('/api/panel?periodo=trimestre&fecha=2026-10-25')).datos;
  assert.equal(trimestre.presupuesto.total, 900, 'presupuesto de tres meses');
});

test('panel de empresa: casillas del 303 y del 130 con lo que se puede deducir', async () => {
  await db.query('DELETE FROM facturas WHERE usuario_id = $1', [lucia.id]);
  await cambiar(lucia.cliente, 'empresa');
  const completa = { nif_emisor: 'B12345674', nif_receptor: NIF };
  await crearFactura(lucia.id, { ...completa, fecha: '2026-10-05', base: 100, cuota: 21, total: 121, lineas: [{ base: 100, tipo: 21, cuota: 21 }] });
  await crearFactura(lucia.id, { ...completa, fecha: '2026-11-15', base: 50, cuota: 5, total: 55, lineas: [{ base: 50, tipo: 10, cuota: 5 }] });
  // Del T1: cuenta en el 130 (acumulado del año), no en el 303 del T4.
  await crearFactura(lucia.id, { ...completa, fecha: '2026-02-10', base: 200, cuota: 42, total: 242, lineas: [{ base: 200, tipo: 21, cuota: 42 }] });
  // Ticket sin NIF ni IVA: no se puede deducir.
  await crearFactura(lucia.id, { fecha: '2026-10-08', total: 18.5 });
  // Pendiente: no cuenta.
  await crearFactura(lucia.id, { ...completa, estado: 'pendiente', fecha: '2026-10-09', base: 1000, cuota: 210, total: 1210, lineas: [{ base: 1000, tipo: 21, cuota: 210 }] });

  const impresos = await calcularImpresos(lucia.id, '2026-10-30');
  assert.deepEqual([impresos.anio, impresos.trimestre, impresos.plazo], [2026, 4, '2027-01-30']);
  const casillas = Object.fromEntries(impresos.impresos.flatMap((i) => (i.casillas || []).map((c) => [`${i.modelo}-${c.casilla}`, c.importe])));
  assert.deepEqual(casillas, { '303-28': 150, '303-29': 26, '130-02': 350 });
  assert.deepEqual(impresos.noDeducibles, { num: 1, total: 18.5 });

  // Del 1 al 20 de enero toca presentar el T4 del año anterior.
  assert.equal((await calcularImpresos(lucia.id, '2027-01-15')).trimestre, 4);

  const { datos } = await lucia.cliente.get('/api/panel');
  assert.equal(datos.version, 'empresa');
  assert.ok(datos.impresos.impresos.length === 2);
});

test('en régimen exento no hay 303 y el IVA cuenta como gasto en el 130', async () => {
  await db.query("UPDATE perfiles_fiscales SET regimen_iva = 'exento' WHERE usuario_id = $1", [lucia.id]);
  const impresos = await calcularImpresos(lucia.id, '2026-10-30');
  const [m303, m130] = impresos.impresos;
  assert.deepEqual([m303.aplica, m303.motivo], [false, 'regimen_exento']);
  assert.equal(m130.casillas[0].importe, 418); // 121 + 55 + 242
  await db.query("UPDATE perfiles_fiscales SET regimen_iva = 'general' WHERE usuario_id = $1", [lucia.id]);
});

test('el Excel y el informe de la gestoría llevan solo las de empresa', async () => {
  const { facturasConfirmadas } = await import('../src/modulos/exportacion/datos.js');
  await db.query('DELETE FROM facturas WHERE usuario_id = $1', [lucia.id]);
  await cambiar(lucia.cliente, 'empresa');
  await crearFactura(lucia.id, { emisor: 'Adobe', fecha: '2026-10-05' });
  await cambiar(lucia.cliente, 'personal');
  await crearFactura(lucia.id, { emisor: 'Zara', fecha: '2026-10-06' });
  const emisores = (await facturasConfirmadas(lucia.id, { desde: '2026-10-01', hasta: '2026-12-31' })).map((f) => f.emisor);
  assert.deepEqual(emisores, ['Adobe']);
  await cambiar(lucia.cliente, 'empresa');
});
