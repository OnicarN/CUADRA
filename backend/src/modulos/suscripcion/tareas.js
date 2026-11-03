// Tareas periódicas de la suscripción. Responsable: Dani (#26).
// RF-60: unos días antes de que acabe la prueba gratuita, un email con lo que pasará y los planes.
// Al acabar no hay que tocar nada: obtenerUso() ya la trata como plan gratis.
import { db } from '../../core/db.js';
import { config } from '../../config.js';
import { enviarEmail } from '../../core/email.js';

export const DIAS_AVISO_PRUEBA = 3;

const TEXTOS = {
  es: {
    asunto: 'Tu prueba de Cuadra termina pronto',
    texto: (nombre, fecha) => `Hola ${nombre}:\n\nTu prueba gratuita de Cuadra termina el ${fecha}. `
      + 'Después pasarás al plan gratis: seguirás viendo todas tus facturas, pero con menos lecturas al mes '
      + 'y sin el informe trimestral, el envío a la gestoría ni Google Calendar.\n\n'
      + `Si quieres seguir con todo, elige un plan aquí: ${config.urlPublica}/app/suscripcion\n\nEl equipo de Cuadra`,
  },
  en: {
    asunto: 'Your Cuadra trial ends soon',
    texto: (nombre, fecha) => `Hi ${nombre},\n\nYour free Cuadra trial ends on ${fecha}. `
      + "After that you'll move to the free plan: you'll still see all your invoices, but with fewer reads per month "
      + 'and without the quarterly report, sending to your accountant or Google Calendar.\n\n'
      + `To keep everything, choose a plan here: ${config.urlPublica}/app/suscripcion\n\nThe Cuadra team`,
  },
};

export async function avisarFinDePrueba() {
  const { rows } = await db.query(
    `SELECT s.usuario_id, s.prueba_hasta, u.email, u.nombre, u.idioma
     FROM suscripciones s JOIN usuarios u ON u.id = s.usuario_id
     WHERE s.estado = 'prueba' AND s.aviso_fin_prueba_en IS NULL
       AND s.prueba_hasta > now() AND s.prueba_hasta <= now() + make_interval(days => $1)`,
    [DIAS_AVISO_PRUEBA],
  );
  for (const u of rows) {
    const textos = TEXTOS[u.idioma] || TEXTOS.es;
    const fecha = new Date(u.prueba_hasta).toLocaleDateString(u.idioma === 'en' ? 'en-GB' : 'es-ES',
      { day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' });
    await enviarEmail({ para: u.email, asunto: textos.asunto, texto: textos.texto(u.nombre, fecha) });
    await db.query('UPDATE suscripciones SET aviso_fin_prueba_en = now() WHERE usuario_id = $1', [u.usuario_id]);
  }
}

export const tareas = [
  { nombre: 'avisar-fin-prueba', cadaMinutos: 60, ejecutar: avisarFinDePrueba },
];
