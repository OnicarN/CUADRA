// Google Calendar: eventos, sugerencias y fechas de Hacienda. Responsable: Dani (#16).
//
// RF-54: conexión (rutas.js) y sincronización de los últimos 90 días y los próximos 30.
// RF-55: si una factura es del día de un evento, se sugiere asociarla ("¿Es de la reunión con Alba?").
//        Un viaje o reunión pasado sin ningún gasto genera el aviso "Evento sin ticket".
// RF-56: los cierres de trimestre y los plazos del 303 y el 130 se apuntan en su calendario.
import { db } from '../../core/db.js';
import { config } from '../../config.js';
import { crearAviso, cerrarAvisos, TIPOS_AVISO } from '../../core/avisos.js';
import { rangoTrimestre, plazoPresentacion, trimestreDe, hoy } from '../../core/fiscal.js';
import { tieneFuncion } from '../suscripcion/uso.js';
import { google } from './google.js';

export const FECHAS_FISCALES = ['trimestre', '303', '130'];
export const MAX_DIAS_ANTELACION = 28; // Google no deja recordatorios de más de 4 semanas
const DIAS_ATRAS = 90;
const DIAS_ADELANTE = 30;
const DIAS_MARGEN_TICKET = 2;  // días que damos para subir el ticket antes de avisar
const DIAS_AVISO_TICKET = 30;  // solo avisamos de eventos recientes
const PREFIJO_CUADRA = 'cuadra'; // id de los eventos que crea Cuadra (no se sincronizan de vuelta)
const ZONA = 'Europe/Madrid';
// Conexión de prueba para ver todo en local sin Google (POST /api/calendario/simular).
export const SIMULADO = 'simulado';

// Palabras que delatan un viaje o una reunión (además de tener ubicación).
const VIAJE_O_REUNION = /viaje|vuelo|tren|ave\b|hotel|reuni|comida|cena|almuerzo|desayuno|visita|cliente|congreso|feria|evento|trip|flight|train|meeting|lunch|dinner|breakfast|visit|client|conference/i;

export const esViajeOReunion = ({ titulo, ubicacion }) => Boolean(ubicacion?.trim()) || VIAJE_O_REUNION.test(titulo || '');

export async function obtenerConexion(usuarioId) {
  const { rows: [conexion] } = await db.query('SELECT * FROM calendario_conexiones WHERE usuario_id = $1', [usuarioId]);
  return conexion || null;
}

// Solo trabaja con el calendario quien lo tiene conectado y en su plan.
async function conexionActiva(usuarioId) {
  const conexion = await obtenerConexion(usuarioId);
  if (!conexion || !(await tieneFuncion(usuarioId, 'calendario'))) return null;
  return conexion;
}

export async function guardarConexion(usuarioId, { refreshToken, email }) {
  await db.query(
    `INSERT INTO calendario_conexiones (usuario_id, email_google, refresh_token) VALUES ($1, $2, $3)
     ON CONFLICT (usuario_id) DO UPDATE SET email_google = $2, refresh_token = $3, conectado_en = now()`,
    [usuarioId, email, refreshToken],
  );
}

export async function desconectar(usuarioId) {
  const conexion = await obtenerConexion(usuarioId);
  if (!conexion) return;
  if (conexion.refresh_token !== SIMULADO) await google.revocar(conexion.refresh_token).catch(() => { /* ya estaba revocado */ });
  await db.transaccion(async (tx) => {
    await tx.query('DELETE FROM calendario_conexiones WHERE usuario_id = $1', [usuarioId]);
    await tx.query(
      `DELETE FROM sugerencias_evento WHERE estado = 'sugerida'
         AND factura_id IN (SELECT id FROM facturas WHERE usuario_id = $1)`,
      [usuarioId],
    );
    // Los eventos ya asociados a facturas se quedan: el panel los usa para el gasto por cliente.
    await tx.query(
      'DELETE FROM eventos e WHERE usuario_id = $1 AND NOT EXISTS (SELECT 1 FROM facturas f WHERE f.evento_id = e.id)',
      [usuarioId],
    );
    await cerrarAvisos({ usuarioId, tipo: TIPOS_AVISO.EVENTO_SIN_TICKET }, tx);
  });
}

