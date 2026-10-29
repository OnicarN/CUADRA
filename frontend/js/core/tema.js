// Modo claro / oscuro. Por defecto sigue el sistema (documento de diseño, "Navegación").
const CLAVE = 'cuadra-tema';

export function temaGuardado() {
  try { return localStorage.getItem(CLAVE) || 'sistema'; } catch { return 'sistema'; }
}

export function aplicarTema(tema = temaGuardado()) {
  if (tema === 'claro' || tema === 'oscuro') document.documentElement.dataset.tema = tema;
  else delete document.documentElement.dataset.tema;
}

export function cambiarTema(tema) {
  try { localStorage.setItem(CLAVE, tema); } catch { /* sin almacenamiento */ }
  aplicarTema(tema);
}
