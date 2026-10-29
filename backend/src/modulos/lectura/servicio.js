// Lectura automática de facturas con IA (Claude). Responsable: Dani (#13).
//
//   await leerFactura(facturaId);      // lee el original, guarda los datos, deja la factura 'pendiente'
//                                      // y llama a comprobarFactura() de facturas/comprobaciones.js
//   await leerSinLeer(usuarioId);      // lee las 'sin_leer' mientras queden lecturas (al ampliar plan)
//
// Campos (RF-24): fecha, hora, emisor, nif_emisor, nif_receptor, numero, lineas de IVA
// (base, tipo, cuota), total, moneda y categoría propuesta. Conversión a euros (RF-25).
export async function leerFactura() {
  throw new Error('Pendiente (#13)');
}

export async function leerSinLeer() {
  throw new Error('Pendiente (#13)');
}
