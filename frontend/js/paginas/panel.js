// Panel (RF-43 a RF-48). Responsable: Rodrigo (#22)
import { iniciarPagina } from '../core/layout.js';
import { t } from '../core/i18n.js';
import { html, seguro, vacio, enConstruccion } from '../core/ui.js';

const textos = {
  es: { 'panel.titulo': "Panel", 'panel.vacio': "Aquí verás cuánto llevas gastado, en qué, el IVA que podrás deducir y lo que tienes pendiente." },
  en: { 'panel.titulo': "Dashboard", 'panel.vacio': "Here you'll see how much you've spent, on what, the VAT you can deduct and what's pending." },
};

await iniciarPagina({ pagina: 'panel', privada: true, textos });

document.getElementById('contenido').innerHTML = html`
  <div class="cabecera-pagina">
    <h1 class="titulo-pagina">${t('panel.titulo')}</h1>
    ${seguro(enConstruccion({ responsable: 'Rodrigo', issue: '#22' }))}
  </div>
  <div class="tarjeta">${seguro(vacio({ icono: 'informes', texto: t('panel.vacio') }))}</div>`;
