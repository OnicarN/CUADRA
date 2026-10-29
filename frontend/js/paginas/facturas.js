// Facturas (RF-37 a RF-39). Responsable: Rodrigo (#18)
// Histórico con búsqueda libre, pestañas de estado y filtros. Los filtros viven en la
// URL (?q=&estado=&desde=…), así el buscador de la cabecera y el panel pueden mandar aquí.
import { iniciarPagina } from '../core/layout.js';
import { t } from '../core/i18n.js';
import { api } from '../core/api.js';
import { icono } from '../core/iconos.js';
import { dinero, fecha } from '../core/formato.js';
import { html, seguro, vacio, mostrarToast, etiquetaEstado } from '../core/ui.js';

const textos = {
  es: {
    'facturas.titulo': 'Facturas',
    'facturas.vacio': 'Aún no hay facturas. Sube la primera',
    'facturas.subir': 'Subir factura',
    'facturas.buscar': 'Emisor, NIF, número, categoría o importe',
    'facturas.estados': 'Estado',
    'facturas.todas': 'Todas',
    'facturas.pendientes': 'Pendientes',
    'facturas.confirmadas': 'Confirmadas',
    'facturas.sinLeer': 'Sin leer',
    'facturas.filtros': 'Filtros',
    'facturas.filtrosActivos': 'Filtros ({n})',
    'facturas.cerrarFiltros': 'Cerrar filtros',
    'facturas.desde': 'Desde',
    'facturas.hasta': 'Hasta',
    'facturas.categoria': 'Categoría',
    'facturas.todasCategorias': 'Todas',
    'facturas.importeMin': 'Importe mínimo (€)',
    'facturas.importeMax': 'Importe máximo (€)',
    'facturas.conAvisos': 'Solo con avisos',
    'facturas.aplicar': 'Ver facturas',
    'facturas.limpiar': 'Quitar filtros',
    'facturas.resultados': '{n} facturas',
    'facturas.resultado': '1 factura',
    'facturas.sinResultados': 'No hay facturas con estos filtros.',
    'facturas.cargarMas': 'Cargar más',
    'facturas.sinEmisor': 'Factura sin leer',
    'facturas.sinCategoria': 'Sin categoría',
    'facturas.aviso': 'Aviso',
    'facturas.avisos': '{n} avisos',
    'facturas.importeNoValido': 'Escribe el importe con números, por ejemplo 41,32',
  },
  en: {
    'facturas.titulo': 'Invoices',
    'facturas.vacio': 'No invoices yet. Upload your first one',
    'facturas.subir': 'Upload invoice',
    'facturas.buscar': 'Issuer, tax ID, number, category or amount',
    'facturas.estados': 'Status',
    'facturas.todas': 'All',
    'facturas.pendientes': 'To review',
    'facturas.confirmadas': 'Confirmed',
    'facturas.sinLeer': 'Not read',
    'facturas.filtros': 'Filters',
    'facturas.filtrosActivos': 'Filters ({n})',
    'facturas.cerrarFiltros': 'Close filters',
    'facturas.desde': 'From',
    'facturas.hasta': 'To',
    'facturas.categoria': 'Category',
    'facturas.todasCategorias': 'All',
    'facturas.importeMin': 'Minimum amount (€)',
    'facturas.importeMax': 'Maximum amount (€)',
    'facturas.conAvisos': 'Only with alerts',
    'facturas.aplicar': 'Show invoices',
    'facturas.limpiar': 'Clear filters',
    'facturas.resultados': '{n} invoices',
    'facturas.resultado': '1 invoice',
    'facturas.sinResultados': 'No invoices match these filters.',
    'facturas.cargarMas': 'Load more',
    'facturas.sinEmisor': 'Unread invoice',
    'facturas.sinCategoria': 'No category',
    'facturas.aviso': 'Alert',
    'facturas.avisos': '{n} alerts',
    'facturas.importeNoValido': 'Write the amount with numbers, for example 41.32',
  },
};

const PESTANAS = [
  { estado: '', texto: 'facturas.todas' },
  { estado: 'pendiente', texto: 'facturas.pendientes' },
  { estado: 'confirmada', texto: 'facturas.confirmadas' },
  { estado: 'sin_leer', texto: 'facturas.sinLeer' },
];
// Filtros del panel (lo que no es la búsqueda ni la pestaña).
const FILTROS = ['desde', 'hasta', 'categoria', 'min', 'max', 'aviso'];
const IMPORTE = /^\s*\d[\d.,]*\s*€?\s*$/;

