// Iniciar sesión (RF-03). Responsable: Ana
import { iniciarPagina } from '../core/layout.js';
import { api } from '../core/api.js';
import { t } from '../core/i18n.js';
import { mostrarToast } from '../core/ui.js';
import { textosAcceso, activarBotonGoogle } from './acceso-textos.js';

const { usuario } = await iniciarPagina({ pagina: 'entrar', textos: textosAcceso });
const volver = new URLSearchParams(location.search).get('volver');
const destino = volver && volver.startsWith('/') && !volver.startsWith('//') ? volver : '/app/panel';
if (usuario) location.replace(destino);

activarBotonGoogle(document.getElementById('google'), () => mostrarToast(t('acceso.googlePendiente')));

const formulario = document.getElementById('formulario');
const error = document.getElementById('error');
formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  error.hidden = true;
  const boton = formulario.querySelector('button[type="submit"]');
  boton.disabled = true;
  try {
    await api('/auth/entrar', { metodo: 'POST', cuerpo: Object.fromEntries(new FormData(formulario)) });
    location.href = destino;
  } catch (e) {
    error.textContent = e.message;
    error.hidden = false;
    boton.disabled = false;
  }
});
