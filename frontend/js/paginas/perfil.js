// Perfil (RF-10 a RF-12, RF-18, RF-19). Responsable: Ana (#24)
// Datos de la cuenta, perfil fiscal, correo de Cuadra con sus emails de confianza,
// accesos y cerrar sesión.
import { iniciarPagina } from '../core/layout.js';
import { api } from '../core/api.js';
import { t } from '../core/i18n.js';
import { icono } from '../core/iconos.js';
import { html, seguro, mostrarToast } from '../core/ui.js';

const textos = {
  es: {
    'perfil.titulo': 'Perfil',
    'perfil.completa': 'Completa tu perfil fiscal antes de subir tu primera factura.',
    'perfil.bienvenida': '¡Te damos la bienvenida a Cuadra! Antes de subir tu primera factura, cuéntanos tus datos fiscales.',
    'perfil.fiscal': 'Perfil fiscal',
    'perfil.fiscalTexto': 'Con estos datos comprobamos que las facturas van a tu nombre.',
    'perfil.nif': 'NIF, NIE o CIF',
    'perfil.nifAyuda': 'Por ejemplo, 12345678Z.',
    'perfil.direccion': 'Dirección fiscal',
    'perfil.actividad': 'Actividad',
    'perfil.eligeActividad': 'Elige tu actividad',
    'perfil.regimen': 'Régimen de IVA',
    'perfil.regimenPropuesto': 'Te proponemos «{regimen}» por tu actividad. Puedes cambiarlo.',
    'perfil.gestoria': 'Email de tu gestoría (opcional)',
    'perfil.gestoriaAyuda': 'Si lo dejas vacío, el Excel y el informe solo se podrán descargar, no enviar.',
    'perfil.guardado': 'Perfil fiscal guardado',
    'perfil.listo': 'Ya está todo listo.',
    'perfil.subirPrimera': 'Subir mi primera factura',
    'perfil.error.nif': 'El NIF no es válido. Revisa los números y la letra.',
    'perfil.error.direccion': 'Escribe tu dirección fiscal.',
    'perfil.error.actividad': 'Elige una actividad de la lista.',
    'perfil.error.regimen_iva': 'Elige un régimen de IVA.',
    'perfil.error.email_gestoria': 'El email de la gestoría no es válido.',
    'perfil.correo': 'Tu correo de Cuadra',
    'perfil.correoTexto': 'Reenvía aquí tus facturas y entrarán solas en tu cuenta.',
    'perfil.copiar': 'Copiar',
    'perfil.copiado': 'Copiado',
    'perfil.confianza': 'Emails de confianza',
    'perfil.confianzaTexto': 'Además de {email}, solo se aceptan facturas enviadas desde estos emails.',
    'perfil.confianzaVacio': 'Aún no has añadido ninguno.',
    'perfil.confianzaNuevo': 'Añadir email',
    'perfil.anadir': 'Añadir',
    'perfil.quitar': 'Quitar {email}',
    'perfil.quitado': 'Email quitado',
    'perfil.error.email': 'El email no es válido.',
    'perfil.error.propio': 'Tu propio email ya puede enviar facturas.',
    'perfil.error.repetido': 'Ese email ya está en la lista.',
    'perfil.ajustes': 'Ajustes',
    'perfil.ajustesTexto': 'Idioma, modo oscuro y avisos por email',
    'perfil.plan': 'Tu plan',
    'perfil.planTexto': 'Facturas del mes, cambiar de plan y pagos',
    'perfil.calendario': 'Google Calendar',
    'perfil.calendarioTexto': 'Relaciona gastos con eventos y plazos de Hacienda',
    'perfil.salir': 'Cerrar sesión',
    'actividad.diseno': 'Diseño',
    'actividad.consultoria': 'Consultoría',
    'actividad.abogacia': 'Abogacía',
    'actividad.arquitectura': 'Arquitectura',
    'actividad.programacion': 'Programación y desarrollo',
    'actividad.marketing': 'Marketing y comunicación',
    'actividad.traduccion': 'Traducción',
    'actividad.fotografia': 'Fotografía y vídeo',
    'actividad.comercio': 'Comercio minorista',
    'actividad.transporte': 'Transporte',
    'actividad.hosteleria': 'Hostelería',
    'actividad.formacion': 'Formación y enseñanza',
    'actividad.sanidad': 'Sanidad',
    'actividad.otras': 'Otras',
    'regimen.general': 'General',
    'regimen.simplificado': 'Simplificado (módulos)',
    'regimen.recargo_equivalencia': 'Recargo de equivalencia',
    'regimen.exento': 'Exento',
  },
  en: {
    'perfil.titulo': 'Profile',
    'perfil.completa': 'Complete your tax profile before uploading your first invoice.',
    'perfil.bienvenida': 'Welcome to Cuadra! Before uploading your first invoice, tell us your tax details.',
    'perfil.fiscal': 'Tax profile',
    'perfil.fiscalTexto': 'We use these details to check that invoices are addressed to you.',
    'perfil.nif': 'Tax ID (NIF, NIE or CIF)',
    'perfil.nifAyuda': 'For example, 12345678Z.',
    'perfil.direccion': 'Tax address',
    'perfil.actividad': 'Activity',
    'perfil.eligeActividad': 'Choose your activity',
    'perfil.regimen': 'VAT scheme',
    'perfil.regimenPropuesto': 'We suggest “{regimen}” for your activity. You can change it.',
    'perfil.gestoria': "Your accountant's email (optional)",
    'perfil.gestoriaAyuda': 'If you leave it empty, the Excel file and the report can only be downloaded, not sent.',
    'perfil.guardado': 'Tax profile saved',
    'perfil.listo': 'You are all set.',
    'perfil.subirPrimera': 'Upload my first invoice',
    'perfil.error.nif': 'The tax ID is not valid. Check the numbers and the letter.',
    'perfil.error.direccion': 'Enter your tax address.',
    'perfil.error.actividad': 'Choose an activity from the list.',
    'perfil.error.regimen_iva': 'Choose a VAT scheme.',
    'perfil.error.email_gestoria': "The accountant's email is not valid.",
    'perfil.correo': 'Your Cuadra email',
    'perfil.correoTexto': 'Forward your invoices here and they will appear in your account.',
    'perfil.copiar': 'Copy',
    'perfil.copiado': 'Copied',
    'perfil.confianza': 'Trusted emails',
    'perfil.confianzaTexto': 'Besides {email}, invoices are only accepted from these emails.',
    'perfil.confianzaVacio': "You haven't added any yet.",
    'perfil.confianzaNuevo': 'Add email',
    'perfil.anadir': 'Add',
    'perfil.quitar': 'Remove {email}',
    'perfil.quitado': 'Email removed',
    'perfil.error.email': 'The email is not valid.',
    'perfil.error.propio': 'Your own email can already send invoices.',
    'perfil.error.repetido': 'That email is already on the list.',
    'perfil.ajustes': 'Settings',
    'perfil.ajustesTexto': 'Language, dark mode and email alerts',
    'perfil.plan': 'Your plan',
    'perfil.planTexto': "This month's invoices, change plan and payments",
    'perfil.calendario': 'Google Calendar',
    'perfil.calendarioTexto': 'Match expenses with events and tax deadlines',
    'perfil.salir': 'Log out',
    'actividad.diseno': 'Design',
    'actividad.consultoria': 'Consulting',
    'actividad.abogacia': 'Law',
    'actividad.arquitectura': 'Architecture',
    'actividad.programacion': 'Software development',
    'actividad.marketing': 'Marketing and communication',
    'actividad.traduccion': 'Translation',
    'actividad.fotografia': 'Photography and video',
    'actividad.comercio': 'Retail',
    'actividad.transporte': 'Transport',
    'actividad.hosteleria': 'Hospitality',
    'actividad.formacion': 'Training and teaching',
    'actividad.sanidad': 'Healthcare',
    'actividad.otras': 'Other',
    'regimen.general': 'Standard',
    'regimen.simplificado': 'Simplified (modules)',
    'regimen.recargo_equivalencia': 'Equivalence surcharge',
    'regimen.exento': 'Exempt',
  },
};

