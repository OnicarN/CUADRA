// Avisos (RF-40 a RF-42). Responsable: Rodrigo (#21).
//
//   await listarAvisos(usuarioId, 'abierto')    lista con la factura y el texto de cada aviso
//   await cerrarAviso(usuarioId, id)            el usuario lo descarta
//   await avisarPendientes()                    PENDIENTE_REVISAR (RF-42)
//   await avisarTrimestre()                     TRIMESTRE
//   await enviarAvisosPorEmail()                un email por usuario con sus avisos nuevos (RF-41)
//
// Las tres últimas las lanza tareas.js cada hora. Un aviso que el usuario ya ha cerrado no
// se vuelve a crear para la misma factura o el mismo trimestre.
import { db } from '../../core/db.js';
import { crearAviso, TIPOS_AVISO } from '../../core/avisos.js';
import { enviarEmail } from '../../core/email.js';
import { noEncontrado, peticionIncorrecta, conflicto } from '../../core/errores.js';
import { trimestreDe, plazoPresentacion, diasEntre, hoy } from '../../core/fiscal.js';
import { config } from '../../config.js';
import { obtenerAjustes } from '../perfil/servicio.js';
import { versionActual } from '../versiones/servicio.js';
import { textosAviso, textoAviso, destinoAviso, IMPORTANTES } from './textos.js';

export const ESTADOS = ['abierto', 'cerrado'];
const MAX_CERRADOS = 100;

const CON_FACTURA = `
  SELECT a.id, a.usuario_id, a.tipo, a.estado, a.factura_id, a.clave, a.datos, a.creado_en, a.cerrado_en, a.email_enviado_en,
         f.emisor, f.total, f.moneda, f.fecha, f.estado AS factura_estado, f.creado_en AS factura_creada
    FROM avisos a LEFT JOIN facturas f ON f.id = a.factura_id AND f.usuario_id = a.usuario_id`;

function deFila(fila) {
  const factura = fila.factura_id
    ? {
      id: fila.factura_id, emisor: fila.emisor, total: fila.total === null ? null : Number(fila.total),
      moneda: fila.moneda, fecha: fila.fecha, estado: fila.factura_estado, creado_en: fila.factura_creada,
    }
    : null;
  const aviso = {
    id: fila.id, tipo: fila.tipo, estado: fila.estado, clave: fila.clave, datos: fila.datos || {},
    creado_en: fila.creado_en, cerrado_en: fila.cerrado_en, factura,
  };
  return {
    ...aviso,
    importante: IMPORTANTES.includes(fila.tipo),
    destino: destinoAviso(fila),
    textos: textosAviso(aviso),
  };
}

// Versión de empresa y personal (#50): los avisos de una factura salen en la versión de la
// factura; los demás en las dos, menos el del trimestre, que solo es de empresa.
// $2 es la versión. Necesita el LEFT JOIN de la factura como f.
const DE_LA_VERSION = `((a.factura_id IS NULL AND (a.tipo <> '${TIPOS_AVISO.TRIMESTRE}' OR $2 = 'empresa')) OR f.version = $2)`;

export async function contarAbiertos(usuarioId, version) {
  const { rows: [{ abiertos }] } = await db.query(
    `SELECT count(*)::int AS abiertos FROM avisos a LEFT JOIN facturas f ON f.id = a.factura_id AND f.usuario_id = a.usuario_id
      WHERE a.usuario_id = $1 AND a.estado = 'abierto' AND ${DE_LA_VERSION}`,
    [usuarioId, version ?? await versionActual(usuarioId)],
  );
  return abiertos;
}

export async function listarAvisos(usuarioId, estado = 'abierto') {
  if (!ESTADOS.includes(estado)) throw peticionIncorrecta('El estado tiene que ser abierto o cerrado');
  const version = await versionActual(usuarioId);
  const { rows } = estado === 'abierto'
    // Primero los que cuestan dinero; dentro de cada grupo, los más nuevos arriba.
    ? await db.query(
      `${CON_FACTURA} WHERE a.usuario_id = $1 AND a.estado = 'abierto' AND ${DE_LA_VERSION}
        ORDER BY (a.tipo = ANY($3)) DESC, a.creado_en DESC, a.id DESC`,
      [usuarioId, version, IMPORTANTES],
    )
    : await db.query(
      `${CON_FACTURA} WHERE a.usuario_id = $1 AND a.estado = 'cerrado' AND ${DE_LA_VERSION}
        ORDER BY a.cerrado_en DESC, a.id DESC LIMIT ${MAX_CERRADOS}`,
      [usuarioId, version],
    );
  return rows.map(deFila);
}

