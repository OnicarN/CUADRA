// Gastos añadidos a mano, sin archivo, en la versión personal y en la de empresa (#54). Responsable: Dani.
//
//   const { id } = await crearGastoManual(usuarioId, { fecha, concepto, total, categoria_id });
//
// Solo hace falta fecha, concepto e importe. En la versión de empresa, el NIF, el número y el IVA
// se completan después en la revisión (y las comprobaciones avisan de lo que falte).
// No gasta lecturas de la IA porque no hay nada que leer.
// Se crea pendiente y el usuario la confirma en la revisión, como cualquier otra.
import * as z from 'zod/v4';
import { db } from '../../core/db.js';
import { peticionIncorrecta } from '../../core/errores.js';
import { comprobarFactura } from '../facturas/comprobaciones.js';

const Gasto = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha no es válida')
    .refine((f) => !Number.isNaN(Date.parse(`${f}T00:00:00Z`)), 'La fecha no es válida'),
  concepto: z.string().trim().min(1, 'Escribe en qué te lo has gastado').max(200, 'El concepto es demasiado largo'),
  total: z.coerce.number({ message: 'El importe no es válido' })
    .positive('El importe tiene que ser mayor que cero').max(1000000, 'El importe es demasiado alto'),
  categoria_id: z.coerce.number().int().positive().nullish(),
});

export async function crearGastoManual(usuarioId, datos) {
  const resultado = Gasto.safeParse(datos ?? {});
  if (!resultado.success) throw peticionIncorrecta(resultado.error.issues[0].message);
  const { fecha, concepto, categoria_id: categoriaId } = resultado.data;
  const total = Math.round(resultado.data.total * 100) / 100;

  // La categoría tiene que ser una base o una propia del usuario.
  if (categoriaId) {
    const { rows } = await db.query(
      'SELECT 1 FROM categorias WHERE id = $1 AND (usuario_id IS NULL OR usuario_id = $2)',
      [categoriaId, usuarioId],
    );
    if (!rows.length) throw peticionIncorrecta('Esa categoría no existe');
  }

  // La versión (empresa o personal) la pone sola el trigger de 201_versiones.sql.
  const { rows: [factura] } = await db.query(
    `INSERT INTO facturas (usuario_id, estado, origen, fecha, emisor, total, moneda, total_eur, categoria_id)
     VALUES ($1, 'pendiente', 'manual', $2::text::date, $3, $4, 'EUR', $4, $5) RETURNING id`,
    [usuarioId, fecha, concepto, total, categoriaId ?? null],
  );
  await comprobarFactura(factura.id);
  return { id: factura.id };
}
