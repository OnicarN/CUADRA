// Tests de la lectura con IA (#13, Gemini). La IA y el tipo de cambio se sustituyen por versiones falsas.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { arrancar } from './ayuda.js';
import { db } from '../src/core/db.js';
import { leerFactura, leerSinLeer, usarLectorIa, usarTipoDeCambio } from '../src/modulos/lectura/servicio.js';
import { limpiarLectura } from '../src/modulos/lectura/esquema.js';

const PDF = Buffer.from('%PDF-1.4\n%%EOF\n');

let servidor;
let peticiones;
let respuestaIa;

before(async () => {
  servidor = await arrancar();
  usarLectorIa(async (peticion) => {
    peticiones.push(peticion);
    return respuestaIa;
  });
  usarTipoDeCambio(async (moneda) => (moneda === 'USD' ? 0.9 : null));
});
after(async () => { await servidor.cerrar(); });
beforeEach(() => { peticiones = []; });

const leida = (datos) => ({ datos, motivo: null });

let contador = 0;
async function crearUsuarioConFactura({ estado = 'pendiente', tipo = 'application/pdf', contenido = PDF } = {}) {
  contador += 1;
  const { rows: [usuario] } = await db.query(
    `INSERT INTO usuarios (nombre, email, alias_correo) VALUES ('Prueba', $1, $2) RETURNING id`,
    [`lectura${contador}@prueba.es`, `alias${contador}`],
  );
  await db.query("INSERT INTO suscripciones (usuario_id, plan, estado, prueba_hasta) VALUES ($1, 'gratis', 'prueba', now() + interval '14 days')", [usuario.id]);
  await db.query("INSERT INTO perfiles_fiscales (usuario_id, nif, direccion, actividad, regimen_iva) VALUES ($1, '12345678Z', 'C/ 1', 'diseno', 'general')", [usuario.id]);
  const factura = await crearFactura(usuario.id, { estado, tipo, contenido });
  return { usuarioId: usuario.id, facturaId: factura };
}

async function crearFactura(usuarioId, { estado = 'pendiente', tipo = 'application/pdf', contenido = PDF } = {}) {
  const { rows: [original] } = await db.query(
    'INSERT INTO originales (usuario_id, nombre_archivo, tipo_mime, tamano, contenido) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [usuarioId, 'f.pdf', tipo, contenido.length, contenido],
  );
  const { rows: [factura] } = await db.query(
    `INSERT INTO facturas (usuario_id, original_id, estado, leida_en) VALUES ($1, $2, $3, ${estado === 'sin_leer' ? 'NULL' : 'now()'}) RETURNING id`,
    [usuarioId, original.id, estado],
  );
  return factura.id;
}

test('limpia lo que devuelve la IA', () => {
  const datos = limpiarLectura({
    fecha: '2026-13-45', hora: '9:05:00', emisor: '  Repsol ', nif_emisor: 'es-a78374725', nif_receptor: '',
    numero: null, lineas_iva: [{ base: 10.004, tipo: 21, cuota: 2.1 }], total: 12.1049, moneda: 'eur', categoria: null,
  });
  assert.equal(datos.fecha, null);
  assert.equal(datos.hora, '09:05');
  assert.equal(datos.emisor, 'Repsol');
  assert.equal(datos.nif_emisor, 'A78374725');
  assert.equal(datos.nif_receptor, null);
  assert.equal(datos.moneda, 'EUR');
  assert.deepEqual(datos.lineas_iva, [{ base: 10, tipo: 21, cuota: 2.1 }]);
  assert.equal(datos.total, 12.1);
});

