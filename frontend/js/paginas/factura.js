// Revisar factura (RF-30 a RF-36). Responsable: Rodrigo (#19)
// Original a la izquierda y datos a la derecha (apilados en móvil). Cada dato se ve como
// texto: un clic lo vuelve campo y Enter o clic fuera lo guarda (RF-31, máximo dos clics).
import { iniciarPagina } from '../core/layout.js';
import { t } from '../core/i18n.js';
import { api } from '../core/api.js';
import { icono } from '../core/iconos.js';
import { dinero, fecha } from '../core/formato.js';
import { html, seguro, vacio, mostrarToast, etiquetaEstado } from '../core/ui.js';
import { pintarSugerenciaEvento } from '../componentes/sugerencia-evento.js';

const textos = {
  es: {
    'factura.titulo': 'Revisar factura',
    'factura.volver': 'Facturas',
    'factura.noEncontrada': 'No hemos encontrado esta factura.',
    'factura.verFacturas': 'Ver mis facturas',
    'factura.sinEmisor': 'Factura sin leer',
    'factura.original': 'Original',
    'factura.sinOriginal': 'Esta factura no tiene original.',
    'factura.noSeVe': 'Este formato no se puede ver en el navegador. Ábrelo o descárgalo.',
    'factura.abrir': 'Abrir',
    'factura.descargar': 'Descargar',
    'factura.datos': 'Datos de la factura',
    'factura.anadir': 'Añadir',
    'factura.editar': 'Cambiar {campo}',
    'factura.sugerido': 'Propuesto por la IA',
    'factura.guardado': 'Guardado',
    'factura.campo.emisor': 'Emisor',
    'factura.campo.nif_emisor': 'NIF del emisor',
    'factura.campo.numero': 'Número',
    'factura.campo.fecha': 'Fecha',
    'factura.campo.hora': 'Hora',
    'factura.campo.nif_receptor': 'NIF del receptor',
    'factura.campo.categoria_id': 'Categoría',
    'factura.campo.total': 'Total',
    'factura.campo.moneda': 'Moneda',
    'factura.campo.tipo_cambio': 'Tipo de cambio',
    'factura.campo.total_eur': 'Total en euros',
    'factura.campo.lineas_iva': 'Líneas de IVA',
    'factura.cambio': '1 {moneda} = {valor} €',
    'factura.sinCategoria': 'Sin categoría',
    'factura.crearCategoria': '+ Crear categoría…',
    'factura.nombreCategoria': 'Nombre de la nueva categoría',
    'factura.iva': 'IVA',
    'factura.base': 'Base',
    'factura.tipo': 'Tipo (%)',
    'factura.cuota': 'Cuota',
    'factura.sinLineas': 'Sin líneas de IVA',
    'factura.sumaBase': 'Base imponible',
    'factura.sumaCuota': 'IVA',
    'factura.anadirLinea': 'Añadir línea',
    'factura.quitarLinea': 'Quitar línea',
    'factura.guardar': 'Guardar',
    'factura.editarIva': 'Cambiar las líneas de IVA',
    'factura.confirmar': 'Confirmar',
    'factura.confirmada': 'Factura confirmada',
    'factura.reabrir': 'Reabrir',
    'factura.borrar': 'Borrar',
    'factura.siguiente': 'Siguiente pendiente',
    'factura.preguntaReabrir': 'Al reabrirla vuelve a pendiente de revisar y deja de contar en tus cuentas hasta que la confirmes otra vez. ¿Reabrir?',
    'factura.preguntaBorrar': 'Se borrará la factura y su original. No se puede deshacer. ¿Borrar?',
    'factura.historial': 'Historial de cambios',
    'factura.sinCambios': 'Aún no hay cambios.',
    'factura.h.confirmar': 'Confirmada',
    'factura.h.reabrir': 'Reabierta para corregirla',
    'factura.h.lineas': 'Líneas de IVA cambiadas',
    'factura.h.vacio': 'vacío',
    'factura.bannerIa': 'Cuadra ha leído esta factura. Lo marcado con el destello es lo que propone: revísalo y confirma.',
    'factura.bannerSinLeer': 'Aún no hemos leído esta factura porque has llegado al límite de tu plan.',
    'factura.verPlanes': 'Ver planes',
    'factura.bannerConfirmada': 'Factura confirmada. Para cambiarla, reábrela.',
    'factura.aviso.sin_nif': 'Este ticket no tiene NIF y puede que no lo puedas deducir. Pide la factura completa.',
    'factura.aviso.otro_nif': 'Esta factura está a nombre de otro NIF. Revisa el NIF del receptor.',
    'factura.aviso.total_no_cuadra': 'La base más el IVA no da el total. Revisa los importes.',
    'factura.aviso.duplicado': 'Puede que esta factura esté repetida. Mira la otra.',
    'factura.aviso.pendiente_revisar': 'Esta factura lleva días pendiente de revisar.',
    'factura.aviso.texto_correo': 'Esta factura sale del texto de un correo, no de un archivo. Revisa bien los datos.',
    'factura.aviso.otro': 'Hay algo que revisar en esta factura.',
    'factura.dup.titulo': '¿Es la misma factura?',
    'factura.dup.texto': 'Se parece mucho a una que ya tenías. Compáralas y decide qué hacer con esta.',
    'factura.dup.esta': 'Esta factura',
    'factura.dup.otra': 'La que ya tenías',
    'factura.dup.abrirOtra': 'Abrir la que ya tenías',
    'factura.dup.coincide': 'coincide',
    'factura.dup.descartar': 'Descartar esta',
    'factura.dup.guardar': 'Guardar igualmente',
    'factura.dup.preguntaDescartar': 'Se borrará esta factura y su original, y te quedas con la que ya tenías. ¿Descartarla?',
    'factura.dup.guardada': 'Guardada. No te volveremos a avisar por esta.',
    'factura.dup.confirmada': 'Esta ya está confirmada: si de verdad está repetida, reábrela para poder descartarla.',
  },
  en: {
    'factura.titulo': 'Review invoice',
    'factura.volver': 'Invoices',
    'factura.noEncontrada': "We couldn't find this invoice.",
    'factura.verFacturas': 'See my invoices',
    'factura.sinEmisor': 'Unread invoice',
    'factura.original': 'Original',
    'factura.sinOriginal': 'This invoice has no original.',
    'factura.noSeVe': "This format can't be shown in the browser. Open or download it.",
    'factura.abrir': 'Open',
    'factura.descargar': 'Download',
    'factura.datos': 'Invoice details',
    'factura.anadir': 'Add',
    'factura.editar': 'Change {campo}',
    'factura.sugerido': 'Suggested by AI',
    'factura.guardado': 'Saved',
    'factura.campo.emisor': 'Issuer',
    'factura.campo.nif_emisor': 'Issuer tax ID',
    'factura.campo.numero': 'Number',
    'factura.campo.fecha': 'Date',
    'factura.campo.hora': 'Time',
    'factura.campo.nif_receptor': 'Recipient tax ID',
    'factura.campo.categoria_id': 'Category',
    'factura.campo.total': 'Total',
    'factura.campo.moneda': 'Currency',
    'factura.campo.tipo_cambio': 'Exchange rate',
    'factura.campo.total_eur': 'Total in euros',
    'factura.campo.lineas_iva': 'VAT lines',
    'factura.cambio': '1 {moneda} = €{valor}',
    'factura.sinCategoria': 'No category',
    'factura.crearCategoria': '+ Create category…',
    'factura.nombreCategoria': 'New category name',
    'factura.iva': 'VAT',
    'factura.base': 'Base',
    'factura.tipo': 'Rate (%)',
    'factura.cuota': 'VAT amount',
    'factura.sinLineas': 'No VAT lines',
    'factura.sumaBase': 'Taxable base',
    'factura.sumaCuota': 'VAT',
    'factura.anadirLinea': 'Add line',
    'factura.quitarLinea': 'Remove line',
    'factura.guardar': 'Save',
    'factura.editarIva': 'Change the VAT lines',
    'factura.confirmar': 'Confirm',
    'factura.confirmada': 'Invoice confirmed',
    'factura.reabrir': 'Reopen',
    'factura.borrar': 'Delete',
    'factura.siguiente': 'Next to review',
    'factura.preguntaReabrir': "Reopening it puts it back to review and it won't count in your numbers until you confirm it again. Reopen?",
    'factura.preguntaBorrar': "The invoice and its original will be deleted. This can't be undone. Delete?",
    'factura.historial': 'Change history',
    'factura.sinCambios': 'No changes yet.',
    'factura.h.confirmar': 'Confirmed',
    'factura.h.reabrir': 'Reopened to fix it',
    'factura.h.lineas': 'VAT lines changed',
    'factura.h.vacio': 'empty',
    'factura.bannerIa': 'Cuadra has read this invoice. What is marked with the sparkle is a suggestion: check it and confirm.',
    'factura.bannerSinLeer': "We haven't read this invoice yet because you've reached your plan's limit.",
    'factura.verPlanes': 'See plans',
    'factura.bannerConfirmada': 'Invoice confirmed. To change it, reopen it.',
    'factura.aviso.sin_nif': "This receipt has no tax ID and you may not be able to deduct it. Ask for the full invoice.",
    'factura.aviso.otro_nif': "This invoice is addressed to another tax ID. Check the recipient's tax ID.",
    'factura.aviso.total_no_cuadra': "Base plus VAT doesn't add up to the total. Check the amounts.",
    'factura.aviso.duplicado': 'This invoice may be a duplicate. Look at the other one.',
    'factura.aviso.pendiente_revisar': 'This invoice has been waiting for review for days.',
    'factura.aviso.texto_correo': 'This invoice comes from the text of an email, not a file. Check the details carefully.',
    'factura.aviso.otro': 'There is something to check on this invoice.',
    'factura.dup.titulo': 'Is it the same invoice?',
    'factura.dup.texto': 'It looks a lot like one you already had. Compare them and decide what to do with this one.',
    'factura.dup.esta': 'This invoice',
    'factura.dup.otra': 'The one you already had',
    'factura.dup.abrirOtra': 'Open the one you already had',
    'factura.dup.coincide': 'matches',
    'factura.dup.descartar': 'Discard this one',
    'factura.dup.guardar': 'Keep it anyway',
    'factura.dup.preguntaDescartar': 'This invoice and its original will be deleted, and you keep the one you already had. Discard it?',
    'factura.dup.guardada': "Kept. We won't warn you about this one again.",
    'factura.dup.confirmada': 'This one is already confirmed: if it really is a duplicate, reopen it to be able to discard it.',
  },
};

