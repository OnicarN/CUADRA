// Crear cuenta (RF-03, RF-05). Responsable: Ana
import { iniciarPagina } from '../core/layout.js';
import { api } from '../core/api.js';
import { t } from '../core/i18n.js';
import { mostrarToast } from '../core/ui.js';
import { textosAcceso, activarBotonGoogle } from './acceso-textos.js';

const { usuario } = await iniciarPagina({ pagina: 'registro', textos: textosAcceso });
if (usuario) location.replace('/app/panel');

activarBotonGoogle(document.getElementById('google'), () => mostrarToast(t('acceso.googlePendiente')));

const formulario = document.getElementById('formulario');
const error = document.getElementById('error');
formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  error.hidden = true;
  const boton = formulario.querySelector('button[type="submit"]');
  boton.disabled = true;
  try {
    await api('/auth/registro', { metodo: 'POST', cuerpo: Object.fromEntries(new FormData(formulario)) });
    // Antes de subir la primera factura hace falta el perfil fiscal (RF-10).
    location.href = '/app/perfil?nuevo=1';
  } catch (e) {
    error.textContent = e.message;
    error.hidden = false;
    boton.disabled = false;
  }
});
