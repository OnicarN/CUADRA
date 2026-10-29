// Iconos de línea (trazo 1,5 px, 24 px). Uso: icono('facturas') devuelve el <svg> como texto.
// Si necesitas uno nuevo, añádelo aquí en una PR aparte (archivo compartido).
const trazos = {
  inicio: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  facturas: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  subir: '<path d="M12 5v14M5 12h14"/>',
  avisos: '<path d="M6 16v-5a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  perfil: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  buscar: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  camara: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  destello: '<path d="M11 3l1.8 5.2L18 10l-5.2 1.8L11 17l-1.8-5.2L4 10l5.2-1.8z"/><path d="M18.5 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
  flecha: '<path d="m9 6 6 6-6 6"/>',
  atras: '<path d="m15 6-6 6 6 6"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  alerta: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.5"/>',
  calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  descargar: '<path d="M12 4v11m-4-4 4 4 4-4M5 20h14"/>',
  correo: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  papelera: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  editar: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13 7 4 4"/>',
  salir: '<path d="M9 4H5v16h4"/><path d="m14 8 4 4-4 4M18 12H9"/>',
  informes: '<path d="M3 21h18M6 17v-5M11 17V7M16 17v-8"/>',
  ajustes: '<path d="M4 6h9M19 6h1M4 12h3M13 12h7M4 18h11M21 18h-1"/><circle cx="16" cy="6" r="2.5"/><circle cx="10" cy="12" r="2.5"/><circle cx="17.5" cy="18" r="2.5"/>',
  archivo: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
  nube: '<path d="M12 17V8m-4 4 4-4 4 4"/><path d="M7 19a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 9a4 4 0 0 1-1 10"/>',
  cerrar: '<path d="M6 6l12 12M18 6 6 18"/>',
  tarjeta: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
  escudo: '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/><path d="m9 12 2 2 4-4"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  euro: '<path d="M17 6.5a7 7 0 1 0 0 11M4 10h9M4 14h9"/>',
  movil: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18h2"/>',
  copiar: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  ojo: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  google: '<path d="M21 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5a4.3 4.3 0 0 1-1.9 2.8v2.3h3A9 9 0 0 0 21 12.2z"/><path d="M12 21a8.9 8.9 0 0 0 6.1-2.2l-3-2.3a5.4 5.4 0 0 1-8.1-2.9H3.9v2.4A9 9 0 0 0 12 21z"/><path d="M7 13.6a5.4 5.4 0 0 1 0-3.4V7.8H3.9a9 9 0 0 0 0 8.2z"/><path d="M12 6.6a4.9 4.9 0 0 1 3.4 1.3L18 5.3A9 9 0 0 0 3.9 7.8L7 10.2a5.4 5.4 0 0 1 5-3.6z"/>',
};

export function icono(nombre, clase = '') {
  const trazo = trazos[nombre] || trazos.archivo;
  return `<svg class="${clase}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${trazo}</svg>`;
}

// Logo de Cuadra: cinco rombos de contorno que encajan. Siempre en el color del texto
// (negro en modo claro, blanco en modo oscuro), nunca en naranja.
export function logo(clase = '') {
  const r = 5.1;
  const rombo = ([x, y]) => `<path d="M${x} ${y - r} L${x + r} ${y} L${x} ${y + r} L${x - r} ${y}Z"/>`;
  const centros = [[12, 12], [6, 6], [18, 6], [6, 18], [18, 18]];
  return `<svg class="${clase}" viewBox="-0.5 -0.5 25 25" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" role="img" aria-label="Cuadra">${centros.map(rombo).join('')}</svg>`;
}

// Pinta los iconos declarados en el HTML con data-icono="nombre" (se llama solo al iniciar la página).
export function pintarIconos(raiz = document) {
  raiz.querySelectorAll('[data-icono]').forEach((el) => {
    el.insertAdjacentHTML('afterbegin', icono(el.dataset.icono));
    el.removeAttribute('data-icono');
  });
}
