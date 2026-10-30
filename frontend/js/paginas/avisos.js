// Avisos (RF-40 a RF-42). Responsable: Rodrigo (#21)
// Lista de avisos como banners: rojo suave los que cuestan dinero y naranja suave las
// sugerencias. Pestañas Abiertos / Cerrados (?estado=cerrado en la URL). El texto de cada
// aviso viene de la API en los dos idiomas (backend/src/modulos/avisos/textos.js).
import { iniciarPagina, actualizarContadorAvisos } from '../core/layout.js';
import { t, idioma } from '../core/i18n.js';
import { api } from '../core/api.js';
import { icono } from '../core/iconos.js';
import { fecha } from '../core/formato.js';
import { html, seguro, vacio, mostrarToast } from '../core/ui.js';

const textos = {
  es: {
    'avisos.titulo': 'Avisos',
    'avisos.subtitulo': 'Lo que te puede costar dinero, y cómo arreglarlo.',
    'avisos.estados': 'Estado de los avisos',
    'avisos.abiertos': 'Abiertos',
    'avisos.cerrados': 'Cerrados',
    'avisos.vacio': 'No tienes avisos. Todo cuadra.',
    'avisos.vacioCerrados': 'Aún no has cerrado ningún aviso.',
    'avisos.descartar': 'Descartar aviso',
    'avisos.descartado': 'Aviso descartado',
    'avisos.creado': 'Desde el {fecha}',
    'avisos.cerradoEl': 'Cerrado el {fecha}',
    'avisos.importante': 'Importante',
    'avisos.sugerencia': 'Sugerencia',
    'avisos.ajustes': 'Elige qué avisos te llegan por email en',
    'avisos.ajustesEnlace': 'Ajustes',
  },
  en: {
    'avisos.titulo': 'Alerts',
    'avisos.subtitulo': 'What could cost you money, and how to fix it.',
    'avisos.estados': 'Alert status',
    'avisos.abiertos': 'Open',
    'avisos.cerrados': 'Closed',
    'avisos.vacio': 'No alerts. Everything adds up.',
    'avisos.vacioCerrados': "You haven't closed any alerts yet.",
    'avisos.descartar': 'Dismiss alert',
    'avisos.descartado': 'Alert dismissed',
    'avisos.creado': 'Since {fecha}',
    'avisos.cerradoEl': 'Closed on {fecha}',
    'avisos.importante': 'Important',
    'avisos.sugerencia': 'Suggestion',
    'avisos.ajustes': 'Choose which alerts you get by email in',
    'avisos.ajustesEnlace': 'Settings',
  },
};

// Icono de cada tipo; los que no están usan alerta (importantes) o destello (sugerencias).
const ICONOS = {
  trimestre: 'calendario', evento_sin_ticket: 'calendario', pendiente_revisar: 'reloj',
  duplicado: 'copiar', sin_leer: 'facturas', correo_no_autorizado: 'correo', texto_correo: 'correo',
};
const ESTADOS = ['abierto', 'cerrado'];

await iniciarPagina({ pagina: 'avisos', privada: true, textos });

const contenido = document.getElementById('contenido');
let estado = ESTADOS.includes(new URLSearchParams(location.search).get('estado'))
  ? new URLSearchParams(location.search).get('estado') : 'abierto';

contenido.innerHTML = html`
  <div class="cabecera-pagina">
    <div>
      <h1 class="titulo-pagina">${t('avisos.titulo')}</h1>
      <p class="texto-2 avisos-subtitulo">${t('avisos.subtitulo')}</p>
    </div>
  </div>
  <div class="pestanas avisos-pestanas" role="tablist" aria-label="${t('avisos.estados')}">
    <button type="button" class="pestana" role="tab" data-estado="abierto">${t('avisos.abiertos')}</button>
    <button type="button" class="pestana" role="tab" data-estado="cerrado">${t('avisos.cerrados')}</button>
  </div>
  <ul class="avisos-lista" id="lista" aria-live="polite"></ul>
  <p class="texto-2 avisos-ajustes">${t('avisos.ajustes')} <a href="/app/ajustes">${t('avisos.ajustesEnlace')}</a>.</p>`;

