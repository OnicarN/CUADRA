// Módulo calendario — /api/calendario
// Responsable: Dani (#16). Solo para planes con la función 'calendario'. La lógica está en servicio.js.
//
// GET    /                     estado de la conexión y ajustes                      RF-54, RF-56
// GET    /conectar             redirige al consentimiento de Google                 RF-54
// GET    /callback             vuelta de Google, guarda el refresh_token            RF-54
// DELETE /                     desconectar                                          RF-54
// PUT    /ajustes              { fechas_fiscales, dias_antelacion }                 RF-56
// GET    /sugerencias?factura=ID   eventos sugeridos para una factura               RF-55
// POST   /sugerencias/:facturaId/:eventoId  { aceptar: true|false }                RF-55
// POST   /simular              solo fuera de producción: calendario de prueba sin Google
import crypto from 'node:crypto';
import { Router } from 'express';
import { config } from '../../config.js';
import { requiereSesion } from '../../core/auth.js';
import { peticionIncorrecta, prohibido, noEncontrado, ErrorHttp } from '../../core/errores.js';
import { tieneFuncion } from '../suscripcion/uso.js';
import { google, calendarioConfigurado, urlConsentimiento } from './google.js';
import {
  obtenerConexion, guardarConexion, desconectar, sincronizar, guardarAjustes,
  listarSugerencias, responderSugerencia, simularConexion, FECHAS_FISCALES, MAX_DIAS_ANTELACION,
} from './servicio.js';

const COOKIE_ESTADO = 'cuadra_calendario';
const PANTALLA = '/app/calendario';
const rutas = Router();
rutas.use(requiereSesion);

const idDe = (valor) => {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) throw peticionIncorrecta('Identificador no válido');
  return id;
};

rutas.get('/', async (req, res) => {
  const conexion = await obtenerConexion(req.usuario.id);
  res.json({
    disponible: await tieneFuncion(req.usuario.id, 'calendario'),
    configurado: calendarioConfigurado(),
    conectado: Boolean(conexion),
    email_google: conexion?.email_google ?? null,
    fechas_fiscales: conexion?.fechas_fiscales ?? [],
    dias_antelacion: conexion?.dias_antelacion ?? 7,
    sincronizado_en: conexion?.sincronizado_en ?? null,
    max_dias_antelacion: MAX_DIAS_ANTELACION,
    simulable: !config.produccion,
  });
});

// Se llega con un enlace normal (no con fetch): los errores vuelven a la pantalla.
rutas.get('/conectar', async (req, res) => {
  if (!(await tieneFuncion(req.usuario.id, 'calendario'))) return res.redirect(`${PANTALLA}?error=plan`);
  if (!calendarioConfigurado()) return res.redirect(`${PANTALLA}?error=configuracion`);
  const estado = crypto.randomBytes(16).toString('hex');
  res.cookie(COOKIE_ESTADO, estado, {
    httpOnly: true, sameSite: 'lax', secure: config.produccion, maxAge: 10 * 60 * 1000,
  });
  res.redirect(urlConsentimiento(estado));
});

rutas.get('/callback', async (req, res) => {
  const guardado = req.cookies?.[COOKIE_ESTADO];
  res.clearCookie(COOKIE_ESTADO);
  const { code, state, error } = req.query;
  if (error) return res.redirect(`${PANTALLA}?error=cancelado`);
  if (!code || !guardado || state !== guardado) return res.redirect(`${PANTALLA}?error=google`);
  try {
    const datos = await google.canjearCodigo(String(code));
    if (!datos.refreshToken) throw new Error('Google no ha devuelto refresh_token');
    await guardarConexion(req.usuario.id, datos);
  } catch (e) {
    console.error('Error al conectar Google Calendar:', e.message);
    return res.redirect(`${PANTALLA}?error=google`);
  }
  // La primera sincronización va por detrás para no hacer esperar.
  sincronizar(req.usuario.id).catch((e) => console.error('Error al sincronizar el calendario:', e.message));
  res.redirect(`${PANTALLA}?conectado=1`);
});

rutas.delete('/', async (req, res) => {
  await desconectar(req.usuario.id);
  res.status(204).end();
});

rutas.put('/ajustes', async (req, res) => {
  const fechas = req.body?.fechas_fiscales;
  const dias = Number(req.body?.dias_antelacion);
  if (!Array.isArray(fechas) || fechas.some((f) => !FECHAS_FISCALES.includes(f))) {
    throw peticionIncorrecta(`fechas_fiscales tiene que ser una lista de: ${FECHAS_FISCALES.join(', ')}`);
  }
  if (!Number.isInteger(dias) || dias < 0 || dias > MAX_DIAS_ANTELACION) {
    throw peticionIncorrecta(`Los días de antelación van de 0 a ${MAX_DIAS_ANTELACION}`);
  }
  if (!(await tieneFuncion(req.usuario.id, 'calendario'))) throw prohibido('Tu plan no incluye Google Calendar');
  let guardado;
  try {
    guardado = await guardarAjustes(req.usuario.id, { fechasFiscales: [...new Set(fechas)], diasAntelacion: dias });
  } catch (e) {
    console.error('Error al apuntar las fechas en Google Calendar:', e.message);
    throw new ErrorHttp(502, 'Google Calendar no ha respondido. Inténtalo de nuevo en un rato.');
  }
  if (!guardado) throw peticionIncorrecta('Conecta primero tu Google Calendar');
  res.json({ ok: true });
});

rutas.get('/sugerencias', async (req, res) => {
  res.json(await listarSugerencias(req.usuario.id, idDe(req.query.factura)));
});

rutas.post('/sugerencias/:facturaId/:eventoId', async (req, res) => {
  if (typeof req.body?.aceptar !== 'boolean') throw peticionIncorrecta('Falta aceptar (true o false)');
  const hecho = await responderSugerencia(req.usuario.id, idDe(req.params.facturaId), idDe(req.params.eventoId), req.body.aceptar);
  if (!hecho) throw noEncontrado('Sugerencia no encontrada');
  res.json({ ok: true });
});

rutas.post('/simular', async (req, res) => {
  if (config.produccion) throw noEncontrado('Ruta no encontrada');
  if (!(await tieneFuncion(req.usuario.id, 'calendario'))) throw prohibido('Tu plan no incluye Google Calendar');
  await simularConexion(req.usuario.id);
  res.json({ ok: true });
});

export default rutas;
