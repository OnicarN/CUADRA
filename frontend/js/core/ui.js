// Utilidades de interfaz compartidas.
import { icono } from './iconos.js';
import { t } from './i18n.js';

// Escapa texto para meterlo en HTML. Úsalo SIEMPRE con datos del usuario o de la IA.
export function escapar(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Plantilla que escapa lo que se interpola:  html`<p>${factura.emisor}</p>`
// Para meter HTML ya preparado (iconos, otra plantilla) envuélvelo con seguro(...).
export function html(partes, ...valores) {
  return partes.reduce((acc, parte, i) => {
    const v = valores[i - 1];
    const texto = Array.isArray(v) ? v.map((x) => (x?.__seguro ? x.valor : escapar(x))).join('') : v?.__seguro ? v.valor : escapar(v);
    return acc + texto + parte;
  });
}
export const seguro = (valor) => ({ __seguro: true, valor });

let temporizador;
export function mostrarToast(mensaje) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    document.body.append(toast);
  }
  toast.textContent = mensaje;
  toast.hidden = false;
  clearTimeout(temporizador);
  temporizador = setTimeout(() => { toast.hidden = true; }, 3500);
}

// Pantalla vacía: un icono de línea, una frase y un botón.
export function vacio({ icono: nombre = 'facturas', texto, boton }) {
  return html`<div class="vacio">${seguro(icono(nombre))}<p>${texto}</p>${
    boton ? seguro(html`<a class="boton boton-principal" href="${boton.href}">${boton.texto}</a>`) : ''
  }</div>`;
}

// Marca una pantalla que aún no está hecha. Se quita al hacerla.
export function enConstruccion({ responsable, issue }) {
  return html`<span class="en-construccion">${seguro(icono('reloj'))} ${t('comun.enConstruccion')} · ${responsable} · ${issue}</span>`;
}

// Etiqueta de estado de una factura.
export function etiquetaEstado(estado) {
  const clases = { pendiente: 'etiqueta-pendiente', confirmada: 'etiqueta-confirmada', sin_leer: 'etiqueta-sin-leer' };
  return html`<span class="etiqueta ${clases[estado] || ''}">${t(`estado.${estado}`)}</span>`;
}