await iniciarPagina({ pagina: 'facturas', privada: true, textos });

// Estado de la pantalla, sacado de la URL.
const parametros = new URLSearchParams(location.search);
const filtros = Object.fromEntries(['q', 'estado', ...FILTROS].map((c) => [c, parametros.get(c) || '']));
if (!PESTANAS.some((p) => p.estado === filtros.estado)) filtros.estado = '';
let facturas = [];
let total = 0;
let pagina = 1;
let peticion = 0;

const contenido = document.getElementById('contenido');
contenido.innerHTML = html`
  <div class="cabecera-pagina">
    <h1 class="titulo-pagina">${t('facturas.titulo')}</h1>
  </div>

  <div class="facturas-barra">
    <div class="facturas-busqueda">
      <form class="facturas-buscador" role="search" id="buscador">
        ${seguro(icono('buscar'))}
        <input type="search" name="q" id="busqueda" autocomplete="off" enterkeyhint="search"
          placeholder="${t('facturas.buscar')}" aria-label="${t('facturas.buscar')}">
      </form>
      <button type="button" class="boton boton-secundario facturas-abrir-filtros" id="abrir-filtros"
        aria-controls="filtros" aria-expanded="false">${seguro(icono('ajustes'))}<span id="abrir-filtros-texto"></span></button>
    </div>
    <div class="pestanas facturas-pestanas" role="tablist" aria-label="${t('facturas.estados')}">
      ${PESTANAS.map((p) => seguro(html`<button type="button" class="pestana" role="tab" data-estado="${p.estado}">${t(p.texto)}</button>`))}
    </div>
  </div>

  <div class="facturas-diseno">
    <div class="facturas-fondo" id="fondo-filtros" hidden></div>
    <aside class="tarjeta facturas-filtros" id="filtros" aria-label="${t('facturas.filtros')}">
      <div class="facturas-filtros-cabecera">
        <h2 class="titulo-seccion">${t('facturas.filtros')}</h2>
        <button type="button" class="boton-icono facturas-cerrar-filtros" id="cerrar-filtros"
          aria-label="${t('facturas.cerrarFiltros')}">${seguro(icono('cerrar'))}</button>
      </div>
      <form class="formulario" id="form-filtros" novalidate>
        <div class="rejilla-2 facturas-fechas">
          <div class="campo"><label for="f-desde">${t('facturas.desde')}</label><input type="date" id="f-desde" name="desde"></div>
          <div class="campo"><label for="f-hasta">${t('facturas.hasta')}</label><input type="date" id="f-hasta" name="hasta"></div>
        </div>
        <div class="campo">
          <label for="f-categoria">${t('facturas.categoria')}</label>
          <select id="f-categoria" name="categoria"><option value="">${t('facturas.todasCategorias')}</option></select>
        </div>
        <div class="rejilla-2">
          <div class="campo"><label for="f-min">${t('facturas.importeMin')}</label><input type="text" inputmode="decimal" id="f-min" name="min"></div>
          <div class="campo"><label for="f-max">${t('facturas.importeMax')}</label><input type="text" inputmode="decimal" id="f-max" name="max"></div>
        </div>
        <p class="campo-error" id="error-filtros" role="alert" hidden></p>
        <label class="facturas-casilla"><input type="checkbox" name="aviso" value="1"> ${t('facturas.conAvisos')}</label>
        <div class="facturas-filtros-acciones">
          <button type="submit" class="boton boton-secundario">${t('facturas.aplicar')}</button>
          <button type="button" class="boton-texto" id="limpiar-filtros">${t('facturas.limpiar')}</button>
        </div>
      </form>
    </aside>

    <section class="tarjeta facturas-lista" aria-live="polite" aria-busy="true">
      <p class="texto-2 facturas-resumen" id="resumen">${t('comun.cargando')}</p>
      <ul class="lista" id="lista"></ul>
      <div id="vacio"></div>
      <button type="button" class="boton boton-secundario boton-bloque" id="cargar-mas" hidden>${t('facturas.cargarMas')}</button>
    </section>
  </div>`;

