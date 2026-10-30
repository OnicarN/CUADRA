// Tests de la suscripción y los pagos (#26). Stripe se sustituye por una versión falsa en memoria.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { arrancar, crearCliente } from './ayuda.js';
import { db } from '../src/core/db.js';
import { config } from '../src/config.js';
import { usarStripe } from '../src/modulos/suscripcion/stripe.js';
import { avisarFinDePrueba } from '../src/modulos/suscripcion/tareas.js';

let servidor;
let sesiones;      // sesiones de Checkout creadas: id -> datos
let canceladas;    // suscripciones canceladas ya
let alFinal;       // suscripciones con cancel_at_period_end
let numero = 0;    // los ids de Stripe son únicos siempre, no solo en cada test
const clavesStripe = { ...config.stripe };
const fin = Math.floor(Date.now() / 1000) + 30 * 86400;

before(async () => {
  servidor = await arrancar();
  usarStripe({
    crearCliente: async ({ usuarioId }) => `cus_${usuarioId}`,
    crearSesion: async (datos) => {
      numero += 1;
      const id = `cs_test_${numero}`;
      sesiones[id] = datos;
      return `https://checkout.stripe.com/c/pay/${id}`;
    },
    // Simula la sesión ya pagada tal y como la devuelve Stripe.
    leerSesion: async (id) => {
      const d = sesiones[id];
      const n = id.split('_').pop();
      const factura = { id: `in_${n}`, status: 'paid', amount_paid: d.line_items[0].price_data.unit_amount, currency: 'eur', hosted_invoice_url: `https://invoice.stripe.com/i/${n}`, status_transitions: { paid_at: fin - 30 * 86400 } };
      return {
        id, status: 'complete', payment_status: 'paid', client_reference_id: d.client_reference_id,
        customer: d.customer, metadata: d.metadata,
        subscription: d.mode === 'subscription' ? { id: `sub_${n}`, items: { data: [{ current_period_end: fin }] }, latest_invoice: factura } : null,
        invoice: d.mode === 'payment' ? factura : null,
      };
    },
    cancelarAlFinal: async (id, cancelar) => { alFinal[id] = cancelar; return { id, cancel_at_period_end: cancelar, items: { data: [{ current_period_end: fin }] } }; },
    cancelarYa: async (id) => { canceladas.push(id); },
    leerEvento: async (cuerpo, firma) => {
      if (firma !== 'firma-buena') throw new Error('firma');
      return JSON.parse(cuerpo.toString());
    },
  });
});
after(async () => {
  usarStripe(null);
  Object.assign(config.stripe, clavesStripe);
  await servidor.cerrar();
});
beforeEach(() => {
  sesiones = {}; canceladas = []; alFinal = {};
  config.stripe.secretKey = 'sk_test_prueba';
  config.stripe.webhookSecret = 'whsec_prueba';
});

let contador = 0;
async function nuevoUsuario({ prueba = false } = {}) {
  contador += 1;
  const cliente = crearCliente(servidor.url);
  const { datos } = await cliente.post('/api/auth/registro', { nombre: 'Prueba', email: `sus${contador}@prueba.es`, password: '12345678' });
  // Por defecto, ya sin prueba: así se ve el plan gratis.
  if (!prueba) await db.query("UPDATE suscripciones SET prueba_hasta = now() - interval '1 day' WHERE usuario_id = $1", [datos.id]);
  return { cliente, id: datos.id };
}

// Compra completa: crear la sesión, "pagar" y volver a Cuadra.
async function comprar(cliente, ruta, cuerpo) {
  const { estado, datos } = await cliente.post(ruta, cuerpo);
  assert.equal(estado, 200, JSON.stringify(datos));
  const sesion = datos.url.split('/').pop();
  const confirmado = await cliente.post('/api/suscripcion/confirmar', { sesion });
  assert.equal(confirmado.estado, 200);
  return sesion;
}

const webhook = (evento, firma = 'firma-buena') => fetch(`${servidor.url}/api/suscripcion/webhook`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': firma }, body: JSON.stringify(evento),
});

