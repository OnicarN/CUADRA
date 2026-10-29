// Verificar email (RF-07 / RF-08). Responsable: Ana (#23)
import { iniciarPagina } from '../core/layout.js';
import { t } from '../core/i18n.js';
import { html, seguro, enConstruccion } from '../core/ui.js';
import { textosAcceso } from './acceso-textos.js';

const textos = {
  es: { ...textosAcceso.es, 'verificar.titulo': 'Verificar email' },
  en: { ...textosAcceso.en, 'verificar.titulo': 'Verify your email' },
};
await iniciarPagina({ pagina: 'verificar', textos });

document.getElementById('contenido').innerHTML = html`
  <h1 class="titulo-pagina">${t('verificar.titulo')}</h1>
  ${seguro(enConstruccion({ responsable: 'Ana', issue: '#23' }))}`;
