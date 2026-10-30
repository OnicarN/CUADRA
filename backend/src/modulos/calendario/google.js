// Llamadas a Google (OAuth y Calendar API) con fetch. Responsable: Dani (#16).
// Usa el mismo cliente OAuth que el login con Google de Ana (#23): GOOGLE_CLIENT_ID y
// GOOGLE_CLIENT_SECRET. En la consola de Google hay que autorizar también la URL de vuelta
// URL_PUBLICA/api/calendario/callback y activar la "Google Calendar API".
//
// Los tests cambian estas llamadas por unas falsas con usarGoogle({ ... }).
import { config } from '../../config.js';

export const RUTA_VUELTA = '/api/calendario/callback';
const AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN = 'https://oauth2.googleapis.com/token';
const CALENDARIO = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

export function calendarioConfigurado() {
  return Boolean(config.google.clientId && config.google.clientSecret);
}

export function urlConsentimiento(estado) {
  const parametros = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: config.urlPublica + RUTA_VUELTA,
    response_type: 'code',
    scope: 'openid email https://www.googleapis.com/auth/calendar.events',
    access_type: 'offline',
    prompt: 'consent', // así Google devuelve siempre el refresh_token
    include_granted_scopes: 'true',
    state: estado,
  });
  return `${AUTH}?${parametros}`;
}

async function pedir(url, opciones = {}) {
  const respuesta = await fetch(url, opciones);
  if (respuesta.status === 204) return null;
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const error = new Error(`Google respondió ${respuesta.status}: ${datos.error?.message || datos.error_description || datos.error || ''}`);
    error.estado = respuesta.status;
    throw error;
  }
  return datos;
}

const formulario = (datos) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(datos),
});

const reales = {
  // Cambia el código de la vuelta por { refreshToken, email }.
  async canjearCodigo(codigo) {
    const datos = await pedir(TOKEN, formulario({
      code: codigo,
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      redirect_uri: config.urlPublica + RUTA_VUELTA,
      grant_type: 'authorization_code',
    }));
    // El id_token llega directamente de Google por HTTPS: basta con leerlo.
    let email = null;
    try {
      email = JSON.parse(Buffer.from(datos.id_token.split('.')[1], 'base64url').toString()).email || null;
    } catch { /* sin id_token */ }
    return { refreshToken: datos.refresh_token, email };
  },

  async tokenDeAcceso(refreshToken) {
    const datos = await pedir(TOKEN, formulario({
      refresh_token: refreshToken,
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      grant_type: 'refresh_token',
    }));
    return datos.access_token;
  },

  async revocar(refreshToken) {
    await pedir(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, { method: 'POST' });
  },

  // Eventos entre dos fechas (ISO), con los repetidos ya desplegados.
  async listarEventos(token, desde, hasta) {
    const eventos = [];
    let pagina = '';
    do {
      const parametros = new URLSearchParams({
        timeMin: desde, timeMax: hasta, singleEvents: 'true', orderBy: 'startTime', maxResults: '250',
      });
      if (pagina) parametros.set('pageToken', pagina);
      const datos = await pedir(`${CALENDARIO}?${parametros}`, { headers: { Authorization: `Bearer ${token}` } });
      eventos.push(...(datos.items || []));
      pagina = datos.nextPageToken || '';
    } while (pagina);
    return eventos;
  },

  // Crea el evento con nuestro id o, si ya existe, lo actualiza.
  async guardarEvento(token, evento) {
    const opciones = (metodo) => ({
      method: metodo,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(evento),
    });
    try {
      await pedir(CALENDARIO, opciones('POST'));
    } catch (error) {
      if (error.estado !== 409) throw error;
      await pedir(`${CALENDARIO}/${evento.id}`, opciones('PUT'));
    }
  },

  async borrarEvento(token, id) {
    try {
      await pedir(`${CALENDARIO}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    } catch (error) {
      if (![404, 410].includes(error.estado)) throw error; // ya no estaba
    }
  },
};

export const google = { ...reales };

export function usarGoogle(falso) {
  Object.assign(google, falso || reales);
}
