// Tokens de un solo uso para verificar el email (RF-07) y recuperar la contraseña (RF-08).
// Al usuario le llega el token en claro por email; en la base de datos solo se guarda su hash.
// Responsable: Ana (#23).
import crypto from 'node:crypto';
import { db } from '../../core/db.js';

export const TIPOS_TOKEN = Object.freeze({
  VERIFICAR_EMAIL: 'verificar_email',
  RECUPERAR_CONTRASENA: 'recuperar_contrasena',
});

const HORAS_VALIDEZ = { verificar_email: 24, recuperar_contrasena: 1 };

const hashDe = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

// Crea un token nuevo y anula los anteriores del mismo tipo que aún no se habían usado.
export async function crearToken(usuarioId, tipo) {
  const token = crypto.randomBytes(32).toString('hex');
  await db.transaccion(async (tx) => {
    await tx.query(
      'UPDATE tokens SET usado_en = now() WHERE usuario_id = $1 AND tipo = $2 AND usado_en IS NULL',
      [usuarioId, tipo],
    );
    await tx.query(
      `INSERT INTO tokens (usuario_id, tipo, token_hash, expira_en)
       VALUES ($1, $2, $3, now() + make_interval(hours => $4))`,
      [usuarioId, tipo, hashDe(token), HORAS_VALIDEZ[tipo]],
    );
  });
  return token;
}

// Marca el token como usado y devuelve el id del usuario, o null si no existe, ya se usó o ha caducado.
export async function consumirToken(token, tipo) {
  if (!token || typeof token !== 'string') return null;
  const { rows } = await db.query(
    `UPDATE tokens SET usado_en = now()
      WHERE token_hash = $1 AND tipo = $2 AND usado_en IS NULL AND expira_en > now()
      RETURNING usuario_id`,
    [hashDe(token), tipo],
  );
  return rows[0]?.usuario_id ?? null;
}