// Campos que se ven y se corrigen uno a uno, en este orden.
const CAMPOS = [
  { campo: 'emisor', tipo: 'texto' },
  { campo: 'nif_emisor', tipo: 'texto' },
  { campo: 'numero', tipo: 'texto' },
  { campo: 'fecha', tipo: 'fecha' },
  { campo: 'hora', tipo: 'hora' },
  { campo: 'nif_receptor', tipo: 'texto' },
  { campo: 'categoria_id', tipo: 'categoria' },
  { campo: 'total', tipo: 'importe' },
  { campo: 'moneda', tipo: 'moneda' },
  { campo: 'tipo_cambio', tipo: 'importe', soloSi: (f) => f.moneda !== 'EUR' },
];
const NUEVA = '__nueva';

await iniciarPagina({ pagina: 'factura', privada: true, textos });

const contenido = document.getElementById('contenido');
const facturaId = new URLSearchParams(location.search).get('id');
let factura = null;
let categorias = [];

contenido.innerHTML = html`
  <a class="boton-texto factura-volver" href="/app/facturas">${seguro(icono('atras'))}${t('factura.volver')}</a>
  <div class="cabecera-pagina" id="cabecera"><h1 class="titulo-pagina">${t('factura.titulo')}</h1></div>
  <div class="pila factura-banners" id="banners"></div>
  <div id="sugerencia-evento"></div>
  <section class="tarjeta factura-duplicado" id="duplicado" aria-labelledby="titulo-duplicado" hidden></section>
  <div class="dos-columnas factura-cuerpo" id="cuerpo" hidden>
    <section class="tarjeta factura-original" id="original" aria-label="${t('factura.original')}"></section>
    <div class="pila">
      <section class="tarjeta" id="datos" aria-labelledby="titulo-datos"></section>
      <section class="tarjeta" id="iva" aria-labelledby="titulo-iva"></section>
      <div class="factura-acciones" id="acciones"></div>
      <section class="tarjeta" id="historial" aria-labelledby="titulo-historial"></section>
    </div>
  </div>
  <dialog class="factura-dialogo" id="dialogo">
    <form method="dialog">
      <p id="dialogo-texto"></p>
      <div class="factura-dialogo-botones">
        <button class="boton boton-secundario" value="no">${t('comun.cancelar')}</button>
        <button class="boton" id="dialogo-si" value="si"></button>
      </div>
    </form>
  </dialog>`;

