// Módulo correo — /api/correo
// Responsable: Dani (#14). RF-18 a RF-21. La lógica está en servicio.js.
//
// POST /entrante   webhook del proveedor de correo entrante. Cabecera x-cuadra-secreto = CORREO_WEBHOOK_SECRETO.
//                  multipart/form-data: para, de, asunto, texto y los archivos en "adjuntos".
//                  -> 200 { aceptado, motivo?, facturas: [ids] }
// POST /simular    igual, sin secreto, solo fuera de producción: para probar en local sin proveedor.
//
// GET  /gmail/conectar?secreto=CORREO_WEBHOOK_SECRETO   conecta el buzón de Gmail de Cuadra (una vez)
// GET  /gmail/callback                                  vuelta de Google: guarda el permiso
// GET  /gmail/estado?secreto=...                        { conectado, email, revisado_en }
//
// Opción sin dominio (la que usamos): un Gmail de Cuadra y direcciones buzon+alias@gmail.com.
// Cuadra lo revisa cada minuto. Cómo ponerlo en marcha: ver gmail.js.
//
// Opción con dominio propio (Cloudflare Email Routing, gratis):
//   1. El dominio de CORREO_DOMINIO en Cloudflare, con Email Routing activado.
//   2. Un Email Worker con el código de cloudflare-worker.js (en esta carpeta), con las variables
//      CUADRA_URL (la URL de Render) y CUADRA_SECRETO (el mismo valor que CORREO_WEBHOOK_SECRETO).
//   3. En Email Routing, regla "catch-all" del dominio -> "Send to a Worker" -> ese worker.
// El worker lee el correo, quita las imágenes incrustadas (logos, firmas) y lo manda aquí.
import crypto from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import { config } from '../../config.js';
import { ErrorHttp, noEncontrado } from '../../core/errores.js';
import { TAMANO_MAXIMO } from '../subida/servicio.js';
import { procesarCorreo } from './servicio.js';
import { gmail, gmailConfigurado, urlConsentimiento, guardarBuzon, obtenerBuzon } from './gmail.js';

const COOKIE_GMAIL = 'cuadra_buzon';

const recibir = multer({ storage: multer.memoryStorage(), limits: { fileSize: TAMANO_MAXIMO, files: 20 } });
const rutas = Router();

function secretoCorrecto(recibido) {
  const esperado = Buffer.from(config.correoWebhookSecreto);
  const dado = Buffer.from(String(recibido || ''));
  return esperado.length > 0 && esperado.length === dado.length && crypto.timingSafeEqual(esperado, dado);
}

async function atender(req, res) {
  const adjuntos = (req.files || []).map((archivo) => ({
    // multer entrega el nombre en latin1; lo pasamos a UTF-8.
    nombre: Buffer.from(archivo.originalname, 'latin1').toString('utf8'),
    buffer: archivo.buffer,
  }));
  const { para, de, asunto, texto } = req.body;
  res.json(await procesarCorreo({ para, de, asunto, texto, adjuntos }));
}

rutas.post('/entrante', (req, _res, next) => {
  if (!config.correoWebhookSecreto) throw new ErrorHttp(503, 'El correo entrante no está configurado');
  if (!secretoCorrecto(req.get('x-cuadra-secreto'))) throw new ErrorHttp(401, 'Secreto no válido');
  next();
}, recibir.array('adjuntos', 20), atender);

rutas.post('/simular', (_req, _res, next) => {
  if (config.produccion) throw noEncontrado('Ruta no encontrada');
  next();
}, recibir.array('adjuntos', 20), atender);

// ---- Buzón de Gmail (lo conecta una vez quien administra Cuadra) ----

rutas.get('/gmail/conectar', (req, res) => {
  if (!gmailConfigurado()) throw new ErrorHttp(503, 'Faltan GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET');
  if (!secretoCorrecto(req.query.secreto)) throw new ErrorHttp(401, 'Secreto no válido');
  const estado = crypto.randomBytes(16).toString('hex');
  res.cookie(COOKIE_GMAIL, estado, { httpOnly: true, sameSite: 'lax', secure: config.produccion, maxAge: 10 * 60 * 1000 });
  res.redirect(urlConsentimiento(estado));
});

rutas.get('/gmail/callback', async (req, res) => {
  const guardado = req.cookies?.[COOKIE_GMAIL];
  res.clearCookie(COOKIE_GMAIL);
  const { code, state } = req.query;
  if (!code || !guardado || state !== guardado) throw new ErrorHttp(400, 'No se ha podido conectar el buzón. Vuelve a empezar.');
  const datos = await gmail.canjearCodigo(String(code));
  if (!datos.refreshToken || !datos.email) throw new ErrorHttp(502, 'Google no ha devuelto el permiso. Vuelve a empezar.');
  await guardarBuzon(datos);
  const [local, dominio] = datos.email.split('@');
  res.type('text/plain; charset=utf-8').send(
    `Buzón conectado: ${datos.email}\n\nCada usuario recibe ahora sus facturas en ${local}+<su alias>@${dominio}.\nYa puedes cerrar esta pestaña.`,
  );
});

rutas.get('/gmail/estado', async (req, res) => {
  if (!secretoCorrecto(req.query.secreto)) throw new ErrorHttp(401, 'Secreto no válido');
  const buzon = await obtenerBuzon();
  res.json({ conectado: Boolean(buzon), email: buzon?.email ?? null, revisado_en: buzon?.revisado_en ?? null });
});

export default rutas;
