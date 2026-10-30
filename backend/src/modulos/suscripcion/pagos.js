// Pagos con Stripe: cambiar de plan, comprar extras, cancelar y guardar las facturas (RF-58 a RF-61).
// Responsable: Dani (#26).
//
// Cómo encaja:
//   1. iniciarPago() crea una sesión de Stripe Checkout y el usuario paga en la página de Stripe.
//   2. Stripe le devuelve a /app/suscripcion?pago=ok&sesion=ID. La pantalla llama a POST /confirmar
//      y aplicarSesion() activa lo comprado. Así funciona también en local, sin webhooks.
//   3. El webhook (procesarEvento) hace lo mismo y además recoge las renovaciones de cada mes,
//      las cancelaciones y las facturas. Todo es idempotente: aplicar dos veces no duplica nada.
import { db } from '../../core/db.js';
import { config } from '../../config.js';
import { peticionIncorrecta, ErrorHttp } from '../../core/errores.js';
import { leerSinLeer } from '../lectura/servicio.js';
import { PLANES, PAQUETES_LECTURAS, FUNCIONES_SUELTAS, planPorId } from './planes.js';
import { obtenerUso } from './uso.js';
import { stripe, stripeConfigurado } from './stripe.js';

const NOMBRES_PLAN = { gratis: 'Gratis', autonomo: 'Autónomo', pro: 'Pro' };
const NOMBRES_FUNCION = { informes: 'Informe trimestral', calendario: 'Google Calendar', gestoria: 'Envío a la gestoría' };

const centimos = (euros) => Math.round(Number(euros) * 100);
const idDe = (valor) => (typeof valor === 'string' ? valor : valor?.id ?? null);
const fechaDe = (segundos) => (segundos ? new Date(segundos * 1000).toISOString() : null);

// Fin del periodo pagado de una suscripción (en las versiones nuevas de la API está en cada línea).
const finPeriodo = (sub) => fechaDe(sub?.current_period_end ?? sub?.items?.data?.[0]?.current_period_end);

function concepto(tipo, clave) {
  if (tipo === 'plan') return `Cuadra · Plan ${NOMBRES_PLAN[clave] || clave}`;
  if (tipo === 'lecturas') return `Cuadra · ${PAQUETES_LECTURAS.find((p) => p.id === clave)?.lecturas ?? ''} lecturas extra`;
  return `Cuadra · ${NOMBRES_FUNCION[clave] || clave}`;
}

async function suscripcionDe(usuarioId, conexion = db) {
  const { rows: [s] } = await conexion.query('SELECT * FROM suscripciones WHERE usuario_id = $1', [usuarioId]);
  return s;
}

export function noConfigurado() {
  return new ErrorHttp(503, 'Los pagos todavía no están configurados en Cuadra', { codigo: 'pagos_no_configurados' });
}

// Estado del plan para la pantalla: lo de obtenerUso() más lo del pago.
export async function estadoSuscripcion(usuarioId) {
  const uso = await obtenerUso(usuarioId);
  const s = await suscripcionDe(usuarioId);
  const { rows: sueltas } = await db.query(
    `SELECT clave, valido_hasta, stripe_ref IS NOT NULL AS de_pago FROM extras
     WHERE usuario_id = $1 AND tipo = 'funcion' AND (valido_hasta IS NULL OR valido_hasta > now())
     ORDER BY creado_en`,
    [usuarioId],
  );
  return {
    ...uso,
    precioMes: planPorId(uso.plan).precioMes,
    planDePago: Boolean(s.stripe_subscription_id),
    cancelarAlFinal: s.cancelar_al_final,
    periodoFin: s.periodo_fin,
    funcionesSueltas: sueltas,
    pagosConfigurados: stripeConfigurado(),
  };
}

// ---- 1. Empezar a pagar ----