export async function cerrarAviso(usuarioId, id) {
  const { rowCount } = await db.query(
    "UPDATE avisos SET estado = 'cerrado', cerrado_en = now() WHERE id = $1 AND usuario_id = $2 AND estado = 'abierto'",
    [id, usuarioId],
  );
  if (!rowCount) {
    const { rows } = await db.query('SELECT 1 FROM avisos WHERE id = $1 AND usuario_id = $2', [id, usuarioId]);
    if (!rows.length) throw noEncontrado('Ese aviso no existe');
    throw conflicto('Ese aviso ya estaba cerrado');
  }
  return { abiertos: await contarAbiertos(usuarioId) };
}

// RF-42: facturas pendientes desde hace más de ajustes.dias_aviso_pendiente días.
// Los ajustes se leen con obtenerAjustes() (Ana, #24); si no hay fila, 7 días.
export async function avisarPendientes() {
  const { rows } = await db.query(
    "SELECT DISTINCT usuario_id FROM facturas WHERE estado = 'pendiente'",
  );
  let creados = 0;
  for (const { usuario_id: usuarioId } of rows) {
    const dias = (await obtenerAjustes(usuarioId))?.dias_aviso_pendiente ?? 7;
    const { rows: facturas } = await db.query(
      `SELECT f.id FROM facturas f
        WHERE f.usuario_id = $1 AND f.estado = 'pendiente' AND f.creado_en < now() - make_interval(days => $2)
          AND NOT EXISTS (SELECT 1 FROM avisos a WHERE a.usuario_id = f.usuario_id AND a.tipo = $3 AND a.factura_id = f.id)`,
      [usuarioId, dias, TIPOS_AVISO.PENDIENTE_REVISAR],
    );
    for (const { id } of facturas) {
      if (await crearAviso({ usuarioId, tipo: TIPOS_AVISO.PENDIENTE_REVISAR, facturaId: id })) creados += 1;
    }
  }
  return creados;
}

// El plazo que viene: el del trimestre pasado si aún no ha vencido (del 1 al 20 de abril,
// por ejemplo, se presenta el T1), y si no el del trimestre de hoy.
export function proximoPlazo(dia = hoy()) {
  const { anio, trimestre } = trimestreDe(dia);
  const anterior = trimestre === 1 ? { anio: anio - 1, trimestre: 4 } : { anio, trimestre: trimestre - 1 };
  const plazoAnterior = plazoPresentacion(anterior.anio, anterior.trimestre);
  if (diasEntre(dia, plazoAnterior) >= 0) return { ...anterior, plazo: plazoAnterior };
  return { anio, trimestre, plazo: plazoPresentacion(anio, trimestre) };
}

// Aviso TRIMESTRE cuando faltan ajustes.dias_aviso_trimestre días o menos para el plazo.
// Clave AAAA-T (por ejemplo "2026-T4"). Los de plazos ya pasados se cierran solos.
export async function avisarTrimestre(dia = hoy()) {
  const { anio, trimestre, plazo } = proximoPlazo(dia);
  const clave = `${anio}-T${trimestre}`;
  const faltan = diasEntre(dia, plazo);
  await db.query(
    "UPDATE avisos SET estado = 'cerrado', cerrado_en = now() WHERE tipo = $1 AND estado = 'abierto' AND clave <> $2",
    [TIPOS_AVISO.TRIMESTRE, clave],
  );
  const { rows } = await db.query(
    `SELECT u.id FROM usuarios u LEFT JOIN ajustes aj ON aj.usuario_id = u.id
      WHERE $1 <= COALESCE(aj.dias_aviso_trimestre, 15)
        AND NOT EXISTS (SELECT 1 FROM avisos a WHERE a.usuario_id = u.id AND a.tipo = $2 AND a.clave = $3)`,
    [faltan, TIPOS_AVISO.TRIMESTRE, clave],
  );
  let creados = 0;
  for (const { id: usuarioId } of rows) {
    if (await crearAviso({ usuarioId, tipo: TIPOS_AVISO.TRIMESTRE, clave, datos: { anio, trimestre, plazo } })) creados += 1;
  }
  return creados;
}

