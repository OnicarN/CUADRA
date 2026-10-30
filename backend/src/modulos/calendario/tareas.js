// Tareas periódicas del calendario. Responsable: Dani (#16).
// Cada hora trae los eventos de Google de quien lo tenga conectado, sugiere facturas
// y avisa de los viajes o reuniones sin ticket.
import { db } from '../../core/db.js';
import { calendarioConfigurado } from './google.js';
import { sincronizar } from './servicio.js';

export const tareas = [
  {
    nombre: 'sincronizar-calendarios',
    cadaMinutos: 60,
    ejecutar: async () => {
      if (!calendarioConfigurado()) return;
      const { rows } = await db.query('SELECT usuario_id FROM calendario_conexiones');
      for (const { usuario_id: usuarioId } of rows) {
        // Si falla uno (p. ej. ha quitado el permiso en Google), seguimos con los demás.
        await sincronizar(usuarioId).catch((e) => console.error(`[calendario] usuario ${usuarioId}:`, e.message));
      }
    },
  },
];
