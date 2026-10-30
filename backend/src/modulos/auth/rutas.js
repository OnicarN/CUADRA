// Módulo auth — /api/auth
// Responsable: Ana (#23). La base (registro, entrar, salir, yo) ya funciona.
//
// POST /registro               { nombre, email, password } -> usuario          (hecho)
// POST /entrar                 { email, password } -> usuario                  (hecho)
// POST /salir                                                                  (hecho)
// GET  /yo                     -> usuario de la sesión (401 si no hay)         (hecho)
// GET  /sesion                 -> usuario de la sesión o null (web pública)    (hecho)
// PUT  /preferencias           { idioma?, tema? }                              (hecho)
// POST /verificar              { token } -> usuario          RF-07             (hecho)
// POST /reenviar-verificacion                                RF-07             (hecho)
// POST /recuperar              { email }                     RF-08             (hecho)
// POST /restablecer            { token, password } -> usuario RF-08            (hecho)
// GET  /google?volver=/ruta    redirige a Google             RF-06             (hecho)
// GET  /google/callback                                      RF-06             (hecho)
//
// /registro acepta también { idioma } para mandar el email de verificación en ese idioma.
// /entrar admite 10 intentos fallidos cada 15 minutos por IP y email (429 después).
// DELETE /cuenta               { confirmacion: email }       RF-62             (hecho, #27)
import crypto from 'node:crypto';
import { Router } from 'express';
import { db } from '../../core/db.js';
import { config } from '../../config.js';
import { cifrarContrasena, comprobarContrasena, iniciarSesion, cerrarSesion, requiereSesion, leerSesion } from '../../core/auth.js';
import { peticionIncorrecta, noAutorizado, conflicto, ErrorHttp } from '../../core/errores.js';
import { emailValido } from '../../core/validacion.js';
import { DIAS_PRUEBA } from '../suscripcion/planes.js';
import { crearToken, consumirToken, TIPOS_TOKEN } from './tokens.js';
import { enviarEmailVerificacion, enviarEmailRecuperacion } from './correos.js';
import { crearLimite } from './limite.js';
import { googleConfigurado, urlConsentimiento, datosDeGoogle } from './google.js';
import { rutaInterna } from './utilidades.js';

const rutas = Router();

const MINIMO_CONTRASENA = 8;
const limiteEntrar = crearLimite({ intentos: 10, minutos: 15 });
const limiteEmails = crearLimite({ intentos: 5, minutos: 15 });
const COOKIE_GOOGLE = 'cuadra_google';

export async function obtenerUsuario(id) {
  const { rows } = await db.query(
    `SELECT u.id, u.nombre, u.email, u.email_verificado, u.idioma, u.tema, u.alias_correo,
            (p.usuario_id IS NOT NULL) AS perfil_completo
       FROM usuarios u LEFT JOIN perfiles_fiscales p ON p.usuario_id = u.id
      WHERE u.id = $1`,
    [id],
  );
  const usuario = rows[0];
  if (!usuario) return null;
  return { ...usuario, correo_cuadra: `${usuario.alias_correo}@${config.correoDominio}` };
}

