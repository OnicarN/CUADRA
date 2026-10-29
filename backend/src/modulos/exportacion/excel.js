// Excel con una fila por factura confirmada (RF-49 a RF-51), sin originales.
// Responsable: Ana (#25).
import ExcelJS from 'exceljs';
import { TIPOS_IVA } from './datos.js';
import { TEXTOS, rellenar } from './textos.js';

const FORMATO_IMPORTE = '#,##0.00';
const FORMATO_EUROS = '#,##0.00 [$€-es-ES]';

export async function generarExcel(facturas, idioma = 'es') {
  const tx = TEXTOS[idioma] || TEXTOS.es;
  const c = tx.columnas;
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Cuadra';
  libro.created = new Date();
  const hoja = libro.addWorksheet(tx.hoja, { views: [{ state: 'frozen', ySplit: 1 }] });

  const tiposIva = [...TIPOS_IVA.map((tipo) => ({ clave: String(tipo), nombre: `${tipo}%` })), { clave: 'otros', nombre: c.otros }];
  hoja.columns = [
    { header: c.fecha, key: 'fecha', width: 12, style: { numFmt: 'dd/mm/yyyy' } },
    { header: c.emisor, key: 'emisor', width: 30 },
    { header: c.nif_emisor, key: 'nif_emisor', width: 14 },
    { header: c.nif_receptor, key: 'nif_receptor', width: 14 },
    { header: c.numero, key: 'numero', width: 16 },
    { header: c.categoria, key: 'categoria', width: 24 },
    ...tiposIva.flatMap(({ clave, nombre }) => [
      { header: rellenar(c.base, { tipo: nombre }), key: `base_${clave}`, width: 12, style: { numFmt: FORMATO_IMPORTE } },
      { header: rellenar(c.cuota, { tipo: nombre }), key: `cuota_${clave}`, width: 12, style: { numFmt: FORMATO_IMPORTE } },
    ]),
    { header: c.total, key: 'total', width: 12, style: { numFmt: FORMATO_IMPORTE } },
    { header: c.moneda, key: 'moneda', width: 9 },
    { header: c.tipo_cambio, key: 'tipo_cambio', width: 13, style: { numFmt: '0.000000' } },
    { header: c.total_eur, key: 'total_eur', width: 14, style: { numFmt: FORMATO_EUROS } },
  ];

  for (const f of facturas) {
    const fila = {
      // Fecha real (no texto) para que Excel y Google Sheets la ordenen y filtren bien.
      fecha: f.fecha ? new Date(`${f.fecha}T00:00:00Z`) : null,
      emisor: f.emisor, nif_emisor: f.nif_emisor, nif_receptor: f.nif_receptor, numero: f.numero,
      categoria: f.categoria || tx.sinCategoria,
      total: f.total, moneda: f.moneda,
      tipo_cambio: f.moneda === 'EUR' ? null : f.tipo_cambio,
      total_eur: f.total_eur,
    };
    for (const { clave } of tiposIva) {
      fila[`base_${clave}`] = f.iva[clave]?.base ?? null;
      fila[`cuota_${clave}`] = f.iva[clave]?.cuota ?? null;
    }
    hoja.addRow(fila);
  }

  // Fila de totales en euros: cada importe se pasa a euros con el tipo de cambio de su factura.
  const totales = { emisor: tx.totales, total_eur: 0 };
  for (const { clave } of tiposIva) {
    totales[`base_${clave}`] = 0;
    totales[`cuota_${clave}`] = 0;
  }
  for (const f of facturas) {
    for (const { clave } of tiposIva) {
      totales[`base_${clave}`] += (f.iva[clave]?.base || 0) * f.cambio;
      totales[`cuota_${clave}`] += (f.iva[clave]?.cuota || 0) * f.cambio;
    }
    totales.total_eur += f.total_eur || 0;
  }
  for (const clave of Object.keys(totales)) {
    if (typeof totales[clave] === 'number') totales[clave] = Math.round(totales[clave] * 100) / 100;
  }
  const filaTotales = hoja.addRow(totales);
  filaTotales.font = { bold: true };
  filaTotales.eachCell((celda) => {
    celda.border = { top: { style: 'thin', color: { argb: 'FF141414' } } };
    if (celda.numFmt === FORMATO_IMPORTE) celda.numFmt = FORMATO_EUROS;
  });

  const cabecera = hoja.getRow(1);
  cabecera.font = { bold: true };
  cabecera.alignment = { vertical: 'middle' };
  cabecera.eachCell((celda) => {
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEC' } };
  });
  hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, facturas.length + 1), column: hoja.columns.length } };

  return Buffer.from(await libro.xlsx.writeBuffer());
}
