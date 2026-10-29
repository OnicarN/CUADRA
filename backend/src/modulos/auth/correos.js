// Emails de la cuenta: verificación (RF-07) y recuperación de contraseña (RF-08), en el idioma del usuario.
// Responsable: Ana (#23).
import { config } from '../../config.js';
import { enviarEmail } from '../../core/email.js';
import { escaparHtml } from './utilidades.js';

const textos = {
  verificar: {
    es: {
      asunto: 'Confirma tu email en Cuadra',
      saludo: (n) => `Hola, ${n}:`,
      cuerpo: 'Confirma tu email para terminar de crear tu cuenta en Cuadra.',
      boton: 'Confirmar mi email',
      pie: 'El enlace caduca en 24 horas. Si no has creado una cuenta en Cuadra, ignora este email.',
    },
    en: {
      asunto: 'Confirm your email on Cuadra',
      saludo: (n) => `Hi ${n},`,
      cuerpo: 'Confirm your email to finish creating your Cuadra account.',
      boton: 'Confirm my email',
      pie: "The link expires in 24 hours. If you didn't create a Cuadra account, ignore this email.",
    },
  },
  recuperar: {
    es: {
      asunto: 'Cambia tu contraseña de Cuadra',
      saludo: (n) => `Hola, ${n}:`,
      cuerpo: 'Hemos recibido una petición para cambiar la contraseña de tu cuenta.',
      boton: 'Elegir una contraseña nueva',
      pie: 'El enlace caduca en 1 hora y solo se puede usar una vez. Si no lo has pedido tú, ignora este email: tu contraseña no cambia.',
    },
    en: {
      asunto: 'Reset your Cuadra password',
      saludo: (n) => `Hi ${n},`,
      cuerpo: 'We received a request to reset the password of your account.',
      boton: 'Choose a new password',
      pie: "The link expires in 1 hour and can only be used once. If you didn't ask for this, ignore this email: your password won't change.",
    },
  },
};

function componer(clase, { nombre, idioma }, enlace) {
  const tx = textos[clase][idioma === 'en' ? 'en' : 'es'];
  const texto = `${tx.saludo(nombre)}\n\n${tx.cuerpo}\n\n${tx.boton}: ${enlace}\n\n${tx.pie}\n`;
  const html = `<p>${escaparHtml(tx.saludo(nombre))}</p><p>${escaparHtml(tx.cuerpo)}</p>
<p><a href="${escaparHtml(enlace)}" style="display:inline-block;padding:12px 24px;border-radius:999px;background:#D2440B;color:#fff;text-decoration:none;font-weight:600">${escaparHtml(tx.boton)}</a></p>
<p style="color:#6B6B6B;font-size:14px">${escaparHtml(tx.pie)}</p>`;
  return { asunto: tx.asunto, texto, html };
}

export async function enviarEmailVerificacion(usuario, token) {
  const enlace = `${config.urlPublica}/verificar?token=${token}`;
  const { asunto, texto, html } = componer('verificar', usuario, enlace);
  await enviarEmail({ para: usuario.email, asunto, texto, html });
}

export async function enviarEmailRecuperacion(usuario, token) {
  const enlace = `${config.urlPublica}/restablecer?token=${token}`;
  const { asunto, texto, html } = componer('recuperar', usuario, enlace);
  await enviarEmail({ para: usuario.email, asunto, texto, html });
}
