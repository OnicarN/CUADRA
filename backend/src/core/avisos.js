// Creación y cierre de avisos. Cualquier módulo que necesite avisar al usuario usa
// estas funciones; la pantalla de avisos y el envío por email son del módulo avisos.
//
//   await crearAviso({ usuarioId, tipo: TIPOS_AVISO.SIN_NIF, facturaId: 12 });
//   await cerrarAvisos({ usuarioId, tipo: TIPOS_AVISO.SIN_NIF, facturaId: 12 });
//
// No se crean dos avisos abiertos con el mismo usuario, tipo y clave. La clave por
// defecto es "f<id>" si hay factura; para el resto pásala tú (por ejemplo "2026-T4").
import { db } from './db.js';

export const TIPOS_AVISO = Object.freeze({
  SIN_NIF: 'sin_nif',                         // Ticket sin NIF
  OTRO_NIF: 'otro_nif',                       // Factura a otro NIF
  TOTAL_NO_CUADRA: 'total_no_cuadra',         // Total que no cuadra
  DUPLICADO: 'duplicado',                     // Posible duplicado
  PENDIENTE_REVISAR: 'pendiente_revisar',     // Pendiente de revisar
  TRIMESTRE: 'trimestre',                     // Trimestre a punto de cerrar
  EVENTO_SIN_TICKET: 'evento_sin_ticket',     // Evento sin ticket
  TEXTO_CORREO: 'texto_correo',               // Factura desde texto del correo
  SIN_LEER: 'sin_leer',                       // Facturas sin leer
  CORREO_NO_AUTORIZADO: 'correo_no_autorizado', // Correo no autorizado
});

function claveDe({ facturaId, clave }) {
  if (clave) return String(clave);
  if (facturaId) return `f${facturaId}`;
  return '';
}

export async function crearAviso({ usuarioId, tipo, facturaId = null, clave, datos = {} }, conexion = db) {
  if (!Object.values(TIPOS_AVISO).includes(tipo)) throw new Error(`Tipo de aviso desconocido: ${tipo}`);
  const { rows } = await conexion.query(
    `INSERT INTO avisos (usuario_id, tipo, factura_id, clave, datos)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (usuario_id, tipo, clave) WHERE estado = 'abierto' DO NOTHING
     RETURNING id`,
    [usuarioId, tipo, facturaId, claveDe({ facturaId, clave }), JSON.stringify(datos)],
  );
  return rows[0]?.id ?? null;
}

export async function cerrarAvisos({ usuarioId, tipo, facturaId, clave }, conexion = db) {
  const condiciones = ['usuario_id = $1', "estado = 'abierto'"];
  const params = [usuarioId];
  if (tipo) { params.push(tipo); condiciones.push(`tipo = $${params.length}`); }
  if (facturaId) { params.push(facturaId); condiciones.push(`factura_id = $${params.length}`); }
  if (clave) { params.push(String(clave)); condiciones.push(`clave = $${params.length}`); }
  const { rowCount } = await conexion.query(
    `UPDATE avisos SET estado = 'cerrado', cerrado_en = now() WHERE ${condiciones.join(' AND ')}`,
    params,
  );
  return rowCount;
}
