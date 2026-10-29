// Nueva contraseña (RF-07 / RF-08). Responsable: Ana (#23)
import { iniciarPagina } from '../core/layout.js';
import { t } from '../core/i18n.js';
import { html, seguro, enConstruccion } from '../core/ui.js';
import { textosAcceso } from './acceso-textos.js';

const textos = {
  es: { ...textosAcceso.es, 'restablecer.titulo': 'Nueva contraseña' },
  en: { ...textosAcceso.en, 'restablecer.titulo': 'New password' },
};
await iniciarPagina({ pagina: 'restablecer', textos });

document.getElementById('contenido').innerHTML = html`
  <h1 class="titulo-pagina">${t('restablecer.titulo')}</h1>
  ${seguro(enConstruccion({ responsable: 'Ana', issue: '#23' }))}`;
