// Informes (RF-49 a RF-53). Responsable: Ana (#25)
import { iniciarPagina } from '../core/layout.js';
import { t } from '../core/i18n.js';
import { html, seguro, vacio, enConstruccion } from '../core/ui.js';

const textos = {
  es: { 'informes.titulo': "Informes", 'informes.vacio': "Descarga el Excel de un periodo o el informe del trimestre para tu gestoría." },
  en: { 'informes.titulo': "Reports", 'informes.vacio': "Download the Excel for a period or the quarterly report for your accountant." },
};

await iniciarPagina({ pagina: 'informes', privada: true, textos });

document.getElementById('contenido').innerHTML = html`
  <div class="cabecera-pagina">
    <h1 class="titulo-pagina">${t('informes.titulo')}</h1>
    ${seguro(enConstruccion({ responsable: 'Ana', issue: '#25' }))}
  </div>
  <div class="tarjeta">${seguro(vacio({ icono: 'descargar', texto: t('informes.vacio') }))}</div>`;