export async function iniciarPago(usuarioId, { tipo, clave }) {
  let linea;
  let modo = 'subscription';
  const uso = await obtenerUso(usuarioId);
  const s = await suscripcionDe(usuarioId);

  if (tipo === 'plan') {
    const plan = PLANES.find((p) => p.id === clave);
    if (!plan) throw peticionIncorrecta('Ese plan no existe');
    if (plan.precioMes === 0) throw peticionIncorrecta('Para pasar al plan gratis cancela tu plan actual');
    if (s.stripe_subscription_id && s.plan === clave && !s.cancelar_al_final) throw peticionIncorrecta('Ya tienes este plan');
    linea = { importe: plan.precioMes, mensual: true };
  } else if (tipo === 'lecturas') {
    const paquete = PAQUETES_LECTURAS.find((p) => p.id === clave);
    if (!paquete) throw peticionIncorrecta('Ese paquete no existe');
    linea = { importe: paquete.precio, mensual: false };
    modo = 'payment';
  } else if (tipo === 'funcion') {
    const funcion = FUNCIONES_SUELTAS.find((f) => f.id === clave);
    if (!funcion) throw peticionIncorrecta('Esa función no existe');
    if (uso.funciones.includes(clave) && !uso.enPrueba) throw peticionIncorrecta('Ya tienes esta función');
    linea = { importe: funcion.precioMes, mensual: true };
  } else {
    throw peticionIncorrecta('Tipo de compra no válido');
  }
  if (!stripeConfigurado()) throw noConfigurado();

  // Un cliente de Stripe por usuario: así las renovaciones y facturas llegan siempre a la misma cuenta.
  let clienteId = s.stripe_customer_id;
  if (!clienteId) {
    const { rows: [u] } = await db.query('SELECT email, nombre FROM usuarios WHERE id = $1', [usuarioId]);
    clienteId = await stripe.crearCliente({ email: u.email, nombre: u.nombre, usuarioId });
    await db.query('UPDATE suscripciones SET stripe_customer_id = $2 WHERE usuario_id = $1', [usuarioId, clienteId]);
  }
  const { rows: [{ idioma }] } = await db.query('SELECT idioma FROM usuarios WHERE id = $1', [usuarioId]);

  const metadata = { usuario_id: String(usuarioId), tipo, clave };
  const datos = {
    mode: modo,
    customer: clienteId,
    client_reference_id: String(usuarioId),
    locale: idioma === 'en' ? 'en' : 'es',
    metadata,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'eur',
        unit_amount: centimos(linea.importe),
        product_data: { name: concepto(tipo, clave) },
        ...(linea.mensual ? { recurring: { interval: 'month' } } : {}),
      },
    }],
    success_url: `${config.urlPublica}/app/suscripcion?pago=ok&sesion={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.urlPublica}/app/suscripcion?pago=cancelado`,
  };
  if (modo === 'subscription') datos.subscription_data = { metadata };
  else datos.invoice_creation = { enabled: true, invoice_data: { metadata } }; // para tener factura (RF-59)
  return stripe.crearSesion(datos);
}

// ---- 2. Activar lo pagado ----

async function registrarFactura(usuarioId, factura, texto) {
  if (!factura || typeof factura !== 'object' || factura.status !== 'paid') return;
  await db.query(
    `INSERT INTO pagos (usuario_id, concepto, importe, moneda, url_factura, stripe_ref, pagado_en)
     SELECT $1, $2, $3, $4, $5, $6, COALESCE($7::text::timestamptz, now())
     WHERE NOT EXISTS (SELECT 1 FROM pagos WHERE stripe_ref = $6)`,
    [
      usuarioId,
      texto || factura.lines?.data?.[0]?.description || 'Cuadra',
      (factura.amount_paid ?? 0) / 100,
      String(factura.currency || 'eur').toUpperCase(),
      factura.hosted_invoice_url || factura.invoice_pdf || null,
      factura.id,
      fechaDe(factura.status_transitions?.paid_at ?? factura.created),
    ],
  );
}

// Devuelve el usuario al que se ha aplicado, o null si la sesión no está pagada.
export async function aplicarSesion(sesion) {
  if (sesion.status !== 'complete' || !['paid', 'no_payment_required'].includes(sesion.payment_status)) return null;
  const usuarioId = Number(sesion.client_reference_id || sesion.metadata?.usuario_id);
  const { tipo, clave } = sesion.metadata || {};
  if (!usuarioId || !tipo) return null;

  if (tipo === 'plan') {
    const subId = idDe(sesion.subscription);
    const s = await suscripcionDe(usuarioId);
    if (s.stripe_subscription_id !== subId) {
      await db.query(
        `UPDATE suscripciones SET plan = $2, estado = 'activa', stripe_subscription_id = $3, stripe_customer_id = $4,
           periodo_inicio = now(), periodo_fin = $5::text::timestamptz, cancelar_al_final = false
         WHERE usuario_id = $1`,
        [usuarioId, clave, subId, idDe(sesion.customer), finPeriodo(sesion.subscription)],
      );
      // Si cambia de plan, el anterior deja de cobrarse.
      if (s.stripe_subscription_id) await stripe.cancelarYa(s.stripe_subscription_id);
    }
  } else if (tipo === 'lecturas') {
    const paquete = PAQUETES_LECTURAS.find((p) => p.id === clave);
    const { rowCount } = await db.query(
      `INSERT INTO extras (usuario_id, tipo, clave, cantidad, stripe_ref)
       SELECT $1, 'lecturas', $2, $3, $4 WHERE NOT EXISTS (SELECT 1 FROM extras WHERE stripe_ref = $4)`,
      [usuarioId, clave, paquete?.lecturas ?? 0, sesion.id],
    );
    // Con las lecturas nuevas, se leen las facturas que esperaban.
    if (rowCount) await leerSinLeer(usuarioId).catch((e) => console.error('Error al leer tras comprar lecturas:', e.message));
  } else if (tipo === 'funcion') {
    const subId = idDe(sesion.subscription);
    const hasta = finPeriodo(sesion.subscription) || new Date(Date.now() + 31 * 86400000).toISOString();
    await db.query(
      `INSERT INTO extras (usuario_id, tipo, clave, valido_hasta, stripe_ref)
       SELECT $1, 'funcion', $2, $3::text::timestamptz, $4 WHERE NOT EXISTS (SELECT 1 FROM extras WHERE stripe_ref = $4)`,
      [usuarioId, clave, hasta, subId],
    );
  }

  const factura = sesion.invoice || sesion.subscription?.latest_invoice;
  await registrarFactura(usuarioId, factura, concepto(tipo, clave));
  return usuarioId;
}

