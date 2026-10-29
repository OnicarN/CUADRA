// Perfil (RF-10 a RF-12, RF-18, RF-19). Responsable: Ana (#24)
// Hecho: datos de la cuenta, correo de Cuadra, accesos y cerrar sesión.
// Pendiente: formulario del perfil fiscal (NIF, dirección, actividad, régimen de IVA,
// email de la gestoría) y la lista de emails de confianza.
import { iniciarPagina } from '../core/layout.js';
import { api } from '../core/api.js';
import { t } from '../core/i18n.js';
import { icono } from '../core/iconos.js';
import { html, seguro, enConstruccion, mostrarToast } from '../core/ui.js';

const textos = {
  es: {
    'perfil.titulo': 'Perfil',
    'perfil.completa': 'Completa tu perfil fiscal antes de subir tu primera factura.',
    'perfil.fiscal': 'Perfil fiscal',
    'perfil.fiscalTexto': 'NIF, dirección fiscal, actividad y email de tu gestoría.',
    'perfil.correo': 'Tu correo de Cuadra',
    'perfil.correoTexto': 'Reenvía aquí tus facturas y entrarán solas en tu cuenta.',
    'perfil.copiar': 'Copiar',
    'perfil.copiado': 'Copiado',
    'perfil.ajustes': 'Ajustes',
    'perfil.ajustesTexto': 'Idioma, modo oscuro y avisos por email',
    'perfil.plan': 'Tu plan',
    'perfil.planTexto': 'Facturas del mes, cambiar de plan y pagos',
    'perfil.calendario': 'Google Calendar',
    'perfil.calendarioTexto': 'Relaciona gastos con eventos y plazos de Hacienda',
    'perfil.salir': 'Cerrar sesión',
  },
  en: {
    'perfil.titulo': 'Profile',
    'perfil.completa': 'Complete your tax profile before uploading your first invoice.',
    'perfil.fiscal': 'Tax profile',
    'perfil.fiscalTexto': "Tax ID, tax address, activity and your accountant's email.",
    'perfil.correo': 'Your Cuadra email',
    'perfil.correoTexto': 'Forward your invoices here and they will appear in your account.',
    'perfil.copiar': 'Copy',
    'perfil.copiado': 'Copied',
    'perfil.ajustes': 'Settings',
    'perfil.ajustesTexto': 'Language, dark mode and email alerts',
    'perfil.plan': 'Your plan',
    'perfil.planTexto': "This month's invoices, change plan and payments",
    'perfil.calendario': 'Google Calendar',
    'perfil.calendarioTexto': 'Match expenses with events and tax deadlines',
    'perfil.salir': 'Log out',
  },
};

const { usuario } = await iniciarPagina({ pagina: 'perfil', privada: true, textos });

const enlace = (href, nombreIcono, titulo, texto) => html`
  <a class="fila" href="${href}">
    <span class="fila-icono">${seguro(icono(nombreIcono))}</span>
    <span class="fila-centro"><span class="fila-titulo">${titulo}</span><span class="fila-sub">${texto}</span></span>
    ${seguro(icono('flecha', 'banner-flecha'))}
  </a>`;

document.getElementById('contenido').innerHTML = html`
  <div class="cabecera-pagina">
    <h1 class="titulo-pagina">${t('perfil.titulo')}</h1>
  </div>
  <div class="pila">
    ${usuario.perfil_completo ? '' : seguro(html`<div class="banner">${seguro(icono('destello'))}<span class="banner-texto">${t('perfil.completa')}</span></div>`)}
    <section class="tarjeta perfil-usuario">
      <span class="avatar">${(usuario.nombre || '?')[0].toUpperCase()}</span>
      <div><p class="titulo-seccion">${usuario.nombre}</p><p class="texto-2">${usuario.email}</p></div>
    </section>
    <section class="tarjeta">
      <div class="tarjeta-cabecera">
        <h2 class="titulo-seccion">${t('perfil.fiscal')}</h2>
        ${seguro(enConstruccion({ responsable: 'Ana', issue: '#24' }))}
      </div>
      <p class="texto-2">${t('perfil.fiscalTexto')}</p>
    </section>
    <section class="tarjeta">
      <h2 class="titulo-seccion">${t('perfil.correo')}</h2>
      <p class="texto-2">${t('perfil.correoTexto')}</p>
      <div class="correo-cuadra">
        <code>${usuario.correo_cuadra}</code>
        <button type="button" class="boton-texto" id="copiar">${t('perfil.copiar')}</button>
      </div>
    </section>
    <nav class="tarjeta perfil-enlaces lista">
      ${seguro(enlace('/app/ajustes', 'ajustes', t('perfil.ajustes'), t('perfil.ajustesTexto')))}
      ${seguro(enlace('/app/suscripcion', 'tarjeta', t('perfil.plan'), t('perfil.planTexto')))}
      ${seguro(enlace('/app/calendario', 'calendario', t('perfil.calendario'), t('perfil.calendarioTexto')))}
    </nav>
    <button type="button" class="boton boton-secundario" id="salir">${seguro(icono('salir'))}${t('perfil.salir')}</button>
  </div>`;

document.getElementById('copiar').addEventListener('click', async () => {
  await navigator.clipboard?.writeText(usuario.correo_cuadra).catch(() => {});
  mostrarToast(t('perfil.copiado'));
});

document.getElementById('salir').addEventListener('click', async () => {
  await api('/auth/salir', { metodo: 'POST' });
  location.href = '/';
});