const { usuario } = await iniciarPagina({ pagina: 'perfil', privada: true, textos });
const esNuevo = new URLSearchParams(location.search).get('nuevo') === '1';

const [perfil, { actividades, regimenes }, emailsConfianza] = await Promise.all([
  api('/perfil'),
  api('/perfil/actividades'),
  api('/perfil/emails-confianza'),
]);
const regimenPropuesto = Object.fromEntries(actividades.map((a) => [a.clave, a.regimen_iva]));

const enlace = (href, nombreIcono, titulo, texto) => html`
  <a class="fila" href="${href}">
    <span class="fila-icono">${seguro(icono(nombreIcono))}</span>
    <span class="fila-centro"><span class="fila-titulo">${titulo}</span><span class="fila-sub">${texto}</span></span>
    ${seguro(icono('flecha', 'banner-flecha'))}
  </a>`;

const opcion = (valor, texto, elegido) => html`<option value="${valor}" ${seguro(valor === elegido ? 'selected' : '')}>${texto}</option>`;

const campo = ({ nombre, etiqueta, ayuda, control }) => html`
  <div class="campo">
    <label for="${nombre}">${etiqueta}</label>
    ${seguro(control)}
    ${ayuda ? seguro(html`<p class="campo-ayuda" id="${nombre}-ayuda">${ayuda}</p>`) : ''}
    <p class="campo-error" id="${nombre}-error" hidden></p>
  </div>`;

