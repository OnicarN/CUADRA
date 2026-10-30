// Panel (RF-43 a RF-48). Responsable: Rodrigo (#22, #50)
// Las cifras mandan: gasto, IVA que podrá deducir, facturas y días para el cierre, con el
// periodo (mes, trimestre o año) en la URL (?periodo=&fecha=). Solo cuentan las confirmadas.
// Hay dos paneles según la versión de arriba (#50): el de empresa, con el IVA y las casillas de
// los impresos del trimestre, y el personal, con lo gastado y el presupuesto.
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
    // Versión personal
    'panel.p.vacio': 'Aún no hay tickets. Sube el primero',
    'panel.p.subir': 'Subir ticket',
    'panel.p.gastado': 'Gastado',
    'panel.p.presupuesto': 'Presupuesto',
    'panel.p.quedan': 'Te quedan {n}',
    'panel.p.pasado': 'Te has pasado {n}',
    'panel.p.de': 'de {n}',
    'panel.p.sinPresupuesto': 'Sin presupuesto',
    'panel.p.ponerPresupuesto': 'Ponte uno en Ajustes',
    'panel.p.tickets': 'Tickets',
    'panel.p.media': 'Media al día',
    'panel.p.mediaApoyo': 'En {n} días',
    'panel.p.porRevisar1': 'Tienes 1 ticket por revisar. Hasta que lo confirmes no cuenta en estas cifras.',
    'panel.p.porRevisar': 'Tienes {n} tickets por revisar. Hasta que los confirmes no cuentan en estas cifras.',
    'panel.p.pendientes1': '1 por revisar',
    'panel.p.pendientes': '{n} por revisar',
    // Impresos (versión de empresa)
    'panel.imp.titulo': 'Tus impresos del {t}T {anio}',
    'panel.imp.plazo': 'Plazo hasta el {fecha}',
    'panel.imp.texto': 'Las casillas de tus gastos, listas para copiar en la Sede de Hacienda o pasárselas a tu gestoría. Los ingresos los pones tú.',
    'panel.imp.303': 'Modelo 303 · IVA del trimestre',
    'panel.imp.130': 'Modelo 130 · Pago a cuenta del IRPF',
    'panel.imp.casilla': 'Casilla {n}',
    'panel.imp.base_soportado': 'Base de tus gastos con IVA',
    'panel.imp.cuota_soportado': 'IVA que te deduces',
    'panel.imp.gastos_deducibles': 'Gastos deducibles desde el 1 de enero',
    'panel.imp.facturas1': 'Con 1 factura',
    'panel.imp.facturas': 'Con {n} facturas',
    'panel.imp.copiar': 'Copiar el importe de la casilla {n}',
    'panel.imp.copiado': 'Copiado: {importe}',
    'panel.imp.regimen_exento': 'Estás exento de IVA: no presentas el 303.',
    'panel.imp.regimen_simplificado': 'En régimen simplificado se calcula por módulos (303 y 131). Pásale el informe a tu gestoría.',
    'panel.imp.regimen_recargo_equivalencia': 'Con recargo de equivalencia no presentas el 303 por esta actividad.',
    'panel.imp.sin_perfil': 'Completa tu perfil fiscal para calcularlo.',
    'panel.imp.noDeducibles1': '1 gasto de este trimestre ({total}) no cuenta porque le falta el NIF o el IVA desglosado. Pide la factura completa.',
    'panel.imp.noDeducibles': '{n} gastos de este trimestre ({total}) no cuentan porque les falta el NIF o el IVA desglosado. Pide la factura completa.',
    'panel.imp.sede': 'Ir a la Sede de Hacienda',
    'panel.imp.informe': 'Informe para la gestoría',
    'panel.imp.aviso': 'Es una ayuda: revisa los datos antes de presentar y, si tienes dudas, pregunta a tu gestoría.',
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
    // Personal version
    'panel.p.vacio': 'No receipts yet. Upload your first one',
    'panel.p.subir': 'Upload receipt',
    'panel.p.gastado': 'Spent',
    'panel.p.presupuesto': 'Budget',
    'panel.p.quedan': '{n} left',
    'panel.p.pasado': '{n} over',
    'panel.p.de': 'of {n}',
    'panel.p.sinPresupuesto': 'No budget',
    'panel.p.ponerPresupuesto': 'Set one in Settings',
    'panel.p.tickets': 'Receipts',
    'panel.p.media': 'Daily average',
    'panel.p.mediaApoyo': 'Over {n} days',
    'panel.p.porRevisar1': "You have 1 receipt to review. Until you confirm it, it doesn't count in these numbers.",
    'panel.p.porRevisar': "You have {n} receipts to review. Until you confirm them, they don't count in these numbers.",
    'panel.p.pendientes1': '1 to review',
    'panel.p.pendientes': '{n} to review',
    // Tax forms (business version)
    'panel.imp.titulo': 'Your Q{t} {anio} tax forms',
    'panel.imp.plazo': 'Deadline: {fecha}',
    'panel.imp.texto': 'The boxes for your expenses, ready to copy into the Tax Agency website or send to your accountant. You fill in your income.',
    'panel.imp.303': 'Form 303 · Quarterly VAT',
    'panel.imp.130': 'Form 130 · Income tax payment on account',
    'panel.imp.casilla': 'Box {n}',
    'panel.imp.base_soportado': 'Base of your expenses with VAT',
    'panel.imp.cuota_soportado': 'VAT you deduct',
    'panel.imp.gastos_deducibles': 'Deductible expenses since 1 January',
    'panel.imp.facturas1': 'From 1 invoice',
    'panel.imp.facturas': 'From {n} invoices',
    'panel.imp.copiar': 'Copy the amount in box {n}',
    'panel.imp.copiado': 'Copied: {importe}',
    'panel.imp.regimen_exento': "You're VAT exempt: you don't file form 303.",
    'panel.imp.regimen_simplificado': 'Under the simplified scheme it is calculated by modules (303 and 131). Send the report to your accountant.',
    'panel.imp.regimen_recargo_equivalencia': "With the equivalence surcharge you don't file form 303 for this activity.",
    'panel.imp.sin_perfil': 'Complete your tax profile to calculate it.',
    'panel.imp.noDeducibles1': "1 expense this quarter ({total}) doesn't count because it's missing the tax ID or the VAT breakdown. Ask for the full invoice.",
    'panel.imp.noDeducibles': "{n} expenses this quarter ({total}) don't count because they're missing the tax ID or the VAT breakdown. Ask for the full invoice.",
    'panel.imp.sede': 'Go to the Tax Agency website',
    'panel.imp.informe': 'Report for your accountant',
    'panel.imp.aviso': "It's a guide: check the figures before filing and ask your accountant if in doubt.",
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

