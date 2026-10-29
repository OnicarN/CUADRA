// Perfil fiscal del usuario. Lo usan otros módulos:
//   const perfil = await obtenerPerfil(usuarioId);   // null si aún no lo ha rellenado (RF-10)
// Responsable: Ana (#24).
import { db } from '../../core/db.js';
import { TIPOS_AVISO } from '../../core/avisos.js';
import { peticionIncorrecta, conflicto, noEncontrado } from '../../core/errores.js';
import { nifValido, normalizarNif, emailValido } from '../../core/validacion.js';

// Regímenes de IVA que el usuario puede elegir (RF-11).
export const REGIMENES_IVA = ['general', 'simplificado', 'recargo_equivalencia', 'exento'];

// Actividades y el régimen de IVA que se propone para cada una (RF-11). Las claves son
// las mismas que usa categorias.actividades en la base de datos.
export const ACTIVIDADES = [
  { clave: 'diseno', regimen_iva: 'general' },
  { clave: 'consultoria', regimen_iva: 'general' },
  { clave: 'abogacia', regimen_iva: 'general' },
  { clave: 'arquitectura', regimen_iva: 'general' },
  { clave: 'programacion', regimen_iva: 'general' },
  { clave: 'marketing', regimen_iva: 'general' },
  { clave: 'traduccion', regimen_iva: 'general' },
  { clave: 'fotografia', regimen_iva: 'general' },
  { clave: 'comercio', regimen_iva: 'recargo_equivalencia' }, // comercio minorista
  { clave: 'transporte', regimen_iva: 'general' },
  { clave: 'hosteleria', regimen_iva: 'general' },
  { clave: 'formacion', regimen_iva: 'exento' },
  { clave: 'sanidad', regimen_iva: 'exento' },
  { clave: 'otras', regimen_iva: 'general' },
];

const DIAS_MAXIMOS = 365;

export async function obtenerPerfil(usuarioId) {
  const { rows } = await db.query('SELECT * FROM perfiles_fiscales WHERE usuario_id = $1', [usuarioId]);
  return rows[0] || null;
}

export async function obtenerAjustes(usuarioId) {
  const { rows } = await db.query('SELECT * FROM ajustes WHERE usuario_id = $1', [usuarioId]);
  return rows[0];
}

// RF-10 a RF-12. Crea o actualiza el perfil fiscal.
export async function guardarPerfil(usuarioId, datos = {}) {
  const nif = normalizarNif(datos.nif);
  if (!nifValido(nif)) throw peticionIncorrecta('El NIF no es válido', { campo: 'nif' });
  const direccion = String(datos.direccion ?? '').trim();
  if (!direccion) throw peticionIncorrecta('Falta la dirección fiscal', { campo: 'direccion' });
  if (!ACTIVIDADES.some((a) => a.clave === datos.actividad)) {
    throw peticionIncorrecta('Elige una actividad de la lista', { campo: 'actividad' });
  }
  if (!REGIMENES_IVA.includes(datos.regimen_iva)) {
    throw peticionIncorrecta('Elige un régimen de IVA', { campo: 'regimen_iva' });
  }
  const emailGestoria = String(datos.email_gestoria ?? '').trim().toLowerCase();
  if (emailGestoria && !emailValido(emailGestoria)) {
    throw peticionIncorrecta('El email de la gestoría no es válido', { campo: 'email_gestoria' });
  }

  const { rows } = await db.query(
    `INSERT INTO perfiles_fiscales (usuario_id, nif, direccion, actividad, regimen_iva, email_gestoria)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (usuario_id) DO UPDATE SET
       nif = EXCLUDED.nif, direccion = EXCLUDED.direccion, actividad = EXCLUDED.actividad,
       regimen_iva = EXCLUDED.regimen_iva, email_gestoria = EXCLUDED.email_gestoria, actualizado_en = now()
     RETURNING *`,
    [usuarioId, nif, direccion, datos.actividad, datos.regimen_iva, emailGestoria || null],
  );
  return rows[0];
}

// RF-19. Emails que, además del suyo, pueden mandar facturas al correo de Cuadra.
export async function listarEmailsConfianza(usuarioId) {
  const { rows } = await db.query(
    'SELECT id, email, creado_en FROM emails_confianza WHERE usuario_id = $1 ORDER BY email',
    [usuarioId],
  );
  return rows;
}

export async function anadirEmailConfianza(usuarioId, valor) {
  const email = String(valor ?? '').trim().toLowerCase();
  if (!emailValido(email)) throw peticionIncorrecta('El email no es válido', { campo: 'email' });
  const { rows: [usuario] } = await db.query('SELECT email FROM usuarios WHERE id = $1', [usuarioId]);
  if (usuario?.email.toLowerCase() === email) {
    throw peticionIncorrecta('Tu propio email ya puede enviar facturas', { campo: 'email', codigo: 'propio' });
  }
  const { rows } = await db.query(
    `INSERT INTO emails_confianza (usuario_id, email) VALUES ($1, $2)
     ON CONFLICT (usuario_id, email) DO NOTHING
     RETURNING id, email, creado_en`,
    [usuarioId, email],
  );
  if (!rows[0]) throw conflicto('Ese email ya está en la lista', { campo: 'email', codigo: 'repetido' });
  return rows[0];
}

export async function borrarEmailConfianza(usuarioId, id) {
  const { rowCount } = await db.query(
    'DELETE FROM emails_confianza WHERE id = $1 AND usuario_id = $2',
    [Number(id) || 0, usuarioId],
  );
  if (!rowCount) throw noEncontrado('Ese email no está en tu lista');
}

// RF-41 y RF-42. Solo cambia lo que llega; el resto se queda como estaba.
export async function guardarAjustes(usuarioId, datos = {}) {
  const actuales = (await obtenerAjustes(usuarioId)) || {
    dias_aviso_pendiente: 7, dias_aviso_trimestre: 15, avisos_sin_email: [],
  };
  const dias = (campo) => {
    if (datos[campo] === undefined) return actuales[campo];
    const n = Number(datos[campo]);
    if (!Number.isInteger(n) || n < 1 || n > DIAS_MAXIMOS) {
      throw peticionIncorrecta(`Los días tienen que ser un número entre 1 y ${DIAS_MAXIMOS}`, { campo });
    }
    return n;
  };
  const diasPendiente = dias('dias_aviso_pendiente');
  const diasTrimestre = dias('dias_aviso_trimestre');

  let sinEmail = actuales.avisos_sin_email;
  if (datos.avisos_sin_email !== undefined) {
    const tipos = Object.values(TIPOS_AVISO);
    if (!Array.isArray(datos.avisos_sin_email) || datos.avisos_sin_email.some((x) => !tipos.includes(x))) {
      throw peticionIncorrecta('Tipo de aviso desconocido', { campo: 'avisos_sin_email' });
    }
    sinEmail = [...new Set(datos.avisos_sin_email)];
  }

  const { rows } = await db.query(
    `INSERT INTO ajustes (usuario_id, dias_aviso_pendiente, dias_aviso_trimestre, avisos_sin_email)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (usuario_id) DO UPDATE SET
       dias_aviso_pendiente = EXCLUDED.dias_aviso_pendiente,
       dias_aviso_trimestre = EXCLUDED.dias_aviso_trimestre,
       avisos_sin_email = EXCLUDED.avisos_sin_email
     RETURNING *`,
    [usuarioId, diasPendiente, diasTrimestre, sinEmail],
  );
  return rows[0];
}
