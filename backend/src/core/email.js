// Envío de emails. Si no hay SMTP configurado (local), el email se imprime en la consola.
//   await enviarEmail({ para, asunto, texto, html, adjuntos: [{ filename, content }] });
import nodemailer from 'nodemailer';
import { config } from '../config.js';

let transporte = null;

function obtenerTransporte() {
  if (!config.smtp.host) return null;
  if (!transporte) {
    transporte = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.puerto,
      secure: config.smtp.puerto === 465,
      auth: { user: config.smtp.usuario, pass: config.smtp.contrasena },
    });
  }
  return transporte;
}

export async function enviarEmail({ para, asunto, texto, html, adjuntos = [] }) {
  const t = obtenerTransporte();
  if (!t) {
    console.log(`\n[email] Para: ${para}\n[email] Asunto: ${asunto}\n${texto || html}\n` +
      (adjuntos.length ? `[email] Adjuntos: ${adjuntos.map((a) => a.filename).join(', ')}\n` : ''));
    return { simulado: true };
  }
  await t.sendMail({ from: config.emailRemitente, to: para, subject: asunto, text: texto, html, attachments: adjuntos });
  return { simulado: false };
}
