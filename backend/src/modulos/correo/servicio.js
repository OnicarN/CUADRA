// Correo propio de Cuadra: lo que se reenvía a <alias>@CORREO_DOMINIO entra solo en la cuenta.
// Responsable: Dani (#14).
//
//   const resultado = await procesarCorreo({ para, de, asunto, texto, adjuntos: [{ nombre, buffer }] });
//   // -> { aceptado, motivo?, facturas: [ids] }
//
// RF-18: busca al usuario por el alias de la dirección de destino.
// RF-19: solo acepta correos de su email o de sus emails de confianza; el resto se descarta y avisa.
// RF-20: cada adjunto válido (PDF o imagen) es una factura.
// RF-21: sin adjuntos válidos, el texto del correo se guarda como PDF y se marca.
import PDFDocument from 'pdfkit';
import { db } from '../../core/db.js';
import { config } from '../../config.js';
import { crearAviso, TIPOS_AVISO } from '../../core/avisos.js';
import { crearFacturaDesdeArchivo, detectarTipo, TAMANO_MAXIMO } from '../subida/servicio.js';

const TEXTO_MAXIMO = 20000;

// "Lucía <lucia@ejemplo.com>" -> "lucia@ejemplo.com"
export function extraerEmail(valor) {
  const texto = String(valor || '').trim();
  const entre = /<([^<>\s]+@[^<>\s]+)>/.exec(texto);
  const email = entre ? entre[1] : /[^\s<>,;"]+@[^\s<>,;"]+/.exec(texto)?.[0];
  return email ? email.toLowerCase() : null;
}

// De todos los destinatarios, el alias del que sea de nuestro dominio.
export function extraerAlias(para) {
  const dominio = `@${config.correoDominio.toLowerCase()}`;
  for (const parte of String(para || '').split(/[,;]/)) {
    const email = extraerEmail(parte);
    if (email?.endsWith(dominio)) return email.slice(0, -dominio.length);
  }
  return null;
}

function pdfDelTexto({ de, asunto, texto }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56 });
    const partes = [];
    doc.on('data', (p) => partes.push(p));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);
    doc.fontSize(9).fillColor('#6B6B6B')
      .text('Factura procedente del texto del correo, no de un adjunto (Cuadra).')
      .moveDown();
    doc.fillColor('#141414').fontSize(11).text(`De: ${de || '—'}`).text(`Asunto: ${asunto || '—'}`)
      .text(`Recibido: ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}`)
      .moveDown();
    doc.fontSize(11).text(String(texto || '(correo sin texto)').slice(0, TEXTO_MAXIMO));
    doc.end();
  });
}

async function registrar({ usuarioId, remitente, asunto, aceptado, numFacturas = 0 }) {
  await db.query(
    `INSERT INTO correos_entrantes (usuario_id, remitente, asunto, aceptado, num_facturas)
     VALUES ($1, $2, $3, $4, $5)`,
    [usuarioId, remitente || '(desconocido)', String(asunto || '').slice(0, 300), aceptado, numFacturas],
  );
}

export async function procesarCorreo({ para, de, asunto = '', texto = '', adjuntos = [] }) {
  const alias = extraerAlias(para);
  const { rows: [usuario] } = alias
    ? await db.query('SELECT id, email FROM usuarios WHERE alias_correo = $1', [alias])
    : { rows: [] };
  if (!usuario) return { aceptado: false, motivo: 'destinatario_desconocido', facturas: [] };

  const remitente = extraerEmail(de);
  const { rows: confianza } = await db.query(
    'SELECT 1 FROM emails_confianza WHERE usuario_id = $1 AND lower(email) = $2',
    [usuario.id, remitente],
  );
  const autorizado = remitente && (remitente === usuario.email.toLowerCase() || confianza.length > 0);
  if (!autorizado) {
    await registrar({ usuarioId: usuario.id, remitente: remitente || de, asunto, aceptado: false });
    await crearAviso({
      usuarioId: usuario.id,
      tipo: TIPOS_AVISO.CORREO_NO_AUTORIZADO,
      clave: `remitente:${remitente || 'desconocido'}`,
      datos: { remitente: remitente || String(de || ''), asunto: String(asunto || '').slice(0, 200) },
    });
    return { aceptado: false, motivo: 'remitente_no_autorizado', facturas: [] };
  }

  // Solo PDF e imágenes admitidas y de tamaño válido: el resto (firmas .vcf, .docx…) se ignora.
  const validos = adjuntos.filter((a) => a.buffer?.length && a.buffer.length <= TAMANO_MAXIMO && detectarTipo(a.buffer));
  const facturas = [];
  for (const adjunto of validos) {
    const factura = await crearFacturaDesdeArchivo({
      usuarioId: usuario.id, buffer: adjunto.buffer, nombre: adjunto.nombre, origen: 'correo',
    });
    facturas.push(factura.id);
  }

  if (!validos.length) {
    const pdf = await pdfDelTexto({ de: remitente, asunto, texto });
    const nombre = `${String(asunto || 'correo').replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 60) || 'correo'}.pdf`;
    const factura = await crearFacturaDesdeArchivo({ usuarioId: usuario.id, buffer: pdf, nombre, origen: 'correo_texto' });
    await crearAviso({
      usuarioId: usuario.id, tipo: TIPOS_AVISO.TEXTO_CORREO, facturaId: factura.id,
      datos: { asunto: String(asunto || '').slice(0, 200) },
    });
    facturas.push(factura.id);
  }

  await registrar({ usuarioId: usuario.id, remitente, asunto, aceptado: true, numFacturas: facturas.length });
  return { aceptado: true, facturas };
}
