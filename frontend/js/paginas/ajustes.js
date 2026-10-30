// Ajustes (RF-04, RF-41, RF-42, RF-62). Responsable: Ana (#24, #27)
// Idioma, modo claro u oscuro, avisos (cuándo saltan y cuáles llegan por email) y eliminar la cuenta,
// que abre una ventana en dos pasos: primero guardar la copia de todo y luego confirmar con el email.
import { iniciarPagina } from '../core/layout.js';
import { api } from '../core/api.js';
import { t, idioma, cambiarIdioma } from '../core/i18n.js';
import { cambiarTema, temaGuardado } from '../core/tema.js';
import { icono } from '../core/iconos.js';
import { html, seguro, mostrarToast } from '../core/ui.js';

const textos = {
  es: {
    'ajustes.titulo': 'Ajustes',
    'ajustes.idioma': 'Idioma',
    'ajustes.idiomaTexto': 'El idioma de la web y de los emails que te enviamos.',
    'ajustes.tema': 'Apariencia',
    'ajustes.temaTexto': 'Por defecto sigue la configuración de tu dispositivo.',
    'ajustes.tema.sistema': 'Sistema',
    'ajustes.tema.claro': 'Claro',
    'ajustes.tema.oscuro': 'Oscuro',
    'ajustes.avisos': 'Avisos',
    'ajustes.avisosTexto': 'Elige cuándo te avisamos y qué avisos te llegan también por email.',
    'ajustes.diasPendiente': 'Avisarme de facturas pendientes de revisar tras',
    'ajustes.diasTrimestre': 'Avisarme antes de que cierre el trimestre con',
    'ajustes.dias': 'días',
    'ajustes.diasError': 'Escribe un número de días entre 1 y 365.',
    'ajustes.porEmail': 'Recibir por email',
    'ajustes.guardado': 'Ajustes guardados',
    'aviso.sin_nif': 'Ticket sin NIF',
    'aviso.otro_nif': 'Factura a otro NIF',
    'aviso.total_no_cuadra': 'Total que no cuadra',
    'aviso.duplicado': 'Posible duplicado',
    'aviso.pendiente_revisar': 'Pendiente de revisar',
    'aviso.trimestre': 'Trimestre a punto de cerrar',
    'aviso.evento_sin_ticket': 'Evento sin ticket',
    'aviso.texto_correo': 'Factura desde el texto del correo',
    'aviso.sin_leer': 'Facturas sin leer',
    'aviso.correo_no_autorizado': 'Correo no autorizado',
    'baja.titulo': 'Eliminar cuenta',
    'baja.texto': 'Borra tu cuenta y todas tus facturas. Antes podrás descargar una copia de todo.',
    'baja.boton': 'Eliminar cuenta',
    'baja.paso': 'Paso {n} de 2',
    'baja.guardarTitulo': 'Antes de irte, guarda tus facturas',
    'baja.guardarTexto': 'Hacienda puede pedirte las facturas y los justificantes durante varios años. Cuando elimines la cuenta, Cuadra no podrá recuperarlas.',
    'baja.contenido': 'La copia es un ZIP con:',
    'baja.contenidoExcel': 'Un Excel con tus facturas confirmadas y otro con las que no habías confirmado.',
    'baja.contenidoOriginales': 'Todas las fotos y PDFs originales, por año y trimestre.',
    'baja.descargar': 'Descargar copia (ZIP)',
    'baja.descargando': 'Preparando la copia…',
    'baja.descargado': 'Copia descargada',
    'baja.tengoCopia': 'Ya tengo mis facturas guardadas o no las necesito',
    'baja.continuar': 'Continuar',
    'baja.confirmarTitulo': '¿Eliminar tu cuenta para siempre?',
    'baja.seBorra': 'Se borrará, sin poder deshacerlo:',
    'baja.borraFacturas': 'Todas tus facturas y sus originales',
    'baja.borraPerfil': 'Tu perfil fiscal, tus avisos y tus ajustes',
    'baja.borraConexiones': 'Tu correo de Cuadra y la conexión con Google Calendar',
    'baja.borraPlan': 'Tu plan: si es de pago, se cancela y no se te cobrará más',
    'baja.escribeEmail': 'Para confirmar, escribe tu email ({email})',
    'baja.eliminar': 'Eliminar mi cuenta',
    'baja.atras': 'Atrás',
    'baja.noCoincide': 'El email no coincide con el de tu cuenta.',
  },
  en: {
    'ajustes.titulo': 'Settings',
    'ajustes.idioma': 'Language',
    'ajustes.idiomaTexto': 'The language of the website and of the emails we send you.',
    'ajustes.tema': 'Appearance',
    'ajustes.temaTexto': 'By default it follows your device settings.',
    'ajustes.tema.sistema': 'System',
    'ajustes.tema.claro': 'Light',
    'ajustes.tema.oscuro': 'Dark',
    'ajustes.avisos': 'Alerts',
    'ajustes.avisosTexto': 'Choose when we alert you and which alerts you also get by email.',
    'ajustes.diasPendiente': 'Alert me about invoices waiting for review after',
    'ajustes.diasTrimestre': 'Alert me before the quarter closes with',
    'ajustes.dias': 'days',
    'ajustes.diasError': 'Enter a number of days between 1 and 365.',
    'ajustes.porEmail': 'Get by email',
    'ajustes.guardado': 'Settings saved',
    'aviso.sin_nif': 'Receipt without tax ID',
    'aviso.otro_nif': 'Invoice to another tax ID',
    'aviso.total_no_cuadra': "Total doesn't add up",
    'aviso.duplicado': 'Possible duplicate',
    'aviso.pendiente_revisar': 'Waiting for review',
    'aviso.trimestre': 'Quarter about to close',
    'aviso.evento_sin_ticket': 'Event without receipt',
    'aviso.texto_correo': 'Invoice from email text',
    'aviso.sin_leer': 'Unread invoices',
    'aviso.correo_no_autorizado': 'Unauthorised email',
    'baja.titulo': 'Delete account',
    'baja.texto': 'Deletes your account and all your invoices. You can download a copy of everything first.',
    'baja.boton': 'Delete account',
    'baja.paso': 'Step {n} of 2',
    'baja.guardarTitulo': 'Before you go, keep your invoices',
    'baja.guardarTexto': 'The Spanish Tax Agency can ask for your invoices and receipts for several years. Once you delete your account, Cuadra cannot recover them.',
    'baja.contenido': 'The copy is a ZIP file with:',
    'baja.contenidoExcel': 'An Excel file with your confirmed invoices and another with the ones you had not confirmed.',
    'baja.contenidoOriginales': 'All the original photos and PDFs, sorted by year and quarter.',
    'baja.descargar': 'Download copy (ZIP)',
    'baja.descargando': 'Preparing the copy…',
    'baja.descargado': 'Copy downloaded',
    'baja.tengoCopia': "I've saved my invoices or I don't need them",
    'baja.continuar': 'Continue',
    'baja.confirmarTitulo': 'Delete your account forever?',
    'baja.seBorra': 'This will be deleted and cannot be undone:',
    'baja.borraFacturas': 'All your invoices and their originals',
    'baja.borraPerfil': 'Your tax profile, alerts and settings',
    'baja.borraConexiones': 'Your Cuadra email address and your Google Calendar connection',
    'baja.borraPlan': "Your plan: if it's a paid one, it is cancelled and you won't be charged again",
    'baja.escribeEmail': 'To confirm, type your email ({email})',
    'baja.eliminar': 'Delete my account',
    'baja.atras': 'Back',
    'baja.noCoincide': "The email doesn't match your account's.",
  },
};