const $ = (id) => document.getElementById(id);
const editable = () => factura.estado === 'pendiente';

// ---------- Cómo se ve cada dato ----------

function textoDe(campo, valor, f = factura) {
  if (valor === null || valor === undefined || valor === '') return '';
  switch (campo) {
    case 'fecha': return fecha(valor);
    case 'hora': return String(valor).slice(0, 5);
    case 'total': return dinero(valor, f.moneda);
    case 'total_eur': return dinero(valor);
    case 'tipo_cambio': return t('factura.cambio', { moneda: f.moneda, valor: Number(valor).toLocaleString(undefined, { maximumFractionDigits: 6 }) });
    case 'categoria_id': {
      if (f.categoria && Number(f.categoria.id) === Number(valor)) return f.categoria.nombre;
      return categorias.find((c) => Number(c.id) === Number(valor))?.nombre ?? `#${valor}`;
    }
    default: return String(valor);
  }
}

// Lo propuesto por la IA que el usuario aún no ha tocado se marca como sugerencia.
function esSugerido(campo) {
  if (!editable() || !factura.leida_por_ia) return false;
  if (factura[campo] === null || factura[campo] === undefined) return false;
  return !factura.cambios.some((c) => c.accion === 'editar' && c.campo === campo);
}

const ivaSugerido = () => editable() && factura.leida_por_ia && factura.lineas_iva.length > 0
  && !factura.cambios.some((c) => c.accion === 'editar' && c.campo === 'lineas_iva');

function marcaSugerido() {
  return html`<span class="factura-sugerido" title="${t('factura.sugerido')}">${seguro(icono('destello'))}<span class="sr-only">${t('factura.sugerido')}</span></span>`;
}

function filaCampo({ campo }) {
  const etiqueta = t(`factura.campo.${campo}`);
  const texto = textoDe(campo, factura[campo]);
  const valor = texto
    ? html`<span class="factura-valor-texto">${texto}</span>`
    : html`<span class="factura-valor-texto factura-vacio">${editable() ? t('factura.anadir') : '—'}</span>`;
  return html`
    <div class="factura-campo" data-campo="${campo}">
      <span class="factura-etiqueta" id="etiqueta-${campo}">${etiqueta}</span>
      ${editable()
        ? seguro(html`<button type="button" class="factura-valor" data-editar="${campo}"
            aria-label="${t('factura.editar', { campo: etiqueta.toLowerCase() })}: ${texto || t('factura.anadir')}">
            ${seguro(valor)}${esSugerido(campo) ? seguro(marcaSugerido()) : ''}${seguro(icono('editar', 'factura-lapiz'))}</button>`)
        : seguro(html`<span class="factura-valor factura-valor-fijo">${seguro(valor)}</span>`)}
      <p class="campo-error" id="error-${campo}" role="alert" hidden></p>
    </div>`;
}

// ---------- Pintar ----------