// POST /confirmar: al volver de Stripe. Solo vale para sesiones del propio usuario.
export async function confirmarSesion(usuarioId, sesionId) {
  if (!stripeConfigurado()) throw noConfigurado();
  if (!/^cs_[A-Za-z0-9_]+$/.test(String(sesionId || ''))) throw peticionIncorrecta('Sesión de pago no válida');
  const sesion = await stripe.leerSesion(sesionId);
  if (Number(sesion.client_reference_id) !== usuarioId) throw peticionIncorrecta('Sesión de pago no válida');
  return Boolean(await aplicarSesion(sesion));
}

// ---- 3. Webhook de Stripe ----

const usuarioDelCliente = async (clienteId) =>
  (await db.query('SELECT usuario_id FROM suscripciones WHERE stripe_customer_id = $1', [clienteId])).rows[0]?.usuario_id;

export async function procesarEvento(evento) {
  const objeto = evento.data?.object || {};
  switch (evento.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      await aplicarSesion(await stripe.leerSesion(objeto.id));
      break;

    case 'invoice.paid': {
      const usuarioId = await usuarioDelCliente(idDe(objeto.customer));
      if (!usuarioId) break;
      const subId = idDe(objeto.subscription ?? objeto.parent?.subscription_details?.subscription);
      // Renovación de una función suelta: sigue activa hasta el final del nuevo periodo (+1 día de margen).
      const finLinea = objeto.lines?.data?.[0]?.period?.end;
      if (subId && finLinea) {
        await db.query(
          "UPDATE extras SET valido_hasta = to_timestamp($2) + interval '1 day' WHERE stripe_ref = $1 AND tipo = 'funcion'",
          [subId, finLinea],
        );
      }
      await registrarFactura(usuarioId, objeto);
      break;
    }

    case 'customer.subscription.updated':
      await db.query(
        `UPDATE suscripciones SET cancelar_al_final = $2, periodo_fin = $3::text::timestamptz
         WHERE stripe_subscription_id = $1`,
        [objeto.id, Boolean(objeto.cancel_at_period_end), finPeriodo(objeto)],
      );
      break;

    case 'customer.subscription.deleted':
      // Plan: vuelve a gratis y conserva todo su histórico (RF-61).
      await db.query(
        `UPDATE suscripciones SET plan = 'gratis', estado = 'cancelada', periodo_fin = now(),
           cancelar_al_final = false, stripe_subscription_id = NULL
         WHERE stripe_subscription_id = $1`,
        [objeto.id],
      );
      await db.query("UPDATE extras SET valido_hasta = now() WHERE stripe_ref = $1 AND tipo = 'funcion'", [objeto.id]);
      break;

    default:
      break; // el resto de eventos no nos interesan
  }
}

// ---- Cancelar (RF-61) ----

// Sin funcion: el plan. Con funcion: esa función suelta. Se cancela al final del periodo ya pagado.
export async function cambiarCancelacion(usuarioId, { cancelar, funcion = null }) {
  let subId;
  if (funcion) {
    const { rows: [extra] } = await db.query(
      `SELECT stripe_ref FROM extras WHERE usuario_id = $1 AND tipo = 'funcion' AND clave = $2
         AND stripe_ref IS NOT NULL AND (valido_hasta IS NULL OR valido_hasta > now())
       ORDER BY creado_en DESC LIMIT 1`,
      [usuarioId, funcion],
    );
    subId = extra?.stripe_ref;
    if (!subId) throw peticionIncorrecta('No tienes esa función contratada');
  } else {
    subId = (await suscripcionDe(usuarioId)).stripe_subscription_id;
    if (!subId) throw peticionIncorrecta('No tienes un plan de pago que cancelar');
  }
  if (!stripeConfigurado()) throw noConfigurado();
  const sub = await stripe.cancelarAlFinal(subId, cancelar);
  if (funcion) {
    // Vale hasta el final de lo pagado; si sigue, la renovación (invoice.paid) lo alarga.
    await db.query("UPDATE extras SET valido_hasta = $2::text::timestamptz WHERE stripe_ref = $1 AND tipo = 'funcion'",
      [subId, finPeriodo(sub)]);
  } else {
    await db.query(
      'UPDATE suscripciones SET cancelar_al_final = $2, periodo_fin = $3::text::timestamptz WHERE usuario_id = $1',
      [usuarioId, cancelar, finPeriodo(sub)],
    );
  }
}

export async function listarPagos(usuarioId) {
  const { rows } = await db.query(
    'SELECT id, concepto, importe, moneda, url_factura, pagado_en FROM pagos WHERE usuario_id = $1 ORDER BY pagado_en DESC',
    [usuarioId],
  );
  return rows;
}
