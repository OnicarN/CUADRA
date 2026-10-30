// Tests de la baja (#27): copia de todo en un ZIP y eliminar la cuenta (RF-62, RF-09).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import ExcelJS from 'exceljs';
import { arrancar, crearCliente } from './ayuda.js';
import { db } from '../src/core/db.js';
import { crearAviso, TIPOS_AVISO } from '../src/core/avisos.js';

let servidor;
before(async () => { servidor = await arrancar(); });
after(async () => { await servidor.cerrar(); });

const PASSWORD = '12345678';

async function registrar(email) {
  const cliente = crearCliente(servidor.url);
  const { datos } = await cliente.post('/api/auth/registro', { nombre: 'Ana', email, password: PASSWORD });
  return { cliente, id: datos.id };
}

// El cliente de ayuda.js solo lee JSON y no manda cuerpo en DELETE: para eso usamos fetch con la cookie.
async function cookieDe(email) {
  const respuesta = await fetch(`${servidor.url}/api/auth/entrar`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: PASSWORD }),
  });
  return respuesta.headers.get('set-cookie')?.split(';')[0] || '';
}

function eliminarCuenta(cookie, confirmacion) {
  return fetch(`${servidor.url}/api/auth/cuenta`, {
    method: 'DELETE', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ confirmacion }),
  });
}

async function crearFactura(usuarioId, { estado, fecha = null, emisor = null, contenido, nombre = 'ticket.pdf', mime = 'application/pdf' }) {
  const { rows: [o] } = await db.query(
    'INSERT INTO originales (usuario_id, nombre_archivo, tipo_mime, tamano, contenido) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [usuarioId, nombre, mime, contenido.length, contenido],
  );
  const { rows: [f] } = await db.query(
    `INSERT INTO facturas (usuario_id, original_id, estado, fecha, emisor, base_imponible, cuota_iva, total, total_eur)
     VALUES ($1, $2, $3, $4::text::date, $5, 10, 2.1, 12.1, 12.1) RETURNING id`,
    [usuarioId, o.id, estado, fecha, emisor],
  );
  if (estado !== 'sin_leer') await db.query('INSERT INTO factura_iva (factura_id, base, tipo, cuota) VALUES ($1, 10, 21, 2.1)', [f.id]);
  return { facturaId: f.id, originalId: o.id };
}

// Lector mínimo de ZIP (directorio central + deflate), para no añadir dependencias.
function leerZip(buffer) {
  const fin = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  let p = buffer.readUInt32LE(fin + 16);
  const archivos = {};
  for (let i = 0, n = buffer.readUInt16LE(fin + 10); i < n; i++) {
    const largoNombre = buffer.readUInt16LE(p + 28);
    const local = buffer.readUInt32LE(p + 42);
    const nombre = buffer.subarray(p + 46, p + 46 + largoNombre).toString('utf8');
    const inicio = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    const datos = buffer.subarray(inicio, inicio + buffer.readUInt32LE(p + 20));
    archivos[nombre] = buffer.readUInt16LE(p + 10) === 8 ? zlib.inflateRawSync(datos) : datos;
    p += 46 + largoNombre + buffer.readUInt16LE(p + 30) + buffer.readUInt16LE(p + 32);
  }
  return archivos;
}

async function emisoresDelExcel(contenido) {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(contenido);
  const hoja = libro.worksheets[0];
  const columna = hoja.getRow(1).values.indexOf('Emisor');
  const emisores = [];
  // La última fila es la de totales.
  hoja.eachRow((fila, n) => { if (n > 1 && n < hoja.rowCount) emisores.push(fila.getCell(columna).value); });
  return emisores;
}

test('la copia trae los Excel, todos los originales y el LEEME', async () => {
  const { id } = await registrar('copia@baja.es');
  const adobe = await crearFactura(id, { estado: 'confirmada', fecha: '2026-07-05', emisor: 'Adobe / Inc.', contenido: Buffer.from('%PDF-adobe') });
  const repsol = await crearFactura(id, { estado: 'pendiente', fecha: '2026-11-02', emisor: 'Repsol', contenido: Buffer.from('foto'), nombre: 'IMG_1.JPG', mime: 'image/jpeg' });
  const ticket = await crearFactura(id, { estado: 'sin_leer', contenido: Buffer.from('%PDF-ticket'), nombre: 'ticket-gasolinera.pdf' });
  // De otro usuario: no debe aparecer (RF-09).
  const otro = await registrar('otro-copia@baja.es');
  await crearFactura(otro.id, { estado: 'confirmada', fecha: '2026-07-01', emisor: 'Ajena', contenido: Buffer.from('ajeno') });

  const respuesta = await fetch(`${servidor.url}/api/exportacion/todo`, { headers: { cookie: await cookieDe('copia@baja.es') } });
  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.headers.get('content-type'), 'application/zip');
  assert.match(respuesta.headers.get('content-disposition'), /cuadra-copia-\d{4}-\d{2}-\d{2}\.zip/);

  const archivos = leerZip(Buffer.from(await respuesta.arrayBuffer()));
  assert.deepEqual(Object.keys(archivos).sort(), [
    'LEEME.txt',
    'facturas-confirmadas.xlsx',
    'facturas-sin-confirmar.xlsx',
    `originales/2026/T3/2026-07-05 Adobe Inc. (${adobe.originalId}).pdf`,
    `originales/2026/T4/2026-11-02 Repsol (${repsol.originalId}).jpg`,
    `originales/sin-fecha/ticket-gasolinera (${ticket.originalId}).pdf`,
  ]);
  assert.equal(archivos[`originales/2026/T3/2026-07-05 Adobe Inc. (${adobe.originalId}).pdf`].toString(), '%PDF-adobe');
  assert.equal(archivos[`originales/2026/T4/2026-11-02 Repsol (${repsol.originalId}).jpg`].toString(), 'foto');

  assert.deepEqual(await emisoresDelExcel(archivos['facturas-confirmadas.xlsx']), ['Adobe / Inc.']);
  assert.deepEqual(await emisoresDelExcel(archivos['facturas-sin-confirmar.xlsx']), ['Repsol', null]);

  const leeme = archivos['LEEME.txt'].toString();
  assert.match(leeme, /copia@baja\.es/);
  assert.match(leeme, /las 1 facturas que revisaste/);
  assert.match(leeme, /\(3 archivos\)/);
  assert.match(leeme, /Hacienda/);
});