function bannerInicial() {
  if (esNuevo && !perfil) return html`<div class="banner">${seguro(icono('destello'))}<span class="banner-texto">${t('perfil.bienvenida')}</span></div>`;
  if (!usuario.perfil_completo) return html`<div class="banner">${seguro(icono('destello'))}<span class="banner-texto">${t('perfil.completa')}</span></div>`;
  return '';
}

function formularioFiscal() {
  const actual = perfil || {};
  return html`
    <form class="formulario" id="form-fiscal" novalidate>
      ${seguro(campo({
        nombre: 'nif', etiqueta: t('perfil.nif'), ayuda: t('perfil.nifAyuda'),
        control: html`<input id="nif" name="nif" required autocomplete="off" autocapitalize="characters" spellcheck="false" aria-describedby="nif-ayuda nif-error" value="${actual.nif || ''}">`,
      }))}
      ${seguro(campo({
        nombre: 'direccion', etiqueta: t('perfil.direccion'),
        control: html`<input id="direccion" name="direccion" required autocomplete="street-address" aria-describedby="direccion-error" value="${actual.direccion || ''}">`,
      }))}
      ${seguro(campo({
        nombre: 'actividad', etiqueta: t('perfil.actividad'),
        control: html`<select id="actividad" name="actividad" required aria-describedby="actividad-error">
          ${seguro(actual.actividad ? '' : html`<option value="" selected disabled>${t('perfil.eligeActividad')}</option>`)}
          ${actividades.map((a) => seguro(opcion(a.clave, t(`actividad.${a.clave}`), actual.actividad)))}
        </select>`,
      }))}
      ${seguro(campo({
        nombre: 'regimen_iva', etiqueta: t('perfil.regimen'), ayuda: ' ',
        control: html`<select id="regimen_iva" name="regimen_iva" required aria-describedby="regimen_iva-ayuda regimen_iva-error">
          ${regimenes.map((r) => seguro(opcion(r, t(`regimen.${r}`), actual.regimen_iva || 'general')))}
        </select>`,
      }))}
      ${seguro(campo({
        nombre: 'email_gestoria', etiqueta: t('perfil.gestoria'), ayuda: t('perfil.gestoriaAyuda'),
        control: html`<input id="email_gestoria" name="email_gestoria" type="email" autocomplete="email" aria-describedby="email_gestoria-ayuda email_gestoria-error" value="${actual.email_gestoria || ''}">`,
      }))}
      <button type="submit" class="boton boton-principal">${t('comun.guardar')}</button>
      <div class="perfil-listo" id="listo" hidden>
        <p>${seguro(icono('check'))} ${t('perfil.listo')}</p>
        <a class="boton boton-principal" href="/app/subir">${seguro(icono('subir'))}${t('perfil.subirPrimera')}</a>
      </div>
    </form>`;
}

