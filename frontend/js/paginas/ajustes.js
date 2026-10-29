// Ajustes (RF-04, RF-41, RF-42). Responsable: Ana (#24)
import { iniciarPagina } from '../core/layout.js';
import { t } from '../core/i18n.js';
import { html, seguro, vacio, enConstruccion } from '../core/ui.js';

const textos = {
  es: { 'ajustes.titulo': "Ajustes", 'ajustes.vacio': "Idioma, modo claro u oscuro y qué avisos te llegan por email." },
  en: { 'ajustes.titulo': "Settings", 'ajustes.vacio': "Language, light or dark mode and which alerts you get by email." },
};

await iniciarPagina({ pagina: 'ajustes', privada: true, textos });

document.getElementById('contenido').innerHTML = html`
  <div class="cabecera-pagina">
    <h1 class="titulo-pagina">${t('ajustes.titulo')}</h1>
    ${seguro(enConstruccion({ responsable: 'Ana', issue: '#24' }))}
  </div>
  <div class="tarjeta">${seguro(vacio({ icono: 'ajustes', texto: t('ajustes.vacio') }))}</div>`;