const ASUNTOS = {
  es: (n) => (n === 1 ? 'Tienes un aviso nuevo en Cuadra' : `Tienes ${n} avisos nuevos en Cuadra`),
  en: (n) => (n === 1 ? 'You have a new alert in Cuadra' : `You have ${n} new alerts in Cuadra`),
};
const SALUDO = { es: (nombre) => `Hola, ${nombre}:`, en: (nombre) => `Hi ${nombre},` };
const PIE = {
  es: 'Puedes elegir qué avisos te llegan por email en Ajustes:',
  en: 'You can choose which alerts you get by email in Settings:',
};
const VER_TODOS = { es: 'Ver todos tus avisos:', en: 'See all your alerts:' };

const escapar = (texto) => String(texto ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function componerEmail(usuario, avisos) {
  const idioma = usuario.idioma === 'en' ? 'en' : 'es';
  const url = (ruta) => `${config.urlPublica}${ruta}`;
  const items = avisos.map((a) => ({ ...textoAviso(a, idioma), enlace: url(a.destino) }));
  const texto = [
    SALUDO[idioma](usuario.nombre),
    '',
    ...items.flatMap((i) => [`· ${i.titulo}`, `  ${i.texto}`, `  ${i.accion}: ${i.enlace}`, '']),
    `${VER_TODOS[idioma]} ${url('/app/avisos')}`,
    `${PIE[idioma]} ${url('/app/ajustes')}`,
  ].join('\n');
  const html = `<p>${escapar(SALUDO[idioma](usuario.nombre))}</p>${items.map((i) => (
    `<p><strong>${escapar(i.titulo)}</strong><br>${escapar(i.texto)}<br><a href="${escapar(i.enlace)}">${escapar(i.accion)}</a></p>`
  )).join('')}<p><a href="${escapar(url('/app/avisos'))}">${escapar(VER_TODOS[idioma].replace(/:$/, ''))}</a></p>`
    + `<p style="color:#6B6B6B;font-size:13px">${escapar(PIE[idioma])} <a href="${escapar(url('/app/ajustes'))}">${escapar(url('/app/ajustes'))}</a></p>`;
  return { para: usuario.email, asunto: ASUNTOS[idioma](avisos.length), texto, html };
}

// RF-41: los avisos abiertos que aún no se han mandado, salvo los tipos que el usuario ha
// quitado en Ajustes. Varios avisos del mismo usuario van en un solo email.
export async function enviarAvisosPorEmail({ enviar = enviarEmail } = {}) {
  const { rows } = await db.query(
    `SELECT u.nombre AS u_nombre, u.email AS u_email, u.idioma AS u_idioma, x.*
       FROM (${CON_FACTURA}) x
       JOIN usuarios u ON u.id = x.usuario_id
       LEFT JOIN ajustes aj ON aj.usuario_id = x.usuario_id
      WHERE x.estado = 'abierto' AND x.email_enviado_en IS NULL
        AND NOT (x.tipo = ANY(COALESCE(aj.avisos_sin_email, '{}')))
      ORDER BY x.usuario_id, x.creado_en, x.id`,
  );
  const porUsuario = new Map();
  for (const fila of rows) {
    if (!porUsuario.has(fila.usuario_id)) {
      porUsuario.set(fila.usuario_id, { usuario: { nombre: fila.u_nombre, email: fila.u_email, idioma: fila.u_idioma }, avisos: [] });
    }
    porUsuario.get(fila.usuario_id).avisos.push(deFila(fila));
  }

  let enviados = 0;
  for (const [usuarioId, { usuario, avisos }] of porUsuario) {
    try {
      await enviar(componerEmail(usuario, avisos));
    } catch (error) {
      // Si falla, se quedan sin marcar y se intenta en la siguiente vuelta.
      console.error(`[avisos] No se pudo mandar el email al usuario ${usuarioId}:`, error.message);
      continue;
    }
    await db.query('UPDATE avisos SET email_enviado_en = now() WHERE id = ANY($1) AND usuario_id = $2', [avisos.map((a) => a.id), usuarioId]);
    enviados += 1;
  }
  return enviados;
}