const lista = document.getElementById('lista');

function pintarAviso(aviso) {
  const texto = aviso.textos[idioma()] || aviso.textos.es;
  const abierto = aviso.estado === 'abierto';
  const nombreIcono = ICONOS[aviso.tipo] || (aviso.importante ? 'alerta' : 'destello');
  const cuando = abierto
    ? t('avisos.creado', { fecha: fecha(aviso.creado_en) })
    : t('avisos.cerradoEl', { fecha: fecha(aviso.cerrado_en) });
  return html`<li class="banner avisos-item ${aviso.importante ? 'banner-aviso' : ''} ${abierto ? '' : 'avisos-cerrado'}" data-id="${aviso.id}">
    ${seguro(icono(nombreIcono))}
    <a class="avisos-enlace" href="${aviso.destino}">
      <span class="banner-texto">
        <span class="avisos-cabeza">
          <strong class="avisos-titulo">${texto.titulo}</strong>
          <span class="avisos-tipo">${aviso.importante ? t('avisos.importante') : t('avisos.sugerencia')}</span>
        </span>
        <span class="avisos-texto">${texto.texto}</span>
        <span class="avisos-pie"><span class="avisos-accion">${texto.accion}</span> · <span class="texto-2">${cuando}</span></span>
      </span>
      ${seguro(icono('flecha', 'banner-flecha'))}
    </a>
    ${abierto ? seguro(html`<button type="button" class="boton-icono avisos-descartar" data-cerrar="${aviso.id}" aria-label="${t('avisos.descartar')}" title="${t('avisos.descartar')}">${seguro(icono('cerrar'))}</button>`) : ''}
  </li>`;
}

function pintarVacio() {
  lista.innerHTML = html`<li class="tarjeta">${seguro(vacio({
    icono: estado === 'abierto' ? 'check' : 'avisos',
    texto: estado === 'abierto' ? t('avisos.vacio') : t('avisos.vacioCerrados'),
  }))}</li>`;
}

async function cargar() {
  document.querySelectorAll('[data-estado]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.estado === estado)));
  lista.setAttribute('aria-busy', 'true');
  try {
    const { avisos } = await api(`/avisos?estado=${estado}`);
    if (!avisos.length) pintarVacio();
    else lista.innerHTML = avisos.map(pintarAviso).join('');
  } catch {
    lista.innerHTML = html`<li class="tarjeta"><p>${t('comun.error')}</p></li>`;
  } finally {
    lista.removeAttribute('aria-busy');
  }
}

document.querySelector('.avisos-pestanas').addEventListener('click', (evento) => {
  const boton = evento.target.closest('[data-estado]');
  if (!boton || boton.dataset.estado === estado) return;
  estado = boton.dataset.estado;
  const url = new URL(location.href);
  if (estado === 'abierto') url.searchParams.delete('estado');
  else url.searchParams.set('estado', estado);
  history.replaceState(null, '', url);
  cargar();
});

lista.addEventListener('click', async (evento) => {
  const boton = evento.target.closest('[data-cerrar]');
  if (!boton) return;
  boton.disabled = true;
  try {
    await api(`/avisos/${boton.dataset.cerrar}/cerrar`, { metodo: 'POST' });
    boton.closest('li').remove();
    if (!lista.children.length) pintarVacio();
    mostrarToast(t('avisos.descartado'));
  } catch (error) {
    // Si ya estaba cerrado (por ejemplo, desde otra pestaña), se quita igual.
    if (error.estado === 409 || error.estado === 404) {
      boton.closest('li').remove();
      if (!lista.children.length) pintarVacio();
    } else {
      boton.disabled = false;
      mostrarToast(t('comun.error'));
    }
  }
  actualizarContadorAvisos();
});

cargar();