const { usuario } = await iniciarPagina({ pagina: 'ajustes', privada: true, textos });
const ajustes = await api('/perfil/ajustes');

const IDIOMAS = [['es', 'Español'], ['en', 'English']];
const TEMAS = ['sistema', 'claro', 'oscuro'];
const temaActual = temaGuardado() !== 'sistema' ? temaGuardado() : usuario.tema;

const selector = (nombre, opciones, actual) => html`
  <div class="pestanas ajustes-selector" role="group" aria-labelledby="titulo-${nombre}">
    ${opciones.map(([valor, texto]) => seguro(html`
      <button type="button" class="pestana" data-${nombre}="${valor}" aria-pressed="${valor === actual}">${texto}</button>`))}
  </div>`;

const campoDias = (nombre, etiqueta, valor) => html`
  <div class="campo">
    <label for="${nombre}">${etiqueta}</label>
    <div class="ajustes-dias">
      <input id="${nombre}" name="${nombre}" type="number" inputmode="numeric" min="1" max="365" step="1" required value="${valor}" aria-describedby="${nombre}-error">
      <span>${t('ajustes.dias')}</span>
    </div>
    <p class="campo-error" id="${nombre}-error" hidden>${t('ajustes.diasError')}</p>
  </div>`;

const filaAviso = (tipo) => html`
  <li class="fila">
    <label class="ajustes-interruptor">
      <span class="fila-centro"><span class="fila-titulo">${t(`aviso.${tipo}`)}</span><span class="fila-sub">${t('ajustes.porEmail')}</span></span>
      <input type="checkbox" role="switch" name="email" value="${tipo}" ${seguro(ajustes.avisos_sin_email.includes(tipo) ? '' : 'checked')}>
    </label>
  </li>`;

