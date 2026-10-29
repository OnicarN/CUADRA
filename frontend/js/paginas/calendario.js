// Google Calendar (RF-54 a RF-56). Responsable: Dani (#16)
import { iniciarPagina } from '../core/layout.js';
import { t } from '../core/i18n.js';
import { html, seguro, vacio, enConstruccion } from '../core/ui.js';

const textos = {
  es: { 'calendario.titulo': "Google Calendar", 'calendario.vacio': "Conecta tu calendario para relacionar gastos con viajes y reuniones y apuntar los plazos de Hacienda." },
  en: { 'calendario.titulo': "Google Calendar", 'calendario.vacio': "Connect your calendar to match expenses with trips and meetings and add tax deadlines." },
};

await iniciarPagina({ pagina: 'calendario', privada: true, textos });

document.getElementById('contenido').innerHTML = html`
  <div class="cabecera-pagina">
    <h1 class="titulo-pagina">${t('calendario.titulo')}</h1>
    ${seguro(enConstruccion({ responsable: 'Dani', issue: '#16' }))}
  </div>
  <div class="tarjeta">${seguro(vacio({ icono: 'calendario', texto: t('calendario.vacio') }))}</div>`;
