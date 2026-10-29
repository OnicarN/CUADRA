// Tu plan (RF-57 a RF-61). Responsable: Ana (#26)
import { iniciarPagina } from '../core/layout.js';
import { t } from '../core/i18n.js';
import { html, seguro, vacio, enConstruccion } from '../core/ui.js';

const textos = {
  es: { 'suscripcion.titulo': "Tu plan", 'suscripcion.vacio': "Tu plan, cuántas facturas llevas este mes y cuándo se renueva." },
  en: { 'suscripcion.titulo': "Your plan", 'suscripcion.vacio': "Your plan, how many invoices you've used this month and when it renews." },
};

await iniciarPagina({ pagina: 'suscripcion', privada: true, textos });

document.getElementById('contenido').innerHTML = html`
  <div class="cabecera-pagina">
    <h1 class="titulo-pagina">${t('suscripcion.titulo')}</h1>
    ${seguro(enConstruccion({ responsable: 'Ana', issue: '#26' }))}
  </div>
  <div class="tarjeta">${seguro(vacio({ icono: 'tarjeta', texto: t('suscripcion.vacio') }))}</div>`;
