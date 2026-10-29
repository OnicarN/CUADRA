// Verificar email (RF-07). Responsable: Ana (#23)
// El enlace del email abre /verificar?token=...: se confirma y se lleva al usuario a la app.
// Sin token (por ejemplo, desde un aviso), explica a dónde se ha enviado el email y deja reenviarlo.
import { iniciarPagina } from '../core/layout.js';
import { api } from '../core/api.js';
import { t } from '../core/i18n.js';
import { html, seguro, mostrarToast } from '../core/ui.js';
import { textosAcceso, mensajeError, estado } from './acceso-textos.js';

const textos = {
  es: {
    ...textosAcceso.es,
    'verificar.titulo': 'Verificar email',
    'verificar.comprobando': 'Comprobando el enlace…',
    'verificar.ok': '¡Email confirmado!',
    'verificar.okTexto': 'Ya puedes usar Cuadra. Te llevamos a tu cuenta…',
    'verificar.yaOk': 'Tu email ya está confirmado',
    'verificar.revisa': 'Revisa tu correo',
    'verificar.revisaTexto': 'Te hemos enviado un enlace para confirmar tu email a:',
    'verificar.caducaTexto': 'El enlace caduca en 24 horas. Si no lo encuentras, mira en la carpeta de spam.',
    'verificar.malTexto': 'Pide uno nuevo y usa el último que te llegue.',
    'verificar.reenviar': 'Reenviar el email',
    'verificar.reenviado': 'Te hemos enviado un email nuevo.',
  },
  en: {
    ...textosAcceso.en,
    'verificar.titulo': 'Verify your email',
    'verificar.comprobando': 'Checking the link…',
    'verificar.ok': 'Email confirmed!',
    'verificar.okTexto': 'You can now use Cuadra. Taking you to your account…',
    'verificar.yaOk': 'Your email is already confirmed',
    'verificar.revisa': 'Check your inbox',
    'verificar.revisaTexto': 'We sent a link to confirm your email to:',
    'verificar.caducaTexto': "The link expires in 24 hours. If you can't find it, check your spam folder.",
    'verificar.malTexto': 'Ask for a new one and use the latest one you get.',
    'verificar.reenviar': 'Resend the email',
    'verificar.reenviado': 'We have sent you a new email.',
  },
};
const { usuario } = await iniciarPagina({ pagina: 'verificar', textos });
const contenido = document.getElementById('contenido');
const token = new URLSearchParams(location.search).get('token');

const destinoDe = (u) => (u?.perfil_completo ? '/app/panel' : '/app/perfil');
const botonPanel = (u) => html`<a class="boton boton-principal boton-bloque" href="${destinoDe(u)}">${t('acceso.irAlPanel')}</a>`;
const botonReenviar = () => html`<button type="button" class="boton boton-secundario boton-bloque" id="reenviar">${t('verificar.reenviar')}</button>`;
const botonEntrar = () => html`<a class="boton boton-secundario boton-bloque" href="/entrar?volver=/verificar">${t('acceso.volverEntrar')}</a>`;
const acciones = (...botones) => html`<div class="acceso-acciones">${botones.map(seguro)}</div>`;

function pintar(trozo) {
  contenido.innerHTML = trozo;
  document.getElementById('reenviar')?.addEventListener('click', reenviar);
}

async function reenviar(evento) {
  const boton = evento.currentTarget;
  boton.disabled = true;
  try {
    await api('/auth/reenviar-verificacion', { metodo: 'POST' });
    mostrarToast(t('verificar.reenviado'));
  } catch (e) {
    mostrarToast(mensajeError(e));
  } finally {
    boton.disabled = false;
  }
}

if (token) {
  // El token ya no hace falta en la barra de direcciones (ni en el historial).
  history.replaceState(null, '', '/verificar');
  pintar(estado({ icono: 'reloj', titulo: t('verificar.comprobando') }));
  try {
    const verificado = await api('/auth/verificar', { metodo: 'POST', cuerpo: { token } });
    pintar(estado({ icono: 'check', tipo: 'ok', titulo: t('verificar.ok'), texto: t('verificar.okTexto'), acciones: acciones(botonPanel(verificado)) }));
    setTimeout(() => location.replace(destinoDe(verificado)), 2500);
  } catch (e) {
    const puedeReenviar = usuario && !usuario.email_verificado;
    pintar(estado({
      icono: 'alerta', tipo: 'mal', titulo: mensajeError(e),
      texto: usuario?.email_verificado ? t('verificar.yaOk') : t('verificar.malTexto'),
      acciones: acciones(usuario?.email_verificado ? botonPanel(usuario) : puedeReenviar ? botonReenviar() : botonEntrar()),
    }));
  }
} else if (!usuario) {
  pintar(estado({ icono: 'correo', titulo: t('verificar.revisa'), texto: t('verificar.caducaTexto'), acciones: acciones(botonEntrar()) }));
} else if (usuario.email_verificado) {
  pintar(estado({ icono: 'check', tipo: 'ok', titulo: t('verificar.yaOk'), acciones: acciones(botonPanel(usuario)) }));
} else {
  pintar(html`
    ${seguro(estado({ icono: 'correo', titulo: t('verificar.revisa'), texto: t('verificar.revisaTexto') }))}
    <p class="acceso-email">${usuario.email}</p>
    <p class="texto-2">${t('verificar.caducaTexto')}</p>
    ${seguro(acciones(botonReenviar(), botonPanel(usuario)))}`);
}
