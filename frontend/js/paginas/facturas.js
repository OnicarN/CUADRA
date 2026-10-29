// Facturas (RF-37 a RF-39). Responsable: Rodrigo (#18)
import { iniciarPagina } from '../core/layout.js';
import { t } from '../core/i18n.js';
import { html, seguro, vacio, enConstruccion } from '../core/ui.js';

const textos = {
  es: { 'facturas.titulo': "Facturas", 'facturas.vacio': "Aún no hay facturas. Sube la primera." },
  en: { 'facturas.titulo': "Invoices", 'facturas.vacio': "No invoices yet. Upload your first one." },
};

await iniciarPagina({ pagina: 'facturas', privada: true, textos });

document.getElementById('contenido').innerHTML = html`
  <div class="cabecera-pagina">
    <h1 class="titulo-pagina">${t('facturas.titulo')}</h1>
    ${seguro(enConstruccion({ responsable: 'Rodrigo', issue: '#18' }))}
  </div>
  <div class="tarjeta">${seguro(vacio({ icono: 'facturas', texto: t('facturas.vacio') }))}</div>`;
