// Recuperar contraseña (RF-08). Responsable: Ana (#23)
// Pide el email y manda un enlace a /restablecer. La respuesta es la misma exista o no la cuenta.
import { iniciarPagina } from '../core/layout.js';
import { api } from '../core/api.js';
import { t } from '../core/i18n.js';
import { html } from '../core/ui.js';
import { textosAcceso, mensajeError, estado } from './acceso-textos.js';

const textos = {
  es: {
    ...textosAcceso.es,
    'recuperar.titulo': 'Recuperar contraseña',
    'recuperar.subtitulo': 'Escribe el email de tu cuenta y te enviaremos un enlace para elegir una contraseña nueva.',
    'recuperar.boton': 'Enviar enlace',
    'recuperar.enviado': 'Revisa tu correo',
    'recuperar.enviadoTexto': 'Si hay una cuenta con {email}, te hemos enviado un enlace. Caduca en 1 hora.',
  },
  en: {
    ...textosAcceso.en,
    'recuperar.titulo': 'Reset your password',
    'recuperar.subtitulo': "Enter your account email and we'll send you a link to choose a new password.",
    'recuperar.boton': 'Send link',
    'recuperar.enviado': 'Check your inbox',
    'recuperar.enviadoTexto': 'If there is an account with {email}, we have sent you a link. It expires in 1 hour.',
  },
};
await iniciarPagina({ pagina: 'recuperar', textos });
const contenido = document.getElementById('contenido');

contenido.innerHTML = html`
  <h1 class="titulo-pagina">${t('recuperar.titulo')}</h1>
  <p class="texto-2">${t('recuperar.subtitulo')}</p>
  <form class="formulario" id="formulario" novalidate>
    <div class="campo">
      <label for="email">${t('acceso.email')}</label>
      <input id="email" name="email" type="email" autocomplete="email" required>
    </div>
    <p class="error-formulario" id="error" role="alert" hidden></p>
    <button class="boton boton-principal boton-bloque" type="submit">${t('recuperar.boton')}</button>
  </form>
  <p class="texto-2 acceso-pie"><a class="boton-texto" href="/entrar">${t('acceso.volverEntrar')}</a></p>`;

const formulario = document.getElementById('formulario');
const error = document.getElementById('error');
formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  error.hidden = true;
  const email = formulario.email.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    error.textContent = t('acceso.emailNoValido');
    error.hidden = false;
    return;
  }
  const boton = formulario.querySelector('button[type="submit"]');
  boton.disabled = true;
  try {
    await api('/auth/recuperar', { metodo: 'POST', cuerpo: { email } });
    contenido.innerHTML = estado({
      icono: 'correo', titulo: t('recuperar.enviado'), texto: t('recuperar.enviadoTexto', { email }),
      acciones: html`<a class="boton boton-secundario boton-bloque" href="/entrar">${t('acceso.volverEntrar')}</a>`,
    });
  } catch (e) {
    error.textContent = mensajeError(e);
    error.hidden = false;
    boton.disabled = false;
  }
});