const $ = (id) => document.getElementById(id);
const formFiltros = $('form-filtros');
const busqueda = $('busqueda');

// ---------- URL y formulario ----------

function pasarAlFormulario() {
  busqueda.value = filtros.q;
  for (const campo of FILTROS) {
    const control = formFiltros.elements[campo];
    if (control.type === 'checkbox') control.checked = filtros[campo] === '1';
    else control.value = filtros[campo];
  }
  document.querySelectorAll('[data-estado]').forEach((boton) => {
    boton.setAttribute('aria-selected', String(boton.dataset.estado === filtros.estado));
  });
  const activos = FILTROS.filter((c) => filtros[c]).length;
  $('abrir-filtros-texto').textContent = activos ? t('facturas.filtrosActivos', { n: activos }) : t('facturas.filtros');
}

function consulta(conPagina) {
  const p = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) if (valor) p.set(clave, valor);
  if (conPagina && pagina > 1) p.set('pagina', pagina);
  return p.toString();
}

function guardarEnUrl() {
  const texto = consulta(false);
  history.replaceState(null, '', texto ? `?${texto}` : location.pathname);
}

// ---------- Datos ----------

async function cargar({ mas = false } = {}) {
  const yo = ++peticion;
  pagina = mas ? pagina + 1 : 1;
  const lista = document.querySelector('.facturas-lista');
  lista.setAttribute('aria-busy', 'true');
  $('cargar-mas').disabled = true;
  try {
    const texto = consulta(true);
    const datos = await api(`/facturas${texto ? `?${texto}` : ''}`);
    if (yo !== peticion) return; // llegó tarde: ya hay otra búsqueda en marcha
    facturas = mas ? facturas.concat(datos.facturas) : datos.facturas;
    total = datos.total;
    pintarLista();
  } catch (error) {
    if (yo !== peticion) return;
    if (mas) pagina -= 1;
    mostrarToast(error.estado === 400 ? error.message : t('comun.error'));
    if (!mas) $('resumen').textContent = t('comun.error');
  } finally {
    if (yo === peticion) {
      lista.setAttribute('aria-busy', 'false');
      $('cargar-mas').disabled = false;
    }
  }
}

async function cargarCategorias() {
  try {
    const categorias = await api('/categorias');
    $('f-categoria').insertAdjacentHTML('beforeend',
      categorias.map((c) => html`<option value="${c.id}">${c.nombre}</option>`).join(''));
    $('f-categoria').value = filtros.categoria;
  } catch { /* sin categorías se puede filtrar por lo demás */ }
}

// ---------- Pintar ----------

function fila(f) {
  const titulo = f.emisor || t('facturas.sinEmisor');
  const avisos = f.avisos_abiertos > 1 ? t('facturas.avisos', { n: f.avisos_abiertos }) : t('facturas.aviso');
  return html`
    <li>
      <a class="fila facturas-fila" href="/app/factura?id=${f.id}">
        <span class="fila-icono">${seguro(icono(f.estado === 'sin_leer' ? 'archivo' : 'facturas'))}</span>
        <span class="fila-centro">
          <span class="fila-titulo">${titulo}</span>
          <span class="fila-sub">${f.categoria || t('facturas.sinCategoria')}${f.numero ? ` · ${f.numero}` : ''}</span>
          <span class="facturas-etiquetas">
            ${seguro(etiquetaEstado(f.estado))}
            ${f.avisos_abiertos ? seguro(html`<span class="etiqueta etiqueta-aviso">${seguro(icono('alerta'))}${avisos}</span>`) : ''}
          </span>
        </span>
        <span class="fila-derecha">
          ${f.total !== null ? seguro(html`<span class="fila-titulo importe">${dinero(f.total, f.moneda)}</span>`) : ''}
          ${f.moneda !== 'EUR' && f.total_eur !== null ? seguro(html`<span class="fila-sub importe">${dinero(f.total_eur)}</span>`) : ''}
          ${f.fecha ? seguro(html`<span class="fila-sub">${fecha(f.fecha)}</span>`) : ''}
        </span>
      </a>
    </li>`;
}