// Evento de Google -> { google_id, titulo, inicio, fin, ubicacion }. Los de todo el día traen
// solo la fecha (y el fin es el día siguiente): se guardan a medianoche de Madrid.
function deGoogle(item) {
  const momento = (parte) => parte?.dateTime || (parte?.date ? `${parte.date} 00:00:00 ${ZONA}` : null);
  return {
    google_id: item.id,
    titulo: String(item.summary || '').slice(0, 300) || '(sin título)',
    inicio: momento(item.start),
    fin: momento(item.end) || momento(item.start),
    ubicacion: item.location ? String(item.location).slice(0, 300) : null,
  };
}

export async function sincronizar(usuarioId) {
  const conexion = await conexionActiva(usuarioId);
  if (!conexion) return;
  if (conexion.refresh_token !== SIMULADO) await traerEventos(usuarioId, conexion);
  await sugerir(usuarioId);
  await avisarEventosSinTicket(usuarioId);
}

async function traerEventos(usuarioId, conexion) {
  const ahora = Date.now();
  const desde = new Date(ahora - DIAS_ATRAS * 86400000).toISOString();
  const hasta = new Date(ahora + DIAS_ADELANTE * 86400000).toISOString();
  const token = await google.tokenDeAcceso(conexion.refresh_token);
  const eventos = (await google.listarEventos(token, desde, hasta))
    .filter((item) => item.status !== 'cancelled' && !String(item.id).startsWith(PREFIJO_CUADRA))
    .map(deGoogle)
    .filter((e) => e.inicio);

  await db.transaccion(async (tx) => {
    for (const e of eventos) {
      await tx.query(
        `INSERT INTO eventos (usuario_id, google_id, titulo, inicio, fin, ubicacion)
         VALUES ($1, $2, $3, $4::text::timestamptz, $5::text::timestamptz, $6)
         ON CONFLICT (usuario_id, google_id)
         DO UPDATE SET titulo = $3, inicio = $4::text::timestamptz, fin = $5::text::timestamptz, ubicacion = $6`,
        [usuarioId, e.google_id, e.titulo, e.inicio, e.fin, e.ubicacion],
      );
    }
    // Lo que ya no está en Google (borrado o movido fuera de la ventana) se va,
    // salvo que ya esté asociado a una factura.
    await tx.query(
      `DELETE FROM eventos e WHERE usuario_id = $1 AND inicio >= $2 AND inicio < $3
         AND NOT (google_id = ANY($4::text[]))
         AND NOT EXISTS (SELECT 1 FROM facturas f WHERE f.evento_id = e.id)`,
      [usuarioId, desde, hasta, eventos.map((e) => e.google_id)],
    );
    await tx.query('UPDATE calendario_conexiones SET sincronizado_en = now() WHERE usuario_id = $1', [usuarioId]);
  });
}

// Solo fuera de producción: conecta un calendario de mentira con una reunión el día de
// sus últimas facturas y una comida pasada sin ticket.
export async function simularConexion(usuarioId) {
  await guardarConexion(usuarioId, { refreshToken: SIMULADO, email: 'prueba@gmail.com' });
  const { rows } = await db.query(
    'SELECT DISTINCT fecha FROM facturas WHERE usuario_id = $1 AND fecha IS NOT NULL ORDER BY fecha DESC LIMIT 5',
    [usuarioId],
  );
  const hace5Dias = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10);
  const eventos = [
    ...rows.map(({ fecha }) => [`simulado${fecha}`, 'Reunión con cliente (prueba)', fecha, null]),
    ['simuladocomida', 'Comida con Alba (prueba)', hace5Dias, 'Restaurante La Plaza'],
  ];
  for (const [googleId, titulo, dia, ubicacion] of eventos) {
    await db.query(
      `INSERT INTO eventos (usuario_id, google_id, titulo, inicio, fin, ubicacion)
       VALUES ($1, $2, $3, ($4 || ' 10:00:00 ${ZONA}')::timestamptz, ($4 || ' 12:00:00 ${ZONA}')::timestamptz, $5)
       ON CONFLICT (usuario_id, google_id) DO NOTHING`,
      [usuarioId, googleId, titulo, dia, ubicacion],
    );
  }
  await db.query('UPDATE calendario_conexiones SET sincronizado_en = now() WHERE usuario_id = $1', [usuarioId]);
  await sincronizar(usuarioId);
}

