// Errores HTTP. Lanza uno desde una ruta y el manejador de app.js responde con
// { error: mensaje } y el código indicado. Express 5 captura los errores de las
// funciones async, no hace falta try/catch en las rutas.
export class ErrorHttp extends Error {
  constructor(estado, mensaje, detalles) {
    super(mensaje);
    this.estado = estado;
    this.detalles = detalles;
  }
}

export const peticionIncorrecta = (mensaje, detalles) => new ErrorHttp(400, mensaje, detalles);
export const noAutorizado = (mensaje = 'Tienes que iniciar sesión') => new ErrorHttp(401, mensaje);
export const prohibido = (mensaje = 'No tienes permiso') => new ErrorHttp(403, mensaje);
export const noEncontrado = (mensaje = 'No encontrado') => new ErrorHttp(404, mensaje);
export const conflicto = (mensaje, detalles) => new ErrorHttp(409, mensaje, detalles);

// Para las rutas que aún no están hechas.
export const pendiente = (issue) => new ErrorHttp(501, `Pendiente de implementar (${issue})`);
