// Tests del correo propio de Cuadra (#14).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { arrancar } from './ayuda.js';
import { db } from '../src/core/db.js';
import { config } from '../src/config.js';
import { extraerEmail, extraerAlias } from '../src/modulos/correo/servicio.js';

const PDF = Buffer.from('%PDF-1.4\n%%EOF\n');
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);
const VCF = Buffer.from('BEGIN:VCARD\nEND:VCARD\n');

let servidor;
before(async () => { servidor = await arrancar(); });
after(async () => { await servidor.cerrar(); });

let contador = 0;
async function crearUsuario() {
  contador += 1;
  const email = `correo${contador}@prueba.es`;
  const respuesta = await fetch(`${servidor.url}/api/auth/registro`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: 'Prueba', email, password: '12345678' }),
  });
  const usuario = await respuesta.json();
  return { ...usuario, direccion: usuario.correo_cuadra };
}

async function enviar(ruta, { para, de, asunto = 'Factura', texto = '', adjuntos = [] }, cabeceras = {}) {
  const formulario = new FormData();
  formulario.append('para', para);
  formulario.append('de', de);
  formulario.append('asunto', asunto);
  formulario.append('texto', texto);
  for (const [nombre, contenido] of adjuntos) formulario.append('adjuntos', new Blob([contenido]), nombre);
  const respuesta = await fetch(`${servidor.url}/api/correo/${ruta}`, { method: 'POST', headers: cabeceras, body: formulario });
  return { estado: respuesta.status, datos: await respuesta.json() };
}

const facturasDe = async (usuarioId) => (await db.query(
  'SELECT origen FROM facturas WHERE usuario_id = $1 ORDER BY id', [usuarioId],
)).rows.map((r) => r.origen);

test('saca el email y el alias de las direcciones', () => {
  assert.equal(extraerEmail('Lucía Demo <Lucia@Ejemplo.com>'), 'lucia@ejemplo.com');
  assert.equal(extraerEmail('lucia@ejemplo.com'), 'lucia@ejemplo.com');
  assert.equal(extraerEmail('sin email'), null);
  assert.equal(extraerAlias(`otro@gmail.com, Cuadra <abc123@${config.correoDominio}>`), 'abc123');
  assert.equal(extraerAlias('nadie@gmail.com'), null);
});

test('un correo con 2 adjuntos crea 2 facturas e ignora lo que no es factura (RF-18, RF-20)', async () => {
  const u = await crearUsuario();
  const { estado, datos } = await enviar('simular', {
    para: u.direccion, de: `Yo <${u.email}>`,
    adjuntos: [['luz.pdf', PDF], ['ticket.jpg', JPG], ['firma.vcf', VCF]],
  });
  assert.equal(estado, 200);
  assert.equal(datos.aceptado, true);
  assert.equal(datos.facturas.length, 2);
  assert.deepEqual(await facturasDe(u.id), ['correo', 'correo']);
  const { rows } = await db.query('SELECT aceptado, num_facturas FROM correos_entrantes WHERE usuario_id = $1', [u.id]);
  assert.deepEqual(rows, [{ aceptado: true, num_facturas: 2 }]);
});

test('sin adjuntos se guarda el texto como PDF y se marca (RF-21)', async () => {
  const u = await crearUsuario();
  const { datos } = await enviar('simular', {
    para: u.direccion, de: u.email, asunto: 'Tu recibo de Uber', texto: 'Total: 12,40 €',
  });
  assert.equal(datos.facturas.length, 1);
  const { rows: [f] } = await db.query(
    'SELECT f.origen, o.tipo_mime, o.nombre_archivo FROM facturas f JOIN originales o ON o.id = f.original_id WHERE f.id = $1',
    [datos.facturas[0]],
  );
  assert.deepEqual(f, { origen: 'correo_texto', tipo_mime: 'application/pdf', nombre_archivo: 'Tu recibo de Uber.pdf' });
  const { rows: avisos } = await db.query("SELECT factura_id FROM avisos WHERE usuario_id = $1 AND tipo = 'texto_correo'", [u.id]);
  assert.equal(avisos[0].factura_id, datos.facturas[0]);
});

test('acepta correos de los emails de confianza (RF-19)', async () => {
  const u = await crearUsuario();
  await db.query("INSERT INTO emails_confianza (usuario_id, email) VALUES ($1, 'Facturas@Gestoria.es')", [u.id]);
  const { datos } = await enviar('simular', { para: u.direccion, de: 'facturas@gestoria.es', adjuntos: [['a.pdf', PDF]] });
  assert.equal(datos.aceptado, true);
});

test('descarta los de remitentes desconocidos y avisa (RF-19)', async () => {
  const u = await crearUsuario();
  const { datos } = await enviar('simular', { para: u.direccion, de: 'spam@raro.com', adjuntos: [['a.pdf', PDF]] });
  assert.deepEqual(datos, { aceptado: false, motivo: 'remitente_no_autorizado', facturas: [] });
  assert.deepEqual(await facturasDe(u.id), []);
  const { rows } = await db.query("SELECT datos FROM avisos WHERE usuario_id = $1 AND tipo = 'correo_no_autorizado'", [u.id]);
  assert.equal(rows[0].datos.remitente, 'spam@raro.com');
});

test('a una dirección que no existe no hace nada', async () => {
  const { datos } = await enviar('simular', { para: `noexiste@${config.correoDominio}`, de: 'a@b.es', adjuntos: [['a.pdf', PDF]] });
  assert.deepEqual(datos, { aceptado: false, motivo: 'destinatario_desconocido', facturas: [] });
});