function pintarCabecera() {
  $('cabecera').innerHTML = html`
    <div class="factura-titulo">
      <h1 class="titulo-pagina">${factura.emisor || t('factura.sinEmisor')}</h1>
      ${seguro(etiquetaEstado(factura.estado))}
    </div>
    ${factura.total !== null ? seguro(html`<p class="cifra factura-cifra">${dinero(factura.total, factura.moneda)}</p>`) : ''}`;
  document.title = `${factura.emisor || t('factura.titulo')} · Cuadra`;
}

function pintarBanners() {
  const banners = [];
  if (factura.estado === 'sin_leer') {
    banners.push(html`<a class="banner" href="/app/suscripcion">${seguro(icono('reloj'))}
      <span class="banner-texto">${t('factura.bannerSinLeer')} <strong>${t('factura.verPlanes')}</strong></span>${seguro(icono('flecha', 'banner-flecha'))}</a>`);
  } else if (editable() && factura.leida_por_ia) {
    banners.push(html`<div class="banner">${seguro(icono('destello'))}<span class="banner-texto">${t('factura.bannerIa')}</span></div>`);
  } else if (factura.estado === 'confirmada') {
    banners.push(html`<div class="banner factura-banner-ok">${seguro(icono('check'))}<span class="banner-texto">${t('factura.bannerConfirmada')}</span></div>`);
  }
  for (const aviso of factura.avisos) {
    const clave = `factura.aviso.${aviso.tipo}`;
    const texto = t(clave) === clave ? t('factura.aviso.otro') : t(clave);
    if (aviso.tipo === 'duplicado' && factura.duplicado_de) {
      const otra = factura.duplicado_de;
      banners.push(html`<a class="banner banner-aviso" href="#duplicado">${seguro(icono('alerta'))}
        <span class="banner-texto">${texto} <strong>${otra.emisor || ''} · ${dinero(otra.total, otra.moneda)} · ${fecha(otra.fecha)}</strong></span>
        ${seguro(icono('flecha', 'banner-flecha'))}</a>`);
    } else {
      banners.push(html`<div class="banner banner-aviso">${seguro(icono('alerta'))}<span class="banner-texto">${texto}</span></div>`);
    }
  }
  $('banners').innerHTML = banners.join('');
}

// Vista del original de una factura (PDF, foto o un aviso si el formato no se puede ver).
function vistaOriginal(f, clase = '') {
  const url = `/api/facturas/${f.id}/original`;
  const original = f.original;
  if (!original) return vacio({ icono: 'archivo', texto: t('factura.sinOriginal') });
  if (original.tipo_mime === 'application/pdf') {
    return html`<iframe class="factura-visor ${clase}" src="${url}" title="${t('factura.original')}: ${original.nombre_archivo}"></iframe>`;
  }
  if (['image/jpeg', 'image/png'].includes(original.tipo_mime)) {
    return html`<img class="factura-visor factura-imagen ${clase}" src="${url}" alt="${t('factura.original')}: ${original.nombre_archivo}">`;
  }
  return vacio({ icono: 'archivo', texto: t('factura.noSeVe') });
}

// El original solo se pinta una vez: así el PDF no se recarga con cada cambio.
function pintarOriginal() {
  const url = `/api/facturas/${factura.id}/original`;
  const original = factura.original;
  const vista = vistaOriginal(factura);
  $('original').innerHTML = html`
    <div class="tarjeta-cabecera">
      <h2 class="titulo-seccion">${t('factura.original')}</h2>
      ${original ? seguro(html`<div class="factura-original-botones">
        <a class="boton boton-secundario" href="${url}" target="_blank" rel="noopener">${seguro(icono('ojo'))}${t('factura.abrir')}</a>
        <a class="boton-icono" href="${url}?descargar=1" download aria-label="${t('factura.descargar')}" title="${t('factura.descargar')}">${seguro(icono('descargar'))}</a>
      </div>`) : ''}
    </div>
    ${seguro(vista)}`;
}

function pintarDatos() {
  const filas = CAMPOS.filter((c) => !c.soloSi || c.soloSi(factura)).map(filaCampo);
  if (factura.moneda !== 'EUR') {
    filas.push(html`<div class="factura-campo"><span class="factura-etiqueta">${t('factura.campo.total_eur')}</span>
      <span class="factura-valor factura-valor-fijo importe">${textoDe('total_eur', factura.total_eur) || '—'}</span></div>`);
  }
  $('datos').innerHTML = html`<h2 class="titulo-seccion" id="titulo-datos">${t('factura.datos')}</h2>
    <div class="factura-campos">${filas.map(seguro)}</div>`;
}

function pintarIva() {
  const lineas = factura.lineas_iva;
  const tabla = lineas.length
    ? html`<table class="factura-tabla">
        <thead><tr><th scope="col">${t('factura.base')}</th><th scope="col">${t('factura.tipo')}</th><th scope="col">${t('factura.cuota')}</th></tr></thead>
        <tbody>${lineas.map((l) => seguro(html`<tr><td class="importe">${dinero(l.base, factura.moneda)}</td><td class="importe">${l.tipo} %</td><td class="importe">${dinero(l.cuota, factura.moneda)}</td></tr>`))}</tbody>
      </table>
      <dl class="factura-sumas">
        <div><dt>${t('factura.sumaBase')}</dt><dd class="importe">${dinero(factura.base_imponible, factura.moneda)}</dd></div>
        <div><dt>${t('factura.sumaCuota')}</dt><dd class="importe">${dinero(factura.cuota_iva, factura.moneda)}</dd></div>
      </dl>`
    : html`<p class="texto-2">${t('factura.sinLineas')}</p>`;

  $('iva').innerHTML = html`
    <div class="tarjeta-cabecera">
      <h2 class="titulo-seccion" id="titulo-iva">${t('factura.iva')}${ivaSugerido() ? seguro(marcaSugerido()) : ''}</h2>
      ${editable() ? seguro(html`<button type="button" class="boton-icono" id="editar-iva" aria-label="${t('factura.editarIva')}" title="${t('factura.editarIva')}">${seguro(icono('editar'))}</button>`) : ''}
    </div>
    ${editable() ? seguro(html`<div class="factura-iva-vista" id="vista-iva">${seguro(tabla)}</div>`) : seguro(tabla)}`;
}

