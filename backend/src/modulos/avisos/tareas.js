// Tareas periódicas de avisos. Responsable: Rodrigo (#21).
// Cada hora crea los avisos que dependen del tiempo y manda por email los nuevos.
//   - PENDIENTE_REVISAR: facturas sin confirmar desde hace más de ajustes.dias_aviso_pendiente días (RF-42).
//   - TRIMESTRE: faltan ajustes.dias_aviso_trimestre días o menos para el plazo (core/fiscal.js).
//   - Email: los avisos con email_enviado_en NULL, salvo los tipos de ajustes.avisos_sin_email (RF-41).
import { avisarPendientes, avisarTrimestre, enviarAvisosPorEmail } from './servicio.js';

export const tareas = [
  {
    nombre: 'avisos-periodicos',
    cadaMinutos: 60,
    ejecutar: async () => {
      await avisarPendientes();
      await avisarTrimestre();
      // Al final, para que los avisos que se acaban de crear vayan en el mismo email.
      await enviarAvisosPorEmail();
    },
  },
];
