// Crear facturas a partir de archivos. Lo usan la subida, el correo y el compartir del móvil.
//
//   const factura = await crearFacturaDesdeArchivo({ usuarioId, buffer, nombre, mime, origen: 'camara' });
//   // -> { id, estado: 'pendiente' | 'sin_leer' }
//
// Responsable: Dani (#12).
// Guarda el original, crea la factura y, si quedan lecturas en el plan, lanza la lectura
// sin esperarla. Si no quedan, la deja 'sin_leer' y avisa (RF-23): la subida nunca se bloquea.
import { db } from '../../core/db.js';
import { crearAviso, TIPOS_AVISO } from '../../core/avisos.js';
import { peticionIncorrecta } from '../../core/errores.js';
import { obtenerUso } from '../suscripcion/uso.js';
import { leerFactura } from '../lectura/servicio.js';

export const FORMATOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif'];
export const TAMANO_MAXIMO = 15 * 1024 * 1024;
export const ORIGENES = ['subida', 'camara', 'correo', 'correo_texto', 'compartir'];

// Tipo real del archivo según sus primeros bytes (RF-17). No nos fiamos de la extensión
// ni del tipo que manda el navegador: un .docx renombrado a .pdf no pasa.
export function detectarTipo(buffer) {
  if (!buffer || buffer.length < 12) return null;
  if (buffer.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.subarray(4, 8).toString('latin1') === 'ftyp') {
    const marca = buffer.subarray(8, 12).toString('latin1');
    if (['heic', 'heix', 'hevc', 'hevx'].includes(marca)) return 'image/heic';
    if (['mif1', 'msf1', 'heif'].includes(marca)) return 'image/heif';
  }
  return null;
}

export async function crearFacturaDesdeArchivo({ usuarioId, buffer, nombre, origen = 'subida' }) {
  if (!ORIGENES.includes(origen)) throw peticionIncorrecta('Origen no válido');
  const tipo = detectarTipo(buffer);
  if (!tipo) throw peticionIncorrecta('Formato no admitido. Sube un PDF o una imagen (JPG, PNG o HEIC).');
  if (buffer.length > TAMANO_MAXIMO) throw peticionIncorrecta('El archivo es demasiado grande (máximo 15 MB).');

  // Comprobamos el uso del plan y, si queda alguna lectura, la reservamos marcando leida_en
  // ya: así varias subidas seguidas no se pasan del límite mientras la IA está leyendo.
  const { restantes } = await obtenerUso(usuarioId);
  const leer = restantes > 0;

  const id = await db.transaccion(async (tx) => {
    const { rows: [original] } = await tx.query(
      `INSERT INTO originales (usuario_id, nombre_archivo, tipo_mime, tamano, contenido)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [usuarioId, String(nombre || 'factura').slice(0, 200), tipo, buffer.length, buffer],
    );
    const { rows: [factura] } = await tx.query(
      `INSERT INTO facturas (usuario_id, original_id, estado, origen, leida_en)
       VALUES ($1, $2, $3, $4, ${leer ? 'now()' : 'NULL'}) RETURNING id`,
      [usuarioId, original.id, leer ? 'pendiente' : 'sin_leer', origen],
    );
    return factura.id;
  });

  if (!leer) {
    const mes = new Date().toISOString().slice(0, 7);
    await crearAviso({ usuarioId, tipo: TIPOS_AVISO.SIN_LEER, clave: mes, datos: { mes } });
    return { id, estado: 'sin_leer' };
  }

  // La lectura puede tardar: no la esperamos. Si falla sin haber leído nada, la factura
  // vuelve a 'sin_leer' y libera la lectura, para que se lea más tarde (leerSinLeer).
  leerFactura(id).catch(async (error) => {
    console.warn(`[subida] No se pudo leer la factura ${id}: ${error.message}`);
    await db.query(
      `UPDATE facturas SET estado = 'sin_leer', leida_en = NULL
        WHERE id = $1 AND estado = 'pendiente' AND datos_ia IS NULL`,
      [id],
    ).catch(() => {});
  });
  return { id, estado: 'pendiente' };
}
