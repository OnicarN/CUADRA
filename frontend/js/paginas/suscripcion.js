// Tu plan (RF-57 a RF-61). Responsable: Dani (#26, antes Ana)
// Plan actual y uso del mes, cambiar de plan, extras, facturas de Cuadra y cancelar.
// Los pagos se hacen en Stripe Checkout; al volver (?pago=ok&sesion=...) se confirman aquí.
import { iniciarPagina } from '../core/layout.js';
import { api } from '../core/api.js';
import { t } from '../core/i18n.js';
import { dinero, fecha } from '../core/formato.js';
import { icono } from '../core/iconos.js';
import { html, seguro, mostrarToast } from '../core/ui.js';

const textos = {
  es: {
    'suscripcion.titulo': 'Tu plan',
    'suscripcion.plan.gratis': 'Gratis',
    'suscripcion.plan.autonomo': 'Autónomo',
    'suscripcion.plan.pro': 'Pro',
    'suscripcion.funcion.informes': 'Informe trimestral en PDF',
    'suscripcion.funcion.gestoria': 'Envío a la gestoría',
    'suscripcion.funcion.calendario': 'Google Calendar',
    'suscripcion.mes': '/ mes',
    'suscripcion.estado.prueba': 'Prueba: quedan {n} días',
    'suscripcion.estado.pruebaUltimo': 'Prueba: último día',
    'suscripcion.estado.activo': 'Activo',
    'suscripcion.estado.seCancela': 'Se cancela el {fecha}',
    'suscripcion.uso': '{usadas} de {limite} facturas leídas este mes',
    'suscripcion.renovacion': 'El contador vuelve a cero el {fecha}.',
    'suscripcion.proximoCobro': 'Próximo cobro: {fecha}.',
    'suscripcion.acabaEl': 'Tu plan acaba el {fecha}. Después pasarás al plan gratis y seguirás viendo todas tus facturas.',
    'suscripcion.prueba': 'Estás probando todo lo del plan Pro gratis hasta el {fecha}. Después pasarás al plan gratis, salvo que elijas otro.',
    'suscripcion.noConfigurado': 'Los pagos todavía no están activados en Cuadra. Puedes ver los planes, pero aún no se puede pagar.',
    'suscripcion.cancelar': 'Cancelar plan',
    'suscripcion.confirmarCancelar': '¿Cancelar tu plan? Lo mantienes hasta el final del periodo pagado y después pasas al plan gratis. No pierdes ninguna factura.',
    'suscripcion.cancelado': 'Plan cancelado. Lo mantienes hasta el {fecha}.',
    'suscripcion.reactivar': 'Mantener mi plan',
    'suscripcion.reactivado': 'Tu plan sigue activo',
    'suscripcion.planes': 'Planes',
    'suscripcion.facturasMes': '{n} facturas al mes',
    'suscripcion.elegir': 'Elegir {plan}',
    'suscripcion.actual': 'Tu plan actual',
    'suscripcion.gratisNota': 'Para volver al plan gratis, cancela tu plan.',
    'suscripcion.extras': 'Extras',
    'suscripcion.extrasTexto': 'Sin cambiar de plan: más lecturas para este mes o una función suelta.',
    'suscripcion.lecturas': '{n} lecturas extra',
    'suscripcion.lecturasTexto': 'Para este mes, pago único',
    'suscripcion.funcionSuelta': 'Cada mes, cancela cuando quieras',
    'suscripcion.comprar': 'Comprar',
    'suscripcion.anadir': 'Añadir',
    'suscripcion.incluida': 'Incluida',
    'suscripcion.hasta': 'Hasta el {fecha}',
    'suscripcion.cancelarFuncion': 'Cancelar',
    'suscripcion.confirmarCancelarFuncion': '¿Cancelar {funcion}? La mantienes hasta el final del mes pagado.',
    'suscripcion.pagos': 'Pagos y facturas',
    'suscripcion.sinPagos': 'Aún no has hecho ningún pago.',
    'suscripcion.verFactura': 'Factura',
    'suscripcion.yendo': 'Te llevamos a la página de pago…',
    'suscripcion.confirmando': 'Confirmando tu pago…',
    'suscripcion.pagoOk': '¡Pago completado! Ya lo tienes activo.',
    'suscripcion.pagoPendiente': 'Tu pago se está procesando. En unos minutos lo verás aquí.',
    'suscripcion.pagoCancelado': 'Has cancelado el pago. No se te ha cobrado nada.',
  },
  en: {
    'suscripcion.titulo': 'Your plan',
    'suscripcion.plan.gratis': 'Free',
    'suscripcion.plan.autonomo': 'Freelancer',
    'suscripcion.plan.pro': 'Pro',
    'suscripcion.funcion.informes': 'Quarterly PDF report',
    'suscripcion.funcion.gestoria': 'Send to your accountant',
    'suscripcion.funcion.calendario': 'Google Calendar',
    'suscripcion.mes': '/ month',
    'suscripcion.estado.prueba': 'Trial: {n} days left',
    'suscripcion.estado.pruebaUltimo': 'Trial: last day',
    'suscripcion.estado.activo': 'Active',
    'suscripcion.estado.seCancela': 'Ends on {fecha}',
    'suscripcion.uso': '{usadas} of {limite} invoices read this month',
    'suscripcion.renovacion': 'The counter resets on {fecha}.',
    'suscripcion.proximoCobro': 'Next payment: {fecha}.',
    'suscripcion.acabaEl': "Your plan ends on {fecha}. After that you'll move to the free plan and keep all your invoices.",
    'suscripcion.prueba': "You're trying everything in the Pro plan for free until {fecha}. After that you'll move to the free plan unless you choose another.",
    'suscripcion.noConfigurado': "Payments aren't enabled in Cuadra yet. You can see the plans, but you can't pay yet.",
    'suscripcion.cancelar': 'Cancel plan',
    'suscripcion.confirmarCancelar': "Cancel your plan? You keep it until the end of the paid period and then move to the free plan. You won't lose any invoice.",
    'suscripcion.cancelado': 'Plan cancelled. You keep it until {fecha}.',
    'suscripcion.reactivar': 'Keep my plan',
    'suscripcion.reactivado': 'Your plan is still active',
    'suscripcion.planes': 'Plans',
    'suscripcion.facturasMes': '{n} invoices per month',
    'suscripcion.elegir': 'Choose {plan}',
    'suscripcion.actual': 'Your current plan',
    'suscripcion.gratisNota': 'To go back to the free plan, cancel your plan.',
    'suscripcion.extras': 'Extras',
    'suscripcion.extrasTexto': 'Without changing plan: more reads for this month or a single feature.',
    'suscripcion.lecturas': '{n} extra reads',
    'suscripcion.lecturasTexto': 'For this month, one-off payment',
    'suscripcion.funcionSuelta': 'Monthly, cancel any time',
    'suscripcion.comprar': 'Buy',
    'suscripcion.anadir': 'Add',
    'suscripcion.incluida': 'Included',
    'suscripcion.hasta': 'Until {fecha}',
    'suscripcion.cancelarFuncion': 'Cancel',
    'suscripcion.confirmarCancelarFuncion': 'Cancel {funcion}? You keep it until the end of the paid month.',
    'suscripcion.pagos': 'Payments and invoices',
    'suscripcion.sinPagos': "You haven't made any payment yet.",
    'suscripcion.verFactura': 'Invoice',
    'suscripcion.yendo': 'Taking you to the payment page…',
    'suscripcion.confirmando': 'Confirming your payment…',
    'suscripcion.pagoOk': "Payment completed! It's active now.",
    'suscripcion.pagoPendiente': "Your payment is being processed. You'll see it here in a few minutes.",
    'suscripcion.pagoCancelado': "You cancelled the payment. You haven't been charged.",
  },
};

