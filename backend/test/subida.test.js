// Tests de la subida de facturas (#12).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { arrancar } from './ayuda.js';
import { db } from '../src/core/db.js';
import { detectarTipo } from '../src/modulos/subida/servicio.js';

const PDF = Buffer.from('%PDF-1.4\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n');
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const HEIC = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypheic'), Buffer.alloc(32)]);
const DOCX = Buffer.concat([Buffer.from('PK\x03\x04'), Buffer.alloc(32)]);

let servidor;
before(async () => { servidor = await arrancar(); });
after(async () => { await servidor.cerrar(); });

async function crearUsuario(email, { conPerfil = true } = {}) {
  const respuesta = await fetch(`${servidor.url}/api/auth/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: 'Prueba', email, password: '12345678' }),
  });
  const usuario = await respuesta.json();
  if (conPerfil) {
    await db.query(
      `INSERT INTO perfiles_fiscales (usuario_id, nif, direccion, actividad, regimen_iva)
       VALUES ($1, '12345678Z', 'Calle 1', 'diseno', 'general')`,
      [usuario.id],
    );
  }
  return { id: usuario.id, cookie: respuesta.headers.get('set-cookie').split(';')[0] };
}

async function subir(cookie, archivos, origen = 'subida') {
  const formulario = new FormData();
  for (const [nombre, contenido] of archivos) formulario.append('archivos', new Blob([contenido]), nombre);
  formulario.append('origen', origen);
  const respuesta = await fetch(`${servidor.url}/api/subida`, { method: 'POST', headers: { cookie }, body: formulario });
  return { estado: respuesta.status, datos: await respuesta.json() };
}

test('detecta el tipo real de cada archivo', () => {
  assert.equal(detectarTipo(PDF), 'application/pdf');
  assert.equal(detectarTipo(JPG), 'image/jpeg');
  assert.equal(detectarTipo(PNG), 'image/png');
  assert.equal(detectarTipo(HEIC), 'image/heic');
  assert.equal(detectarTipo(DOCX), null);
});

test('pide sesión', async () => {
  const respuesta = await fetch(`${servidor.url}/api/subida`, { method: 'POST' });
  assert.equal(respuesta.status, 401);
});

test('sin perfil fiscal no deja subir (RF-10)', async () => {
  const { cookie } = await crearUsuario('sinperfil@prueba.es', { conPerfil: false });
  const { estado, datos } = await subir(cookie, [['a.pdf', PDF]]);
  assert.equal(estado, 409);
  assert.equal(datos.codigo, 'perfil_incompleto');
});

test('varios archivos a la vez: una factura por archivo y se rechaza el formato no admitido (RF-16, RF-17)', async () => {
  const { id, cookie } = await crearUsuario('varios@prueba.es');
  const { estado, datos } = await subir(cookie, [
    ['factura-ñandú.pdf', PDF], ['ticket.jpg', JPG], ['foto.heic', HEIC], ['contrato.docx', DOCX],
  ], 'camara');
  assert.equal(estado, 201);
  assert.equal(datos.length, 4);
  assert.deepEqual(datos.map((d) => d.estado), ['pendiente', 'pendiente', 'pendiente', 'rechazado']);
  assert.equal(datos[0].nombre, 'factura-ñandú.pdf');
  assert.match(datos[3].error, /Formato no admitido/);

  const { rows } = await db.query(
    `SELECT f.origen, o.tipo_mime, o.nombre_archivo FROM facturas f JOIN originales o ON o.id = f.original_id
      WHERE f.usuario_id = $1 ORDER BY f.id`,
    [id],
  );
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((r) => r.tipo_mime), ['application/pdf', 'image/jpeg', 'image/heic']);
  assert.ok(rows.every((r) => r.origen === 'camara'));
  assert.equal(rows[0].nombre_archivo, 'factura-ñandú.pdf');
});

test('al llegar al límite del plan se guarda como sin leer y avisa (RF-23)', async () => {
  const { id, cookie } = await crearUsuario('limite@prueba.es');
  // Plan gratis (5 lecturas al mes) ya gastado.
  await db.query("UPDATE suscripciones SET estado = 'activa', plan = 'gratis' WHERE usuario_id = $1", [id]);
  for (let i = 0; i < 5; i++) {
    await db.query("INSERT INTO facturas (usuario_id, estado, leida_en) VALUES ($1, 'pendiente', now())", [id]);
  }
  const { estado, datos } = await subir(cookie, [['a.pdf', PDF], ['b.pdf', PDF]]);
  assert.equal(estado, 201);
  assert.deepEqual(datos.map((d) => d.estado), ['sin_leer', 'sin_leer']);

  const { rows } = await db.query(
    "SELECT count(*) AS n FROM avisos WHERE usuario_id = $1 AND tipo = 'sin_leer' AND estado = 'abierto'",
    [id],
  );
  assert.equal(rows[0].n, 1);
});

test('si la lectura falla, la factura vuelve a sin leer y no gasta lectura', async () => {
  // Mientras la lectura (#13) no esté hecha, leerFactura siempre falla.
  const { id, cookie } = await crearUsuario('falla@prueba.es');
  const { datos } = await subir(cookie, [['a.pdf', PDF]]);
  assert.equal(datos[0].estado, 'pendiente');
  await new Promise((resolve) => setTimeout(resolve, 200));
  const { rows } = await db.query('SELECT estado, leida_en FROM facturas WHERE usuario_id = $1', [id]);
  assert.equal(rows[0].estado, 'sin_leer');
  assert.equal(rows[0].leida_en, null);
});

test('sin archivos responde 400', async () => {
  const { cookie } = await crearUsuario('vacio@prueba.es');
  const { estado } = await subir(cookie, []);
  assert.equal(estado, 400);
});