// RF-55: factura sin evento cuya fecha cae dentro de un evento -> sugerencia.
export async function sugerir(usuarioId, facturaId = null) {
  await db.query(
    `INSERT INTO sugerencias_evento (factura_id, evento_id)
     SELECT f.id, e.id FROM facturas f
       JOIN eventos e ON e.usuario_id = f.usuario_id
        AND f.fecha BETWEEN (e.inicio AT TIME ZONE '${ZONA}')::date
                        AND (GREATEST(e.inicio, e.fin - interval '1 second') AT TIME ZONE '${ZONA}')::date
     WHERE f.usuario_id = $1 AND ($2::int IS NULL OR f.id = $2)
       AND f.fecha IS NOT NULL AND f.evento_id IS NULL AND f.estado IN ('pendiente', 'confirmada')
     ON CONFLICT DO NOTHING`,
    [usuarioId, facturaId],
  );
}

export async function avisarEventosSinTicket(usuarioId) {
  const { rows } = await db.query(
    `SELECT e.id, e.titulo, e.inicio, e.ubicacion FROM eventos e
     WHERE e.usuario_id = $1
       AND e.fin < now() - make_interval(days => $2) AND e.fin > now() - make_interval(days => $3)
       AND NOT EXISTS (SELECT 1 FROM facturas f WHERE f.evento_id = e.id)
       AND NOT EXISTS (SELECT 1 FROM sugerencias_evento s WHERE s.evento_id = e.id AND s.estado <> 'rechazada')`,
    [usuarioId, DIAS_MARGEN_TICKET, DIAS_AVISO_TICKET],
  );
  for (const evento of rows.filter(esViajeOReunion)) {
    await crearAviso({
      usuarioId,
      tipo: TIPOS_AVISO.EVENTO_SIN_TICKET,
      clave: `evento:${evento.id}`,
      datos: { evento_id: evento.id, titulo: evento.titulo, fecha: evento.inicio },
    });
  }
}

export async function listarSugerencias(usuarioId, facturaId) {
  if (!(await conexionActiva(usuarioId))) return [];
  await sugerir(usuarioId, facturaId); // por si la factura se acaba de leer
  const { rows } = await db.query(
    `SELECT e.id AS evento_id, e.titulo, e.inicio, e.fin, e.ubicacion
     FROM sugerencias_evento s
       JOIN facturas f ON f.id = s.factura_id
       JOIN eventos e ON e.id = s.evento_id
     WHERE f.usuario_id = $1 AND f.id = $2 AND f.evento_id IS NULL AND s.estado = 'sugerida'
     ORDER BY e.inicio`,
    [usuarioId, facturaId],
  );
  return rows;
}

