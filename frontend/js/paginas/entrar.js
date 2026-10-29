// Iniciar sesión (RF-03, RF-06). Responsable: Ana
import { iniciarPagina } from '../core/layout.js';
import { api } from '../core/api.js';
import { t } from '../core/i18n.js';
import { mostrarToast } from '../core/ui.js';
import { textosAcceso, activarBotonGoogle, mensajeError } from './acceso-textos.js';

const { usuario } = await iniciarPagina({ pagina: 'entrar', textos: textosAcceso });
const parametros = new URLSearchParams(location.search);
const volver = parametros.get('volver');
const destino = volver && volver.startsWith('/') && !volver.startsWith('//') ? volver : '/app/panel';
if (usuario) location.replace(destino);

activarBotonGoogle(document.getElementById('google'), () => mostrarToast(t('acceso.googlePendiente')), destino);

const formulario = document.getElementById('formulario');
const error = document.getElementById('error');

// Vuelta de Google con error: /entrar?error=google o google_email.
const errorGoogle = { google: 'acceso.googleError', google_email: 'acceso.googleEmail' }[parametros.get('error')];
if (errorGoogle) {
  error.textContent = t(errorGoogle);
  error.hidden = false;
}
formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  error.hidden = true;
  const boton = formulario.querySelector('button[type="submit"]');
  boton.disabled = true;
  try {
    await api('/auth/entrar', { metodo: 'POST', cuerpo: Object.fromEntries(new FormData(formulario)) });
    location.href = destino;
  } catch (e) {
    error.textContent = mensajeError(e);
    error.hidden = false;
    boton.disabled = false;
  }
});
