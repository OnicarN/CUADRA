// Textos del Excel, del informe y del email a la gestoría, en el idioma del usuario.
// Responsable: Ana (#25).
export const TEXTOS = {
  es: {
    hoja: 'Facturas',
    columnas: {
      fecha: 'Fecha', emisor: 'Emisor', nif_emisor: 'NIF emisor', nif_receptor: 'NIF receptor', numero: 'Número',
      categoria: 'Categoría', base: 'Base {tipo}', cuota: 'IVA {tipo}', otros: 'otros', total: 'Total',
      moneda: 'Moneda', tipo_cambio: 'Tipo de cambio', total_eur: 'Total (EUR)',
    },
    totales: 'Totales (EUR)',
    sinCategoria: 'Sin categoría',
    archivoExcel: 'cuadra-facturas-{desde}_{hasta}.xlsx',
    archivoInforme: 'cuadra-informe-{anio}-T{trimestre}.pdf',
    copia: {
      archivo: 'cuadra-copia-{fecha}.zip',
      confirmadas: 'facturas-confirmadas.xlsx',
      sinConfirmar: 'facturas-sin-confirmar.xlsx',
      originales: 'originales',
      sinFecha: 'sin-fecha',
      trimestre: 'T{trimestre}',
      leeme: 'LEEME.txt',
      textoLeeme: `Copia de tu cuenta de Cuadra
Hecha el {fecha} para {nombre} ({email}).

Qué hay en esta carpeta:

- facturas-confirmadas.xlsx: las {confirmadas} facturas que revisaste y confirmaste, con todos sus datos.
  Es el mismo Excel que se envía a la gestoría.
- facturas-sin-confirmar.xlsx: las {sinConfirmar} facturas que aún no habías confirmado. Sus datos los leyó
  la IA y pueden tener errores: compruébalos con el original.
- originales/: las fotos y PDFs de todas tus facturas ({originales} archivos), ordenados por año y trimestre.
  Las que no tienen fecha están en originales/sin-fecha/.

Importante: Hacienda puede pedirte las facturas y los justificantes durante varios años.
Guarda esta copia en un sitio seguro.
`,
    },
    informe: {
      titulo: 'Informe del {trimestre}.º trimestre de {anio}',
      periodo: 'Del {desde} al {hasta}',
      nif: 'NIF {nif}',
      gasto: 'Gasto total',
      iva: 'IVA deducible',
      facturas: 'Facturas confirmadas',
      comparacion: 'Comparación con el {trimestre}.º trimestre de {anio}',
      sube: '{porcentaje} más que el trimestre anterior ({importe})',
      baja: '{porcentaje} menos que el trimestre anterior ({importe})',
      igual: 'Igual que el trimestre anterior',
      sinAnterior: 'No hay facturas confirmadas en el trimestre anterior.',
      categorias: 'Principales categorías',
      ivaPorTipo: 'IVA soportado por tipo',
      base: 'Base',
      cuota: 'Cuota',
      avisos: 'Avisos pendientes',
      sinAvisos: 'No tienes avisos pendientes.',
      sinConfirmar: '{n} facturas de este trimestre aún no están confirmadas y no cuentan en este informe.',
      vacio: 'No hay facturas confirmadas en este trimestre.',
      anexo: 'Anexo: detalle de las facturas',
      cabecera: ['Fecha', 'Emisor', 'NIF emisor', 'Número', 'Categoría', 'Base (EUR)', 'IVA (EUR)', 'Total (EUR)'],
      moneda: 'Original: {total} {moneda} · cambio {cambio}',
      total: 'Total',
      pie: 'Generado con Cuadra el {fecha} · Solo incluye facturas confirmadas · Página {pagina} de {paginas}',
    },
    avisos: {
      sin_nif: 'Ticket sin NIF', otro_nif: 'Factura a otro NIF', total_no_cuadra: 'Total que no cuadra',
      duplicado: 'Posible duplicado', pendiente_revisar: 'Pendiente de revisar', trimestre: 'Trimestre a punto de cerrar',
      evento_sin_ticket: 'Evento sin ticket', texto_correo: 'Factura desde el texto del correo', sin_leer: 'Facturas sin leer',
      correo_no_autorizado: 'Correo no autorizado',
    },
    email: {
      asuntoExcel: 'Facturas de {nombre} ({desde} – {hasta})',
      asuntoInforme: 'Informe del {trimestre}.º trimestre de {anio} de {nombre}',
      cuerpo: 'Hola:\n\n{nombre} ({email}) te envía desde Cuadra {que}. Lo tienes adjunto.\n\nSolo incluye facturas que {nombre} ha revisado y confirmado.\n\nSi tienes cualquier duda, responde directamente a {email}.\n',
      queExcel: 'el Excel con sus facturas del {desde} al {hasta}',
      queInforme: 'el informe del {trimestre}.º trimestre de {anio}',
    },
  },
  en: {
    hoja: 'Invoices',
    columnas: {
      fecha: 'Date', emisor: 'Issuer', nif_emisor: 'Issuer tax ID', nif_receptor: 'Recipient tax ID', numero: 'Number',
      categoria: 'Category', base: 'Base {tipo}', cuota: 'VAT {tipo}', otros: 'other', total: 'Total',
      moneda: 'Currency', tipo_cambio: 'Exchange rate', total_eur: 'Total (EUR)',
    },
    totales: 'Totals (EUR)',
    sinCategoria: 'No category',
    archivoExcel: 'cuadra-invoices-{desde}_{hasta}.xlsx',
    archivoInforme: 'cuadra-report-{anio}-Q{trimestre}.pdf',
    copia: {
      archivo: 'cuadra-backup-{fecha}.zip',
      confirmadas: 'confirmed-invoices.xlsx',
      sinConfirmar: 'unconfirmed-invoices.xlsx',
      originales: 'originals',
      sinFecha: 'no-date',
      trimestre: 'Q{trimestre}',
      leeme: 'README.txt',
      textoLeeme: `Backup of your Cuadra account
Made on {fecha} for {nombre} ({email}).

What is in this folder:

- confirmed-invoices.xlsx: the {confirmadas} invoices you reviewed and confirmed, with all their details.
  It is the same Excel file that is sent to your accountant.
- unconfirmed-invoices.xlsx: the {sinConfirmar} invoices you had not confirmed yet. Their details were read
  by the AI and may contain mistakes: check them against the original.
- originals/: the photos and PDFs of all your invoices ({originales} files), sorted by year and quarter.
  The ones without a date are in originals/no-date/.

Important: the Spanish Tax Agency can ask for your invoices and receipts for several years.
Keep this backup somewhere safe.
`,
    },
    informe: {
      titulo: 'Report for Q{trimestre} {anio}',
      periodo: 'From {desde} to {hasta}',
      nif: 'Tax ID {nif}',
      gasto: 'Total spending',
      iva: 'Deductible VAT',
      facturas: 'Confirmed invoices',
      comparacion: 'Compared with Q{trimestre} {anio}',
      sube: '{porcentaje} more than the previous quarter ({importe})',
      baja: '{porcentaje} less than the previous quarter ({importe})',
      igual: 'Same as the previous quarter',
      sinAnterior: 'There are no confirmed invoices in the previous quarter.',
      categorias: 'Top categories',
      ivaPorTipo: 'Input VAT by rate',
      base: 'Base',
      cuota: 'VAT',
      avisos: 'Open alerts',
      sinAvisos: 'You have no open alerts.',
      sinConfirmar: '{n} invoices from this quarter are not confirmed yet and are not included in this report.',
      vacio: 'There are no confirmed invoices in this quarter.',
      anexo: 'Appendix: invoice details',
      cabecera: ['Date', 'Issuer', 'Issuer tax ID', 'Number', 'Category', 'Base (EUR)', 'VAT (EUR)', 'Total (EUR)'],
      moneda: 'Original: {total} {moneda} · rate {cambio}',
      total: 'Total',
      pie: 'Generated with Cuadra on {fecha} · Only confirmed invoices · Page {pagina} of {paginas}',
    },
    avisos: {
      sin_nif: 'Receipt without tax ID', otro_nif: 'Invoice to another tax ID', total_no_cuadra: "Total doesn't add up",
      duplicado: 'Possible duplicate', pendiente_revisar: 'Waiting for review', trimestre: 'Quarter about to close',
      evento_sin_ticket: 'Event without receipt', texto_correo: 'Invoice from email text', sin_leer: 'Unread invoices',
      correo_no_autorizado: 'Unauthorised email',
    },
    email: {
      asuntoExcel: 'Invoices from {nombre} ({desde} – {hasta})',
      asuntoInforme: 'Q{trimestre} {anio} report from {nombre}',
      cuerpo: 'Hello,\n\n{nombre} ({email}) is sending you {que} from Cuadra. You will find it attached.\n\nIt only includes invoices that {nombre} has reviewed and confirmed.\n\nIf you have any questions, reply directly to {email}.\n',
      queExcel: 'the Excel file with their invoices from {desde} to {hasta}',
      queInforme: 'the report for Q{trimestre} {anio}',
    },
  },
};

export function rellenar(texto, variables = {}) {
  return texto.replace(/\{(\w+)\}/g, (_, v) => variables[v] ?? `{${v}}`);
}
