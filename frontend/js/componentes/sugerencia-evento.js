// Sugerencia de asociar una factura a un evento de Google Calendar (RF-55).
// Responsable: Dani (#16).
//
// La pantalla de revisión (js/paginas/factura.js, de Rodrigo) ya la llama:
//   pintarSugerenciaEvento(contenedor, facturaId)
// Debe pedir GET /api/calendario/sugerencias?factura=ID y, si hay alguna, pintar un banner
// de la IA ("¿Este gasto es de la reunión con Alba?") con botones Sí / No que llamen a
// POST /api/calendario/sugerencias/:facturaId/:eventoId { aceptar }.
// Si no hay sugerencias o el usuario no tiene calendario, no pinta nada.
export async function pintarSugerenciaEvento(_contenedor, _facturaId) {
  // Pendiente (#16)
}