// Crea el usuario con su suscripción de prueba y sus ajustes. La usa también el login con Google.
export async function crearUsuario({ nombre, email, passwordHash = null, googleId = null, verificado = false }) {
  return db.transaccion(async (tx) => {
    const alias = crypto.randomBytes(5).toString('hex');
    const { rows } = await tx.query(
      `INSERT INTO usuarios (nombre, email, password_hash, google_id, email_verificado, alias_correo)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [nombre, email, passwordHash, googleId, verificado, alias],
    );
    const id = rows[0].id;
    await tx.query(
      `INSERT INTO suscripciones (usuario_id, plan, estado, prueba_hasta)
       VALUES ($1, 'gratis', 'prueba', now() + make_interval(days => $2))`,
      [id, DIAS_PRUEBA],
    );
    await tx.query('INSERT INTO ajustes (usuario_id) VALUES ($1)', [id]);
    return id;
  });
}

rutas.post('/registro', async (req, res) => {
  const nombre = String(req.body.nombre || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!nombre) throw peticionIncorrecta('Escribe tu nombre');
  if (!emailValido(email)) throw peticionIncorrecta('El email no es válido');
  if (password.length < MINIMO_CONTRASENA) throw peticionIncorrecta('La contraseña tiene que tener al menos 8 caracteres');

  const existe = await db.query('SELECT 1 FROM usuarios WHERE email = $1', [email]);
  if (existe.rows.length) throw conflicto('Ya hay una cuenta con ese email');

  const id = await crearUsuario({ nombre, email, passwordHash: await cifrarContrasena(password) });
  if (req.body.idioma === 'en') await db.query("UPDATE usuarios SET idioma = 'en' WHERE id = $1", [id]);
  await mandarVerificacion(id);
  iniciarSesion(res, id);
  res.status(201).json(await obtenerUsuario(id));
});

// RF-07. Si el email no sale, la cuenta se crea igual: se puede reenviar desde la pantalla de verificar.
async function mandarVerificacion(usuarioId) {
  try {
    const { rows } = await db.query('SELECT nombre, email, idioma FROM usuarios WHERE id = $1', [usuarioId]);
    await enviarEmailVerificacion(rows[0], await crearToken(usuarioId, TIPOS_TOKEN.VERIFICAR_EMAIL));
  } catch (error) {
    console.error('No se pudo enviar el email de verificación:', error.message);
  }
}

rutas.post('/entrar', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const clave = `${req.ip}|${email}`;
  limiteEntrar.comprobar(clave);
  const { rows } = await db.query('SELECT id, password_hash FROM usuarios WHERE email = $1', [email]);
  const ok = rows[0] && (await comprobarContrasena(String(req.body.password || ''), rows[0].password_hash));
  if (!ok) {
    limiteEntrar.fallo(clave);
    throw noAutorizado('El email o la contraseña no son correctos');
  }
  limiteEntrar.limpiar(clave);
  iniciarSesion(res, rows[0].id);
  res.json(await obtenerUsuario(rows[0].id));
});

rutas.post('/salir', (_req, res) => {
  cerrarSesion(res);
  res.status(204).end();
});

rutas.get('/yo', requiereSesion, async (req, res) => {
  const usuario = await obtenerUsuario(req.usuario.id);
  if (!usuario) throw noAutorizado();
  res.json(usuario);
});

rutas.get('/sesion', async (req, res) => {
  const sesion = leerSesion(req);
  res.json(sesion ? await obtenerUsuario(sesion.id) : null);
});

rutas.put('/preferencias', requiereSesion, async (req, res) => {
  const { idioma, tema } = req.body;
  if (idioma && !['es', 'en'].includes(idioma)) throw peticionIncorrecta('Idioma no válido');
  if (tema && !['sistema', 'claro', 'oscuro'].includes(tema)) throw peticionIncorrecta('Tema no válido');
  await db.query(
    'UPDATE usuarios SET idioma = COALESCE($2, idioma), tema = COALESCE($3, tema) WHERE id = $1',
    [req.usuario.id, idioma || null, tema || null],
  );
  res.json(await obtenerUsuario(req.usuario.id));
});

const enlaceNoValido = () => peticionIncorrecta('El enlace no es válido o ha caducado', { codigo: 'enlace_no_valido' });

// RF-07. El enlace del email abre /verificar?token=..., que llama aquí. Deja la sesión iniciada.
rutas.post('/verificar', async (req, res) => {
  const usuarioId = await consumirToken(req.body.token, TIPOS_TOKEN.VERIFICAR_EMAIL);
  if (!usuarioId) throw enlaceNoValido();
  await db.query('UPDATE usuarios SET email_verificado = true WHERE id = $1', [usuarioId]);
  iniciarSesion(res, usuarioId);
  res.json(await obtenerUsuario(usuarioId));
});

rutas.post('/reenviar-verificacion', requiereSesion, async (req, res) => {
  const usuario = await obtenerUsuario(req.usuario.id);
  if (!usuario) throw noAutorizado();
  if (usuario.email_verificado) throw peticionIncorrecta('Tu email ya está confirmado', { codigo: 'ya_verificado' });
  const clave = `reenviar|${usuario.id}`;
  limiteEmails.comprobar(clave);
  limiteEmails.fallo(clave);
  await mandarVerificacion(usuario.id);
  res.json({ ok: true });
});

// RF-08. Responde lo mismo exista o no la cuenta, para no desvelar qué emails están registrados.
rutas.post('/recuperar', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!emailValido(email)) throw peticionIncorrecta('El email no es válido');
  const clave = `recuperar|${req.ip}|${email}`;
  limiteEmails.comprobar(clave);
  limiteEmails.fallo(clave);
  const { rows } = await db.query('SELECT id, nombre, email, idioma FROM usuarios WHERE email = $1', [email]);
  if (rows[0]) {
    try {
      await enviarEmailRecuperacion(rows[0], await crearToken(rows[0].id, TIPOS_TOKEN.RECUPERAR_CONTRASENA));
    } catch (error) {
      console.error('No se pudo enviar el email de recuperación:', error.message);
    }
  }
  res.json({ ok: true });
});

rutas.post('/restablecer', async (req, res) => {
  const password = String(req.body.password || '');
  // Se comprueba antes de gastar el token, para poder corregirla con el mismo enlace.
  if (password.length < MINIMO_CONTRASENA) throw peticionIncorrecta('La contraseña tiene que tener al menos 8 caracteres');
  const usuarioId = await consumirToken(req.body.token, TIPOS_TOKEN.RECUPERAR_CONTRASENA);
  if (!usuarioId) throw enlaceNoValido();
  // Ha demostrado que el email es suyo, así que también queda verificado.
  await db.query(
    'UPDATE usuarios SET password_hash = $2, email_verificado = true WHERE id = $1',
    [usuarioId, await cifrarContrasena(password)],
  );
  iniciarSesion(res, usuarioId);
  res.json(await obtenerUsuario(usuarioId));
});

// RF-06. Busca la cuenta por google_id; si no, por email (solo si Google lo da por verificado);
// si no existe, la crea ya verificada. Devuelve { id, nuevo }.
export async function entrarConGoogle({ googleId, email, emailVerificado, nombre }) {
  if (!googleId || !emailValido(email)) throw peticionIncorrecta('Google no ha devuelto un email válido');
  const porGoogle = await db.query('SELECT id FROM usuarios WHERE google_id = $1', [googleId]);
  if (porGoogle.rows[0]) return { id: porGoogle.rows[0].id, nuevo: false };

  const porEmail = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);
  if (porEmail.rows[0]) {
    if (!emailVerificado) throw conflicto('Ya hay una cuenta con ese email. Entra con tu contraseña.');
    await db.query('UPDATE usuarios SET google_id = $2, email_verificado = true WHERE id = $1', [porEmail.rows[0].id, googleId]);
    return { id: porEmail.rows[0].id, nuevo: false };
  }

  const id = await crearUsuario({ nombre: nombre || email.split('@')[0], email, googleId, verificado: emailVerificado });
  if (!emailVerificado) await mandarVerificacion(id);
  return { id, nuevo: true };
}

rutas.get('/google', async (req, res) => {
  if (!googleConfigurado()) throw new ErrorHttp(503, 'El acceso con Google no está configurado', { codigo: 'google_no_configurado' });
  const estado = crypto.randomBytes(16).toString('hex');
  res.cookie(COOKIE_GOOGLE, JSON.stringify({ estado, volver: rutaInterna(req.query.volver) }), {
    httpOnly: true, sameSite: 'lax', secure: config.produccion, maxAge: 10 * 60 * 1000,
  });
  res.redirect(await urlConsentimiento(estado));
});

rutas.get('/google/callback', async (req, res) => {
  let guardado = {};
  try { guardado = JSON.parse(req.cookies?.[COOKIE_GOOGLE] || '{}'); } catch { /* cookie rota */ }
  res.clearCookie(COOKIE_GOOGLE);

  const { code, state } = req.query;
  if (!googleConfigurado() || !code || !guardado.estado || state !== guardado.estado) {
    return res.redirect('/entrar?error=google');
  }
  try {
    const { id, nuevo } = await entrarConGoogle(await datosDeGoogle(String(code)));
    iniciarSesion(res, id);
    res.redirect(nuevo ? '/app/perfil?nuevo=1' : rutaInterna(guardado.volver));
  } catch (error) {
    if (!(error instanceof ErrorHttp)) console.error('Error al entrar con Google:', error.message);
    res.redirect(`/entrar?error=${error.estado === 409 ? 'google_email' : 'google'}`);
  }
});
// RF-62. Elimina la cuenta. Para confirmar hay que escribir el email de la cuenta. Antes se cancela
// la suscripción de Stripe, si la hay, para que no se siga cobrando. Después basta con borrar el
// usuario: todas las tablas cuelgan de usuarios con ON DELETE CASCADE (facturas, originales, avisos,
// perfil, suscripción, Google Calendar…).
// Pendiente legal: Hacienda puede pedir los justificantes durante años. Por eso Ajustes ofrece antes
// descargar la copia de todo (GET /api/exportacion/todo).
rutas.delete('/cuenta', requiereSesion, async (req, res) => {
  const { rows: [usuario] } = await db.query(
    `SELECT u.id, u.email, s.stripe_subscription_id
       FROM usuarios u LEFT JOIN suscripciones s ON s.usuario_id = u.id WHERE u.id = $1`,
    [req.usuario.id],
  );
  if (!usuario) throw noAutorizado();
  const confirmacion = String(req.body?.confirmacion ?? '').trim().toLowerCase();
  if (confirmacion !== usuario.email.toLowerCase()) {
    throw peticionIncorrecta('Escribe el email de tu cuenta para confirmar', { codigo: 'confirmacion' });
  }
  if (usuario.stripe_subscription_id) await cancelarSuscripcionStripe(usuario.stripe_subscription_id);
  await db.query('DELETE FROM usuarios WHERE id = $1', [usuario.id]);
  cerrarSesion(res);
  res.status(204).end();
});

async function cancelarSuscripcionStripe(suscripcionId) {
  if (!config.stripe.secretKey) {
    console.warn(`Sin STRIPE_SECRET_KEY: la suscripción ${suscripcionId} no se ha cancelado en Stripe.`);
    return;
  }
  const { default: Stripe } = await import('stripe');
  try {
    await new Stripe(config.stripe.secretKey).subscriptions.cancel(suscripcionId);
  } catch (error) {
    if (error.code === 'resource_missing') return; // ya no existe en Stripe: nada que cancelar
    // Mejor no borrar la cuenta que dejar a alguien sin cuenta y con la suscripción cobrándose.
    console.error('No se pudo cancelar la suscripción de Stripe:', error.message);
    throw new ErrorHttp(502, 'No hemos podido cancelar tu suscripción. Inténtalo de nuevo en unos minutos.');
  }
}

export default rutas;