test('la copia sin facturas también se descarga', async () => {
  await registrar('vacia@baja.es');
  const respuesta = await fetch(`${servidor.url}/api/exportacion/todo`, { headers: { cookie: await cookieDe('vacia@baja.es') } });
  const archivos = leerZip(Buffer.from(await respuesta.arrayBuffer()));
  assert.deepEqual(Object.keys(archivos).sort(), ['LEEME.txt', 'facturas-confirmadas.xlsx', 'facturas-sin-confirmar.xlsx']);
  assert.equal((await fetch(`${servidor.url}/api/exportacion/todo`)).status, 401);
});

test('eliminar la cuenta pide sesión y escribir su email', async () => {
  const { cliente } = await registrar('confirmar@baja.es');
  const cookie = await cookieDe('confirmar@baja.es');
  assert.equal((await eliminarCuenta('', 'confirmar@baja.es')).status, 401);
  assert.equal((await eliminarCuenta(cookie, '')).status, 400);
  const otroEmail = await eliminarCuenta(cookie, 'otro@baja.es');
  assert.equal(otroEmail.status, 400);
  assert.equal((await otroEmail.json()).detalles.codigo, 'confirmacion');
  assert.equal((await cliente.get('/api/auth/yo')).estado, 200);
});

test('tras eliminar la cuenta no puedo entrar y mis datos no existen', async () => {
  const { cliente, id } = await registrar('adios@baja.es');
  await cliente.put('/api/perfil', { nif: '12345678Z', direccion: 'Calle 1', actividad: 'diseno', regimen_iva: 'general' });
  await cliente.post('/api/perfil/emails-confianza', { email: 'socio@baja.es' });
  const { facturaId } = await crearFactura(id, { estado: 'confirmada', fecha: '2026-07-05', emisor: 'X', contenido: Buffer.from('x') });
  await crearAviso({ usuarioId: id, tipo: TIPOS_AVISO.SIN_NIF, facturaId });
  await db.query("UPDATE suscripciones SET stripe_subscription_id = 'sub_prueba' WHERE usuario_id = $1", [id]);
  const otro = await registrar('sigue@baja.es');
  await crearFactura(otro.id, { estado: 'confirmada', fecha: '2026-07-05', emisor: 'Y', contenido: Buffer.from('y') });

  // Sin clave de Stripe (en local) avisa por la consola de que no ha cancelado nada y sigue.
  const cookie = await cookieDe('adios@baja.es');
  const avisos = [];
  const original = console.warn;
  console.warn = (...args) => { avisos.push(args.join(' ')); };
  let respuesta;
  try {
    respuesta = await eliminarCuenta(cookie, ' ADIOS@baja.es ');
  } finally {
    console.warn = original;
  }
  assert.equal(respuesta.status, 204);
  assert.match(respuesta.headers.get('set-cookie'), /cuadra_sesion=;/);
  assert.ok(avisos.some((a) => a.includes('sub_prueba')));

  // No puedo entrar, ni siquiera con la cookie que tenía.
  assert.equal((await crearCliente(servidor.url).post('/api/auth/entrar', { email: 'adios@baja.es', password: PASSWORD })).estado, 401);
  assert.equal((await fetch(`${servidor.url}/api/auth/yo`, { headers: { cookie } })).status, 401);

  // Mis datos no existen.
  for (const tabla of ['usuarios', 'facturas', 'originales', 'avisos', 'perfiles_fiscales', 'emails_confianza', 'ajustes', 'suscripciones', 'tokens']) {
    const { rows } = await db.query(`SELECT count(*)::int AS n FROM ${tabla} WHERE ${tabla === 'usuarios' ? 'id' : 'usuario_id'} = $1`, [id]);
    assert.equal(rows[0].n, 0, tabla);
  }
  assert.equal((await db.query('SELECT count(*)::int AS n FROM factura_iva WHERE factura_id = $1', [facturaId])).rows[0].n, 0);

  // Los del otro usuario siguen ahí.
  assert.equal((await db.query('SELECT count(*)::int AS n FROM facturas WHERE usuario_id = $1', [otro.id])).rows[0].n, 1);
  assert.equal((await otro.cliente.get('/api/auth/yo')).estado, 200);
});
