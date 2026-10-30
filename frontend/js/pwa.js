// App instalable y compartir a Cuadra (RF-22). Responsable: Dani (#15).
//
//   import { registrarServiceWorker, recogerCompartidos, alPoderInstalar, instalar } from '../pwa.js';
//
// De momento lo importa subir.js. El service worker (sw.js) sirve para toda la web una vez registrado.

// Chrome avisa de que se puede instalar con este evento; lo guardamos para lanzarlo al pulsar el botón.
// Se escucha en cuanto se carga el módulo porque puede llegar antes de que la página esté pintada.
let peticionInstalar = null;
const avisos = new Set();
window.addEventListener('beforeinstallprompt', (evento) => {
  evento.preventDefault();
  peticionInstalar = evento;
  avisos.forEach((fn) => fn(true));
});
window.addEventListener('appinstalled', () => {
  peticionInstalar = null;
  avisos.forEach((fn) => fn(false));
});

export async function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    return null; // sin service worker la web funciona igual, solo sin instalar ni compartir
  }
}

// Llama a fn(true) cuando se puede instalar y fn(false) cuando ya no.
export function alPoderInstalar(fn) {
  avisos.add(fn);
  fn(Boolean(peticionInstalar));
}

export async function instalar() {
  if (!peticionInstalar) return false;
  const evento = peticionInstalar;
  peticionInstalar = null;
  evento.prompt();
  const { outcome } = await evento.userChoice;
  avisos.forEach((fn) => fn(false));
  return outcome === 'accepted';
}

export const yaInstalada = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

// iPhone/iPad sin instalar: allí no hay botón de instalar, se hace desde Compartir.
export const esIosSinInstalar = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) && !yaInstalada();

// Archivos que el service worker guardó al compartirlos desde otra app. Se borran al leerlos.
export async function recogerCompartidos() {
  if (!('caches' in window)) return [];
  const cache = await caches.open('cuadra-compartido');
  const archivos = [];
  for (const peticion of await cache.keys()) {
    const respuesta = await cache.match(peticion);
    if (respuesta) {
      const blob = await respuesta.blob();
      const nombre = decodeURIComponent(respuesta.headers.get('X-Nombre') || 'compartido');
      archivos.push(new File([blob], nombre, { type: blob.type }));
    }
    await cache.delete(peticion);
  }
  return archivos;
}