function filaEmail(e) {
  return html`
    <li class="fila">
      <span class="fila-centro"><span class="fila-titulo">${e.email}</span></span>
      <button type="button" class="boton-icono" data-quitar="${e.id}" aria-label="${t('perfil.quitar', { email: e.email })}" title="${t('perfil.quitar', { email: e.email })}">${seguro(icono('papelera'))}</button>
    </li>`;
}

document.getElementById('contenido').innerHTML = html`
  <div class="cabecera-pagina">
    <h1 class="titulo-pagina">${t('perfil.titulo')}</h1>
  </div>
  <div class="pila">
    ${seguro(bannerInicial())}
    <section class="tarjeta perfil-usuario">
      <span class="avatar">${(usuario.nombre || '?')[0].toUpperCase()}</span>
      <div><p class="titulo-seccion">${usuario.nombre}</p><p class="texto-2">${usuario.email}</p></div>
    </section>
    <section class="tarjeta" aria-labelledby="titulo-fiscal">
      <h2 class="titulo-seccion" id="titulo-fiscal">${t('perfil.fiscal')}</h2>
      <p class="texto-2 perfil-intro">${t('perfil.fiscalTexto')}</p>
      ${seguro(formularioFiscal())}
    </section>
    <section class="tarjeta" aria-labelledby="titulo-correo">
      <h2 class="titulo-seccion" id="titulo-correo">${t('perfil.correo')}</h2>
      <p class="texto-2">${t('perfil.correoTexto')}</p>
      <div class="correo-cuadra">
        <code>${usuario.correo_cuadra}</code>
        <button type="button" class="boton-texto" id="copiar">${t('perfil.copiar')}</button>
      </div>
      <h3 class="perfil-subtitulo">${t('perfil.confianza')}</h3>
      <p class="texto-2">${t('perfil.confianzaTexto', { email: usuario.email })}</p>
      <ul class="lista" id="lista-confianza"></ul>
      <form class="perfil-confianza-form" id="form-confianza" novalidate>
        <div class="campo">
          <label for="email-confianza">${t('perfil.confianzaNuevo')}</label>
          <div class="perfil-confianza-fila">
            <input id="email-confianza" name="email" type="email" autocomplete="off" required aria-describedby="email-confianza-error">
            <button type="submit" class="boton boton-secundario">${t('perfil.anadir')}</button>
          </div>
          <p class="campo-error" id="email-confianza-error" hidden></p>
        </div>
      </form>
    </section>
    <nav class="tarjeta perfil-enlaces lista">
      ${seguro(enlace('/app/ajustes', 'ajustes', t('perfil.ajustes'), t('perfil.ajustesTexto')))}
      ${seguro(enlace('/app/suscripcion', 'tarjeta', t('perfil.plan'), t('perfil.planTexto')))}
      ${seguro(enlace('/app/calendario', 'calendario', t('perfil.calendario'), t('perfil.calendarioTexto')))}
    </nav>
    <button type="button" class="boton boton-secundario" id="salir">${seguro(icono('salir'))}${t('perfil.salir')}</button>
  </div>`;

// ---------- Perfil fiscal ----------
const formFiscal = document.getElementById('form-fiscal');
const selectActividad = document.getElementById('actividad');
const selectRegimen = document.getElementById('regimen_iva');
const ayudaRegimen = document.getElementById('regimen_iva-ayuda');

function mostrarPropuesta() {
  const propuesto = regimenPropuesto[selectActividad.value];
  ayudaRegimen.textContent = propuesto ? t('perfil.regimenPropuesto', { regimen: t(`regimen.${propuesto}`) }) : '';
  ayudaRegimen.hidden = !propuesto;
}

