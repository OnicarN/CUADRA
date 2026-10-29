// Avisos (RF-40 a RF-42). Responsable: Rodrigo (#21)
import { iniciarPagina } from '../core/layout.js';
import { t } from '../core/i18n.js';
import { html, seguro, vacio, enConstruccion } from '../core/ui.js';

const textos = {
  es: { 'avisos.titulo': "Avisos", 'avisos.vacio': "No tienes avisos. Todo cuadra." },
  en: { 'avisos.titulo': "Alerts", 'avisos.vacio': "No alerts. Everything adds up." },
};

await iniciarPagina({ pagina: 'avisos', privada: true, textos });

document.getElementById('contenido').innerHTML = html`
  <div class="cabecera-pagina">
    <h1 class="titulo-pagina">${t('avisos.titulo')}</h1>
    ${seguro(enConstruccion({ responsable: 'Rodrigo', issue: '#21' }))}
  </div>
  <div class="tarjeta">${seguro(vacio({ icono: 'avisos', texto: t('avisos.vacio') }))}</div>`;