// Devuelve false si la sugerencia no existe (o no es de este usuario).
export async function responderSugerencia(usuarioId, facturaId, eventoId, aceptar) {
  return db.transaccion(async (tx) => {
    const { rowCount } = await tx.query(
      `UPDATE sugerencias_evento s SET estado = $4
       FROM facturas f WHERE f.id = s.factura_id AND f.usuario_id = $1 AND s.factura_id = $2 AND s.evento_id = $3`,
      [usuarioId, facturaId, eventoId, aceptar ? 'aceptada' : 'rechazada'],
    );
    if (!rowCount) return false;
    if (aceptar) {
      await tx.query('UPDATE facturas SET evento_id = $3 WHERE id = $2 AND usuario_id = $1', [usuarioId, facturaId, eventoId]);
      // Una factura va con un solo evento: el resto de sugerencias de esa factura sobran.
      await tx.query(
        "UPDATE sugerencias_evento SET estado = 'rechazada' WHERE factura_id = $1 AND evento_id <> $2 AND estado = 'sugerida'",
        [facturaId, eventoId],
      );
      await cerrarAvisos({ usuarioId, tipo: TIPOS_AVISO.EVENTO_SIN_TICKET, clave: `evento:${eventoId}` }, tx);
    }
    return true;
  });
}

// ---- RF-56: fechas de Hacienda en su calendario ----

const TITULOS = {
  es: {
    trimestre: (t, a) => `Cierra el ${t}T de ${a}`,
    303: (t, a) => `Último día del modelo 303 (${t}T ${a})`,
    130: (t, a) => `Último día del modelo 130 (${t}T ${a})`,
    descripcion: 'Revisa tus facturas en Cuadra antes de esta fecha:',
  },
  en: {
    trimestre: (t, a) => `Q${t} ${a} closes`,
    303: (t, a) => `Last day for form 303 (Q${t} ${a})`,
    130: (t, a) => `Last day for form 130 (Q${t} ${a})`,
    descripcion: 'Check your invoices in Cuadra before this date:',
  },
};

const diaSiguiente = (fecha) => new Date(Date.parse(`${fecha}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);

// Las fechas de los próximos 12 meses: el trimestre anterior (su plazo aún puede estar abierto),
// el actual y los tres siguientes.
export function proximasFechas(tipos, desde = hoy()) {
  const { anio, trimestre } = trimestreDe(desde);
  const fechas = [];
  for (let paso = -1; paso <= 3; paso += 1) {
    const indice = anio * 4 + (trimestre - 1) + paso;
    const a = Math.floor(indice / 4);
    const t = (indice % 4) + 1;
    for (const tipo of tipos) {
      const fecha = tipo === 'trimestre' ? rangoTrimestre(a, t).hasta : plazoPresentacion(a, t);
      if (fecha >= desde) fechas.push({ id: `${PREFIJO_CUADRA}${tipo}${a}t${t}`, tipo, anio: a, trimestre: t, fecha });
    }
  }
  return fechas;
}

export async function guardarAjustes(usuarioId, { fechasFiscales, diasAntelacion }) {
  const conexion = await conexionActiva(usuarioId);
  if (!conexion) return false;
  await db.query(
    'UPDATE calendario_conexiones SET fechas_fiscales = $2, dias_antelacion = $3 WHERE usuario_id = $1',
    [usuarioId, fechasFiscales, diasAntelacion],
  );

  if (conexion.refresh_token === SIMULADO) return true;

  const { rows: [{ idioma }] } = await db.query('SELECT idioma FROM usuarios WHERE id = $1', [usuarioId]);
  const textos = TITULOS[idioma] || TITULOS.es;
  const minutos = diasAntelacion * 24 * 60;
  const token = await google.tokenDeAcceso(conexion.refresh_token);
  for (const f of proximasFechas(fechasFiscales)) {
    await google.guardarEvento(token, {
      id: f.id,
      summary: textos[f.tipo](f.trimestre, f.anio),
      description: `${textos.descripcion} ${config.urlPublica}/app/facturas`,
      start: { date: f.fecha },
      end: { date: diaSiguiente(f.fecha) },
      transparency: 'transparent',
      reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: minutos }, { method: 'email', minutes: minutos }] },
    });
  }
  // Los tipos que ha quitado se borran de su calendario.
  const quitados = conexion.fechas_fiscales.filter((tipo) => !fechasFiscales.includes(tipo));
  for (const f of proximasFechas(quitados)) await google.borrarEvento(token, f.id);
  return true;
}
