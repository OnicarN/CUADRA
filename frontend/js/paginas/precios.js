// Página de precios (RF-02, RF-03). Los datos salen de backend/src/modulos/suscripcion/planes.js
import { iniciarPagina } from '../core/layout.js';
import { api } from '../core/api.js';
import { t } from '../core/i18n.js';
import { dinero } from '../core/formato.js';
import { icono } from '../core/iconos.js';
import { html, seguro } from '../core/ui.js';

const textos = {
  es: {
    'precios.titulo': 'Precios claros, sin sorpresas',
    'precios.subtitulo': 'Elige según cuántas facturas subes al mes. Puedes cambiar de plan o cancelar cuando quieras.',
    'precios.prueba': 'Prueba gratis {dias} días con todo incluido. Después eliges plan o sigues gratis.',
    'precios.mes': '/ mes',
    'precios.facturas': '{n} facturas al mes',
    'precios.recomendado': 'Recomendado',
    'precios.empezar': 'Empezar prueba gratis',
    'precios.empezarGratis': 'Empezar gratis',
    'precios.plan.gratis': 'Gratis',
    'precios.plan.gratisTexto': 'Para probar o si tienes pocos gastos.',
    'precios.plan.autonomo': 'Autónomo',
    'precios.plan.autonomoTexto': 'Para el día a día de la mayoría de autónomos.',
    'precios.plan.pro': 'Pro',
    'precios.plan.proTexto': 'Para quien viaja, se reúne con clientes y quiere todo.',
    'precios.funcion.informes': 'Informe trimestral en PDF',
    'precios.funcion.gestoria': 'Envío a la gestoría desde Cuadra',
    'precios.funcion.calendario': 'Conexión con Google Calendar',
    'precios.extras.titulo': 'Extras sin cambiar de plan',
    'precios.extras.texto': '¿Te pasas de facturas un mes o solo quieres una función concreta? Añádela suelta.',
    'precios.extra.lecturas': '{n} lecturas extra',
    'precios.extra.lecturasTexto': 'Para este mes',
    'precios.extra.funcion': 'Función suelta',
    'precios.todos.titulo': 'Incluido en todos los planes',
    'precios.todos.1': 'Subida por foto, PDF o reenviando el correo',
    'precios.todos.2': 'Lectura automática de fecha, NIF, IVA y total',
    'precios.todos.3': 'Revisión con el original al lado',
    'precios.todos.4': 'Avisos de tickets sin NIF y duplicados',
    'precios.todos.5': 'Panel con tus cifras',
    'precios.todos.6': 'Exportación a Excel para la gestoría',
    'precios.todos.7': 'Español e inglés, en el móvil y en el ordenador',
    'precios.todos.8': 'Tu histórico siempre disponible, aunque canceles',
  },
  en: {
    'precios.titulo': 'Clear pricing, no surprises',
    'precios.subtitulo': 'Choose based on how many invoices you upload each month. Change plan or cancel whenever you want.',
    'precios.prueba': 'Free {dias}-day trial with everything included. Then pick a plan or stay on the free one.',
    'precios.mes': '/ month',
    'precios.facturas': '{n} invoices per month',
    'precios.recomendado': 'Recommended',
    'precios.empezar': 'Start free trial',
    'precios.empezarGratis': 'Start for free',
    'precios.plan.gratis': 'Free',
    'precios.plan.gratisTexto': 'To try it out or if you have few expenses.',
    'precios.plan.autonomo': 'Freelancer',
    'precios.plan.autonomoTexto': 'For the day-to-day of most freelancers.',
    'precios.plan.pro': 'Pro',
    'precios.plan.proTexto': 'For those who travel, meet clients and want it all.',
    'precios.funcion.informes': 'Quarterly PDF report',
    'precios.funcion.gestoria': 'Send to your accountant from Cuadra',
    'precios.funcion.calendario': 'Google Calendar connection',
    'precios.extras.titulo': 'Extras without changing plan',
    'precios.extras.texto': 'Over your invoice limit one month, or just want one feature? Add it on its own.',
    'precios.extra.lecturas': '{n} extra reads',
    'precios.extra.lecturasTexto': 'For this month',
    'precios.extra.funcion': 'Single feature',
    'precios.todos.titulo': 'Included in every plan',
    'precios.todos.1': 'Upload by photo, PDF or forwarding the email',
    'precios.todos.2': 'Automatic reading of date, tax ID, VAT and total',
    'precios.todos.3': 'Review with the original side by side',
    'precios.todos.4': 'Alerts for receipts without tax ID and duplicates',
    'precios.todos.5': 'Dashboard with your numbers',
    'precios.todos.6': 'Excel export for your accountant',
    'precios.todos.7': 'Spanish and English, on mobile and desktop',
    'precios.todos.8': 'Your history always available, even if you cancel',
  },
};

await iniciarPagina({ pagina: 'precios', textos });

const FUNCIONES = ['informes', 'gestoria', 'calendario'];
const check = (texto, incluido = true) => html`<li class="${incluido ? '' : 'no'}">${seguro(icono(incluido ? 'check' : 'cerrar'))}<span>${texto}</span></li>`;

const datos = await api('/suscripcion/planes');
document.getElementById('texto-prueba').textContent = t('precios.prueba', { dias: datos.diasPrueba });

document.getElementById('planes').innerHTML = datos.planes.map((plan) => {
  const destacado = plan.id === 'autonomo';
  return html`
    <article class="tarjeta plan ${destacado ? 'plan-destacado' : ''}">
      <div class="plan-cabecera">
        <h2 class="titulo-seccion">${t(`precios.plan.${plan.id}`)}</h2>
        ${destacado ? seguro(html`<span class="etiqueta etiqueta-pendiente">${t('precios.recomendado')}</span>`) : ''}
      </div>
      <p class="texto-2">${t(`precios.plan.${plan.id}Texto`)}</p>
      <p class="plan-precio"><span class="cifra">${dinero(plan.precioMes)}</span><span class="texto-2">${t('precios.mes')}</span></p>
      <ul class="lista-check">
        ${seguro(check(t('precios.facturas', { n: plan.facturasMes })))}
        ${FUNCIONES.map((f) => seguro(check(t(`precios.funcion.${f}`), plan.funciones.includes(f))))}
      </ul>
      <a class="boton ${destacado ? 'boton-principal' : 'boton-secundario'}" href="/registro?plan=${plan.id}">
        ${plan.precioMes ? t('precios.empezar') : t('precios.empezarGratis')}
      </a>
    </article>`;
}).join('');

document.getElementById('extras').innerHTML = [
  ...datos.paquetesLecturas.map((p) => html`
    <div class="tarjeta extra">
      <div><p class="titulo-seccion">${t('precios.extra.lecturas', { n: p.lecturas })}</p><p class="texto-2">${t('precios.extra.lecturasTexto')}</p></div>
      <p class="importe titulo-seccion">${dinero(p.precio)}</p>
    </div>`),
  ...datos.funcionesSueltas.map((f) => html`
    <div class="tarjeta extra">
      <div><p class="titulo-seccion">${t(`precios.funcion.${f.id}`)}</p><p class="texto-2">${t('precios.extra.funcion')}</p></div>
      <p class="importe titulo-seccion">${dinero(f.precioMes)} <span class="texto-2">${t('precios.mes')}</span></p>
    </div>`),
].join('');

document.getElementById('incluido-todos').innerHTML = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => check(t(`precios.todos.${n}`))).join('');
