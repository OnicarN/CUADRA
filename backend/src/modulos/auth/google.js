// Inicio de sesión con Google (RF-06) con OAuth 2.0. Usa el mismo cliente OAuth que
// Google Calendar (Dani, #16): GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env.
// En la consola de Google hay que autorizar la URL de vuelta URL_PUBLICA/api/auth/google/callback.
// Responsable: Ana (#23).
import { config } from '../../config.js';

export const RUTA_VUELTA = '/api/auth/google/callback';

export function googleConfigurado() {
  return Boolean(config.google.clientId && config.google.clientSecret);
}

// googleapis es grande: se carga solo cuando alguien entra con Google.
async function cliente() {
  const { google } = await import('googleapis');
  return new google.auth.OAuth2(config.google.clientId, config.google.clientSecret, config.urlPublica + RUTA_VUELTA);
}

export async function urlConsentimiento(estado) {
  return (await cliente()).generateAuthUrl({
    scope: ['openid', 'email', 'profile'],
    state: estado,
    prompt: 'select_account',
  });
}

// Cambia el código que devuelve Google por los datos de la persona.
export async function datosDeGoogle(codigo) {
  const oauth = await cliente();
  const { tokens } = await oauth.getToken(codigo);
  const ticket = await oauth.verifyIdToken({ idToken: tokens.id_token, audience: config.google.clientId });
  const datos = ticket.getPayload();
  return {
    googleId: datos.sub,
    email: String(datos.email || '').toLowerCase(),
    emailVerificado: datos.email_verified === true,
    nombre: datos.name || datos.given_name || '',
  };
}