await iniciarPagina({ pagina: 'suscripcion', privada: true, textos });

const contenido = document.getElementById('contenido');
const { planes, paquetesLecturas, funcionesSueltas } = await api('/suscripcion/planes');
let estado;
let pagos = [];

const nombrePlan = (id) => t(`suscripcion.plan.${id}`);
const nombreFuncion = (id) => t(`suscripcion.funcion.${id}`);
const dia = (valor) => fecha(valor, { day: 'numeric', month: 'long', year: 'numeric' });

// ---- Vuelta de Stripe ----
const parametros = new URLSearchParams(location.search);
if (parametros.size) history.replaceState(null, '', location.pathname);
if (parametros.get('pago') === 'cancelado') mostrarToast(t('suscripcion.pagoCancelado'));
if (parametros.get('pago') === 'ok' && parametros.get('sesion')) {
  contenido.innerHTML = html`<div class="cabecera-pagina"><h1 class="titulo-pagina">${t('suscripcion.titulo')}</h1></div>
    <div class="tarjeta"><p>${t('suscripcion.confirmando')}</p><div class="progreso progreso-cargando"><span></span></div></div>`;
  try {
    const { aplicado } = await api('/suscripcion/confirmar', { metodo: 'POST', cuerpo: { sesion: parametros.get('sesion') } });
    mostrarToast(t(aplicado ? 'suscripcion.pagoOk' : 'suscripcion.pagoPendiente'));
  } catch (e) {
    mostrarToast(e.message || t('comun.error'));
  }
}

