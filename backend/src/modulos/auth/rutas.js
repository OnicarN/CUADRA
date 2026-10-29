// Módulo auth — /api/auth
// Responsable: Ana (#23). La base (registro, entrar, salir, yo) ya funciona.
//
// POST /registro               { nombre, email, password } -> usuario          (hecho)
// POST /entrar                 { email, password } -> usuario                  (hecho)
// POST /salir                                                                  (hecho)
// GET  /yo                     -> usuario de la sesión (401 si no hay)         (hecho)
// GET  /sesion                 -> usuario de la sesión o null (web pública)    (hecho)
// PUT  /preferencias           { idioma?, tema? }                              (hecho)
// POST /verificar              { token }                     RF-07             (pendiente)
// POST /reenviar-verificacion                                RF-07             (pendiente)
// POST /recuperar              { email }                     RF-08             (pendiente)
// POST /restablecer            { token, password }           RF-08             (pendiente)
// GET  /google                 redirige a Google             RF-06             (pendiente)
// GET  /google/callback                                      RF-06             (pendiente)
// DELETE /cuenta               { confirmacion }              RF-62             (pendiente, #27)
import crypto from 'node:crypto';
import { Router } from 'express';
import { db } from '../../core/db.js';
import { config } from '../../config.js';
import { cifrarContrasena, comprobarContrasena, iniciarSesion, cerrarSesion, requiereSesion, leerSesion } from '../../core/auth.js';
import { peticionIncorrecta, noAutorizado, conflicto, pendiente } from '../../core/errores.js';
import { emailValido } from '../../core/validacion.js';
import { DIAS_PRUEBA } from '../suscripcion/planes.js';

const rutas = Router();

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
  if (password.length < 8) throw peticionIncorrecta('La contraseña tiene que tener al menos 8 caracteres');

  const existe = await db.query('SELECT 1 FROM usuarios WHERE email = $1', [email]);
  if (existe.rows.length) throw conflicto('Ya hay una cuenta con ese email');

  const id = await crearUsuario({ nombre, email, passwordHash: await cifrarContrasena(password) });
  // TODO Ana (#23): enviar el email de verificación (RF-07).
  iniciarSesion(res, id);
  res.status(201).json(await obtenerUsuario(id));
});

rutas.post('/entrar', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const { rows } = await db.query('SELECT id, password_hash FROM usuarios WHERE email = $1', [email]);
  const ok = rows[0] && (await comprobarContrasena(String(req.body.password || ''), rows[0].password_hash));
  if (!ok) throw noAutorizado('El email o la contraseña no son correctos');
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

rutas.post('/verificar', () => { throw pendiente('#23'); });
rutas.post('/reenviar-verificacion', requiereSesion, () => { throw pendiente('#23'); });
rutas.post('/recuperar', () => { throw pendiente('#23'); });
rutas.post('/restablecer', () => { throw pendiente('#23'); });
rutas.get('/google', () => { throw pendiente('#23'); });
rutas.get('/google/callback', () => { throw pendiente('#23'); });
rutas.delete('/cuenta', requiereSesion, () => { throw pendiente('#27'); });

export default rutas;
