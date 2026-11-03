// Tareas periódicas del correo. Responsable: Dani (#14).
// Cada minuto mira si han llegado facturas al buzón de Gmail de Cuadra (gmail.js).
// En el plan gratis de Render el servidor se duerme sin visitas: los correos se recogen al despertar.
import { gmailConfigurado } from './gmail.js';
import { revisarBuzon } from './servicio.js';

export const tareas = [
  {
    nombre: 'revisar-buzon',
    cadaMinutos: 1,
    ejecutar: async () => {
      if (!gmailConfigurado()) return;
      await revisarBuzon();
    },
  },
];