function etiquetaPlan() {
  if (estado.enPrueba) {
    const dias = Math.ceil((new Date(estado.pruebaHasta) - Date.now()) / 86400000);
    return html`<span class="etiqueta etiqueta-pendiente">${dias > 1 ? t('suscripcion.estado.prueba', { n: dias }) : t('suscripcion.estado.pruebaUltimo')}</span>`;
  }
  if (estado.cancelarAlFinal && estado.periodoFin) {
    return html`<span class="etiqueta etiqueta-aviso">${t('suscripcion.estado.seCancela', { fecha: dia(estado.periodoFin) })}</span>`;
  }
  return html`<span class="etiqueta etiqueta-confirmada">${seguro(icono('check'))}${t('suscripcion.estado.activo')}</span>`;
}

function tarjetaPlan() {
  const porcentaje = estado.limite ? Math.min(100, Math.round((estado.usadas / estado.limite) * 100)) : 0;
  let cobro = '';
  if (estado.planDePago && estado.periodoFin) {
    cobro = estado.cancelarAlFinal
      ? t('suscripcion.acabaEl', { fecha: dia(estado.periodoFin) })
      : t('suscripcion.proximoCobro', { fecha: dia(estado.periodoFin) });
  }
  return html`
    <section class="tarjeta suscripcion-actual">
      <div class="suscripcion-cabecera">
        <div>
          <h2 class="titulo-seccion">${nombrePlan(estado.plan)}</h2>
          <p class="cifra suscripcion-precio">${dinero(estado.precioMes)} <span class="texto-2">${t('suscripcion.mes')}</span></p>
        </div>
        ${seguro(etiquetaPlan())}
      </div>
      <div class="suscripcion-uso">
        <p>${t('suscripcion.uso', { usadas: estado.usadas, limite: estado.limite })}</p>
        <div class="progreso" role="progressbar" aria-valuemin="0" aria-valuemax="${estado.limite}" aria-valuenow="${estado.usadas}"
          aria-label="${t('suscripcion.uso', { usadas: estado.usadas, limite: estado.limite })}"><span style="width: ${porcentaje}%"></span></div>
        <p class="texto-2">${t('suscripcion.renovacion', { fecha: dia(estado.renovacion) })} ${cobro}</p>
      </div>
      ${estado.planDePago ? seguro(html`<div class="suscripcion-acciones">
        ${estado.cancelarAlFinal
          ? seguro(html`<button type="button" class="boton boton-secundario" data-accion="reactivar">${t('suscripcion.reactivar')}</button>`)
          : seguro(html`<button type="button" class="boton boton-texto suscripcion-cancelar" data-accion="cancelar">${t('suscripcion.cancelar')}</button>`)}
      </div>`) : ''}
    </section>`;
}

