// Versión de empresa y versión personal (#50). Responsable: Rodrigo.
//
//   const version = await versionActual(usuarioId);          // 'empresa' | 'personal'
//   await cambiarVersion(usuarioId, 'personal');
//   await guardarPersonal(usuarioId, { presupuesto_mensual: 300 });
//   await guardarEmpresa(usuarioId, { cuota_autonomos_mensual: 230, vivienda_afecta_pct: 20 });
//
// Las facturas nuevas se guardan solas en la versión actual (trigger de 201_versiones.sql).
import { db } from '../../core/db.js';
import { peticionIncorrecta } from '../../core/errores.js';

export const VERSIONES = ['empresa', 'personal'];
const PRESUPUESTO_MAXIMO = 1000000;

const numero = (valor) => (valor === null || valor === undefined ? null : Number(valor));

export async function obtenerVersiones(usuarioId) {
  const { rows: [fila] } = await db.query('SELECT * FROM versiones_usuario WHERE usuario_id = $1', [usuarioId]);
  return {
    actual: fila?.version_actual ?? 'empresa',
    personal: { presupuesto_mensual: numero(fila?.presupuesto_mensual) },
    empresa: {
      cuota_autonomos_mensual: numero(fila?.cuota_autonomos_mensual),
      vivienda_afecta_pct: numero(fila?.vivienda_afecta_pct),
    },
  };
}

// "230,5" -> 230.5. Vacío -> null. Fuera de [minimo, maximo] -> 400 con el campo.
function leerImporte(valor, campo, mensaje, { minimo, maximo, incluyeMinimo }) {
  if (valor === '' || valor === undefined || valor === null) return null;
  const n = Number(String(valor).replace(/\s|€|%/g, '').replace(',', '.'));
  const bajo = incluyeMinimo ? n < minimo : n <= minimo;
  if (!Number.isFinite(n) || bajo || n > maximo) throw peticionIncorrecta(mensaje, { campo });
  return Math.round(n * 100) / 100;
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

// Datos de la versión de empresa para las deducciones (impresos.js): la cuota de autónomos
// (gasto del 130 sin factura) y el % de la casa que usa para trabajar (suministros).
export async function guardarEmpresa(usuarioId, datos = {}) {
  const cuota = leerImporte(datos.cuota_autonomos_mensual, 'cuota_autonomos_mensual',
    'La cuota de autónomos tiene que ser un importe de 0 o más', { minimo: 0, maximo: 10000, incluyeMinimo: true });
  const vivienda = leerImporte(datos.vivienda_afecta_pct, 'vivienda_afecta_pct',
    'El porcentaje de la casa tiene que estar entre 1 y 100', { minimo: 0, maximo: 100 });
  await db.query(
    `INSERT INTO versiones_usuario (usuario_id, cuota_autonomos_mensual, vivienda_afecta_pct) VALUES ($1, $2, $3)
     ON CONFLICT (usuario_id) DO UPDATE SET cuota_autonomos_mensual = $2, vivienda_afecta_pct = $3, actualizado_en = now()`,
    [usuarioId, cuota, vivienda],
  );
  return obtenerVersiones(usuarioId);
}