test('sin Stripe configurado, los botones explican que no hay pagos', async () => {
  const { cliente } = await nuevoUsuario();
  config.stripe.secretKey = '';
  const { estado, datos } = await cliente.post('/api/suscripcion/cambiar-plan', { plan: 'autonomo' });
  assert.equal(estado, 503);
  assert.equal(datos.detalles.codigo, 'pagos_no_configurados');
  assert.equal((await cliente.get('/api/suscripcion')).datos.pagosConfigurados, false);
});

test('pasar a Autónomo: Checkout, se activa al volver y cambia el límite (RF-58)', async () => {
  const { cliente, id } = await nuevoUsuario();
  assert.equal((await cliente.get('/api/suscripcion')).datos.plan, 'gratis');
  const sesion = await comprar(cliente, '/api/suscripcion/cambiar-plan', { plan: 'autonomo' });

  const datos = sesiones[sesion];
  assert.equal(datos.mode, 'subscription');
  assert.equal(datos.customer, `cus_${id}`);
  assert.equal(datos.line_items[0].price_data.unit_amount, 499);
  assert.match(datos.success_url, /\/app\/suscripcion\?pago=ok&sesion=\{CHECKOUT_SESSION_ID\}$/);

  const estado = (await cliente.get('/api/suscripcion')).datos;
  assert.equal(estado.plan, 'autonomo');
  assert.equal(estado.limite, 40);
  assert.equal(estado.planDePago, true);
  // Confirmar otra vez no duplica nada.
  await cliente.post('/api/suscripcion/confirmar', { sesion });
  const pagos = (await cliente.get('/api/suscripcion/pagos')).datos;
  assert.equal(pagos.length, 1);
  assert.equal(pagos[0].importe, 4.99);
  assert.match(pagos[0].url_factura, /invoice\.stripe\.com/);

  // Subir a Pro cancela la suscripción de Autónomo.
  await comprar(cliente, '/api/suscripcion/cambiar-plan', { plan: 'pro' });
  assert.equal((await cliente.get('/api/suscripcion')).datos.plan, 'pro');
  assert.equal(canceladas.length, 1);
  assert.match(canceladas[0], /^sub_/);
});

test('no se puede confirmar la sesión de pago de otro usuario', async () => {
  const a = await nuevoUsuario();
  const b = await nuevoUsuario();
  const { datos } = await a.cliente.post('/api/suscripcion/cambiar-plan', { plan: 'pro' });
  const sesion = datos.url.split('/').pop();
  assert.equal((await b.cliente.post('/api/suscripcion/confirmar', { sesion })).estado, 400);
  assert.equal((await b.cliente.get('/api/suscripcion')).datos.plan, 'gratis');
});

test('comprar 20 lecturas sube el límite y lee las facturas sin leer (RF-58)', async () => {
  const { cliente, id } = await nuevoUsuario();
  const { rows: [original] } = await db.query(
    "INSERT INTO originales (usuario_id, nombre_archivo, tipo_mime, tamano, contenido) VALUES ($1, 'a.pdf', 'application/pdf', 4, '\\x25504446') RETURNING id",
    [id],
  );
  await db.query("INSERT INTO facturas (usuario_id, estado, original_id) VALUES ($1, 'sin_leer', $2)", [id, original.id]);
  const sesion = await comprar(cliente, '/api/suscripcion/comprar-extra', { id: 'lecturas-20' });
  assert.equal(sesiones[sesion].mode, 'payment');
  assert.equal(sesiones[sesion].invoice_creation.enabled, true);
  assert.equal((await cliente.get('/api/suscripcion')).datos.limite, 5 + 20);
  // leerSinLeer la ha cogido (en los tests no hay IA: queda pendiente de leer).
  const { rows: [f] } = await db.query('SELECT estado FROM facturas WHERE usuario_id = $1', [id]);
  assert.equal(f.estado, 'pendiente');
});

