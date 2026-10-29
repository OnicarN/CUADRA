// Planes, extras y prueba gratuita (RF-60).
// Responsable: Ana (#26).
// PROVISIONAL: los precios y límites están pendientes del documento de precios.
// Cambiarlos aquí los cambia en toda la web (la página de precios los lee de /api/suscripcion/planes).

export const DIAS_PRUEBA = 14;

// Funciones que dependen del plan. Lo demás (subir, leer, revisar, avisos, panel, Excel) es para todos.
export const FUNCIONES = Object.freeze({
  INFORMES: 'informes',       // informe trimestral en PDF (RF-52)
  CALENDARIO: 'calendario',   // conexión con Google Calendar (RF-54 a RF-56)
  GESTORIA: 'gestoria',       // envío del Excel y el informe a la gestoría (RF-53)
});

export const PLANES = [
  { id: 'gratis',   precioMes: 0,    facturasMes: 5,   funciones: [] },
  { id: 'autonomo', precioMes: 4.99, facturasMes: 40,  funciones: ['informes', 'gestoria'] },
  { id: 'pro',      precioMes: 9.99, facturasMes: 150, funciones: ['informes', 'gestoria', 'calendario'] },
];

// Durante la prueba gratuita el usuario tiene todo lo del plan Pro.
export const PLAN_PRUEBA = 'pro';

export const PAQUETES_LECTURAS = [
  { id: 'lecturas-20', lecturas: 20, precio: 1.99 },
  { id: 'lecturas-50', lecturas: 50, precio: 3.99 },
];

export const FUNCIONES_SUELTAS = [
  { id: 'informes',   precioMes: 1.49 },
  { id: 'calendario', precioMes: 1.99 },
];

export function planPorId(id) {
  return PLANES.find((p) => p.id === id) || PLANES[0];
}
