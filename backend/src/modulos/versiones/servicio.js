// Versión de empresa y versión personal (#50). Responsable: Rodrigo.
//
//   const version = await versionActual(usuarioId);          // 'empresa' | 'personal'
//   await cambiarVersion(usuarioId, 'personal');
//   await guardarPersonal(usuarioId, { presupuesto_mensual: 300 });
//
// Las facturas nuevas se guardan solas en la versión actual (trigger de 201_versiones.sql).
import { db } from '../../core/db.js';
import { peticionIncorrecta } from '../../core/errores.js';

export const VERSIONES = ['empresa', 'personal'];
const PRESUPUESTO_MAXIMO = 1000000;

export async function obtenerVersiones(usuarioId) {
  const { rows: [fila] } = await db.query('SELECT * FROM versiones_usuario WHERE usuario_id = $1', [usuarioId]);
  return {
    actual: fila?.version_actual ?? 'empresa',
    personal: { presupuesto_mensual: fila?.presupuesto_mensual === null || !fila ? null : Number(fila.presupuesto_mensual) },
  };
}

export async function versionActual(usuarioId) {
  return (await obtenerVersiones(usuarioId)).actual;
}

export async function cambiarVersion(usuarioId, version) {
  if (!VERSIONES.includes(version)) throw peticionIncorrecta('La versión tiene que ser empresa o personal');
  await db.query(
    `INSERT INTO versiones_usuario (usuario_id, version_actual) VALUES ($1, $2)
     ON CONFLICT (usuario_id) DO UPDATE SET version_actual = $2, actualizado_en = now()`,
    [usuarioId, version],
  );
  return obtenerVersiones(usuarioId);
}

// Datos de la versión personal. Por ahora, el presupuesto del mes (vacío = sin presupuesto).
export async function guardarPersonal(usuarioId, datos = {}) {
  let presupuesto = datos.presupuesto_mensual;
  if (presupuesto === '' || presupuesto === undefined) presupuesto = null;
  if (presupuesto !== null) {
    presupuesto = Number(String(presupuesto).replace(',', '.'));
    if (!Number.isFinite(presupuesto) || presupuesto <= 0 || presupuesto > PRESUPUESTO_MAXIMO) {
      throw peticionIncorrecta('El presupuesto tiene que ser un importe mayor que 0', { campo: 'presupuesto_mensual' });
    }
    presupuesto = Math.round(presupuesto * 100) / 100;
  }
  await db.query(
    `INSERT INTO versiones_usuario (usuario_id, presupuesto_mensual) VALUES ($1, $2)
     ON CONFLICT (usuario_id) DO UPDATE SET presupuesto_mensual = $2, actualizado_en = now()`,
    [usuarioId, presupuesto],
  );
  return obtenerVersiones(usuarioId);
}
