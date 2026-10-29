// Informe trimestral en PDF (RF-52): una página ejecutiva y un anexo con cada factura.
// Colores del documento de diseño: blanco y grises, naranja solo para lo importante.
// Responsable: Ana (#25).
import PDFDocument from 'pdfkit';
import { TEXTOS, rellenar } from './textos.js';

const COLOR = {
  texto: '#141414', texto2: '#6B6B6B', borde: '#E6E6E3', fondo: '#F6F6F4', gris: '#EFEFEC',
  acento: '#F05A1A', naranjaSuave: '#FFF1EA', verde: '#17803F', rojo: '#C62828', rojoSuave: '#FDECEC',
};
const MARGEN = 48;
const ALTO_PIE = 28;

export function generarInforme(datos, idioma = 'es') {
  const tx = TEXTOS[idioma] || TEXTOS.es;
  const ti = tx.informe;
  const local = idioma === 'en' ? 'en-GB' : 'es-ES';
  const euros = (n) => new Intl.NumberFormat(local, { style: 'currency', currency: 'EUR' }).format(n || 0);
  const fecha = (f) => (f ? new Intl.DateTimeFormat(local, { timeZone: 'UTC' }).format(new Date(`${f}T00:00:00Z`)) : '—');
  const porcentaje = (n) => new Intl.NumberFormat(local, { style: 'percent', maximumFractionDigits: 1 }).format(n);

  const doc = new PDFDocument({
    size: 'A4', margin: MARGEN, bufferPages: true,
    info: { Title: rellenar(ti.titulo, datos), Author: datos.usuario?.nombre || '', Creator: 'Cuadra' },
  });
  const partes = [];
  doc.on('data', (p) => partes.push(p));
  const terminado = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(partes))));

  const ancho = doc.page.width - MARGEN * 2;
  const limiteY = () => doc.page.height - MARGEN - ALTO_PIE;

  // ---------- Página ejecutiva ----------
  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLOR.texto).text('Cuadra', MARGEN, MARGEN);
  doc.moveDown(1.5);
  doc.font('Helvetica-Bold').fontSize(24).text(rellenar(ti.titulo, datos));
  doc.font('Helvetica').fontSize(11).fillColor(COLOR.texto2)
    .text([datos.usuario?.nombre, datos.usuario?.nif && rellenar(ti.nif, { nif: datos.usuario.nif }),
      rellenar(ti.periodo, { desde: fecha(datos.desde), hasta: fecha(datos.hasta) })].filter(Boolean).join('  ·  '));
  doc.moveDown(1.5);

  // Tres cifras grandes en tarjetas.
  const cifras = [
    [ti.gasto, euros(datos.resumen.gasto), COLOR.texto],
    [ti.iva, euros(datos.resumen.iva), COLOR.acento],
    [ti.facturas, String(datos.resumen.cantidad), COLOR.texto],
  ];
  const hueco = 12;
  const anchoTarjeta = (ancho - hueco * 2) / 3;
  const yTarjetas = doc.y;
  cifras.forEach(([etiqueta, valor, color], i) => {
    const x = MARGEN + i * (anchoTarjeta + hueco);
    doc.roundedRect(x, yTarjetas, anchoTarjeta, 74, 12).fill(COLOR.fondo);
    doc.font('Helvetica').fontSize(10).fillColor(COLOR.texto2).text(etiqueta, x + 14, yTarjetas + 14, { width: anchoTarjeta - 28 });
    doc.font('Helvetica-Bold').fontSize(20).fillColor(color).text(valor, x + 14, yTarjetas + 36, { width: anchoTarjeta - 28, lineBreak: false });
  });
  doc.x = MARGEN;
  doc.y = yTarjetas + 74 + 24;

  const titulo = (texto) => {
    doc.font('Helvetica-Bold').fontSize(13).fillColor(COLOR.texto).text(texto, MARGEN, doc.y, { width: ancho });
    doc.moveDown(0.5);
  };
  const parrafo = (texto, color = COLOR.texto2) => {
    doc.font('Helvetica').fontSize(10.5).fillColor(color).text(texto, MARGEN, doc.y, { width: ancho });
  };

  // Comparación con el trimestre anterior.
  titulo(rellenar(ti.comparacion, datos.anterior));
  if (!datos.anterior.cantidad) {
    parrafo(ti.sinAnterior);
  } else {
    const diferencia = datos.resumen.gasto - datos.anterior.gasto;
    const relativa = Math.abs(diferencia) / datos.anterior.gasto;
    const variables = { porcentaje: porcentaje(relativa), importe: euros(datos.anterior.gasto) };
    parrafo(Math.abs(diferencia) < 0.005 ? ti.igual : rellenar(diferencia > 0 ? ti.sube : ti.baja, variables), COLOR.texto);
  }
  doc.moveDown(1.2);

  // Principales categorías con barras en naranja (un solo color, como en los gráficos de la web).
  titulo(ti.categorias);
  if (!datos.categorias.length) {
    parrafo(ti.vacio);
  } else {
    const maximo = datos.categorias[0].gasto || 1;
    const anchoNombre = 170;
    const anchoImporte = 90;
    const anchoBarra = ancho - anchoNombre - anchoImporte - 16;
    for (const c of datos.categorias.slice(0, 5)) {
      const y = doc.y;
      doc.font('Helvetica').fontSize(10).fillColor(COLOR.texto)
        .text(c.nombre || tx.sinCategoria, MARGEN, y, { width: anchoNombre, lineBreak: false, ellipsis: true });
      doc.roundedRect(MARGEN + anchoNombre + 8, y + 1, anchoBarra, 10, 5).fill(COLOR.gris);
      doc.roundedRect(MARGEN + anchoNombre + 8, y + 1, Math.max(6, anchoBarra * (c.gasto / maximo)), 10, 5).fill(COLOR.acento);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.texto)
        .text(euros(c.gasto), MARGEN + ancho - anchoImporte, y, { width: anchoImporte, align: 'right', lineBreak: false });
      doc.y = y + 20;
    }
  }
  doc.moveDown(1);

  // IVA por tipo.
  if (datos.ivaPorTipo.length) {
    titulo(ti.ivaPorTipo);
    for (const l of datos.ivaPorTipo) {
      const y = doc.y;
      const nombre = l.tipo === 'otros' ? tx.columnas.otros : `${l.tipo}%`;
      doc.font('Helvetica').fontSize(10).fillColor(COLOR.texto2).text(nombre, MARGEN, y, { width: 80 });
      doc.fillColor(COLOR.texto).text(`${ti.base} ${euros(l.base)}`, MARGEN + 80, y, { width: 200 });
      doc.font('Helvetica-Bold').text(`${ti.cuota} ${euros(l.cuota)}`, MARGEN + 280, y, { width: ancho - 280, align: 'right' });
      doc.y = y + 18;
    }
    doc.moveDown(1);
  }

  // Avisos pendientes, en rojo suave como los banners de aviso.
  titulo(ti.avisos);
  if (!datos.avisos.length && !datos.sinConfirmar) {
    parrafo(ti.sinAvisos);
  } else {
    const lineas = datos.avisos.map((a) => `${tx.avisos[a.tipo] || a.tipo}: ${a.cantidad}`);
    if (datos.sinConfirmar) lineas.push(rellenar(ti.sinConfirmar, { n: datos.sinConfirmar }));
    const texto = lineas.join('\n');
    doc.font('Helvetica').fontSize(10.5);
    const alto = doc.heightOfString(texto, { width: ancho - 28, lineGap: 3 }) + 24;
    const y = doc.y;
    doc.roundedRect(MARGEN, y, ancho, alto, 12).fill(COLOR.rojoSuave);
    doc.fillColor(COLOR.texto).text(texto, MARGEN + 14, y + 12, { width: ancho - 28, lineGap: 3 });
    doc.y = y + alto;
  }

  // ---------- Anexo ----------
  doc.addPage();
  doc.font('Helvetica-Bold').fontSize(16).fillColor(COLOR.texto).text(ti.anexo, MARGEN, MARGEN);
  doc.moveDown(0.8);

  // Fecha, emisor, NIF, número, categoría, base, IVA, total.
  const anchos = [56, 118, 66, 62, 75, 49, 46, 27];
  const escala = ancho / anchos.reduce((s, a) => s + a, 0);
  const columnas = anchos.map((a) => a * escala);
  const alineacion = (i) => (i >= 5 ? 'right' : 'left');

  const fila = (valores, { negrita = false, color = COLOR.texto, tamano = 8.5 } = {}) => {
    const y = doc.y;
    let x = MARGEN;
    doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(tamano).fillColor(color);
    valores.forEach((v, i) => {
      doc.text(v ?? '', x + 2, y, { width: columnas[i] - 4, align: alineacion(i), lineBreak: false, ellipsis: true });
      x += columnas[i];
    });
    doc.y = y + tamano + 6;
  };
  const cabeceraTabla = () => {
    const y = doc.y;
    doc.rect(MARGEN, y - 4, ancho, 18).fill(COLOR.gris);
    doc.y = y;
    fila(ti.cabecera, { negrita: true, tamano: 8 });
    doc.y += 2;
  };

  if (!datos.facturas.length) {
    parrafo(ti.vacio);
  } else {
    cabeceraTabla();
    for (const f of datos.facturas) {
      const otraMoneda = f.moneda !== 'EUR';
      if (doc.y + (otraMoneda ? 26 : 16) > limiteY()) {
        doc.addPage();
        doc.y = MARGEN;
        cabeceraTabla();
      }
      fila([fecha(f.fecha), f.emisor || '—', f.nif_emisor || '—', f.numero || '—', f.categoria || tx.sinCategoria,
        euros(f.base_eur), euros(f.cuota_eur), euros(f.total_eur)]);
      if (otraMoneda) {
        doc.font('Helvetica').fontSize(7.5).fillColor(COLOR.texto2)
          .text(rellenar(ti.moneda, { total: f.total, moneda: f.moneda, cambio: f.tipo_cambio ?? '—' }),
            MARGEN + columnas[0] + 2, doc.y - 3, { width: ancho - columnas[0], lineBreak: false });
        doc.y += 8;
      }
      doc.moveTo(MARGEN, doc.y - 2).lineTo(MARGEN + ancho, doc.y - 2).lineWidth(0.5).strokeColor(COLOR.borde).stroke();
    }
    if (doc.y + 18 > limiteY()) {
      doc.addPage();
      doc.y = MARGEN;
    }
    doc.y += 2;
    fila([ti.total, '', '', '', '', euros(datos.resumen.base), euros(datos.resumen.iva), euros(datos.resumen.gasto)], { negrita: true });
  }

  // Pie con número de página en todas.
  const { start, count } = doc.bufferedPageRange();
  const generado = fecha(new Date().toISOString().slice(0, 10));
  for (let i = start; i < start + count; i++) {
    doc.switchToPage(i);
    // Sin margen inferior mientras se escribe el pie, para que pdfkit no abra otra página.
    const margenInferior = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const y = doc.page.height - MARGEN - 10;
    doc.font('Helvetica').fontSize(8).fillColor(COLOR.texto2)
      .text(rellenar(ti.pie, { fecha: generado, pagina: i + 1, paginas: count }), MARGEN, y, { width: ancho, align: 'center', lineBreak: false });
    doc.page.margins.bottom = margenInferior;
  }

  doc.end();
  return terminado;
}
