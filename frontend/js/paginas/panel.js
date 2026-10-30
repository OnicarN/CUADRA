// Panel (RF-43 a RF-48). Responsable: Rodrigo (#22)
// Las cifras mandan: gasto, IVA que podrá deducir, facturas y días para el cierre, con el
// periodo (mes, trimestre o año) en la URL (?periodo=&fecha=). Solo cuentan las confirmadas.
import { iniciarPagina } from '../core/layout.js';
import { t } from '../core/i18n.js';
import { api } from '../core/api.js';
import { icono } from '../core/iconos.js';
import { dinero, fecha, porcentaje } from '../core/formato.js';
import { html, seguro, vacio, mostrarToast, etiquetaEstado } from '../core/ui.js';

const textos = {
  es: {
    'panel.titulo': 'Panel',
    'panel.periodo': 'Periodo',
    'panel.mes': 'Mes',
    'panel.trimestre': 'Trimestre',
    'panel.anio': 'Año',
    'panel.anterior': 'Periodo anterior',
    'panel.siguiente': 'Periodo siguiente',
    'panel.vacio': 'Aún no hay facturas. Sube la primera',
    'panel.subir': 'Subir factura',
    'panel.perfil': 'Completa tu perfil fiscal para poder subir facturas.',
    'panel.completarPerfil': 'Completar',
    'panel.porRevisar1': 'Tienes 1 factura por revisar. Hasta que la confirmes no cuenta en estas cifras.',
    'panel.porRevisar': 'Tienes {n} facturas por revisar. Hasta que las confirmes no cuentan en estas cifras.',
    'panel.gasto': 'Gasto',
    'panel.vs.mes': 'vs mes pasado',
    'panel.vs.trimestre': 'vs trimestre anterior',
    'panel.vs.anio': 'vs año pasado',
    'panel.igual': 'Igual que el periodo anterior',
    'panel.sinAnterior': 'Sin gasto en el periodo anterior',
    'panel.iva': 'IVA que podrás deducir · T{t} {anio}',
    'panel.ivaApoyo': 'IVA soportado del trimestre (modelo 303)',
    'panel.facturas': 'Facturas confirmadas',
    'panel.pendientes1': '1 pendiente de revisar',
    'panel.pendientes': '{n} pendientes de revisar',
    'panel.sinPendientes': 'Nada pendiente de revisar',
    'panel.dias': 'Días para cerrar el T{t}',
    'panel.plazo': 'Plazo: {fecha}',
    'panel.avisos1': '1 aviso abierto',
    'panel.avisos': '{n} avisos abiertos',
    'panel.categorias': 'Gasto por categoría',
    'panel.sinCategoria': 'Sin categoría',
    'panel.sinGasto': 'No hay gastos confirmados en este periodo.',
    'panel.factura1': '1 factura',
    'panel.facturasN': '{n} facturas',
    'panel.verCategoria': 'Ver las facturas de {categoria}',
    'panel.recientes': 'Gastos recientes',
    'panel.clientes': 'Gasto por cliente o proyecto',
    'panel.clientesApoyo': 'De los gastos que has asociado a eventos de tu calendario.',
    'panel.sinEmisor': 'Factura sin leer',
  },
  en: {
    'panel.titulo': 'Dashboard',
    'panel.periodo': 'Period',
    'panel.mes': 'Month',
    'panel.trimestre': 'Quarter',
    'panel.anio': 'Year',
    'panel.anterior': 'Previous period',
    'panel.siguiente': 'Next period',
    'panel.vacio': 'No invoices yet. Upload your first one',
    'panel.subir': 'Upload invoice',
    'panel.perfil': 'Complete your tax profile to be able to upload invoices.',
    'panel.completarPerfil': 'Complete',
    'panel.porRevisar1': "You have 1 invoice to review. Until you confirm it, it doesn't count in these numbers.",
    'panel.porRevisar': "You have {n} invoices to review. Until you confirm them, they don't count in these numbers.",
    'panel.gasto': 'Spending',
    'panel.vs.mes': 'vs last month',
    'panel.vs.trimestre': 'vs last quarter',
    'panel.vs.anio': 'vs last year',
    'panel.igual': 'Same as the previous period',
    'panel.sinAnterior': 'No spending in the previous period',
    'panel.iva': 'VAT you can deduct · Q{t} {anio}',
    'panel.ivaApoyo': 'Input VAT for the quarter (form 303)',
    'panel.facturas': 'Confirmed invoices',
    'panel.pendientes1': '1 to review',
    'panel.pendientes': '{n} to review',
    'panel.sinPendientes': 'Nothing to review',
    'panel.dias': 'Days to close Q{t}',
    'panel.plazo': 'Deadline: {fecha}',
    'panel.avisos1': '1 open alert',
    'panel.avisos': '{n} open alerts',
    'panel.categorias': 'Spending by category',
    'panel.sinCategoria': 'No category',
    'panel.sinGasto': 'No confirmed spending in this period.',
    'panel.factura1': '1 invoice',
    'panel.facturasN': '{n} invoices',
    'panel.verCategoria': 'See the invoices for {categoria}',
    'panel.recientes': 'Recent expenses',
    'panel.clientes': 'Spending by client or project',
    'panel.clientesApoyo': "From the expenses you've linked to events in your calendar.",
    'panel.sinEmisor': 'Unread invoice',
  },
};

