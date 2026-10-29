// Tests del módulo exportación (#25): Excel, informe trimestral en PDF y envío a la gestoría.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { arrancar, crearCliente } from './ayuda.js';
import { db } from '../src/core/db.js';

let servidor;
let ana;
let anaId;
before(async () => {
  servidor = await arrancar();
  ana = crearCliente(servidor.url);
  anaId = (await ana.post('/api/auth/registro', { nombre: 'Ana', email: 'ana@export.es', password: '12345678' })).datos.id;
  const categoria = async (clave) => (await db.query('SELECT id FROM categorias WHERE clave = $1', [clave])).rows[0].id;
  const software = await categoria('software');
  const combustible = await categoria('combustible');
  // T2 de 2026 (trimestre anterior) y T3 de 2026.
  await crearFactura(anaId, { fecha: '2026-05-10', emisor: 'Abril SL', categoria: software, iva: [[100, 21]] });
  await crearFactura(anaId, { fecha: '2026-07-05', emisor: 'Adobe', categoria: software, iva: [[50, 21], [20, 10]] });
  await crearFactura(anaId, { fecha: '2026-08-15', emisor: 'Repsol', categoria: combustible, iva: [[40, 21]] });
  await crearFactura(anaId, { fecha: '2026-09-01', emisor: 'GitHub Inc', categoria: software, iva: [[10, 0]], moneda: 'USD', cambio: 0.9 });
  await crearFactura(anaId, { fecha: '2026-08-20', emisor: 'Pendiente SA', categoria: software, iva: [[999, 21]], estado: 'pendiente' });
});
after(async () => { await servidor.cerrar(); });

