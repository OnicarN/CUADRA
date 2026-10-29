// Tareas periódicas (avisos de "pendiente de revisar", trimestre, renovación del mes...).
// Cada módulo puede tener un archivo tareas.js que exporte:
//   export const tareas = [{ nombre: 'avisos-pendientes', cadaMinutos: 60, ejecutar: async () => {...} }];
// Se cargan solas al arrancar, no hay que registrarlas en ningún sitio.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function iniciarTareas(carpetaModulos) {
  for (const modulo of fs.readdirSync(carpetaModulos)) {
    const archivo = path.join(carpetaModulos, modulo, 'tareas.js');
    if (!fs.existsSync(archivo)) continue;
    const { tareas = [] } = await import(pathToFileURL(archivo).href);
    for (const tarea of tareas) programar(`${modulo}/${tarea.nombre}`, tarea);
  }
}

function programar(nombre, { cadaMinutos = 60, ejecutar }) {
  const lanzar = async () => {
    try {
      await ejecutar();
    } catch (error) {
      console.error(`[tarea ${nombre}]`, error);
    }
  };
  setTimeout(lanzar, 5000);
  setInterval(lanzar, cadaMinutos * 60 * 1000).unref();
}