test('el webhook de verdad exige el secreto', async () => {
  const u = await crearUsuario();
  const correo = { para: u.direccion, de: u.email, adjuntos: [['a.pdf', PDF]] };
  const anterior = config.correoWebhookSecreto;
  try {
    config.correoWebhookSecreto = '';
    assert.equal((await enviar('entrante', correo)).estado, 503);
    config.correoWebhookSecreto = 'secreto-de-prueba';
    assert.equal((await enviar('entrante', correo)).estado, 401);
    assert.equal((await enviar('entrante', correo, { 'x-cuadra-secreto': 'otro-secreto-xx' })).estado, 401);
    const bueno = await enviar('entrante', correo, { 'x-cuadra-secreto': 'secreto-de-prueba' });
    assert.equal(bueno.estado, 200);
    assert.equal(bueno.datos.facturas.length, 1);
  } finally {
    config.correoWebhookSecreto = anterior;
  }
});

// ---- Buzón de Gmail: buzon+alias@gmail.com, sin dominio propio ----

const b64 = (texto) => Buffer.from(texto).toString('base64url');
function mensajeGmail({ id, para, de, asunto = 'Factura', adjunto = null, autenticacion = 'spf=pass dkim=pass' }) {
  const parts = [{ mimeType: 'text/plain', filename: '', body: { data: b64('Te reenvío la factura') } }];
  if (adjunto) {
    parts.push({ mimeType: 'application/pdf', filename: adjunto, body: { attachmentId: `adj-${id}` }, headers: [{ name: 'Content-Disposition', value: 'attachment' }] });
    parts.push({ mimeType: 'image/png', filename: 'logo.png', body: { attachmentId: 'logo' }, headers: [{ name: 'Content-Disposition', value: 'inline' }] });
  }
  return {
    id,
    payload: {
      mimeType: 'multipart/mixed',
      headers: [
        { name: 'Delivered-To', value: para }, { name: 'To', value: para }, { name: 'From', value: de },
        { name: 'Subject', value: asunto }, { name: 'Authentication-Results', value: `mx.google.com; ${autenticacion}` },
      ],
      parts,
    },
  };
}

test('buzón de Gmail: cada usuario tiene buzon+alias@gmail.com y sus correos se convierten en facturas', async () => {
  const { usarGmail, guardarBuzon, desconectarBuzon } = await import('../src/modulos/correo/gmail.js');
  const { revisarBuzon } = await import('../src/modulos/correo/servicio.js');
  const mensajes = {};
  const archivados = [];
  usarGmail({
    tokenDeAcceso: async () => 'token',
    listarNuevos: async () => Object.keys(mensajes).filter((id) => !archivados.includes(id)),
    leerMensaje: async (_t, id) => mensajes[id],
    leerAdjunto: async (_t, _m, adjunto) => (adjunto === 'logo' ? JPG : PDF),
    archivar: async (_t, id) => { archivados.push(id); },
  });
  try {
    await guardarBuzon({ email: 'cuadra.facturas@gmail.com', refreshToken: 'r' });
    const u = await crearUsuario();
    // La dirección que ve el usuario ya es la del buzón.
    const { rows: [{ alias_correo: alias }] } = await db.query('SELECT alias_correo FROM usuarios WHERE id = $1', [u.id]);
    const yo = await (await fetch(`${servidor.url}/api/auth/registro`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Otra', email: 'buzon-otra@prueba.es', password: '12345678' }),
    })).json();
    assert.match(yo.correo_cuadra, /^cuadra\.facturas\+[0-9a-f]+@gmail\.com$/);
    assert.equal(extraerAlias(`Cuadra <cuadra.facturas+${alias}@gmail.com>`, 'cuadra.facturas@gmail.com'), alias);

    const direccion = `cuadra.facturas+${alias}@gmail.com`;
    mensajes.m1 = mensajeGmail({ id: 'm1', para: direccion, de: `Yo <${u.email}>`, adjunto: 'luz.pdf' });
    mensajes.m2 = mensajeGmail({ id: 'm2', para: direccion, de: u.email, adjunto: 'falsa.pdf', autenticacion: 'spf=fail dkim=none' });
    assert.equal(await revisarBuzon(), 2);
    assert.deepEqual(archivados, ['m1', 'm2']);

    // El de m1 crea una factura (el logo incrustado se ignora); el de m2 no pasa la verificación.
    assert.deepEqual(await facturasDe(u.id), ['correo']);
    const { rows } = await db.query('SELECT aceptado FROM correos_entrantes WHERE usuario_id = $1 ORDER BY id', [u.id]);
    assert.deepEqual(rows.map((r) => r.aceptado), [true, false]);
    assert.equal(await revisarBuzon(), 0); // ya no quedan nuevos
  } finally {
    usarGmail(null);
    await desconectarBuzon();
  }
});

test('buzón de Gmail: conectar exige el secreto', async () => {
  const anterior = { ...config.google };
  const secreto = config.correoWebhookSecreto;
  try {
    config.google.clientId = 'cliente'; config.google.clientSecret = 'secreto';
    config.correoWebhookSecreto = 'secreto-buzon-123';
    const sin = await fetch(`${servidor.url}/api/correo/gmail/conectar?secreto=otro`, { redirect: 'manual' });
    assert.equal(sin.status, 401);
    const con = await fetch(`${servidor.url}/api/correo/gmail/conectar?secreto=secreto-buzon-123`, { redirect: 'manual' });
    assert.equal(con.status, 302);
    assert.match(con.headers.get('location'), /gmail\.modify/);
  } finally {
    Object.assign(config.google, anterior);
    config.correoWebhookSecreto = secreto;
  }
});
