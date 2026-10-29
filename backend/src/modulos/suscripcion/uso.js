// Cuánto lleva gastado el usuario de su plan este mes y qué funciones tiene.
// Lo usan otros módulos:
//   const { restantes } = await obtenerUso(usuarioId);     // subida (RF-23)
//   if (!(await tieneFuncion(usuarioId, 'informes'))) ...   // exportación, calendario
// Responsable: Ana (#26). Si cambias lo que devuelve, avisa a Dani y Rodrigo.
import { db } from '../../core/db.js';
import { planPorId, PLAN_PRUEBA } from './planes.js';

export async function obtenerUso(usuarioId) {
  const { rows } = await db.query(
    `SELECT s.*,
            (s.estado = 'prueba' AND s.prueba_hasta > now()) AS en_prueba,
            (SELECT count(*) FROM facturas f
              WHERE f.usuario_id = s.usuario_id AND f.leida_en >= date_trunc('month', now())) AS usadas,
            (SELECT COALESCE(sum(e.cantidad), 0) FROM extras e
              WHERE e.usuario_id = s.usuario_id AND e.tipo = 'lecturas'
                AND e.creado_en >= date_trunc('month', now())) AS lecturas_extra,
            (SELECT COALESCE(array_agg(e.clave), '{}') FROM extras e
              WHERE e.usuario_id = s.usuario_id AND e.tipo = 'funcion'
                AND (e.valido_hasta IS NULL OR e.valido_hasta > now())) AS funciones_extra,
            (date_trunc('month', now()) + interval '1 month') AS renovacion
       FROM suscripciones s WHERE s.usuario_id = $1`,
    [usuarioId],
  );
  const s = rows[0];
  if (!s) throw new Error(`El usuario ${usuarioId} no tiene suscripción`);

  const caducada = s.estado === 'cancelada' && s.periodo_fin && new Date(s.periodo_fin) < new Date();
  const plan = planPorId(s.en_prueba ? PLAN_PRUEBA : caducada ? 'gratis' : s.plan);
  const limite = plan.facturasMes + s.lecturas_extra;

  return {
    plan: plan.id,
    estado: s.estado,
    enPrueba: s.en_prueba,
    pruebaHasta: s.prueba_hasta,
    limite,
    usadas: s.usadas,
    restantes: Math.max(0, limite - s.usadas),
    renovacion: s.renovacion,
    funciones: [...new Set([...plan.funciones, ...s.funciones_extra])],
  };
}

export async function tieneFuncion(usuarioId, funcion) {
  const { funciones } = await obtenerUso(usuarioId);
  return funciones.includes(funcion);
}