document.getElementById('contenido').innerHTML = html`
  <div class="cabecera-pagina">
    <h1 class="titulo-pagina">${t('ajustes.titulo')}</h1>
  </div>
  <div class="pila">
    <section class="tarjeta">
      <h2 class="titulo-seccion" id="titulo-idioma">${t('ajustes.idioma')}</h2>
      <p class="texto-2 ajustes-texto">${t('ajustes.idiomaTexto')}</p>
      ${seguro(selector('idioma', IDIOMAS, idioma()))}
    </section>
    <section class="tarjeta">
      <h2 class="titulo-seccion" id="titulo-tema">${t('ajustes.tema')}</h2>
      <p class="texto-2 ajustes-texto">${t('ajustes.temaTexto')}</p>
      ${seguro(selector('tema', TEMAS.map((x) => [x, t(`ajustes.tema.${x}`)]), temaActual))}
    </section>
    <section class="tarjeta">
      <h2 class="titulo-seccion">${t('ajustes.avisos')}</h2>
      <p class="texto-2 ajustes-texto">${t('ajustes.avisosTexto')}</p>
      <form class="formulario" id="form-avisos" novalidate>
        ${seguro(campoDias('dias_aviso_pendiente', t('ajustes.diasPendiente'), ajustes.dias_aviso_pendiente))}
        ${seguro(campoDias('dias_aviso_trimestre', t('ajustes.diasTrimestre'), ajustes.dias_aviso_trimestre))}
        <ul class="lista">${ajustes.tipos_aviso.map((tipo) => seguro(filaAviso(tipo)))}</ul>
        <button type="submit" class="boton boton-principal">${t('comun.guardar')}</button>
      </form>
    </section>
    <section class="tarjeta ajustes-baja" aria-labelledby="titulo-baja">
      <div>
        <h2 class="titulo-seccion" id="titulo-baja">${t('baja.titulo')}</h2>
        <p class="texto-2">${t('baja.texto')}</p>
      </div>
      <button type="button" class="boton boton-peligro" id="abrir-baja" aria-haspopup="dialog">${t('baja.boton')}</button>
    </section>
  </div>

  <dialog class="ajustes-dialogo" id="dialogo-baja" aria-labelledby="titulo-paso-1">
    <section class="ajustes-paso" id="paso-1">
      <p class="ajustes-paso-numero">${t('baja.paso', { n: 1 })}</p>
      <h2 class="titulo-seccion" id="titulo-paso-1">${t('baja.guardarTitulo')}</h2>
      <div class="banner banner-aviso">${seguro(icono('alerta'))}<span class="banner-texto">${t('baja.guardarTexto')}</span></div>
      <p>${t('baja.contenido')}</p>
      <ul class="ajustes-lista">
        <li>${t('baja.contenidoExcel')}</li>
        <li>${t('baja.contenidoOriginales')}</li>
      </ul>
      <button type="button" class="boton boton-principal" id="descargar-copia">${seguro(icono('descargar'))}<span>${t('baja.descargar')}</span></button>
      <label class="ajustes-casilla">
        <input type="checkbox" id="tengo-copia">
        <span>${t('baja.tengoCopia')}</span>
      </label>
      <div class="ajustes-dialogo-botones">
        <button type="button" class="boton boton-secundario" data-cerrar>${t('comun.cancelar')}</button>
        <button type="button" class="boton boton-secundario" id="ir-paso-2" disabled>${t('baja.continuar')}</button>
      </div>
    </section>

    <form class="ajustes-paso" id="paso-2" novalidate hidden>
      <p class="ajustes-paso-numero">${t('baja.paso', { n: 2 })}</p>
      <h2 class="titulo-seccion" id="titulo-paso-2">${t('baja.confirmarTitulo')}</h2>
      <p>${t('baja.seBorra')}</p>
      <ul class="ajustes-lista">
        <li>${t('baja.borraFacturas')}</li>
        <li>${t('baja.borraPerfil')}</li>
        <li>${t('baja.borraConexiones')}</li>
        <li>${t('baja.borraPlan')}</li>
      </ul>
      <div class="campo">
        <label for="confirmacion">${t('baja.escribeEmail', { email: usuario.email })}</label>
        <input id="confirmacion" type="email" autocomplete="off" spellcheck="false" autocapitalize="none" aria-describedby="confirmacion-error">
        <p class="campo-error" id="confirmacion-error" role="alert" hidden></p>
      </div>
      <div class="ajustes-dialogo-botones">
        <button type="button" class="boton boton-secundario" id="volver-paso-1">${t('baja.atras')}</button>
        <button type="submit" class="boton boton-peligro" disabled>${t('baja.eliminar')}</button>
      </div>
    </form>
  </dialog>`;