function tarjetaOpcion(plan) {
  const actual = !estado.enPrueba && estado.plan === plan.id && (plan.precioMes === 0 || estado.planDePago);
  let accion;
  if (actual) accion = html`<span class="etiqueta">${t('suscripcion.actual')}</span>`;
  else if (plan.precioMes === 0) accion = html`<p class="texto-2">${estado.planDePago ? t('suscripcion.gratisNota') : ''}</p>`;
  else accion = html`<button type="button" class="boton ${plan.id === 'autonomo' ? 'boton-principal' : 'boton-secundario'}" data-plan="${plan.id}">${t('suscripcion.elegir', { plan: nombrePlan(plan.id) })}</button>`;
  return html`
    <article class="tarjeta suscripcion-opcion ${actual ? 'suscripcion-opcion-actual' : ''}">
      <h3 class="titulo-seccion">${nombrePlan(plan.id)}</h3>
      <p class="cifra">${dinero(plan.precioMes)} <span class="texto-2">${t('suscripcion.mes')}</span></p>
      <ul class="suscripcion-funciones">
        <li>${seguro(icono('check'))}${t('suscripcion.facturasMes', { n: plan.facturasMes })}</li>
        ${plan.funciones.map((f) => seguro(html`<li>${seguro(icono('check'))}${nombreFuncion(f)}</li>`))}
      </ul>
      ${seguro(accion)}
    </article>`;
}

function filaExtraFuncion(funcion) {
  const suelta = estado.funcionesSueltas.find((s) => s.clave === funcion.id);
  let derecha;
  if (suelta) {
    derecha = html`<span class="fila-sub">${suelta.valido_hasta ? t('suscripcion.hasta', { fecha: dia(suelta.valido_hasta) }) : ''}</span>
      ${suelta.de_pago ? seguro(html`<button type="button" class="boton-texto" data-cancelar-funcion="${funcion.id}">${t('suscripcion.cancelarFuncion')}</button>`) : ''}`;
  } else if (estado.funciones.includes(funcion.id) && !estado.enPrueba) {
    derecha = html`<span class="etiqueta etiqueta-confirmada">${t('suscripcion.incluida')}</span>`;
  } else {
    derecha = html`<button type="button" class="boton boton-secundario" data-extra="${funcion.id}">${t('suscripcion.anadir')}</button>`;
  }
  return html`<li class="fila">
    <span class="fila-icono">${seguro(icono(funcion.id === 'calendario' ? 'calendario' : 'informes'))}</span>
    <span class="fila-centro"><span class="fila-titulo">${nombreFuncion(funcion.id)}</span>
      <span class="fila-sub">${dinero(funcion.precioMes)} ${t('suscripcion.mes')} · ${t('suscripcion.funcionSuelta')}</span></span>
    <span class="fila-derecha suscripcion-extra-accion">${seguro(derecha)}</span>
  </li>`;
}

const filaLecturas = (paquete) => html`<li class="fila">
  <span class="fila-icono">${seguro(icono('destello'))}</span>
  <span class="fila-centro"><span class="fila-titulo">${t('suscripcion.lecturas', { n: paquete.lecturas })}</span>
    <span class="fila-sub">${dinero(paquete.precio)} · ${t('suscripcion.lecturasTexto')}</span></span>
  <span class="fila-derecha suscripcion-extra-accion"><button type="button" class="boton boton-secundario" data-extra="${paquete.id}">${t('suscripcion.comprar')}</button></span>
</li>`;

const filaPago = (pago) => html`<li class="fila">
  <span class="fila-icono">${seguro(icono('archivo'))}</span>
  <span class="fila-centro"><span class="fila-titulo">${pago.concepto}</span><span class="fila-sub">${dia(pago.pagado_en)}</span></span>
  <span class="fila-derecha suscripcion-extra-accion"><strong>${dinero(pago.importe, pago.moneda)}</strong>
    ${pago.url_factura ? seguro(html`<a class="boton-texto" href="${pago.url_factura}" target="_blank" rel="noopener">${seguro(icono('descargar'))}${t('suscripcion.verFactura')}</a>`) : ''}</span>
</li>`;

