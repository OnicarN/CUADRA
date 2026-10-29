// Revisar factura (RF-30 a RF-36). Responsable: Rodrigo (#19)
import { iniciarPagina } from '../core/layout.js';
import { t } from '../core/i18n.js';
import { html, seguro, vacio, enConstruccion } from '../core/ui.js';
import { pintarSugerenciaEvento } from '../componentes/sugerencia-evento.js';

const textos = {
  es: { 'factura.titulo': "Revisar factura", 'factura.vacio': "Aquí verás el original al lado de los datos leídos para corregirlos y confirmar." },
  en: { 'factura.titulo': "Review invoice", 'factura.vacio': "Here you'll see the original next to the data read, to fix it and confirm." },
};

await iniciarPagina({ pagina: 'factura', privada: true, textos });

document.getElementById('contenido').innerHTML = html`
  <div class="cabecera-pagina">
    <h1 class="titulo-pagina">${t('factura.titulo')}</h1>
    ${seguro(enConstruccion({ responsable: 'Rodrigo', issue: '#19' }))}
  </div>
  <div id="sugerencia-evento"></div>
  <div class="tarjeta">${seguro(vacio({ icono: 'editar', texto: t('factura.vacio') }))}</div>`;

// Sugerencia de evento de Google Calendar (RF-55). El componente es de Dani (#16):
// deja este contenedor y esta llamada en la pantalla de revisión.
const facturaId = new URLSearchParams(location.search).get('id');
if (facturaId) pintarSugerenciaEvento(document.getElementById('sugerencia-evento'), facturaId);