function pintarAcciones() {
  const siguiente = factura.siguiente_pendiente
    ? html`<a class="boton ${factura.estado === 'confirmada' ? 'boton-principal' : 'boton-texto'}" href="/app/factura?id=${factura.siguiente_pendiente}">${t('factura.siguiente')}${seguro(icono('flecha'))}</a>`
    : '';
  let botones = '';
  if (factura.estado === 'pendiente') {
    botones = html`<button type="button" class="boton boton-principal" id="confirmar">${seguro(icono('check'))}${t('factura.confirmar')}</button>
      <button type="button" class="boton boton-peligro" id="borrar">${seguro(icono('papelera'))}${t('factura.borrar')}</button>`;
  } else if (factura.estado === 'confirmada') {
    botones = html`<button type="button" class="boton boton-secundario" id="reabrir">${t('factura.reabrir')}</button>`;
  } else {
    botones = html`<button type="button" class="boton boton-peligro" id="borrar">${seguro(icono('papelera'))}${t('factura.borrar')}</button>`;
  }
  $('acciones').innerHTML = botones + siguiente;
}

function textoCambio(cambio) {
  if (cambio.accion === 'confirmar') return t('factura.h.confirmar');
  if (cambio.accion === 'reabrir') return t('factura.h.reabrir');
  if (cambio.campo === 'lineas_iva') return t('factura.h.lineas');
  const etiqueta = t(`factura.campo.${cambio.campo}`);
  const valor = (v) => textoDe(cambio.campo, v) || t('factura.h.vacio');
  return `${etiqueta}: ${valor(cambio.valor_anterior)} → ${valor(cambio.valor_nuevo)}`;
}

function pintarHistorial() {
  const cuando = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
  $('historial').innerHTML = html`<h2 class="titulo-seccion" id="titulo-historial">${t('factura.historial')}</h2>
    ${factura.cambios.length
      ? seguro(html`<ul class="lista factura-historial">${factura.cambios.map((c) => seguro(html`
          <li class="fila"><span class="fila-centro"><span class="fila-sub">${fecha(c.creado_en, cuando)}</span>${textoCambio(c)}</span></li>`))}</ul>`)
      : seguro(html`<p class="texto-2">${t('factura.sinCambios')}</p>`)}`;
}

// ---------- Posible duplicado (RF-36): las dos facturas juntas y el usuario decide ----------

const CAMPOS_DUPLICADO = ['emisor', 'nif_emisor', 'numero', 'fecha', 'hora', 'total'];
const otras = new Map(); // facturas con las que se compara, para no pedirlas cada vez
let duplicadoPintado = null;

function igual(campo, a, b) {
  const x = a[campo];
  const y = b[campo];
  if (x === null || x === undefined || y === null || y === undefined) return false;
  if (campo === 'total') return Number(x) === Number(y);
  if (campo === 'hora') return String(x).slice(0, 5) === String(y).slice(0, 5);
  const limpio = (v) => String(v).toLowerCase().replace(campo === 'nif_emisor' ? /[\s.-]/g : /\s+/g, campo === 'nif_emisor' ? '' : ' ').trim();
  return limpio(x) === limpio(y);
}

function datosDuplicado(f, otra) {
  return html`<dl class="factura-dup-datos">${CAMPOS_DUPLICADO.map((campo) => {
    const coincide = otra && igual(campo, f, otra);
    return seguro(html`<div class="${coincide ? 'factura-coincide' : ''}">
      <dt>${t(`factura.campo.${campo}`)}</dt>
      <dd class="importe">${textoDe(campo, f[campo], f) || '—'}${coincide
        ? seguro(html`${seguro(icono('check'))}<span class="sr-only"> (${t('factura.dup.coincide')})</span>`) : ''}</dd>
    </div>`);
  })}</dl>`;
}