// Idioma (RF-04): se guarda en la cuenta y en el navegador, y se recarga la página.
document.querySelectorAll('[data-idioma]').forEach((boton) => {
  boton.addEventListener('click', async () => {
    if (boton.getAttribute('aria-pressed') === 'true') return;
    await api('/auth/preferencias', { metodo: 'PUT', cuerpo: { idioma: boton.dataset.idioma } }).catch(() => {});
    cambiarIdioma(boton.dataset.idioma);
  });
});

// Tema: se aplica al momento y se guarda en la cuenta.
document.querySelectorAll('[data-tema]').forEach((boton) => {
  boton.addEventListener('click', async () => {
    const tema = boton.dataset.tema;
    cambiarTema(tema);
    document.querySelectorAll('[data-tema]').forEach((b) => b.setAttribute('aria-pressed', String(b === boton)));
    try {
      await api('/auth/preferencias', { metodo: 'PUT', cuerpo: { tema } });
    } catch (e) {
      mostrarToast(e.message || t('comun.error'));
    }
  });
});

// Avisos (RF-41, RF-42).
const formAvisos = document.getElementById('form-avisos');
formAvisos.addEventListener('input', (evento) => {
  const error = document.getElementById(`${evento.target.id}-error`);
  if (error) { error.hidden = true; evento.target.removeAttribute('aria-invalid'); }
});

