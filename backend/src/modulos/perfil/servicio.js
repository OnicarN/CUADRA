// Perfil fiscal del usuario. Lo usan otros módulos:
//   const perfil = await obtenerPerfil(usuarioId);   // null si aún no lo ha rellenado (RF-10)
// Responsable: Ana (#24).
import { db } from '../../core/db.js';

export async function obtenerPerfil(usuarioId) {
  const { rows } = await db.query('SELECT * FROM perfiles_fiscales WHERE usuario_id = $1', [usuarioId]);
  return rows[0] || null;
}

export async function obtenerAjustes(usuarioId) {
  const { rows } = await db.query('SELECT * FROM ajustes WHERE usuario_id = $1', [usuarioId]);
  return rows[0];
}
