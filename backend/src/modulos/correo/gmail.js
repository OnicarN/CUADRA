// Buzón de Gmail de Cuadra (#14): recibir facturas por correo sin dominio propio. Responsable: Dani.
//
// Gmail entrega en el mismo buzón todo lo que va a buzon+loquesea@gmail.com. Cada usuario tiene
// su dirección buzon+<alias>@gmail.com; Cuadra revisa el buzón cada minuto (tareas.js), saca el
// alias de la dirección y pasa el correo a procesarCorreo(), igual que haría un webhook.
//
// Puesta en marcha (una vez):
//   1. Crear una cuenta de Gmail para Cuadra (p. ej. cuadra.facturas@gmail.com).
//   2. Google Cloud (el mismo proyecto del login): activar la "Gmail API" y añadir la URL de vuelta
//      URL_PUBLICA/api/correo/gmail/callback al cliente OAuth.
//   3. Abrir URL_PUBLICA/api/correo/gmail/conectar?secreto=CORREO_WEBHOOK_SECRETO y entrar con
//      esa cuenta de Gmail. Cuadra guarda el permiso en la base de datos (tabla buzon_correo).
//
// Las llamadas a Google van con fetch; los tests las cambian con usarGmail({ ... }).
import { db } from '../../core/db.js';
import { config } from '../../config.js';

export const RUTA_VUELTA = '/api/correo/gmail/callback';
const API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const TOKEN = 'https://oauth2.googleapis.com/token';
const MAXIMO_POR_VUELTA = 20;

export const gmailConfigurado = () => Boolean(config.google.clientId && config.google.clientSecret);