function pintar() {
  const banners = [];
  if (!estado.pagosConfigurados) {
    banners.push(html`<div class="banner">${seguro(icono('alerta'))}<span class="banner-texto">${t('suscripcion.noConfigurado')}</span></div>`);
  }
  if (estado.enPrueba) {
    banners.push(html`<div class="banner">${seguro(icono('reloj'))}<span class="banner-texto">${t('suscripcion.prueba', { fecha: dia(estado.pruebaHasta) })}</span></div>`);
  }
  contenido.innerHTML = html`
    <div class="cabecera-pagina"><h1 class="titulo-pagina">${t('suscripcion.titulo')}</h1></div>
    <div class="pila">
      ${banners.map(seguro)}
      ${seguro(tarjetaPlan())}
      <section>
        <h2 class="titulo-seccion suscripcion-titulo">${t('suscripcion.planes')}</h2>
        <div class="rejilla">${planes.map((p) => seguro(tarjetaOpcion(p)))}</div>
      </section>
      <section class="tarjeta">
        <h2 class="titulo-seccion">${t('suscripcion.extras')}</h2>
        <p class="texto-2 suscripcion-texto">${t('suscripcion.extrasTexto')}</p>
        <ul class="lista">
          ${paquetesLecturas.map((p) => seguro(filaLecturas(p)))}
          ${funcionesSueltas.map((f) => seguro(filaExtraFuncion(f)))}
        </ul>
      </section>
      <section class="tarjeta">
        <h2 class="titulo-seccion">${t('suscripcion.pagos')}</h2>
        ${pagos.length
          ? seguro(html`<ul class="lista">${pagos.map((p) => seguro(filaPago(p)))}</ul>`)
          : seguro(html`<p class="texto-2 suscripcion-texto">${t('suscripcion.sinPagos')}</p>`)}
      </section>
    </div>`;
}

async function cargar() {
  [estado, pagos] = await Promise.all([api('/suscripcion'), api('/suscripcion/pagos')]);
  pintar();
}

// Lleva a Stripe Checkout.
async function irAPagar(boton, ruta, cuerpo) {
  boton.disabled = true;
  try {
    const { url } = await api(ruta, { metodo: 'POST', cuerpo });
    mostrarToast(t('suscripcion.yendo'));
    location.href = url;
  } catch (e) {
    mostrarToast(e.message || t('comun.error'));
    boton.disabled = false;
  }
}

async function accion(boton, ruta, cuerpo, mensaje) {
  boton.disabled = true;
  try {
    estado = await api(ruta, { metodo: 'POST', cuerpo });
    pintar();
    mostrarToast(mensaje());
  } catch (e) {
    mostrarToast(e.message || t('comun.error'));
    boton.disabled = false;
  }
}

contenido.addEventListener('click', (evento) => {
  const boton = evento.target.closest('button');
  if (!boton) return;
  if (boton.dataset.plan) irAPagar(boton, '/suscripcion/cambiar-plan', { plan: boton.dataset.plan });
  else if (boton.dataset.extra) irAPagar(boton, '/suscripcion/comprar-extra', { id: boton.dataset.extra });
  else if (boton.dataset.accion === 'cancelar') {
    if (confirm(t('suscripcion.confirmarCancelar'))) {
      accion(boton, '/suscripcion/cancelar', {}, () => t('suscripcion.cancelado', { fecha: dia(estado.periodoFin) }));
    }
  } else if (boton.dataset.accion === 'reactivar') {
    accion(boton, '/suscripcion/reactivar', {}, () => t('suscripcion.reactivado'));
  } else if (boton.dataset.cancelarFuncion) {
    const funcion = boton.dataset.cancelarFuncion;
    if (confirm(t('suscripcion.confirmarCancelarFuncion', { funcion: nombreFuncion(funcion) }))) {
      accion(boton, '/suscripcion/cancelar', { funcion }, () => t('suscripcion.cancelado', { fecha: dia(estado.funcionesSueltas.find((s) => s.clave === funcion)?.valido_hasta) }));
    }
  }
});

await cargar();