async function pintarDuplicado() {
  const seccion = $('duplicado');
  const resumen = factura.duplicado_de;
  if (!resumen || factura.duplicado_aceptado) {
    seccion.hidden = true;
    seccion.innerHTML = '';
    duplicadoPintado = null;
    return;
  }
  if (!otras.has(resumen.id)) {
    // Si no se puede cargar entera, nos apañamos con el resumen que trae la factura.
    otras.set(resumen.id, await api(`/facturas/${resumen.id}`).catch(() => ({ ...resumen, original: null })));
  }
  const otra = otras.get(resumen.id);
  if (factura.duplicado_de?.id !== resumen.id) return; // cambió mientras cargaba

  // Los originales solo se pintan cuando cambia la pareja; los datos, siempre.
  if (duplicadoPintado !== resumen.id) {
    seccion.innerHTML = html`
      <h2 class="titulo-seccion" id="titulo-duplicado">${t('factura.dup.titulo')}</h2>
      <p class="texto-2 factura-dup-texto">${t('factura.dup.texto')}</p>
      <div class="factura-dup-rejilla">
        <div class="factura-dup-columna">
          <div class="factura-dup-cabecera"><h3>${t('factura.dup.esta')}</h3>${seguro(etiquetaEstado(factura.estado))}</div>
          ${seguro(vistaOriginal(factura, 'factura-visor-mini'))}
          <div id="dup-datos-esta"></div>
        </div>
        <div class="factura-dup-columna">
          <div class="factura-dup-cabecera"><h3>${t('factura.dup.otra')}</h3>${seguro(etiquetaEstado(otra.estado))}</div>
          ${seguro(vistaOriginal(otra, 'factura-visor-mini'))}
          <div id="dup-datos-otra"></div>
          <a class="boton-texto factura-dup-abrir" href="/app/factura?id=${otra.id}">${t('factura.dup.abrirOtra')}${seguro(icono('flecha'))}</a>
        </div>
      </div>
      <div class="factura-dup-botones" id="dup-botones"></div>`;
    duplicadoPintado = resumen.id;
  }
  $('dup-datos-esta').innerHTML = datosDuplicado(factura, otra);
  $('dup-datos-otra').innerHTML = datosDuplicado(otra, factura);
  $('dup-botones').innerHTML = factura.estado === 'confirmada'
    ? html`<p class="texto-2">${t('factura.dup.confirmada')}</p>
      <button type="button" class="boton boton-secundario" data-duplicado="guardar">${t('factura.dup.guardar')}</button>`
    : html`<button type="button" class="boton boton-peligro" data-duplicado="descartar">${seguro(icono('papelera'))}${t('factura.dup.descartar')}</button>
      <button type="button" class="boton boton-secundario" data-duplicado="guardar">${t('factura.dup.guardar')}</button>`;
  seccion.hidden = false;
}

$('duplicado').addEventListener('click', async (evento) => {
  const boton = evento.target.closest('[data-duplicado]');
  if (!boton || !factura?.duplicado_de) return;
  const accion = boton.dataset.duplicado;
  const otraId = factura.duplicado_de.id;
  if (accion === 'descartar' && !(await preguntar(t('factura.dup.preguntaDescartar'), t('factura.dup.descartar'), true))) return;
  boton.disabled = true;
  try {
    await api(`/facturas/${factura.id}/duplicado`, { metodo: 'POST', cuerpo: { accion } });
    if (accion === 'descartar') {
      location.href = `/app/factura?id=${otraId}`;
      return;
    }
    mostrarToast(t('factura.dup.guardada'));
    await recargar();
  } catch (error) {
    boton.disabled = false;
    mostrarToast(error.message || t('comun.error'));
    await recargar();
  }
});

function pintarTodo({ original = false } = {}) {
  pintarCabecera();
  pintarBanners();
  pintarDuplicado();
  if (original) pintarOriginal();
  pintarDatos();
  pintarIva();
  pintarAcciones();
  pintarHistorial();
}

// ---------- Editar un dato (un clic para abrir, Enter o clic fuera para guardar) ----------

function controlPara({ campo, tipo }) {
  const valor = factura[campo] ?? '';
  const comun = `id="campo-${campo}" class="factura-control" aria-labelledby="etiqueta-${campo}" aria-describedby="error-${campo}"`;
  switch (tipo) {
    case 'fecha': return html`<input type="date" ${seguro(comun)} value="${valor}">`;
    case 'hora': return html`<input type="time" ${seguro(comun)} value="${String(valor).slice(0, 5)}">`;
    case 'importe': return html`<input type="text" inputmode="decimal" autocomplete="off" ${seguro(comun)} value="${valor === '' ? '' : String(valor).replace('.', ',')}">`;
    case 'moneda': return html`<input type="text" maxlength="3" autocomplete="off" autocapitalize="characters" ${seguro(comun)} value="${valor}">`;
    case 'categoria': {
      // La categoría actual sale siempre, aunque no sea de su actividad.
      const lista = [...categorias];
      if (factura.categoria && !lista.some((c) => c.id === factura.categoria.id)) lista.unshift(factura.categoria);
      return html`<select ${seguro(comun)}>
        <option value="">${t('factura.sinCategoria')}</option>
        ${lista.map((c) => seguro(html`<option value="${c.id}" ${Number(c.id) === Number(valor) ? 'selected' : ''}>${c.nombre}</option>`))}
        <option value="${NUEVA}">${t('factura.crearCategoria')}</option>
      </select>`;
    }
    default: return html`<input type="text" autocomplete="off" ${seguro(comun)} value="${valor}">`;
  }
}

function mostrarError(campo, mensaje) {
  const error = $(`error-${campo}`);
  if (!error) return mostrarToast(mensaje);
  error.textContent = mensaje;
  error.hidden = !mensaje;
}

async function guardar(cambios, campoError) {
  try {
    factura = await api(`/facturas/${factura.id}`, { metodo: 'PATCH', cuerpo: cambios });
    pintarTodo();
    mostrarToast(t('factura.guardado'));
    return true;
  } catch (error) {
    if (error.estado === 400) {
      mostrarError(error.detalles?.campo && $(`error-${error.detalles.campo}`) ? error.detalles.campo : campoError, error.message);
      return false;
    }
    mostrarToast(error.message || t('comun.error'));
    if (error.estado === 409) await recargar();
    return true;
  }
}