test('ticket de supermercado con varios tipos de IVA (RF-24, RF-29)', async () => {
  const { facturaId } = await crearUsuarioConFactura();
  respuestaIa = leida({
    fecha: '2026-10-20', hora: '18:42', emisor: 'Mercadona S.A.', nif_emisor: 'A46103834', nif_receptor: null,
    numero: 'FS-118273', total: 33.07, moneda: 'EUR', categoria: 'Comidas con clientes',
    lineas_iva: [{ base: 18.2, tipo: 10, cuota: 1.82 }, { base: 6.4, tipo: 21, cuota: 1.34 }, { base: 5.1, tipo: 4, cuota: 0.21 }],
  });
  await leerFactura(facturaId);

  const peticion = peticiones[0];
  assert.equal(peticion.mime, 'application/pdf');
  assert.match(peticion.instrucciones, /Comidas con clientes/);

  const { rows: [f] } = await db.query(
    `SELECT f.*, c.nombre AS categoria FROM facturas f LEFT JOIN categorias c ON c.id = f.categoria_id WHERE f.id = $1`,
    [facturaId],
  );
  assert.equal(f.estado, 'pendiente');
  assert.equal(f.fecha, '2026-10-20');
  assert.equal(f.emisor, 'Mercadona S.A.');
  assert.equal(f.base_imponible, 29.7);
  assert.equal(f.cuota_iva, 3.37);
  assert.equal(f.total, 33.07);
  assert.equal(f.total_eur, 33.07);
  assert.equal(f.tipo_cambio, null);
  assert.equal(f.categoria, 'Comidas con clientes');
  const { rows: lineas } = await db.query('SELECT tipo FROM factura_iva WHERE factura_id = $1 ORDER BY tipo', [facturaId]);
  assert.deepEqual(lineas.map((l) => l.tipo), [4, 10, 21]);
});

test('factura en dólares: importe original y en euros (RF-25)', async () => {
  const { facturaId } = await crearUsuarioConFactura();
  respuestaIa = leida({
    fecha: '2026-10-01', hora: null, emisor: 'Figma, Inc.', nif_emisor: null, nif_receptor: null, numero: 'INV-1',
    total: 15, moneda: 'USD', categoria: 'Software y suscripciones', lineas_iva: [{ base: 15, tipo: 0, cuota: 0 }],
  });
  await leerFactura(facturaId);
  const { rows: [f] } = await db.query('SELECT total, moneda, tipo_cambio, total_eur FROM facturas WHERE id = $1', [facturaId]);
  assert.deepEqual(f, { total: 15, moneda: 'USD', tipo_cambio: 0.9, total_eur: 13.5 });
});

test('si la IA no la lee, queda pendiente con los campos vacíos', async () => {
  const { facturaId } = await crearUsuarioConFactura();
  respuestaIa = { datos: null, motivo: 'bloqueada_SAFETY' };
  await leerFactura(facturaId);
  const { rows: [f] } = await db.query('SELECT estado, emisor, datos_ia FROM facturas WHERE id = $1', [facturaId]);
  assert.equal(f.estado, 'pendiente');
  assert.equal(f.emisor, null);
  assert.equal(f.datos_ia.motivo, 'bloqueada_SAFETY');
});

test('las imágenes se mandan con su tipo, también HEIC', async () => {
  const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(16)]);
  const { facturaId } = await crearUsuarioConFactura({ tipo: 'image/jpeg', contenido: jpg });
  respuestaIa = leida({ fecha: null, hora: null, emisor: 'Bar', nif_emisor: null, nif_receptor: null, numero: null, total: 3, moneda: 'EUR', categoria: null, lineas_iva: [] });
  await leerFactura(facturaId);
  assert.equal(peticiones[0].mime, 'image/jpeg');
  assert.ok(Buffer.isBuffer(peticiones[0].archivo));
});

test('una respuesta con forma incorrecta no se guarda', async () => {
  const { facturaId } = await crearUsuarioConFactura();
  respuestaIa = leida({ emisor: 42 });
  await leerFactura(facturaId);
  const { rows: [f] } = await db.query('SELECT estado, emisor, datos_ia FROM facturas WHERE id = $1', [facturaId]);
  assert.equal(f.emisor, null);
  assert.equal(f.datos_ia.motivo, 'respuesta_no_valida');
});

