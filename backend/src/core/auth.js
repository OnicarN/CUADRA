// Sesión con un JWT en una cookie httpOnly.
// En las rutas privadas usa el middleware requiereSesion: deja el id del usuario
// en req.usuario.id. Todas las consultas deben filtrar por ese id (RF-09).
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { noAutorizado } from './errores.js';

const COOKIE = 'cuadra_sesion';
const DURACION_DIAS = 30;

export async function cifrarContrasena(contrasena) {
  return bcrypt.hash(contrasena, 10);
}

export async function comprobarContrasena(contrasena, hash) {
  if (!hash) return false;
  return bcrypt.compare(contrasena, hash);
}

export function iniciarSesion(res, usuarioId) {
  const token = jwt.sign({ id: usuarioId }, config.jwtSecreto, { expiresIn: `${DURACION_DIAS}d` });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.produccion,
    maxAge: DURACION_DIAS * 24 * 60 * 60 * 1000,
  });
}

export function cerrarSesion(res) {
  res.clearCookie(COOKIE);
}

export function leerSesion(req) {
  const token = req.cookies?.[COOKIE];
  if (!token) return null;
  try {
    const { id } = jwt.verify(token, config.jwtSecreto);
    return { id };
  } catch {
    return null;
  }
}

export function requiereSesion(req, _res, next) {
  const sesion = leerSesion(req);
  if (!sesion) throw noAutorizado();
  req.usuario = sesion;
  next();
}