function abrirCampo(campo) {
  const definicion = CAMPOS.find((c) => c.campo === campo);
  const contenedor = document.querySelector(`.factura-campo[data-campo="${campo}"]`);
  const boton = contenedor?.querySelector('[data-editar]');
  if (!definicion || !boton) return;
  boton.insertAdjacentHTML('afterend', controlPara(definicion));
  boton.hidden = true;
  const control = $(`campo-${campo}`);
  control.focus();
  if (control.select && control.type === 'text') control.select();

  let terminado = false;
  const cerrar = () => { terminado = true; pintarDatos(); };
  const enviar = async () => {
    if (terminado) return;
    let valor = control.value.trim();
    if (definicion.tipo === 'categoria') {
      if (valor === NUEVA) return pedirNuevaCategoria(control);
      valor = valor ? Number(valor) : null;
    }
    const antes = factura[campo] === null || factura[campo] === undefined ? '' : String(factura[campo]);
    const ahora = valor === null ? '' : String(valor);
    const igual = definicion.tipo === 'importe'
      ? Number(antes) === Number(ahora.replace(',', '.')) && (antes === '') === (ahora === '')
      : definicion.tipo === 'hora' ? antes.slice(0, 5) === ahora : antes === ahora;
    if (igual) return cerrar();
    terminado = true;
    const ok = await guardar({ [campo]: valor === '' ? null : valor }, campo);
    if (!ok) { terminado = false; control.focus(); }
  };

  control.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter') { evento.preventDefault(); enviar(); }
    if (evento.key === 'Escape') { evento.preventDefault(); cerrar(); }
  });
  control.addEventListener('blur', () => { if (control.value !== NUEVA) enviar(); });
  if (definicion.tipo === 'categoria') control.addEventListener('change', enviar);
}

function pedirNuevaCategoria(select) {
  select.insertAdjacentHTML('afterend', html`<input type="text" class="factura-control" id="nueva-categoria" maxlength="60"
    placeholder="${t('factura.nombreCategoria')}" aria-label="${t('factura.nombreCategoria')}">`);
  select.hidden = true;
  const entrada = $('nueva-categoria');
  entrada.focus();
  let enviando = false;
  const crear = async () => {
    const nombre = entrada.value.trim();
    if (enviando) return;
    if (!nombre) return pintarDatos();
    enviando = true;
    try {
      const categoria = await api('/categorias', { metodo: 'POST', cuerpo: { nombre } });
      categorias.push(categoria);
      await guardar({ categoria_id: categoria.id }, 'categoria_id');
    } catch (error) {
      // Si ya existe, usamos esa.
      if (error.estado === 409 && error.detalles?.id) {
        await guardar({ categoria_id: error.detalles.id }, 'categoria_id');
      } else {
        enviando = false;
        mostrarError('categoria_id', error.message);
        entrada.focus();
      }
    }
  };
  entrada.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter') { evento.preventDefault(); crear(); }
    if (evento.key === 'Escape') { evento.preventDefault(); enviando = true; pintarDatos(); }
  });
  entrada.addEventListener('blur', crear);
}

// ---------- Editar las líneas de IVA ----------

const aNumero = (texto) => Number(String(texto).trim().replace(',', '.'));
const conComa = (n) => (n === null || n === undefined || n === '' ? '' : String(n).replace('.', ','));

function filaLinea(linea = {}) {
  return html`<div class="factura-linea">
    <div class="campo"><label>${t('factura.base')}<input type="text" inputmode="decimal" data-l="base" value="${conComa(linea.base)}"></label></div>
    <div class="campo"><label>${t('factura.tipo')}<input type="text" inputmode="decimal" data-l="tipo" value="${conComa(linea.tipo ?? 21)}"></label></div>
    <div class="campo"><label>${t('factura.cuota')}<input type="text" inputmode="decimal" data-l="cuota" value="${conComa(linea.cuota)}"></label></div>
    <button type="button" class="boton-icono" data-quitar aria-label="${t('factura.quitarLinea')}" title="${t('factura.quitarLinea')}">${seguro(icono('papelera'))}</button>
  </div>`;
}

