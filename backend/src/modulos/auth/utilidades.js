// Pequeñas utilidades del módulo auth. Responsable: Ana (#23).

export function escaparHtml(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Solo rutas internas ("/app/panel"), nunca otra web ("//otra.com", "https://...").
export function rutaInterna(valor, porDefecto = '/app/panel') {
  return typeof valor === 'string' && valor.startsWith('/') && !valor.startsWith('//') && !valor.startsWith('/\\')
    ? valor
    : porDefecto;
}