test('no toca una factura ya confirmada', async () => {
  const { facturaId } = await crearUsuarioConFactura({ estado: 'confirmada' });
  respuestaIa = leida({ fecha: null, hora: null, emisor: 'Otro', nif_emisor: null, nif_receptor: null, numero: null, total: 1, moneda: 'EUR', categoria: null, lineas_iva: [] });
  await leerFactura(facturaId);
  assert.equal(peticiones.length, 0);
});

test('leerSinLeer lee las pendientes mientras queden lecturas y cierra el aviso', async () => {
  const { usuarioId } = await crearUsuarioConFactura({ estado: 'sin_leer' });
  await crearFactura(usuarioId, { estado: 'sin_leer' });
  await db.query("INSERT INTO avisos (usuario_id, tipo, clave) VALUES ($1, 'sin_leer', '2026-10')", [usuarioId]);
  respuestaIa = leida({ fecha: null, hora: null, emisor: 'X', nif_emisor: null, nif_receptor: null, numero: null, total: 1, moneda: 'EUR', categoria: null, lineas_iva: [] });

  const leidas = await leerSinLeer(usuarioId);
  assert.equal(leidas, 2);
  const { rows } = await db.query("SELECT count(*) AS n FROM facturas WHERE usuario_id = $1 AND estado = 'sin_leer'", [usuarioId]);
  assert.equal(rows[0].n, 0);
  const { rows: avisos } = await db.query("SELECT estado FROM avisos WHERE usuario_id = $1 AND tipo = 'sin_leer'", [usuarioId]);
  assert.equal(avisos[0].estado, 'cerrado');
});

test('leerSinLeer respeta el límite del plan', async () => {
  const { usuarioId } = await crearUsuarioConFactura({ estado: 'sin_leer' });
  await db.query("UPDATE suscripciones SET estado = 'activa' WHERE usuario_id = $1", [usuarioId]);
  for (let i = 0; i < 5; i++) await db.query("INSERT INTO facturas (usuario_id, estado, leida_en) VALUES ($1, 'pendiente', now())", [usuarioId]);
  respuestaIa = leida({ fecha: null, hora: null, emisor: 'X', nif_emisor: null, nif_receptor: null, numero: null, total: 1, moneda: 'EUR', categoria: null, lineas_iva: [] });
  assert.equal(await leerSinLeer(usuarioId), 0);
  assert.equal(peticiones.length, 0);
});

test('gemini.js: forma de la petición y lectura de la respuesta', async () => {
  const { leerConGemini } = await import('../src/modulos/lectura/gemini.js');
  const fetchOriginal = globalThis.fetch;
  let enviado;
  const responder = (cuerpo, estado = 200) => async (url, opciones) => {
    enviado = { url, opciones, cuerpo: JSON.parse(opciones.body) };
    return new Response(JSON.stringify(cuerpo), { status: estado });
  };
  try {
    globalThis.fetch = responder({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"emisor":"Bar"}' }] } }] });
    const ok = await leerConGemini({ instrucciones: 'X', archivo: Buffer.from('hola'), mime: 'image/heic' });
    assert.deepEqual(ok, { datos: { emisor: 'Bar' }, motivo: null });
    assert.match(enviado.url, /:generateContent$/);
    assert.equal(enviado.cuerpo.contents[0].parts[0].inlineData.mimeType, 'image/heic');
    assert.equal(enviado.cuerpo.contents[0].parts[0].inlineData.data, Buffer.from('hola').toString('base64'));
    assert.equal(enviado.cuerpo.generationConfig.responseMimeType, 'application/json');

    globalThis.fetch = responder({ promptFeedback: { blockReason: 'SAFETY' } });
    assert.equal((await leerConGemini({ instrucciones: 'X', archivo: Buffer.from('a'), mime: 'application/pdf' })).motivo, 'bloqueada_SAFETY');

    globalThis.fetch = responder({ error: { message: 'cuota' } }, 429);
    await assert.rejects(leerConGemini({ instrucciones: 'X', archivo: Buffer.from('a'), mime: 'application/pdf' }), /429/);
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});
