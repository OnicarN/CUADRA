// Subir facturas (RF-13 a RF-17, RF-23). Responsable: Dani (#12)
import { iniciarPagina } from '../core/layout.js';
import { t } from '../core/i18n.js';
import { html, seguro, vacio, enConstruccion } from '../core/ui.js';

const textos = {
  es: { 'subir.titulo': "Subir facturas", 'subir.vacio': "Haz una foto, elige archivos o arrástralos aquí." },
  en: { 'subir.titulo': "Upload invoices", 'subir.vacio': "Take a photo, choose files or drag them here." },
};

await iniciarPagina({ pagina: 'subir', privada: true, textos });

document.getElementById('contenido').innerHTML = html`
  <div class="cabecera-pagina">
    <h1 class="titulo-pagina">${t('subir.titulo')}</h1>
    ${seguro(enConstruccion({ responsable: 'Dani', issue: '#12' }))}
  </div>
  <div class="tarjeta">${seguro(vacio({ icono: 'nube', texto: t('subir.vacio') }))}</div>`;