function abrirIva(indiceFoco = 0) {
  $('iva').innerHTML = html`
    <h2 class="titulo-seccion" id="titulo-iva">${t('factura.campo.lineas_iva')}</h2>
    <form class="factura-iva-form" id="form-iva" novalidate>
      <div id="lineas">${factura.lineas_iva.map((l) => seguro(filaLinea(l)))}</div>
      <button type="button" class="boton-texto factura-anadir-linea" id="anadir-linea">${seguro(icono('subir'))}${t('factura.anadirLinea')}</button>
      <p class="campo-error" id="error-lineas_iva" role="alert" hidden></p>
      <div class="factura-iva-botones">
        <button type="submit" class="boton boton-secundario">${t('factura.guardar')}</button>
        <button type="button" class="boton-texto" id="cancelar-iva">${t('comun.cancelar')}</button>
      </div>
    </form>`;
  const lineas = $('lineas');
  if (!factura.lineas_iva.length) lineas.insertAdjacentHTML('beforeend', filaLinea());
  lineas.querySelectorAll('input[data-l="base"]')[indiceFoco]?.focus();

  // La cuota se calcula sola hasta que el usuario la escribe a mano.
  lineas.addEventListener('input', (evento) => {
    const fila = evento.target.closest('.factura-linea');
    const cuota = fila.querySelector('[data-l="cuota"]');
    if (evento.target === cuota) { cuota.dataset.manual = '1'; return; }
    if (cuota.dataset.manual) return;
    const base = aNumero(fila.querySelector('[data-l="base"]').value);
    const tipo = aNumero(fila.querySelector('[data-l="tipo"]').value);
    cuota.value = Number.isFinite(base) && Number.isFinite(tipo) ? conComa((Math.round(base * tipo) / 100).toFixed(2)) : '';
  });
  lineas.addEventListener('click', (evento) => {
    if (evento.target.closest('[data-quitar]')) evento.target.closest('.factura-linea').remove();
  });
  $('anadir-linea').addEventListener('click', () => {
    lineas.insertAdjacentHTML('beforeend', filaLinea());
    lineas.lastElementChild.querySelector('input').focus();
  });
  $('cancelar-iva').addEventListener('click', pintarIva);
  $('form-iva').addEventListener('keydown', (evento) => { if (evento.key === 'Escape') pintarIva(); });
  $('form-iva').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const nuevas = [...lineas.querySelectorAll('.factura-linea')]
      .map((fila) => Object.fromEntries([...fila.querySelectorAll('[data-l]')].map((i) => [i.dataset.l, i.value.trim()])))
      .filter((l) => l.base || l.cuota)
      .map((l) => ({ base: l.base, tipo: l.tipo || 0, ...(l.cuota ? { cuota: l.cuota } : {}) }));
    await guardar({ lineas_iva: nuevas }, 'lineas_iva');
  });
}

// ---------- Confirmar, reabrir y borrar ----------

function preguntar(texto, boton, peligro = false) {
  const dialogo = $('dialogo');
  $('dialogo-texto').textContent = texto;
  $('dialogo-si').textContent = boton;
  $('dialogo-si').className = `boton ${peligro ? 'boton-peligro' : 'boton-principal'}`;
  dialogo.returnValue = '';
  dialogo.showModal();
  return new Promise((resolve) => {
    dialogo.addEventListener('close', () => resolve(dialogo.returnValue === 'si'), { once: true });
  });
}

async function accion(ruta, mensaje) {
  try {
    factura = await api(`/facturas/${factura.id}/${ruta}`, { metodo: 'POST' });
    pintarTodo();
    mostrarToast(mensaje);
  } catch (error) {
    mostrarToast(error.message || t('comun.error'));
    await recargar();
  }
}

$('cuerpo').addEventListener('click', async (evento) => {
  if (!factura) return;
  // Con ratón o dedo, un clic en la tabla de IVA la abre; con teclado está el botón del lápiz.
  if (evento.target.closest('#vista-iva')) {
    const fila = evento.target.closest('tbody tr');
    return abrirIva(fila ? fila.sectionRowIndex : 0);
  }
  const objetivo = evento.target.closest('button');
  if (!objetivo) return;
  if (objetivo.dataset.editar) return abrirCampo(objetivo.dataset.editar);
  if (objetivo.id === 'editar-iva') return abrirIva();
  if (objetivo.id === 'confirmar') return accion('confirmar', t('factura.confirmada'));
  if (objetivo.id === 'reabrir') {
    if (await preguntar(t('factura.preguntaReabrir'), t('factura.reabrir'))) await accion('reabrir', t('factura.h.reabrir'));
    return;
  }
  if (objetivo.id === 'borrar') {
    if (!(await preguntar(t('factura.preguntaBorrar'), t('factura.borrar'), true))) return;
    try {
      await api(`/facturas/${factura.id}`, { metodo: 'DELETE' });
      location.href = factura.siguiente_pendiente ? `/app/factura?id=${factura.siguiente_pendiente}` : '/app/facturas';
    } catch (error) {
      mostrarToast(error.message || t('comun.error'));
      await recargar();
    }
  }
});

// ---------- Cargar ----------

async function recargar() {
  try {
    factura = await api(`/facturas/${factura.id}`);
    pintarTodo();
  } catch { /* nos quedamos con lo que hay */ }
}

function noEncontrada() {
  $('cuerpo').hidden = true;
  $('banners').innerHTML = html`<div class="tarjeta">${seguro(vacio({
    icono: 'facturas', texto: t('factura.noEncontrada'), boton: { href: '/app/facturas', texto: t('factura.verFacturas') },
  }))}</div>`;
}

if (!/^\d+$/.test(facturaId || '')) {
  noEncontrada();
} else {
  try {
    [factura, categorias] = await Promise.all([api(`/facturas/${facturaId}`), api('/categorias').catch(() => [])]);
    $('cuerpo').hidden = false;
    pintarTodo({ original: true });
  } catch (error) {
    if (error.estado === 404 || error.estado === 400) noEncontrada();
    else mostrarToast(error.message || t('comun.error'));
  }
}

// Sugerencia de evento de Google Calendar (RF-55). El componente es de Dani (#16):
// deja este contenedor y esta llamada en la pantalla de revisión.
if (facturaId) pintarSugerenciaEvento(document.getElementById('sugerencia-evento'), facturaId);