const PERIODOS = ['mes', 'trimestre', 'anio'];
const MESES_PASO = { mes: 1, trimestre: 3, anio: 12 };

const { usuario } = await iniciarPagina({ pagina: 'panel', privada: true, textos });

const parametros = new URLSearchParams(location.search);
let periodo = PERIODOS.includes(parametros.get('periodo')) ? parametros.get('periodo') : 'mes';
let dia = /^\d{4}-\d{2}-\d{2}$/.test(parametros.get('fecha') || '') ? parametros.get('fecha') : null;
let peticion = 0;

const contenido = document.getElementById('contenido');
contenido.innerHTML = html`
  <div class="cabecera-pagina">
    <h1 class="titulo-pagina">${t('panel.titulo')}</h1>
    <div class="panel-periodo">
      <div class="pestanas" role="tablist" aria-label="${t('panel.periodo')}">
        ${PERIODOS.map((p) => seguro(html`<button type="button" class="pestana" role="tab" data-periodo="${p}">${t(`panel.${p}`)}</button>`))}
      </div>
      <div class="panel-navegar">
        <button type="button" class="boton-icono" id="anterior" aria-label="${t('panel.anterior')}" title="${t('panel.anterior')}">${seguro(icono('atras'))}</button>
        <span class="panel-etiqueta" id="etiqueta-periodo" aria-live="polite"></span>
        <button type="button" class="boton-icono" id="siguiente" aria-label="${t('panel.siguiente')}" title="${t('panel.siguiente')}">${seguro(icono('flecha'))}</button>
      </div>
    </div>
  </div>
  <div class="pila panel-banners" id="banners"></div>
  <div id="cuerpo" aria-busy="true"><p class="texto-2">${t('comun.cargando')}</p></div>`;

const $ = (id) => document.getElementById(id);

// ---------- Fechas del periodo ----------

const hoy = () => new Date().toISOString().slice(0, 10);

