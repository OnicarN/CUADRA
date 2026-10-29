// Comprobaciones automáticas de una factura. Crea o cierra los avisos que tocan.
// Se llama después de leer una factura (módulo lectura) y después de cada edición.
//
//   await comprobarFactura(facturaId);
//
// Responsable: Rodrigo (#20).
// Debe comprobar:
//   - RF-27 base + cuotas = total            -> aviso TOTAL_NO_CUADRA
//   - RF-28 NIF del receptor = NIF del perfil -> aviso OTRO_NIF
//   - falta NIF del emisor o del receptor     -> aviso SIN_NIF
//   - RF-35 posible duplicado                 -> aviso DUPLICADO y facturas.duplicado_de
// Y cerrar los avisos que ya no apliquen (por ejemplo, tras corregir el total).
export async function comprobarFactura(_facturaId) {
  // Pendiente (#20). De momento no comprueba nada.
  return [];
}