function pintarLista() {
  const hayFiltros = Object.values(filtros).some(Boolean);
  $('lista').innerHTML = facturas.map(fila).join('');
  $('resumen').textContent = total === 1 ? t('facturas.resultado') : t('facturas.resultados', { n: total });
  $('resumen').hidden = total === 0;
  $('cargar-mas').hidden = facturas.length >= total;

  if (total > 0) {
    $('vacio').innerHTML = '';
  } else if (hayFiltros) {
    $('vacio').innerHTML = html`<div class="vacio">${seguro(icono('buscar'))}<p>${t('facturas.sinResultados')}</p>
      <button type="button" class="boton boton-secundario" data-limpiar>${t('facturas.limpiar')}</button></div>`;
  } else {
    $('vacio').innerHTML = vacio({ icono: 'facturas', texto: t('facturas.vacio'), boton: { href: '/app/subir', texto: t('facturas.subir') } });
  }
}

// ---------- Panel de filtros (en móvil se abre encima) ----------

const enMovil = window.matchMedia('(max-width: 1023px)');

function abrirFiltros(abrir) {
  document.body.classList.toggle('facturas-filtros-abiertos', abrir);
  $('fondo-filtros').hidden = !abrir;
  $('abrir-filtros').setAttribute('aria-expanded', String(abrir));
  if (abrir) $('f-desde').focus();
  else if (enMovil.matches) $('abrir-filtros').focus();
}

function leerPanel() {
  const datos = new FormData(formFiltros);
  const nuevos = {};
  for (const campo of FILTROS) nuevos[campo] = String(datos.get(campo) ?? '').trim();
  for (const campo of ['min', 'max']) {
    if (nuevos[campo] && !IMPORTE.test(nuevos[campo])) {
      $('error-filtros').textContent = t('facturas.importeNoValido');
      $('error-filtros').hidden = false;
      formFiltros.elements[campo].focus();
      return null;
    }
  }
  $('error-filtros').hidden = true;
  return nuevos;
}

function aplicar() {
  pasarAlFormulario();
  guardarEnUrl();
  cargar();
}

// ---------- Eventos ----------

let espera;
busqueda.addEventListener('input', () => {
  clearTimeout(espera);
  espera = setTimeout(() => { filtros.q = busqueda.value.trim(); aplicar(); }, 300);
});
$('buscador').addEventListener('submit', (evento) => {
  evento.preventDefault();
  clearTimeout(espera);
  filtros.q = busqueda.value.trim();
  busqueda.blur();
  aplicar();
});

document.querySelector('.facturas-pestanas').addEventListener('click', (evento) => {
  const boton = evento.target.closest('[data-estado]');
  if (!boton || boton.dataset.estado === filtros.estado) return;
  filtros.estado = boton.dataset.estado;
  aplicar();
});

formFiltros.addEventListener('submit', (evento) => {
  evento.preventDefault();
  const nuevos = leerPanel();
  if (!nuevos) return;
  Object.assign(filtros, nuevos);
  if (enMovil.matches) abrirFiltros(false);
  aplicar();
});
// En ordenador el panel está siempre a la vista: aplicamos al cambiar fecha, categoría o la casilla.
formFiltros.addEventListener('change', (evento) => {
  if (enMovil.matches || ['min', 'max'].includes(evento.target.name)) return;
  formFiltros.requestSubmit();
});

function limpiar() {
  for (const campo of FILTROS) filtros[campo] = '';
  filtros.q = '';
  filtros.estado = '';
  $('error-filtros').hidden = true;
  if (enMovil.matches) abrirFiltros(false);
  aplicar();
}
$('limpiar-filtros').addEventListener('click', limpiar);
$('vacio').addEventListener('click', (evento) => { if (evento.target.closest('[data-limpiar]')) limpiar(); });

$('abrir-filtros').addEventListener('click', () => abrirFiltros(true));
$('cerrar-filtros').addEventListener('click', () => abrirFiltros(false));
$('fondo-filtros').addEventListener('click', () => abrirFiltros(false));
document.addEventListener('keydown', (evento) => {
  if (evento.key === 'Escape' && document.body.classList.contains('facturas-filtros-abiertos')) abrirFiltros(false);
});
enMovil.addEventListener('change', () => abrirFiltros(false));

$('cargar-mas').addEventListener('click', () => cargar({ mas: true }));

pasarAlFormulario();
cargarCategorias();
cargar();