function moverMeses(texto, meses) {
  const [a, m] = texto.split('-').map(Number);
  const total = a * 12 + (m - 1) + meses;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}-01`;
}

function nombrePeriodo(p) {
  if (p.tipo === 'mes') {
    const texto = fecha(p.desde, { month: 'long', year: 'numeric' });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }
  if (p.tipo === 'trimestre') return `${t('panel.trimestre')} ${Math.ceil(Number(p.desde.slice(5, 7)) / 3)} · ${p.desde.slice(0, 4)}`;
  return p.desde.slice(0, 4);
}

// ---------- Pintar ----------

function tarjeta({ titulo, cifra, apoyo, clase = '' }) {
  return html`<div class="tarjeta panel-cifra ${clase}">
    <p class="tarjeta-titulo">${titulo}</p>
    <p class="cifra">${cifra}</p>
    ${apoyo ? seguro(html`<p class="tarjeta-apoyo">${seguro(apoyo)}</p>`) : ''}
  </div>`;
}

function comparacion(d) {
  if (d.variacion === null) return html`<span>${t('panel.sinAnterior')}</span>`;
  if (d.variacion === 0) return html`<span>${t('panel.igual')}</span>`;
  // Gastar menos es bueno (verde); gastar más, malo (rojo). Siempre con flecha y texto.
  const baja = d.variacion < 0;
  return html`<span class="${baja ? 'baja' : 'sube'}">${baja ? '↓' : '↑'} ${porcentaje(Math.abs(d.variacion), 1)}</span> ${t(`panel.vs.${d.periodo.tipo}`)}`;
}

function cifras(d) {
  const pendientes = d.pendientes === 0 ? t('panel.sinPendientes')
    : d.pendientes === 1 ? t('panel.pendientes1') : t('panel.pendientes', { n: d.pendientes });
  const avisos = d.avisosAbiertos === 1 ? t('panel.avisos1') : t('panel.avisos', { n: d.avisosAbiertos });
  return html`<div class="panel-cifras">
    ${seguro(tarjeta({ titulo: `${t('panel.gasto')} · ${nombrePeriodo(d.periodo)}`, cifra: dinero(d.gastoTotal), apoyo: comparacion(d), clase: 'panel-cifra-principal' }))}
    ${seguro(tarjeta({ titulo: t('panel.iva', { t: d.trimestre.trimestre, anio: d.trimestre.anio }), cifra: dinero(d.ivaSoportadoTrimestre), apoyo: html`${t('panel.ivaApoyo')}` }))}
    ${seguro(tarjeta({ titulo: t('panel.facturas'), cifra: String(d.numFacturas), apoyo: d.pendientes
      ? html`<a class="boton-texto" href="/app/facturas?estado=pendiente">${pendientes}</a>` : html`${pendientes}` }))}
    ${seguro(tarjeta({ titulo: t('panel.dias', { t: d.cierre.trimestre }), cifra: String(Math.max(0, d.diasCierreTrimestre)),
      apoyo: html`${t('panel.plazo', { fecha: fecha(d.cierre.plazo) })}${d.avisosAbiertos ? seguro(html` · <a class="boton-texto" href="/app/avisos">${avisos}</a>`) : ''}` }))}
  </div>`;
}

// Barras finas horizontales con un solo color. Cada barra lleva su valor escrito al final
// (así se lee sin pasar el ratón) y un tooltip oscuro con el detalle. Pulsarla abre esas facturas.
function grafico(d) {
  if (!d.porCategoria.length) return html`<p class="texto-2">${t('panel.sinGasto')}</p>`;
  const maximo = Math.max(...d.porCategoria.map((c) => c.total));
  return html`<ul class="panel-barras">${d.porCategoria.map((c) => {
    const nombre = c.categoria || t('panel.sinCategoria');
    const parte = d.gastoTotal ? (c.total / d.gastoTotal) * 100 : 0;
    const num = c.num === 1 ? t('panel.factura1') : t('panel.facturasN', { n: c.num });
    const filtro = new URLSearchParams({ estado: 'confirmada', desde: d.periodo.desde, hasta: d.periodo.hasta });
    if (c.id) filtro.set('categoria', c.id);
    return seguro(html`<li>
      <a class="panel-barra" href="/app/facturas?${filtro.toString()}"
        aria-label="${nombre}: ${dinero(c.total)}, ${porcentaje(parte)}, ${num}. ${t('panel.verCategoria', { categoria: nombre })}">
        <span class="panel-barra-nombre">${nombre}</span>
        <span class="panel-barra-pista"><span class="panel-barra-relleno" style="width: ${Math.max(2, (c.total / maximo) * 100).toFixed(1)}%"></span></span>
        <span class="panel-barra-valor importe">${dinero(c.total)}</span>
        <span class="panel-tooltip" role="presentation">${nombre}<br><strong>${dinero(c.total)}</strong> · ${porcentaje(parte)} · ${num}</span>
      </a>
    </li>`);
  })}</ul>`;
}

function recientes(lista) {
  return html`<ul class="lista">${lista.map((f) => seguro(html`<li>
    <a class="fila" href="/app/factura?id=${f.id}">
      <span class="fila-icono">${seguro(icono(f.estado === 'sin_leer' ? 'archivo' : 'facturas'))}</span>
      <span class="fila-centro">
        <span class="fila-titulo">${f.emisor || t('panel.sinEmisor')}</span>
        <span class="fila-sub">${f.categoria || t('panel.sinCategoria')}</span>
      </span>
      <span class="fila-derecha">
        ${f.total !== null ? seguro(html`<span class="fila-titulo importe">${dinero(f.total, f.moneda)}</span>`) : ''}
        ${f.estado === 'confirmada'
          ? seguro(html`<span class="fila-sub">${fecha(f.fecha)}</span>`)
          : seguro(etiquetaEstado(f.estado))}
      </span>
    </a></li>`))}</ul>`;
}

function clientes(d) {
  return html`<section class="tarjeta">
    <h2 class="titulo-seccion">${t('panel.clientes')}</h2>
    <p class="texto-2">${t('panel.clientesApoyo')}</p>
    <ul class="lista">${d.porCliente.map((c) => seguro(html`<li class="fila">
      <span class="fila-icono">${seguro(icono('calendario'))}</span>
      <span class="fila-centro"><span class="fila-titulo">${c.cliente}</span>
        <span class="fila-sub">${c.num === 1 ? t('panel.factura1') : t('panel.facturasN', { n: c.num })}</span></span>
      <span class="fila-derecha importe fila-titulo">${dinero(c.total)}</span>
    </li>`))}</ul>
  </section>`;
}

function pintarBanners(d) {
  const banners = [];
  if (usuario && usuario.perfil_completo === false) {
    banners.push(html`<a class="banner" href="/app/perfil">${seguro(icono('perfil'))}
      <span class="banner-texto">${t('panel.perfil')} <strong>${t('panel.completarPerfil')}</strong></span>${seguro(icono('flecha', 'banner-flecha'))}</a>`);
  }
  if (d?.pendientes) {
    banners.push(html`<a class="banner" href="/app/facturas?estado=pendiente">${seguro(icono('destello'))}
      <span class="banner-texto">${d.pendientes === 1 ? t('panel.porRevisar1') : t('panel.porRevisar', { n: d.pendientes })}</span>${seguro(icono('flecha', 'banner-flecha'))}</a>`);
  }
  $('banners').innerHTML = banners.join('');
}

function pintarCabecera(d) {
  document.querySelectorAll('[data-periodo]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.periodo === periodo)));
  $('etiqueta-periodo').textContent = d ? nombrePeriodo(d.periodo) : '';
  // No tiene sentido ir a un periodo que aún no ha empezado.
  $('siguiente').disabled = !d || moverMeses(d.periodo.desde, MESES_PASO[periodo]) > hoy();
  $('anterior').disabled = !d;
}

// ---------- Cargar ----------

async function cargar() {
  const yo = ++peticion;
  const consulta = new URLSearchParams({ periodo });
  if (dia) consulta.set('fecha', dia);
  history.replaceState(null, '', `?${consulta.toString()}`);
  $('cuerpo').setAttribute('aria-busy', 'true');
  try {
    const [d, ultimas] = await Promise.all([api(`/panel?${consulta.toString()}`), api('/facturas')]);
    if (yo !== peticion) return;
    pintarCabecera(d);
    pintarBanners(d);
    if (ultimas.total === 0) {
      $('cuerpo').innerHTML = html`<div class="tarjeta">${seguro(vacio({ icono: 'facturas', texto: t('panel.vacio'), boton: { href: '/app/subir', texto: t('panel.subir') } }))}</div>`;
      return;
    }
    $('cuerpo').innerHTML = html`
      ${seguro(cifras(d))}
      <div class="panel-bloques">
        <section class="tarjeta panel-categorias">
          <h2 class="titulo-seccion">${t('panel.categorias')}</h2>
          ${seguro(grafico(d))}
        </section>
        <section class="tarjeta">
          <div class="tarjeta-cabecera">
            <h2 class="titulo-seccion">${t('panel.recientes')}</h2>
            <a class="boton-texto" href="/app/facturas">${t('comun.verTodo')}</a>
          </div>
          ${seguro(recientes(ultimas.facturas.slice(0, 5)))}
        </section>
      </div>
      ${d.porCliente.length ? seguro(clientes(d)) : ''}`;
  } catch (error) {
    if (yo !== peticion) return;
    pintarCabecera(null);
    $('cuerpo').innerHTML = html`<p class="texto-2">${t('comun.error')}</p>`;
    mostrarToast(error.message || t('comun.error'));
  } finally {
    if (yo === peticion) $('cuerpo').setAttribute('aria-busy', 'false');
  }
}

contenido.querySelector('.pestanas').addEventListener('click', (evento) => {
  const boton = evento.target.closest('[data-periodo]');
  if (!boton || boton.dataset.periodo === periodo) return;
  periodo = boton.dataset.periodo;
  cargar();
});

function mover(paso) {
  const base = dia || hoy();
  dia = moverMeses(base, paso * MESES_PASO[periodo]);
  // Si volvemos al periodo de hoy, mejor usar hoy (así el mes en curso no se queda fijo en el día 1).
  if (dia.slice(0, 7) === hoy().slice(0, 7)) dia = null;
  cargar();
}
$('anterior').addEventListener('click', () => mover(-1));
$('siguiente').addEventListener('click', () => mover(1));

pintarCabecera(null);
cargar();