test('función suelta: da acceso y se puede cancelar', async () => {
  const { cliente } = await nuevoUsuario();
  await comprar(cliente, '/api/suscripcion/comprar-extra', { id: 'calendario' });
  const estado = (await cliente.get('/api/suscripcion')).datos;
  assert.ok(estado.funciones.includes('calendario'));
  assert.equal(estado.funcionesSueltas[0].clave, 'calendario');
  assert.equal((await cliente.post('/api/suscripcion/comprar-extra', { id: 'calendario' })).estado, 400);
  assert.equal((await cliente.post('/api/suscripcion/cancelar', { funcion: 'calendario' })).estado, 200);
  assert.equal(Object.values(alFinal)[0], true);
});

test('cancelar: sigue con su plan hasta el final del periodo y luego pasa a gratis (RF-61)', async () => {
  const { cliente, id } = await nuevoUsuario();
  await comprar(cliente, '/api/suscripcion/cambiar-plan', { plan: 'autonomo' });
  await db.query("INSERT INTO facturas (usuario_id, estado, emisor) VALUES ($1, 'confirmada', 'Histórico')", [id]);

  const cancelado = (await cliente.post('/api/suscripcion/cancelar')).datos;
  assert.equal(cancelado.cancelarAlFinal, true);
  assert.equal(cancelado.plan, 'autonomo');
  assert.equal((await cliente.post('/api/suscripcion/reactivar')).datos.cancelarAlFinal, false);
  await cliente.post('/api/suscripcion/cancelar');

  // Al final del periodo Stripe borra la suscripción.
  const { rows: [s] } = await db.query('SELECT stripe_subscription_id FROM suscripciones WHERE usuario_id = $1', [id]);
  assert.equal((await webhook({ type: 'customer.subscription.deleted', data: { object: { id: s.stripe_subscription_id } } })).status, 200);
  const estado = (await cliente.get('/api/suscripcion')).datos;
  assert.equal(estado.plan, 'gratis');
  assert.equal(estado.planDePago, false);
  const { rows } = await db.query('SELECT emisor FROM facturas WHERE usuario_id = $1', [id]);
  assert.equal(rows[0].emisor, 'Histórico');
});

test('webhook: exige firma, activa el pago y guarda las renovaciones (RF-59)', async () => {
  const { cliente, id } = await nuevoUsuario();
  assert.equal((await webhook({ type: 'invoice.paid', data: { object: {} } }, 'firma-mala')).status, 400);

  const { datos } = await cliente.post('/api/suscripcion/cambiar-plan', { plan: 'pro' });
  const sesion = datos.url.split('/').pop();
  const subId = `sub_${sesion.split('_').pop()}`;
  assert.equal((await webhook({ type: 'checkout.session.completed', data: { object: { id: sesion } } })).status, 200);
  assert.equal((await cliente.get('/api/suscripcion')).datos.plan, 'pro');

  const renovacion = {
    id: 'in_renovacion', customer: `cus_${id}`, status: 'paid', amount_paid: 999, currency: 'eur',
    hosted_invoice_url: 'https://invoice.stripe.com/i/renovacion', lines: { data: [{ description: 'Cuadra · Plan Pro', period: { end: fin } }] },
    parent: { subscription_details: { subscription: subId } },
  };
  await webhook({ type: 'invoice.paid', data: { object: renovacion } });
  await webhook({ type: 'invoice.paid', data: { object: renovacion } }); // Stripe puede repetir eventos
  const pagos = (await cliente.get('/api/suscripcion/pagos')).datos;
  assert.deepEqual(pagos.map((p) => p.concepto).sort(), ['Cuadra · Plan Pro', 'Cuadra · Plan Pro']);
});

test('avisa por email una sola vez antes de que acabe la prueba (RF-60)', async () => {
  const { id } = await nuevoUsuario({ prueba: true });
  await db.query("UPDATE suscripciones SET prueba_hasta = now() + interval '2 days' WHERE usuario_id = $1", [id]);
  const original = console.log;
  const emails = [];
  console.log = (texto) => emails.push(String(texto));
  try {
    await avisarFinDePrueba();
    await avisarFinDePrueba();
  } finally {
    console.log = original;
  }
  assert.equal(emails.filter((e) => e.includes(`sus${contador}@prueba.es`)).length, 1);
});
