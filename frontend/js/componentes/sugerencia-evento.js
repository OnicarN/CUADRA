// Sugerencia de asociar una factura a un evento de Google Calendar (RF-55).
// Responsable: Dani (#16).
//
// La pantalla de revisión (js/paginas/factura.js, de Rodrigo) ya la llama:
//   pintarSugerenciaEvento(contenedor, facturaId)
// Pide GET /api/calendario/sugerencias?factura=ID y, si hay alguna, pinta un banner de la IA
// ("¿Este gasto es de Reunión con Alba?") con botones Sí / No que llaman a
// POST /api/calendario/sugerencias/:facturaId/:eventoId { aceptar }.
// Si no hay sugerencias o el usuario no tiene calendario, no pinta nada.
import { api } from '../core/api.js';
import { t, agregarTextos } from '../core/i18n.js';
import { fecha } from '../core/formato.js';
import { icono } from '../core/iconos.js';
import { html, seguro, mostrarToast } from '../core/ui.js';

agregarTextos({
  es: {
    'sugerencia.pregunta': '¿Este gasto es de {evento}?',
    'sugerencia.calendario': 'Lo hemos visto en tu Google Calendar',
    'sugerencia.si': 'Sí',
    'sugerencia.no': 'No',
    'sugerencia.aceptada': 'Gasto asociado a {evento}',
  },
  en: {
    'sugerencia.pregunta': 'Is this expense from {evento}?',
    'sugerencia.calendario': 'We found it in your Google Calendar',
    'sugerencia.si': 'Yes',
    'sugerencia.no': 'No',
    'sugerencia.aceptada': 'Expense linked to {evento}',
  },
});

// Los estilos están en calendario.css; se cargan una vez al pintar la primera sugerencia.
function cargarEstilos() {
  if (document.querySelector('link[data-sugerencia-evento]')) return;
  const enlace = document.createElement('link');
  enlace.rel = 'stylesheet';
  enlace.href = '/css/paginas/calendario.css';
  enlace.dataset.sugerenciaEvento = '';
  document.head.append(enlace);
}

export async function pintarSugerenciaEvento(contenedor, facturaId) {
  if (!contenedor) return;
  let sugerencias = [];
  try {
    sugerencias = await api(`/calendario/sugerencias?factura=${encodeURIComponent(facturaId)}`);
  } catch {
    return; // sin calendario o sin conexión: no es importante, no molestamos
  }
  const [sugerencia] = sugerencias;
  if (!sugerencia) {
    contenedor.replaceChildren();
    return;
  }
  cargarEstilos();
  const cuando = fecha(sugerencia.inicio, { weekday: 'long', day: 'numeric', month: 'long' });
  contenedor.innerHTML = html`
    <div class="banner sugerencia-evento" role="group" aria-labelledby="sugerencia-pregunta">
      ${seguro(icono('destello'))}
      <div class="banner-texto">
        <strong id="sugerencia-pregunta">${t('sugerencia.pregunta', { evento: sugerencia.titulo })}</strong>
        <span class="sugerencia-evento-detalle">${seguro(icono('calendario'))}${cuando}${sugerencia.ubicacion ? ` · ${sugerencia.ubicacion}` : ''} · ${t('sugerencia.calendario')}</span>
      </div>
      <div class="sugerencia-evento-botones">
        <button type="button" class="boton boton-secundario" data-aceptar="false">${t('sugerencia.no')}</button>
        <button type="button" class="boton boton-principal" data-aceptar="true">${t('sugerencia.si')}</button>
      </div>
    </div>`;

  contenedor.querySelectorAll('[data-aceptar]').forEach((boton) => boton.addEventListener('click', async () => {
    const aceptar = boton.dataset.aceptar === 'true';
    contenedor.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    try {
      await api(`/calendario/sugerencias/${facturaId}/${sugerencia.evento_id}`, { metodo: 'POST', cuerpo: { aceptar } });
      if (aceptar) mostrarToast(t('sugerencia.aceptada', { evento: sugerencia.titulo }));
      // Si había otra sugerencia (rechazada esta), se enseña la siguiente.
      await pintarSugerenciaEvento(contenedor, facturaId);
    } catch (error) {
      mostrarToast(error.message || t('comun.error'));
      contenedor.querySelectorAll('button').forEach((b) => { b.disabled = false; });
    }
  }));
}
