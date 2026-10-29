// Ayuda para los tests: arranca la app con una base de datos en memoria y da un
// cliente que guarda la cookie de sesión.
//
//   const { url, cerrar } = await arrancar();
//   const demo = await crearCliente(url);
//   await demo.post('/api/auth/registro', { nombre: 'A', email: 'a@a.es', password: '12345678' });
import { crearApp } from '../src/app.js';
import { migrar } from '../db/migrar.js';
import { db } from '../src/core/db.js';

export async function arrancar() {
  await migrar();
  const app = await crearApp();
  const servidor = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  return {
    url: `http://localhost:${servidor.address().port}`,
    cerrar: async () => {
      await new Promise((resolve) => servidor.close(resolve));
      await db.cerrar();
    },
  };
}

export function crearCliente(url) {
  let cookie = '';
  const peticion = async (metodo, ruta, cuerpo) => {
    const respuesta = await fetch(url + ruta, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', cookie },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    const nueva = respuesta.headers.get('set-cookie');
    if (nueva) cookie = nueva.split(';')[0];
    const datos = respuesta.status === 204 ? null : await respuesta.json().catch(() => null);
    return { estado: respuesta.status, datos };
  };
  return {
    get: (ruta) => peticion('GET', ruta),
    post: (ruta, cuerpo) => peticion('POST', ruta, cuerpo ?? {}),
    put: (ruta, cuerpo) => peticion('PUT', ruta, cuerpo ?? {}),
    patch: (ruta, cuerpo) => peticion('PATCH', ruta, cuerpo ?? {}),
    delete: (ruta) => peticion('DELETE', ruta),
  };
}
