// Crear cuenta (RF-03, RF-05, RF-06, RF-07). Responsable: Ana
import { iniciarPagina } from '../core/layout.js';
import { api } from '../core/api.js';
import { t, idioma } from '../core/i18n.js';
import { mostrarToast } from '../core/ui.js';
import { textosAcceso, activarBotonGoogle, mensajeError } from './acceso-textos.js';

const { usuario } = await iniciarPagina({ pagina: 'registro', textos: textosAcceso });
if (usuario) location.replace('/app/panel');

// Si viene de precios (/registro?plan=pro), se guarda el plan para proponerlo luego en
// la pantalla de suscripción (#26), que lo lee de localStorage 'cuadra-plan-elegido'.
const plan = new URLSearchParams(location.search).get('plan');
if (plan && /^[a-z0-9-]{1,30}$/.test(plan)) {
  try { localStorage.setItem('cuadra-plan-elegido', plan); } catch { /* sin almacenamiento */ }
}

activarBotonGoogle(document.getElementById('google'), () => mostrarToast(t('acceso.googlePendiente')));

const formulario = document.getElementById('formulario');
const error = document.getElementById('error');
formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  error.hidden = true;
  const boton = formulario.querySelector('button[type="submit"]');
  boton.disabled = true;
  try {
    const cuerpo = { ...Object.fromEntries(new FormData(formulario)), idioma: idioma() };
    await api('/auth/registro', { metodo: 'POST', cuerpo });
    // Antes de subir la primera factura hace falta el perfil fiscal (RF-10).
    location.href = '/app/perfil?nuevo=1';
  } catch (e) {
    error.textContent = mensajeError(e);
    error.hidden = false;
    boton.disabled = false;
  }
});
