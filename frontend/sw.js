// Service worker de Cuadra (RF-22). Responsable: Dani (#15). Lo registra js/pwa.js.
//
// 1. Compartir a Cuadra: el móvil manda los archivos con un POST a /app/subir?compartido=1
//    (share_target del manifest). Aquí se guardan en la caché "cuadra-compartido" y se
//    redirige a /app/subir?compartido=1, donde subir.js los recoge y los sube.
// 2. Caché de los archivos estáticos: primero la red (así siempre se ve lo último) y, si no
//    hay conexión o tarda más de 3 s, lo guardado. La API (/api) nunca se guarda.
//
// iPhone/iPad: Safari no soporta share_target. Allí Cuadra se puede añadir a la pantalla de
// inicio (Compartir -> Añadir a pantalla de inicio), pero no aparece en el menú Compartir.
const VERSION = 'v1';
const ESTATICOS = `cuadra-estaticos-${VERSION}`;
const COMPARTIDO = 'cuadra-compartido';
const ESPERA_RED = 3000;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (evento) => {
  evento.waitUntil((async () => {
    for (const nombre of await caches.keys()) {
      if (nombre.startsWith('cuadra-estaticos-') && nombre !== ESTATICOS) await caches.delete(nombre);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (evento) => {
  const { request } = evento;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.method === 'POST' && url.pathname === '/app/subir' && url.searchParams.has('compartido')) {
    evento.respondWith(recibirCompartido(request));
    return;
  }
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) return;
  evento.respondWith(primeroRed(request));
});

async function recibirCompartido(request) {
  try {
    const datos = await request.formData();
    const cache = await caches.open(COMPARTIDO);
    const archivos = datos.getAll('archivos').filter((a) => a instanceof File);
    let n = 0;
    for (const archivo of archivos) {
      n += 1;
      await cache.put(`/compartido/${Date.now()}-${n}`, new Response(archivo, {
        headers: {
          'Content-Type': archivo.type || 'application/octet-stream',
          'X-Nombre': encodeURIComponent(archivo.name || `archivo-${n}`),
        },
      }));
    }
  } catch {
    // Si algo falla, abrimos la pantalla igualmente: el usuario puede subirlo a mano.
  }
  return Response.redirect('/app/subir?compartido=1', 303);
}

async function primeroRed(request) {
  const cache = await caches.open(ESTATICOS);
  const red = fetch(request).then((respuesta) => {
    if (respuesta.ok && respuesta.type === 'basic') cache.put(request, respuesta.clone());
    return respuesta;
  });
  red.catch(() => {}); // si gana la caché y luego falla la red, que no salte un error suelto
  const tiempo = new Promise((resolve) => setTimeout(resolve, ESPERA_RED));
  try {
    const respuesta = await Promise.race([red, tiempo]);
    if (respuesta) return respuesta;
    return (await cache.match(request)) || (await red);
  } catch {
    const guardada = await cache.match(request);
    if (guardada) return guardada;
    throw new Error('Sin conexión');
  }
}