async function crearFactura(usuarioId, { fecha, emisor, categoria, iva, moneda = 'EUR', cambio = null, estado = 'confirmada' }) {
  const lineas = iva.map(([base, tipo]) => ({ base, tipo, cuota: Math.round(base * tipo) / 100 }));
  const base = lineas.reduce((s, l) => s + l.base, 0);
  const cuota = lineas.reduce((s, l) => s + l.cuota, 0);
  const total = Math.round((base + cuota) * 100) / 100;
  const totalEur = moneda === 'EUR' ? total : Math.round(total * cambio * 100) / 100;
  const { rows: [f] } = await db.query(
    `INSERT INTO facturas (usuario_id, estado, fecha, emisor, nif_emisor, numero, base_imponible, cuota_iva, total,
                           moneda, tipo_cambio, total_eur, categoria_id)
     VALUES ($1, $2, $3::text::date, $4, 'B12345674', 'F-1', $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
    [usuarioId, estado, fecha, emisor, base, cuota, total, moneda, cambio, totalEur, categoria],
  );
  for (const l of lineas) {
    await db.query('INSERT INTO factura_iva (factura_id, base, tipo, cuota) VALUES ($1, $2, $3, $4)', [f.id, l.base, l.tipo, l.cuota]);
  }
  return f.id;
}

async function descargar(ruta) {
  const cookie = await sesion();
  const respuesta = await fetch(servidor.url + ruta, { headers: { cookie } });
  const contenido = Buffer.from(await respuesta.arrayBuffer());
  return { estado: respuesta.status, tipo: respuesta.headers.get('content-type'), disposicion: respuesta.headers.get('content-disposition'), contenido };
}

// Cookie de sesión de Ana para las descargas binarias (el cliente de ayuda.js solo lee JSON).
async function sesion() {
  const respuesta = await fetch(`${servidor.url}/api/auth/entrar`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ana@export.es', password: '12345678' }),
  });
  return respuesta.headers.get('set-cookie').split(';')[0];
}

async function leerExcel(contenido) {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(contenido);
  const hoja = libro.worksheets[0];
  const filas = [];
  hoja.eachRow((fila) => filas.push(fila));
  const cabecera = filas[0].values.slice(1);
  const valor = (fila, columna) => {
    const v = fila.getCell(cabecera.indexOf(columna) + 1).value;
    return v && typeof v === 'object' && 'result' in v ? v.result : v;
  };
  return { hoja, filas, cabecera, valor };
}

// Cuenta las páginas del PDF (los objetos /Type /Page no van comprimidos).
const paginasPdf = (pdf) => (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;

test('el Excel solo trae las facturas confirmadas del periodo', async () => {
  const { estado, tipo, disposicion, contenido } = await descargar('/api/exportacion/excel?desde=2026-07-01&hasta=2026-09-30');
  assert.equal(estado, 200);
  assert.match(tipo, /spreadsheetml/);
  assert.match(disposicion, /cuadra-facturas-2026-07-01_2026-09-30\.xlsx/);

  const { filas, cabecera, valor, hoja } = await leerExcel(contenido);
  assert.deepEqual(cabecera.slice(0, 6), ['Fecha', 'Emisor', 'NIF emisor', 'NIF receptor', 'Número', 'Categoría']);
  for (const c of ['Base 21%', 'IVA 21%', 'Base 10%', 'IVA 10%', 'Base 4%', 'Base 0%', 'Total', 'Moneda', 'Tipo de cambio', 'Total (EUR)']) {
    assert.ok(cabecera.includes(c), c);
  }
  assert.equal(hoja.getRow(1).font.bold, true);

  const datos = filas.slice(1, -1);
  assert.deepEqual(datos.map((f) => valor(f, 'Emisor')), ['Adobe', 'Repsol', 'GitHub Inc']);
  assert.ok(valor(datos[0], 'Fecha') instanceof Date);
  assert.equal(valor(datos[0], 'Base 21%'), 50);
  assert.equal(valor(datos[0], 'IVA 10%'), 2);
  assert.equal(valor(datos[2], 'Moneda'), 'USD');
  assert.equal(valor(datos[2], 'Tipo de cambio'), 0.9);
  assert.equal(valor(datos[2], 'Total (EUR)'), 9);

  // Fila de totales en euros: el USD se suma ya convertido.
  const totales = filas.at(-1);
  assert.equal(valor(totales, 'Emisor'), 'Totales (EUR)');
  assert.equal(totales.font.bold, true);
  assert.equal(valor(totales, 'Base 21%'), 90);
  assert.equal(valor(totales, 'Base 0%'), 9);
  assert.equal(valor(totales, 'Total (EUR)'), 60.5 + 22 + 48.4 + 9);
});

test('el Excel filtra por categorías y no mezcla usuarios', async () => {
  const { id: combustible } = (await db.query("SELECT id FROM categorias WHERE clave = 'combustible'")).rows[0];
  const { contenido } = await descargar(`/api/exportacion/excel?desde=2026-01-01&hasta=2026-12-31&categorias=${combustible}`);
  const { filas, valor } = await leerExcel(contenido);
  assert.deepEqual(filas.slice(1, -1).map((f) => valor(f, 'Emisor')), ['Repsol']);

  // Otro usuario no ve las facturas de Ana (RF-09).
  const { facturasConfirmadas } = await import('../src/modulos/exportacion/datos.js');
  const otro = crearCliente(servidor.url);
  const { datos: otroUsuario } = await otro.post('/api/auth/registro', { nombre: 'Otro', email: 'otro@export.es', password: '12345678' });
  assert.deepEqual(await facturasConfirmadas(otroUsuario.id, { desde: '2026-01-01', hasta: '2026-12-31' }), []);
  assert.equal((await facturasConfirmadas(anaId, { desde: '2026-01-01', hasta: '2026-12-31' })).length, 4);
});

test('el Excel valida el periodo', async () => {
  assert.equal((await ana.get('/api/exportacion/excel?desde=2026-09-30&hasta=2026-07-01')).estado, 400);
  assert.equal((await ana.get('/api/exportacion/excel?desde=ayer&hasta=2026-07-01')).estado, 400);
  assert.equal((await ana.get('/api/exportacion/excel?desde=2026-02-30&hasta=2026-03-01')).estado, 400);
  assert.equal((await ana.get('/api/exportacion/excel?desde=2026-01-01&hasta=2026-03-01&categorias=a')).estado, 400);
});

test('el informe trimestral es un PDF con página ejecutiva y anexo', async () => {
  const { estado, tipo, disposicion, contenido } = await descargar('/api/exportacion/informe?anio=2026&trimestre=3');
  assert.equal(estado, 200);
  assert.equal(tipo, 'application/pdf');
  assert.match(disposicion, /cuadra-informe-2026-T3\.pdf/);
  assert.equal(contenido.subarray(0, 4).toString(), '%PDF');
  assert.ok(paginasPdf(contenido) >= 2);

  assert.equal((await ana.get('/api/exportacion/informe?anio=2026&trimestre=5')).estado, 400);
});

test('los datos del informe: totales, comparación, categorías y avisos', async () => {
  const { datosInforme } = await import('../src/modulos/exportacion/datos.js');
  const datos = await datosInforme(anaId, 2026, 3);
  assert.equal(datos.resumen.cantidad, 3);
  assert.equal(datos.resumen.gasto, 139.9);
  assert.equal(datos.resumen.iva, 20.9);
  assert.deepEqual({ anio: datos.anterior.anio, trimestre: datos.anterior.trimestre, gasto: datos.anterior.gasto }, { anio: 2026, trimestre: 2, gasto: 121 });
  assert.equal(datos.categorias[0].nombre, 'Software y suscripciones');
  assert.equal(datos.sinConfirmar, 1);
  // T1 tira del T4 del año anterior.
  assert.deepEqual((await datosInforme(anaId, 2026, 1)).anterior.trimestre, 4);
});

test('el informe y el envío dependen del plan', async () => {
  await db.query("UPDATE suscripciones SET estado = 'activa', plan = 'gratis', prueba_hasta = now() - interval '1 day' WHERE usuario_id = $1", [anaId]);
  try {
    assert.equal((await ana.get('/api/exportacion/informe?anio=2026&trimestre=3')).estado, 403);
    assert.equal((await ana.post('/api/exportacion/enviar', { tipo: 'excel', desde: '2026-07-01', hasta: '2026-09-30' })).estado, 403);
    // El Excel es para todos los planes.
    assert.equal((await descargar('/api/exportacion/excel?desde=2026-07-01&hasta=2026-09-30')).estado, 200);
  } finally {
    await db.query("UPDATE suscripciones SET estado = 'prueba', prueba_hasta = now() + interval '14 days' WHERE usuario_id = $1", [anaId]);
  }
});

test('sin email de gestoría no se envía; con email, va adjunto', async () => {
  const sinPerfil = await ana.post('/api/exportacion/enviar', { tipo: 'excel', desde: '2026-07-01', hasta: '2026-09-30' });
  assert.equal(sinPerfil.estado, 400);
  assert.equal(sinPerfil.datos.detalles.codigo, 'sin_gestoria');

  await ana.put('/api/perfil', { nif: '12345678Z', direccion: 'Calle 1', actividad: 'diseno', regimen_iva: 'general', email_gestoria: 'gestoria@ejemplo.com' });

  const emails = [];
  const original = console.log;
  console.log = (...args) => { emails.push(args.join(' ')); };
  let excel;
  let informe;
  try {
    excel = await ana.post('/api/exportacion/enviar', { tipo: 'excel', desde: '2026-07-01', hasta: '2026-09-30' });
    informe = await ana.post('/api/exportacion/enviar', { tipo: 'informe', anio: 2026, trimestre: 3 });
  } finally {
    console.log = original;
  }
  assert.equal(excel.estado, 200);
  assert.equal(excel.datos.para, 'gestoria@ejemplo.com');
  assert.equal(informe.estado, 200);
  const texto = emails.join('\n');
  assert.match(texto, /Para: gestoria@ejemplo\.com/);
  assert.match(texto, /Adjuntos: cuadra-facturas-2026-07-01_2026-09-30\.xlsx/);
  assert.match(texto, /Adjuntos: cuadra-informe-2026-T3\.pdf/);

  assert.equal((await ana.post('/api/exportacion/enviar', { tipo: 'otro' })).estado, 400);
});
