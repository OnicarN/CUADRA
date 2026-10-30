// Consultas del histórico de facturas (RF-37, RF-38, RF-39).
// Responsable: Rodrigo (#18).
//
//   const { facturas, total } = await listarFacturas(usuarioId, req.query);
//   const original = await obtenerOriginal(usuarioId, facturaId);
//
// Todas filtran por usuario_id (RF-09).
import { db } from '../../core/db.js';
import { peticionIncorrecta } from '../../core/errores.js';
import { versionActual } from '../versiones/servicio.js';

export const POR_PAGINA = 30;
const ESTADOS = ['sin_leer', 'pendiente', 'confirmada'];
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

// "41,32", "1.234,56 €" o "41.32" -> 41.32. Si no es un importe, null.
export function leerImporte(texto) {
  let limpio = String(texto ?? '').replace(/[\s€]/g, '');
  if (!/^\d[\d.,]*$/.test(limpio)) return null;
  if (limpio.includes(',')) limpio = limpio.replace(/\./g, '').replace(',', '.');
  const numero = Number(limpio);
  return Number.isFinite(numero) ? numero : null;
}

function leerFecha(valor, nombre) {
  if (!valor) return null;
  if (!FECHA.test(valor) || Number.isNaN(Date.parse(valor))) throw peticionIncorrecta(`La fecha "${nombre}" no es válida`);
  return valor;
}

function leerCantidad(valor, nombre) {
  if (valor === undefined || valor === '') return null;
  const numero = leerImporte(valor);
  if (numero === null) throw peticionIncorrecta(`El importe "${nombre}" no es válido`);
  return numero;
}

// Para buscar con ILIKE sin que % o _ hagan de comodín.
const escaparLike = (texto) => texto.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function listarFacturas(usuarioId, filtros = {}) {
  const valor = (nombre) => (typeof filtros[nombre] === 'string' ? filtros[nombre].trim() : '');
  const params = [usuarioId];
  const condiciones = ['f.usuario_id = $1'];
  const nuevo = (v) => { params.push(v); return `$${params.length}`; };
  // Solo las de la versión en la que está (empresa o personal, #50).
  condiciones.push(`f.version = ${nuevo(await versionActual(usuarioId))}`);

  const q = valor('q');
  if (q) {
    const texto = nuevo(`%${escaparLike(q)}%`);
    const opciones = ['emisor', 'nif_emisor', 'numero'].map((c) => `f.${c} ILIKE ${texto}`);
    opciones.push(`c.nombre ILIKE ${texto}`);
    const importe = leerImporte(q);
    if (importe !== null) {
      const p = nuevo(importe);
      opciones.push(...['total', 'total_eur', 'base_imponible', 'cuota_iva'].map((c) => `f.${c} = ${p}`));
    }
    condiciones.push(`(${opciones.join(' OR ')})`);
  }

  const estado = valor('estado');
  if (estado) {
    if (!ESTADOS.includes(estado)) throw peticionIncorrecta('Estado no válido');
    condiciones.push(`f.estado = ${nuevo(estado)}`);
  }

  // Sin fecha de factura (p. ej. sin leer) se usa el día en que se subió.
  const desde = leerFecha(valor('desde'), 'desde');
  const hasta = leerFecha(valor('hasta'), 'hasta');
  if (desde) condiciones.push(`COALESCE(f.fecha, f.creado_en::date) >= ${nuevo(desde)}::date`);
  if (hasta) condiciones.push(`COALESCE(f.fecha, f.creado_en::date) <= ${nuevo(hasta)}::date`);

  const categoria = valor('categoria');
  if (categoria) {
    if (!/^\d+$/.test(categoria)) throw peticionIncorrecta('Categoría no válida');
    condiciones.push(`f.categoria_id = ${nuevo(Number(categoria))}`);
  }

  const min = leerCantidad(valor('min'), 'mínimo');
  const max = leerCantidad(valor('max'), 'máximo');
  if (min !== null) condiciones.push(`COALESCE(f.total_eur, f.total) >= ${nuevo(min)}`);
  if (max !== null) condiciones.push(`COALESCE(f.total_eur, f.total) <= ${nuevo(max)}`);

  if (['1', 'true', 'si'].includes(valor('aviso'))) {
    condiciones.push(`EXISTS (SELECT 1 FROM avisos a WHERE a.factura_id = f.id AND a.estado = 'abierto')`);
  }

  const pagina = Math.max(1, Number.parseInt(valor('pagina'), 10) || 1);
  const donde = condiciones.join(' AND ');
  const desdeTablas = 'FROM facturas f LEFT JOIN categorias c ON c.id = f.categoria_id';

  const [{ rows: facturas }, { rows: [cuenta] }] = await Promise.all([
    db.query(
      `SELECT f.id, f.estado, f.fecha, f.emisor, f.nif_emisor, f.numero, f.total, f.moneda, f.total_eur,
              c.nombre AS categoria,
              (SELECT COUNT(*) FROM avisos a WHERE a.factura_id = f.id AND a.estado = 'abierto')::int AS avisos_abiertos
         ${desdeTablas}
        WHERE ${donde}
        ORDER BY COALESCE(f.fecha, f.creado_en::date) DESC, f.creado_en DESC, f.id DESC
        LIMIT ${POR_PAGINA} OFFSET ${(pagina - 1) * POR_PAGINA}`,
      params,
    ),
    db.query(`SELECT COUNT(*)::int AS total ${desdeTablas} WHERE ${donde}`, params),
  ]);
  return { facturas, total: cuenta.total };
}

export async function obtenerOriginal(usuarioId, facturaId) {
  const { rows: [original] } = await db.query(
    `SELECT o.nombre_archivo, o.tipo_mime, o.contenido
       FROM facturas f JOIN originales o ON o.id = f.original_id
      WHERE f.id = $1 AND f.usuario_id = $2 AND o.usuario_id = $2`,
    [facturaId, usuarioId],
  );
  return original ?? null;
}
