// Nueva contraseña (RF-08). Responsable: Ana (#23)
// Se llega desde el enlace del email: /restablecer?token=...
import { iniciarPagina } from '../core/layout.js';
import { api } from '../core/api.js';
import { t } from '../core/i18n.js';
import { html } from '../core/ui.js';
import { textosAcceso, mensajeError, estado } from './acceso-textos.js';

const textos = {
  es: {
    ...textosAcceso.es,
    'restablecer.titulo': 'Nueva contraseña',
    'restablecer.subtitulo': 'Elige la contraseña con la que entrarás a partir de ahora.',
    'restablecer.repetir': 'Repite la contraseña',
    'restablecer.noCoinciden': 'Las dos contraseñas no coinciden.',
    'restablecer.boton': 'Guardar contraseña',
    'restablecer.pedirOtro': 'Pedir un enlace nuevo',
    'restablecer.sinToken': 'Para cambiar la contraseña, abre el enlace que te hemos enviado por email.',
  },
  en: {
    ...textosAcceso.en,
    'restablecer.titulo': 'New password',
    'restablecer.subtitulo': 'Choose the password you will use to log in from now on.',
    'restablecer.repetir': 'Repeat the password',
    'restablecer.noCoinciden': "The two passwords don't match.",
    'restablecer.boton': 'Save password',
    'restablecer.pedirOtro': 'Ask for a new link',
    'restablecer.sinToken': 'To change your password, open the link we sent you by email.',
  },
};
await iniciarPagina({ pagina: 'restablecer', textos });
const contenido = document.getElementById('contenido');
const token = new URLSearchParams(location.search).get('token');
const botonPedirOtro = () => html`<a class="boton boton-principal boton-bloque" href="/recuperar">${t('restablecer.pedirOtro')}</a>`;

if (!token) {
  contenido.innerHTML = estado({ icono: 'alerta', tipo: 'mal', titulo: t('restablecer.titulo'), texto: t('restablecer.sinToken'), acciones: botonPedirOtro() });
} else {
  contenido.innerHTML = html`
    <h1 class="titulo-pagina">${t('restablecer.titulo')}</h1>
    <p class="texto-2">${t('restablecer.subtitulo')}</p>
    <form class="formulario" id="formulario" novalidate>
      <div class="campo">
        <label for="password">${t('acceso.passwordNueva')}</label>
        <input id="password" name="password" type="password" autocomplete="new-password" minlength="8" required>
        <span class="campo-ayuda">${t('acceso.passwordAyuda')}</span>
      </div>
      <div class="campo">
        <label for="repetir">${t('restablecer.repetir')}</label>
        <input id="repetir" name="repetir" type="password" autocomplete="new-password" minlength="8" required>
      </div>
      <p class="error-formulario" id="error" role="alert" hidden></p>
      <button class="boton boton-principal boton-bloque" type="submit">${t('restablecer.boton')}</button>
    </form>`;

  const formulario = document.getElementById('formulario');
  const error = document.getElementById('error');
  const mostrarError = (texto) => { error.textContent = texto; error.hidden = false; };

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    error.hidden = true;
    const password = formulario.password.value;
    if (password.length < 8) return mostrarError(t('acceso.passwordCorta'));
    if (password !== formulario.repetir.value) return mostrarError(t('restablecer.noCoinciden'));
    const boton = formulario.querySelector('button[type="submit"]');
    boton.disabled = true;
    try {
      const usuario = await api('/auth/restablecer', { metodo: 'POST', cuerpo: { token, password } });
      location.replace(usuario.perfil_completo ? '/app/panel' : '/app/perfil');
    } catch (e) {
      boton.disabled = false;
      if (e.detalles?.codigo === 'enlace_no_valido') {
        contenido.innerHTML = estado({ icono: 'alerta', tipo: 'mal', titulo: t('acceso.enlaceNoValido'), acciones: botonPedirOtro() });
      } else {
        mostrarError(mensajeError(e));
      }
    }
  });
}