formAvisos.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const cuerpo = {};
  for (const nombre of ['dias_aviso_pendiente', 'dias_aviso_trimestre']) {
    const input = document.getElementById(nombre);
    const n = Number(input.value);
    if (!Number.isInteger(n) || n < 1 || n > 365) {
      document.getElementById(`${nombre}-error`).hidden = false;
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }
    cuerpo[nombre] = n;
  }
  cuerpo.avisos_sin_email = [...formAvisos.querySelectorAll('input[name="email"]:not(:checked)')].map((x) => x.value);

  const boton = formAvisos.querySelector('button[type="submit"]');
  boton.disabled = true;
  try {
    await api('/perfil/ajustes', { metodo: 'PUT', cuerpo });
    mostrarToast(t('ajustes.guardado'));
  } catch (e) {
    mostrarToast(e.message || t('comun.error'));
  } finally {
    boton.disabled = false;
  }
});

// ---------- Eliminar la cuenta (RF-62) ----------
const dialogo = document.getElementById('dialogo-baja');
const paso1 = document.getElementById('paso-1');
const paso2 = document.getElementById('paso-2');
const tengoCopia = document.getElementById('tengo-copia');
const irPaso2 = document.getElementById('ir-paso-2');
const inputConfirmacion = document.getElementById('confirmacion');
const errorConfirmacion = document.getElementById('confirmacion-error');
const botonEliminar = paso2.querySelector('button[type="submit"]');
const coincide = () => inputConfirmacion.value.trim().toLowerCase() === usuario.email.toLowerCase();

function irAPaso(n) {
  paso1.hidden = n !== 1;
  paso2.hidden = n !== 2;
  dialogo.setAttribute('aria-labelledby', `titulo-paso-${n}`);
  (n === 1 ? document.getElementById('descargar-copia') : inputConfirmacion).focus();
}

document.getElementById('abrir-baja').addEventListener('click', () => {
  tengoCopia.checked = false;
  irPaso2.disabled = true;
  paso2.reset();
  botonEliminar.disabled = true;
  errorConfirmacion.hidden = true;
  dialogo.showModal();
  irAPaso(1);
});
dialogo.querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', () => dialogo.close()));
// Clic fuera de la ventana: se cierra.
dialogo.addEventListener('click', (evento) => { if (evento.target === dialogo) dialogo.close(); });

tengoCopia.addEventListener('change', () => { irPaso2.disabled = !tengoCopia.checked; });
irPaso2.addEventListener('click', () => irAPaso(2));
document.getElementById('volver-paso-1').addEventListener('click', () => irAPaso(1));

// Paso 1: descargar la copia. Al terminar, se marca sola la casilla.
document.getElementById('descargar-copia').addEventListener('click', async (evento) => {
  const boton = evento.currentTarget;
  const texto = boton.querySelector('span');
  boton.disabled = true;
  texto.textContent = t('baja.descargando');
  try {
    const respuesta = await fetch('/api/exportacion/todo', { credentials: 'same-origin' });
    if (!respuesta.ok) throw new Error((await respuesta.json().catch(() => ({}))).error || t('comun.error'));
    const nombre = /filename="([^"]+)"/.exec(respuesta.headers.get('content-disposition') || '')?.[1] || 'cuadra.zip';
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(await respuesta.blob());
    enlace.download = nombre;
    document.body.append(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(enlace.href), 10000);
    tengoCopia.checked = true;
    irPaso2.disabled = false;
    mostrarToast(t('baja.descargado'));
  } catch (e) {
    mostrarToast(e.message || t('comun.error'));
  } finally {
    boton.disabled = false;
    texto.textContent = t('baja.descargar');
  }
});

// Paso 2: escribir el email y eliminar.
inputConfirmacion.addEventListener('input', () => {
  botonEliminar.disabled = !coincide();
  errorConfirmacion.hidden = true;
});

paso2.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  if (!coincide()) {
    errorConfirmacion.textContent = t('baja.noCoincide');
    errorConfirmacion.hidden = false;
    return;
  }
  botonEliminar.disabled = true;
  try {
    await api('/auth/cuenta', { metodo: 'DELETE', cuerpo: { confirmacion: inputConfirmacion.value } });
    location.replace('/');
  } catch (e) {
    errorConfirmacion.textContent = e.message || t('comun.error');
    errorConfirmacion.hidden = false;
    botonEliminar.disabled = false;
  }
});
