// Límite de intentos en memoria: N intentos fallidos por clave (IP + email) en una ventana de tiempo.
// Se pierde al reiniciar el servidor, que es suficiente para frenar a quien prueba contraseñas.
// Responsable: Ana (#23).
import { ErrorHttp } from '../../core/errores.js';

export function crearLimite({ intentos, minutos }) {
  const registros = new Map(); // clave -> { fallos, desde }
  const ventana = minutos * 60 * 1000;

  const vigente = (clave) => {
    const r = registros.get(clave);
    if (r && Date.now() - r.desde > ventana) {
      registros.delete(clave);
      return null;
    }
    return r;
  };

  return {
    // Lanza 429 si la clave ya ha gastado sus intentos.
    comprobar(clave) {
      const r = vigente(clave);
      if (r && r.fallos >= intentos) {
        const espera = Math.ceil((r.desde + ventana - Date.now()) / 60000);
        throw new ErrorHttp(429, `Demasiados intentos. Vuelve a probar dentro de ${espera} min.`, { minutos: espera });
      }
    },
    fallo(clave) {
      const r = vigente(clave);
      if (r) r.fallos += 1;
      else registros.set(clave, { fallos: 1, desde: Date.now() });
    },
    limpiar(clave) {
      registros.delete(clave);
    },
  };
}
