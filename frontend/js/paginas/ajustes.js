// Ajustes (RF-04, RF-41, RF-42). Responsable: Ana (#24)
// Idioma, modo claro u oscuro y avisos: cuándo saltan y cuáles llegan por email.
import { iniciarPagina } from '../core/layout.js';
import { api } from '../core/api.js';
import { t, idioma, cambiarIdioma } from '../core/i18n.js';
import { cambiarTema, temaGuardado } from '../core/tema.js';
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
  </div>`;

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