// RF-11: al elegir la actividad se propone su régimen; el usuario puede cambiarlo después.
selectActividad.addEventListener('change', () => {
  const propuesto = regimenPropuesto[selectActividad.value];
  if (propuesto) selectRegimen.value = propuesto;
  mostrarPropuesta();
  limpiarError('actividad');
});
mostrarPropuesta();

function limpiarError(nombre) {
  const error = document.getElementById(`${nombre}-error`);
  if (!error) return;
  error.hidden = true;
  document.getElementById(nombre)?.removeAttribute('aria-invalid');
}

function marcarError(nombre, mensaje) {
  const error = document.getElementById(`${nombre}-error`);
  const control = document.getElementById(nombre);
  error.textContent = mensaje;
  error.hidden = false;
  control?.setAttribute('aria-invalid', 'true');
  control?.focus();
}

formFiscal.addEventListener('input', (evento) => limpiarError(evento.target.id));

formFiscal.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  for (const nombre of ['nif', 'direccion', 'actividad', 'regimen_iva', 'email_gestoria']) limpiarError(nombre);
  const boton = formFiscal.querySelector('button[type="submit"]');
  boton.disabled = true;
  try {
    await api('/perfil', { metodo: 'PUT', cuerpo: Object.fromEntries(new FormData(formFiscal)) });
    mostrarToast(t('perfil.guardado'));
    document.querySelector('.banner')?.remove();
    if (esNuevo) {
      const listo = document.getElementById('listo');
      listo.hidden = false;
      listo.querySelector('a').focus();
    }
  } catch (e) {
    const nombre = e.detalles?.campo;
    if (nombre && document.getElementById(`${nombre}-error`)) marcarError(nombre, t(`perfil.error.${nombre}`));
    else mostrarToast(e.message || t('comun.error'));
  } finally {
    boton.disabled = false;
  }
});

// ---------- Emails de confianza (RF-19) ----------
const listaConfianza = document.getElementById('lista-confianza');
let emails = emailsConfianza;

function pintarEmails() {
  listaConfianza.innerHTML = emails.length
    ? emails.map(filaEmail).join('')
    : html`<li class="fila texto-2">${t('perfil.confianzaVacio')}</li>`;
}
pintarEmails();

listaConfianza.addEventListener('click', async (evento) => {
  const boton = evento.target.closest('[data-quitar]');
  if (!boton) return;
  boton.disabled = true;
  try {
    await api(`/perfil/emails-confianza/${boton.dataset.quitar}`, { metodo: 'DELETE' });
    emails = emails.filter((e) => String(e.id) !== boton.dataset.quitar);
    pintarEmails();
    mostrarToast(t('perfil.quitado'));
  } catch (e) {
    boton.disabled = false;
    mostrarToast(e.message || t('comun.error'));
  }
});

const formConfianza = document.getElementById('form-confianza');
const inputConfianza = document.getElementById('email-confianza');
inputConfianza.addEventListener('input', () => limpiarError('email-confianza'));

formConfianza.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  limpiarError('email-confianza');
  const boton = formConfianza.querySelector('button[type="submit"]');
  boton.disabled = true;
  try {
    const nuevo = await api('/perfil/emails-confianza', { metodo: 'POST', cuerpo: { email: inputConfianza.value } });
    emails = [...emails, nuevo].sort((a, b) => a.email.localeCompare(b.email));
    pintarEmails();
    formConfianza.reset();
  } catch (e) {
    const codigo = e.detalles?.codigo;
    if (codigo === 'propio' || codigo === 'repetido') marcarError('email-confianza', t(`perfil.error.${codigo}`));
    else if (e.detalles?.campo === 'email') marcarError('email-confianza', t('perfil.error.email'));
    else mostrarToast(e.message || t('comun.error'));
  } finally {
    boton.disabled = false;
  }
});

// ---------- Resto ----------
document.getElementById('copiar').addEventListener('click', async () => {
  await navigator.clipboard?.writeText(usuario.correo_cuadra).catch(() => {});
  mostrarToast(t('perfil.copiado'));
});

document.getElementById('salir').addEventListener('click', async () => {
  await api('/auth/salir', { metodo: 'POST' });
  location.href = '/';
});
