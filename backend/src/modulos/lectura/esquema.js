// Qué le pedimos a la IA de cada factura (RF-24) y cómo limpiamos lo que devuelve.
// Responsable: Dani (#13).
import * as z from 'zod/v4';
import { normalizarNif } from '../../core/validacion.js';

export const EsquemaFactura = z.object({
  fecha: z.string().nullable().describe('Fecha de la factura en formato AAAA-MM-DD'),
  hora: z.string().nullable().describe('Hora en formato HH:MM si aparece (tickets), si no null'),
  emisor: z.string().nullable().describe('Nombre comercial o razón social de quien emite la factura'),
  nif_emisor: z.string().nullable().describe('NIF/CIF/VAT del emisor tal como aparece'),
  nif_receptor: z.string().nullable().describe('NIF del cliente o receptor, si aparece'),
  numero: z.string().nullable().describe('Número de factura o ticket'),
  lineas_iva: z.array(z.object({
    base: z.number().describe('Base imponible de este tipo de IVA'),
    tipo: z.number().describe('Porcentaje de IVA: 21, 10, 4, 0…'),
    cuota: z.number().describe('Cuota de IVA de este tipo'),
  })).describe('Una línea por cada tipo de IVA distinto de la factura'),
  total: z.number().nullable().describe('Importe total a pagar, con impuestos'),
  moneda: z.string().nullable().describe('Código ISO 4217 de la moneda: EUR, USD, GBP…'),
  categoria: z.string().nullable().describe('Nombre exacto de una de las categorías de la lista'),
});

const redondear = (n) => (typeof n === 'number' && Number.isFinite(n) ? Math.round(n * 100) / 100 : null);
const texto = (v) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 300) : null);

// Deja los datos listos para guardar: formatos válidos o null, importes con 2 decimales.
export function limpiarLectura(datos) {
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(datos.fecha || '') && !Number.isNaN(Date.parse(datos.fecha)) ? datos.fecha : null;
  const [, hh, mm] = /^(\d{1,2}):(\d{2})/.exec(datos.hora || '') || [];
  const hora = hh && Number(hh) < 24 && Number(mm) < 60 ? `${hh.padStart(2, '0')}:${mm}` : null;
  const moneda = /^[A-Za-z]{3}$/.test(datos.moneda || '') ? datos.moneda.toUpperCase() : 'EUR';
  const lineas = (datos.lineas_iva || [])
    .map((l) => ({ base: redondear(l.base), tipo: redondear(l.tipo), cuota: redondear(l.cuota) }))
    .filter((l) => l.base !== null && l.tipo !== null && l.cuota !== null);
  return {
    fecha,
    hora,
    emisor: texto(datos.emisor),
    nif_emisor: normalizarNif(datos.nif_emisor) || null,
    nif_receptor: normalizarNif(datos.nif_receptor) || null,
    numero: texto(datos.numero),
    lineas_iva: lineas,
    total: redondear(datos.total),
    moneda,
    categoria: texto(datos.categoria),
  };
}
