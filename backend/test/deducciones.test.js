// Tests de cuánto se deduce de cada factura (#50): categorías, UE y cuota de autónomos.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { arrancar, crearCliente } from './ayuda.js';
import { db } from '../src/core/db.js';
import { clasificarFactura, esNifUe } from '../src/modulos/panel/deducibilidad.js';
import { calcularImpresos } from '../src/modulos/panel/impresos.js';
import { comprobarFactura } from '../src/modulos/facturas/comprobaciones.js';

let servidor;
let lucia;
const NIF = '12345678Z';
const general = { regimen: 'general', actividad: 'diseno' };
const completa = (cambios) => ({
  base_imponible: 100, cuota_iva: 21, total_eur: 121, moneda: 'EUR', nif_emisor: 'B12345674', nif_receptor: NIF, lineas: 1, categoria: 'software', ...cambios,
});

before(async () => {
  servidor = await arrancar();
  lucia = crearCliente(servidor.url);
  await lucia.post('/api/auth/registro', { nombre: 'Lucía', email: 'lucia@deducciones.es', password: '12345678' });
  const { rows: [u] } = await db.query("SELECT id FROM usuarios WHERE email = 'lucia@deducciones.es'");
  lucia.id = u.id;
  await db.query(
    `INSERT INTO perfiles_fiscales (usuario_id, nif, direccion, actividad, regimen_iva) VALUES ($1, $2, 'Calle 1', 'diseno', 'general')`,
    [lucia.id, NIF],
  );
});
after(async () => { await servidor.cerrar(); });

test('NIF de otro país de la UE', () => {
  assert.equal(esNifUe('IE6388047V'), true);
  assert.equal(esNifUe('DE 123 456 789'), true);
  assert.equal(esNifUe('ESB12345674'), false);
  assert.equal(esNifUe('B12345674'), false);
  assert.equal(esNifUe('X1234567L'), false);
  assert.equal(esNifUe(null), false);
});

test('factura normal: todo el IVA a las casillas 28 y 29 y la base al 130', () => {
  const r = clasificarFactura(completa(), general);
  assert.equal(r.tipo, 'interior');
  assert.deepEqual([r.iva.casillas.deducible, r.iva.base, r.iva.cuota, r.irpf], [['28', '29'], 100, 21, 100]);
});

test('coche: la mitad del IVA y nada en el IRPF, salvo en transporte', () => {
  const r = clasificarFactura(completa({ categoria: 'combustible', base_imponible: 50, cuota_iva: 10.5 }), general);
  assert.deepEqual([r.iva.base, r.iva.cuota, r.irpf, r.motivos], [25, 5.25, 0, ['vehiculo']]);
  const t = clasificarFactura(completa({ categoria: 'vehiculo' }), { ...general, actividad: 'transporte' });
  assert.deepEqual([t.iva.cuota, t.irpf], [21, 100]);
});

test('comidas con clientes: sin IVA deducible y el IVA va al gasto', () => {
  const r = clasificarFactura(completa({ categoria: 'comidas' }), general);
  assert.deepEqual([r.iva.cuota, r.irpf, r.motivos], [0, 121, ['atenciones']]);
});

test('suministros de casa: el % de la vivienda en el IVA y el 30 % de eso en el IRPF', () => {
  const r = clasificarFactura(completa({ categoria: 'suministros' }), { ...general, viviendaPct: 20 });
  // IVA: 21 × 20 % = 4,20. IRPF: (100 + 16,80 de IVA no deducido) × 20 % × 30 % = 7,01
  assert.deepEqual([r.iva.cuota, r.irpf, r.motivos], [4.2, 7.01, ['suministros']]);
  // Sin trabajar en casa (un local), entera.
  assert.equal(clasificarFactura(completa({ categoria: 'suministros' }), general).iva.cuota, 21);
});

test('equipos: de más de 3.005,06 € van a bienes de inversión y de más de 300 € se amortizan', () => {
  const caro = clasificarFactura(completa({ categoria: 'equipos', base_imponible: 4000, cuota_iva: 840 }), general);
  assert.deepEqual([caro.iva.casillas.deducible, caro.iva.cuota, caro.irpf], [['30', '31'], 840, 0]);
  assert.ok(caro.motivos.includes('amortizar'));
  const medio = clasificarFactura(completa({ categoria: 'equipos', base_imponible: 1200, cuota_iva: 252 }), general);
  assert.deepEqual([medio.iva.casillas.deducible, medio.irpf], [['28', '29'], 0]);
  assert.equal(clasificarFactura(completa({ categoria: 'equipos', base_imponible: 250, cuota_iva: 52.5 }), general).irpf, 250);
});