export function urlConsentimiento(estado) {
  const parametros = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: config.urlPublica + RUTA_VUELTA,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.modify',
    access_type: 'offline',
    prompt: 'consent',
    state: estado,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${parametros}`;
}

async function pedir(url, opciones = {}) {
  const respuesta = await fetch(url, opciones);
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new Error(`Gmail respondió ${respuesta.status}: ${datos.error?.message || datos.error_description || datos.error || ''}`);
  return datos;
}

const formulario = (datos) => ({
  method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(datos),
});

const reales = {
  async canjearCodigo(codigo) {
    const datos = await pedir(TOKEN, formulario({
      code: codigo, client_id: config.google.clientId, client_secret: config.google.clientSecret,
      redirect_uri: config.urlPublica + RUTA_VUELTA, grant_type: 'authorization_code',
    }));
    const perfil = await pedir(`${API}/profile`, { headers: { Authorization: `Bearer ${datos.access_token}` } });
    return { refreshToken: datos.refresh_token, email: String(perfil.emailAddress || '').toLowerCase() };
  },
  async tokenDeAcceso(refreshToken) {
    const datos = await pedir(TOKEN, formulario({
      refresh_token: refreshToken, client_id: config.google.clientId, client_secret: config.google.clientSecret, grant_type: 'refresh_token',
    }));
    return datos.access_token;
  },
  async listarNuevos(token) {
    const q = encodeURIComponent('in:inbox is:unread');
    const datos = await pedir(`${API}/messages?q=${q}&maxResults=${MAXIMO_POR_VUELTA}`, { headers: { Authorization: `Bearer ${token}` } });
    return (datos.messages || []).map((m) => m.id);
  },
  async leerMensaje(token, id) {
    return pedir(`${API}/messages/${id}?format=full`, { headers: { Authorization: `Bearer ${token}` } });
  },
  async leerAdjunto(token, mensajeId, adjuntoId) {
    const datos = await pedir(`${API}/messages/${mensajeId}/attachments/${adjuntoId}`, { headers: { Authorization: `Bearer ${token}` } });
    return Buffer.from(datos.data || '', 'base64url');
  },
  // Leído y fuera de la bandeja de entrada: así no se vuelve a procesar.
  async archivar(token, id) {
    await pedir(`${API}/messages/${id}/modify`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ removeLabelIds: ['UNREAD', 'INBOX'] }),
    });
  },
};

export const gmail = { ...reales };
export function usarGmail(falso) { Object.assign(gmail, falso || reales); }

// ---- El buzón guardado ----

let cache;
export async function obtenerBuzon() {
  if (cache === undefined) {
    const { rows: [buzon] } = await db.query('SELECT email, refresh_token, revisado_en FROM buzon_correo WHERE id = 1');
    cache = buzon || null;
  }
  return cache;
}

export async function guardarBuzon({ email, refreshToken }) {
  await db.query(
    `INSERT INTO buzon_correo (id, email, refresh_token) VALUES (1, $1, $2)
     ON CONFLICT (id) DO UPDATE SET email = $1, refresh_token = $2, conectado_en = now()`,
    [email, refreshToken],
  );
  cache = undefined;
}

export async function desconectarBuzon() {
  await db.query('DELETE FROM buzon_correo');
  cache = undefined;
}

// La dirección de Cuadra de un usuario: buzon+alias@gmail.com si hay buzón; si no, alias@CORREO_DOMINIO.
export async function direccionCorreo(alias) {
  const buzon = await obtenerBuzon().catch(() => null);
  if (!buzon) return `${alias}@${config.correoDominio}`;
  const [local, dominio] = buzon.email.split('@');
  return `${local}+${alias}@${dominio}`;
}

// ---- Leer un mensaje de Gmail ----

const cabecera = (mensaje, nombre) =>
  mensaje.payload?.headers?.filter((h) => h.name.toLowerCase() === nombre.toLowerCase()).map((h) => h.value) ?? [];

function partes(parte, lista = []) {
  lista.push(parte);
  for (const hija of parte?.parts || []) partes(hija, lista);
  return lista;
}

const decodificar = (datos) => Buffer.from(datos || '', 'base64url').toString('utf8');
const sinEtiquetas = (htmlTexto) => htmlTexto.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+\n/g, '\n').replace(/[ \t]{2,}/g, ' ').trim();

// Devuelve lo que necesita procesarCorreo(), más si el remitente está verificado (SPF o DKIM).
export async function convertirMensaje(token, mensaje) {
  const todas = partes(mensaje.payload || {});
  const adjuntos = [];
  for (const p of todas) {
    if (!p.filename || !p.body?.attachmentId) continue;
    const disposicion = (p.headers || []).find((h) => h.name.toLowerCase() === 'content-disposition')?.value || '';
    if (/^\s*inline/i.test(disposicion) && /^image\//.test(p.mimeType)) continue; // logos y firmas
    adjuntos.push({ nombre: p.filename, buffer: await gmail.leerAdjunto(token, mensaje.id, p.body.attachmentId) });
  }
  const textoPlano = todas.find((p) => p.mimeType === 'text/plain' && p.body?.data && !p.filename);
  const textoHtml = todas.find((p) => p.mimeType === 'text/html' && p.body?.data && !p.filename);
  const texto = textoPlano ? decodificar(textoPlano.body.data) : textoHtml ? sinEtiquetas(decodificar(textoHtml.body.data)) : '';

  // Gmail comprueba si el remitente es quien dice ser. Sin SPF ni DKIM válidos no nos fiamos del "De".
  const autenticacion = cabecera(mensaje, 'Authentication-Results').join(' ');
  return {
    // Delivered-To lleva la dirección exacta con el +alias; To, por si acaso.
    para: [...cabecera(mensaje, 'Delivered-To'), ...cabecera(mensaje, 'To'), ...cabecera(mensaje, 'Cc')].join(', '),
    de: cabecera(mensaje, 'From')[0] || '',
    asunto: cabecera(mensaje, 'Subject')[0] || '',
    texto,
    adjuntos,
    verificado: /\b(spf|dkim)=pass\b/i.test(autenticacion),
  };
}
