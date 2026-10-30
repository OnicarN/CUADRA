// Tareas periódicas de la lectura. Responsable: Dani (#13).
// Cuando empieza un mes nuevo (o el usuario compra lecturas), las facturas 'sin_leer'
// vuelven a tener hueco: aquí se leen solas.
import { db } from '../../core/db.js';
import { claveGemini } from './gemini.js';
import { leerSinLeer } from './servicio.js';

export const tareas = [
  {
    nombre: 'leer-sin-leer',
    cadaMinutos: 60,
    ejecutar: async () => {
      // Sin clave de API no hay lectura: no tocamos nada para no gastar lecturas en vacío.
      if (!claveGemini()) return;
      const { rows } = await db.query("SELECT DISTINCT usuario_id FROM facturas WHERE estado = 'sin_leer'");
      for (const { usuario_id: usuarioId } of rows) await leerSinLeer(usuarioId);
    },
  },
];