test('proveedor de la UE sin IVA: inversión del sujeto pasivo al 21 %', () => {
  const google = completa({ nif_emisor: 'IE6388047V', base_imponible: null, cuota_iva: null, total_eur: 100, lineas: 0, categoria: 'publicidad' });
  const r = clasificarFactura(google, general);
  assert.equal(r.tipo, 'intracomunitaria');
  assert.deepEqual(r.iva.casillas, { devengado: ['10', '11'], deducible: ['36', '37'] });
  assert.deepEqual([r.iva.devengadoBase, r.iva.devengadoCuota, r.iva.cuota, r.irpf], [100, 21, 21, 100]);
  // Con una línea de IVA al 0 % (como la pinta Google) también.
  assert.equal(clasificarFactura({ ...google, base_imponible: 100, cuota_iva: 0, lineas: 1 }, general).tipo, 'intracomunitaria');
  // Sin tu NIF en la factura no vale.
  assert.equal(clasificarFactura({ ...google, nif_receptor: null }, general).tipo, 'incompleta');
});

test('lo que no se calcula: incompleta y fuera de la UE', () => {
  assert.equal(clasificarFactura(completa({ nif_emisor: null }), general).tipo, 'incompleta');
  assert.equal(clasificarFactura(completa({ lineas: 0, cuota_iva: null }), general).tipo, 'incompleta');
  const usa = clasificarFactura(completa({ moneda: 'USD', nif_emisor: null }), general);
  assert.deepEqual([usa.tipo, usa.iva, usa.irpf], ['fuera_ue', null, 0]);
});

test('régimen exento: no se deduce IVA y todo el total es gasto', () => {
  const r = clasificarFactura(completa(), { regimen: 'exento', actividad: 'formacion' });
  assert.deepEqual([r.iva, r.irpf], [null, 121]);
});

test('la factura de un proveedor de la UE no avisa de que le falta el IVA', async () => {
  const { rows: [f] } = await db.query(
    `INSERT INTO facturas (usuario_id, estado, fecha, emisor, nif_emisor, nif_receptor, total, total_eur, moneda)
     VALUES ($1, 'pendiente', '2026-10-10', 'Google Ireland', 'IE6388047V', $2, 100, 100, 'EUR') RETURNING id`,
    [lucia.id, NIF],
  );
  assert.deepEqual((await comprobarFactura(f.id)).map((a) => a.tipo), []);
});

test('cuota de autónomos y % de casa: se guardan y cuentan en el 130', async () => {
  assert.equal((await lucia.put('/api/versiones/empresa', { cuota_autonomos_mensual: 'abc' })).estado, 400);
  assert.equal((await lucia.put('/api/versiones/empresa', { vivienda_afecta_pct: 0 })).estado, 400);
  assert.equal((await lucia.put('/api/versiones/empresa', { vivienda_afecta_pct: 120 })).estado, 400);
  const { datos } = await lucia.put('/api/versiones/empresa', { cuota_autonomos_mensual: '230,50', vivienda_afecta_pct: '15' });
  assert.deepEqual(datos.empresa, { cuota_autonomos_mensual: 230.5, vivienda_afecta_pct: 15 });

  await db.query('DELETE FROM facturas WHERE usuario_id = $1', [lucia.id]);
  const insertar = async (f) => {
    const { rows: [n] } = await db.query(
      `INSERT INTO facturas (usuario_id, estado, fecha, emisor, nif_emisor, nif_receptor, base_imponible, cuota_iva, total, total_eur, moneda, categoria_id)
       VALUES ($1, 'confirmada', $2, 'X', $3, $4, $5, $6, $7, $7, 'EUR', (SELECT id FROM categorias WHERE clave = $8 AND usuario_id IS NULL)) RETURNING id`,
      [lucia.id, f.fecha, f.nif_emisor ?? 'B12345674', NIF, f.base ?? null, f.cuota ?? null, f.total, f.categoria],
    );
    if (f.cuota !== undefined) await db.query('INSERT INTO factura_iva (factura_id, base, tipo, cuota) VALUES ($1, $2, 21, $3)', [n.id, f.base, f.cuota]);
  };
  await insertar({ fecha: '2026-10-05', base: 100, cuota: 21, total: 121, categoria: 'software' });
  await insertar({ fecha: '2026-10-06', base: 40, cuota: 8.4, total: 48.4, categoria: 'combustible' });
  await insertar({ fecha: '2026-10-07', nif_emisor: 'IE6388047V', total: 50, categoria: 'publicidad' });

  const i = await calcularImpresos(lucia.id, '2026-10-30');
  const de = (modelo) => Object.fromEntries(i.impresos.find((m) => m.modelo === modelo).casillas.map((c) => [c.casilla, c.importe]));
  // 303: 28/29 = software 100/21 + la mitad del combustible 20/4,20. UE: 10/11 y 36/37 = 50/10,50.
  assert.deepEqual(de('303'), { 10: 50, 11: 10.5, 28: 120, 29: 25.2, 36: 50, 37: 10.5 });
  // 130: 100 (software) + 0 (combustible) + 50 (UE) + 230,50 × 12 meses de cuota = 2.916
  assert.deepEqual(de('130'), { '02': 2916 });
  assert.deepEqual(i.impresos[1].cuotaAutonomos, { mensual: 230.5, meses: 12, total: 2766 });
  assert.deepEqual(Object.keys(i.motivos).sort(), ['intracomunitaria', 'vehiculo']);
  assert.equal(i.sinCuotaAutonomos, false);
});
