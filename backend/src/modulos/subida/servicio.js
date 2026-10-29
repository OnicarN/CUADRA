// Crear facturas a partir de archivos. Lo usan la subida, el correo y el compartir del móvil.
//
//   const factura = await crearFacturaDesdeArchivo({ usuarioId, buffer, nombre, mime, origen: 'camara' });
//
// Responsable: Dani (#12).
// Debe: guardar el original (tabla originales), crear la factura y, si quedan lecturas
// en el plan (suscripcion/uso.js), lanzar la lectura; si no, dejarla 'sin_leer' y avisar (RF-23).
export const FORMATOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif'];
export const TAMANO_MAXIMO = 15 * 1024 * 1024;

export async function crearFacturaDesdeArchivo() {
  throw new Error('Pendiente (#12)');
}