// ---------- Versión personal ----------

// Días que ya han pasado del periodo (si es el de hoy) o todos.
function diasTranscurridos(d) {
  const fin = d.periodo.hasta < hoy() ? d.periodo.hasta : hoy();
  const dias = Math.round((Date.parse(fin) - Date.parse(d.periodo.desde)) / 86400000) + 1;
  return Math.max(1, Math.min(dias, d.diasPeriodo));
}

function cifrasPersonal(d) {
  const p = d.presupuesto;
  const pendientes = d.pendientes === 0 ? t('panel.sinPendientes')
    : d.pendientes === 1 ? t('panel.p.pendientes1') : t('panel.p.pendientes', { n: d.pendientes });
  const dias = diasTranscurridos(d);
  const presupuesto = p
    ? tarjeta({
      titulo: t('panel.p.presupuesto'),
      cifra: p.restante >= 0 ? t('panel.p.quedan', { n: dinero(p.restante) }) : t('panel.p.pasado', { n: dinero(-p.restante) }),
      apoyo: html`<span class="panel-presupuesto ${p.restante < 0 ? 'panel-presupuesto-pasado' : ''}" role="img"
          aria-label="${porcentaje(Math.min(999, (d.gastoTotal / p.total) * 100))}">
          <span style="width: ${Math.min(100, (d.gastoTotal / p.total) * 100).toFixed(1)}%"></span></span>
        <span>${t('panel.p.de', { n: dinero(p.total) })}</span>`,
      clase: p.restante < 0 ? 'panel-cifra-pasado' : '',
    })
    : tarjeta({
      titulo: t('panel.p.presupuesto'), cifra: t('panel.p.sinPresupuesto'),
      apoyo: html`<a class="boton-texto" href="/app/ajustes#personal">${t('panel.p.ponerPresupuesto')}</a>`,
    });
  return html`<div class="panel-cifras">
    ${seguro(tarjeta({ titulo: `${t('panel.p.gastado')} · ${nombrePeriodo(d.periodo)}`, cifra: dinero(d.gastoTotal), apoyo: comparacion(d), clase: 'panel-cifra-principal' }))}
    ${seguro(presupuesto)}
    ${seguro(tarjeta({ titulo: t('panel.p.tickets'), cifra: String(d.numFacturas), apoyo: d.pendientes
      ? html`<a class="boton-texto" href="/app/facturas?estado=pendiente">${pendientes}</a>` : html`${pendientes}` }))}
    ${seguro(tarjeta({ titulo: t('panel.p.media'), cifra: dinero(d.gastoTotal / dias), apoyo: html`${t('panel.p.mediaApoyo', { n: dias })}` }))}
  </div>`;
}

// ---------- Impresos (versión de empresa) ----------

