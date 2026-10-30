// Copia de todo antes de eliminar la cuenta (RF-62): un ZIP con
//   LEEME.txt                      qué hay en la copia
//   facturas-confirmadas.xlsx      las confirmadas (el mismo Excel que recibe la gestoría)
//   facturas-sin-confirmar.xlsx    las pendientes y sin leer
//   originales/2026/T3/...         todas las fotos y PDFs, por año y trimestre
// Pendiente legal (documento funcional): Hacienda puede pedir los justificantes durante años; por
// eso Ajustes ofrece esta copia antes de eliminar la cuenta.
// Responsable: Ana (#27).
import path from 'node:path';
import { ZipArchive } from 'archiver';
import { db, aBuffer } from '../../core/db.js';
import { trimestreDe } from '../../core/fiscal.js';
import { facturasPorEstado, idiomaDe } from './datos.js';
import { generarExcel } from './excel.js';
import { TEXTOS, rellenar } from './textos.js';

const EXTENSIONES = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/heic': '.heic', 'image/webp': '.webp' };

export async function nombreCopia(usuarioId) {
  const tx = TEXTOS[await idiomaDe(usuarioId)].copia;
  return rellenar(tx.archivo, { fecha: new Date().toISOString().slice(0, 10) });
}

// Escribe el ZIP en `destino` (la respuesta HTTP) sin cargar todos los originales en memoria a la vez.
export async function escribirCopia(usuarioId, destino) {
  const idioma = await idiomaDe(usuarioId);
  const tx = TEXTOS[idioma].copia;
  const confirmadas = await facturasPorEstado(usuarioId, ['confirmada']);
  const sinConfirmar = await facturasPorEstado(usuarioId, ['pendiente', 'sin_leer']);
  const { rows: originales } = await db.query(
    `SELECT o.id, o.nombre_archivo, o.tipo_mime, f.fecha::text AS fecha, f.emisor
       FROM originales o LEFT JOIN facturas f ON f.original_id = o.id
      WHERE o.usuario_id = $1 ORDER BY f.fecha NULLS LAST, o.id`,
    [usuarioId],
  );
  const { rows: [usuario] } = await db.query('SELECT nombre, email FROM usuarios WHERE id = $1', [usuarioId]);

  const zip = new ZipArchive({ zlib: { level: 6 } });
  const terminado = new Promise((resolve, reject) => {
    zip.on('error', reject);
    destino.on('finish', resolve);
    destino.on('close', resolve);
  });
  zip.on('warning', (error) => console.warn('ZIP:', error.message));
  zip.pipe(destino);

  zip.append(rellenar(tx.textoLeeme, {
    fecha: new Date().toISOString().slice(0, 10), nombre: usuario.nombre, email: usuario.email,
    confirmadas: confirmadas.length, sinConfirmar: sinConfirmar.length, originales: originales.length,
  }).replace(/\n/g, '\r\n'), { name: tx.leeme });
  zip.append(await generarExcel(confirmadas, idioma), { name: tx.confirmadas });
  zip.append(await generarExcel(sinConfirmar, idioma), { name: tx.sinConfirmar });

  for (const o of originales) {
    const { rows: [fila] } = await db.query('SELECT contenido FROM originales WHERE id = $1 AND usuario_id = $2', [o.id, usuarioId]);
    if (fila) zip.append(aBuffer(fila.contenido), { name: rutaOriginal(o, tx) });
  }
  await zip.finalize();
  await terminado;
}

// originales/2026/T3/2026-07-05 Adobe (12).pdf  ·  originales/sin-fecha/Ticket (16).pdf
export function rutaOriginal(o, tx) {
  const extension = EXTENSIONES[o.tipo_mime] || path.extname(o.nombre_archivo || '').toLowerCase().replace(/[^.a-z0-9]/g, '');
  // Sin barras ni caracteres que Windows no admite en nombres de archivo.
  const emisor = String(o.emisor || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 50);
  const base = path.basename(o.nombre_archivo || '', path.extname(o.nombre_archivo || '')).replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').trim().slice(0, 50);
  if (!o.fecha) return `${tx.originales}/${tx.sinFecha}/${base || emisor || 'original'} (${o.id})${extension}`;
  const { anio, trimestre } = trimestreDe(o.fecha);
  const nombre = [o.fecha, emisor].filter(Boolean).join(' ');
  return `${tx.originales}/${anio}/${rellenar(tx.trimestre, { trimestre })}/${nombre} (${o.id})${extension}`;
}