function impresos(d) {
  const i = d.impresos;
  if (!i) return '';
  const modelos = i.impresos.map((m) => seguro(html`<div class="panel-modelo">
    <h3 class="panel-modelo-titulo">${t(`panel.imp.${m.modelo}`)}</h3>
    ${m.aplica
      ? seguro(html`<ul class="panel-casillas">${m.casillas.map((c) => seguro(html`<li class="panel-casilla">
          <span class="panel-casilla-texto"><span class="panel-casilla-numero">${t('panel.imp.casilla', { n: c.casilla })}</span>
            <span class="texto-2">${t(`panel.imp.${c.concepto}`)}</span></span>
          <span class="panel-casilla-importe importe">${dinero(c.importe)}</span>
          <button type="button" class="boton-icono" data-copiar="${c.importe}" aria-label="${t('panel.imp.copiar', { n: c.casilla })}"
            title="${t('panel.imp.copiar', { n: c.casilla })}">${seguro(icono('copiar'))}</button>
        </li>`))}</ul>
        <p class="texto-2 panel-modelo-pie">${m.numFacturas === 1 ? t('panel.imp.facturas1') : t('panel.imp.facturas', { n: m.numFacturas })}</p>`)
      : seguro(html`<p class="texto-2">${t(`panel.imp.${m.motivo}`)}</p>`)}
  </div>`));
  const noDeducibles = i.noDeducibles.num
    ? html`<a class="banner banner-aviso" href="/app/avisos">${seguro(icono('alerta'))}<span class="banner-texto">${i.noDeducibles.num === 1
      ? t('panel.imp.noDeducibles1', { total: dinero(i.noDeducibles.total) })
      : t('panel.imp.noDeducibles', { n: i.noDeducibles.num, total: dinero(i.noDeducibles.total) })}</span>${seguro(icono('flecha', 'banner-flecha'))}</a>`
    : '';
  return html`<section class="tarjeta panel-impresos">
    <div class="tarjeta-cabecera">
      <h2 class="titulo-seccion">${t('panel.imp.titulo', { t: i.trimestre, anio: i.anio })}</h2>
      <span class="etiqueta etiqueta-pendiente">${seguro(icono('calendario'))} ${t('panel.imp.plazo', { fecha: fecha(i.plazo) })}</span>
    </div>
    <p class="texto-2">${t('panel.imp.texto')}</p>
    <div class="panel-modelos">${modelos}</div>
    ${seguro(noDeducibles)}
    <div class="panel-impresos-botones">
      <a class="boton boton-principal" href="${i.sede}" target="_blank" rel="noopener noreferrer">${t('panel.imp.sede')}</a>
      <a class="boton boton-secundario" href="/app/informes">${t('panel.imp.informe')}</a>
    </div>
    <p class="texto-2 panel-impresos-aviso">${t('panel.imp.aviso')}</p>
  </section>`;
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
  const personal = d?.version === 'personal';
  if (!personal && usuario && usuario.perfil_completo === false) {
    banners.push(html`<a class="banner" href="/app/perfil">${seguro(icono('perfil'))}
      <span class="banner-texto">${t('panel.perfil')} <strong>${t('panel.completarPerfil')}</strong></span>${seguro(icono('flecha', 'banner-flecha'))}</a>`);
  }
  if (d?.pendientes) {
    banners.push(html`<a class="banner" href="/app/facturas?estado=pendiente">${seguro(icono('destello'))}
      <span class="banner-texto">${d.pendientes === 1 ? t(personal ? 'panel.p.porRevisar1' : 'panel.porRevisar1')
        : t(personal ? 'panel.p.porRevisar' : 'panel.porRevisar', { n: d.pendientes })}</span>${seguro(icono('flecha', 'banner-flecha'))}</a>`);
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
    const personal = d.version === 'personal';
    if (ultimas.total === 0) {
      $('cuerpo').innerHTML = html`<div class="tarjeta">${seguro(vacio({
        icono: 'facturas',
        texto: t(personal ? 'panel.p.vacio' : 'panel.vacio'),
        boton: { href: '/app/subir', texto: t(personal ? 'panel.p.subir' : 'panel.subir') },
      }))}</div>`;
      return;
    }
    $('cuerpo').innerHTML = html`
      ${seguro(personal ? cifrasPersonal(d) : cifras(d))}
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
      ${!personal && d.porCliente.length ? seguro(clientes(d)) : ''}
      ${seguro(impresos(d))}`;
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
// Copiar el importe de una casilla tal y como se escribe en Hacienda (con coma).
$('cuerpo').addEventListener('click', async (evento) => {
  const boton = evento.target.closest('[data-copiar]');
  if (!boton) return;
  const importe = Number(boton.dataset.copiar).toFixed(2).replace('.', ',');
  try {
    await navigator.clipboard.writeText(importe);
    mostrarToast(t('panel.imp.copiado', { importe }));
  } catch {
    mostrarToast(importe);
  }
});

$('anterior').addEventListener('click', () => mover(-1));
$('siguiente').addEventListener('click', () => mover(1));

pintarCabecera(null);
cargar();
