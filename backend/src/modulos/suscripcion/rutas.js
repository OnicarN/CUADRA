// Módulo suscripción — /api/suscripcion
// Responsable: Dani (#26, antes Ana). La lógica de los pagos está en pagos.js.
//
// GET  /planes          (público) planes, extras y prueba                         RF-02
// GET  /                plan actual, uso del mes, renovación y estado del pago      RF-57
// POST /cambiar-plan    { plan } -> { url } de Stripe Checkout                     RF-58
// POST /comprar-extra   { id } -> { url } (paquete de lecturas o función suelta)    RF-58
// POST /confirmar       { sesion } al volver de Stripe: activa lo pagado           RF-58
// POST /cancelar        { funcion? } cancela al final del periodo pagado           RF-61
// POST /reactivar       deshace la cancelación del plan                            RF-61
// GET  /pagos           facturas emitidas por Cuadra                               RF-59
// POST /webhook         eventos de Stripe (firma con req.cuerpoCrudo)              RF-59
//
// Configuración (modo prueba): STRIPE_SECRET_KEY=sk_test_... y, para el webhook,
// STRIPE_WEBHOOK_SECRET=whsec_... con el endpoint URL_PUBLICA/api/suscripcion/webhook y los eventos
// checkout.session.completed, invoice.paid, customer.subscription.updated y customer.subscription.deleted.
import { Router } from 'express';
import { config } from '../../config.js';
import { requiereSesion } from '../../core/auth.js';
import { peticionIncorrecta, ErrorHttp } from '../../core/errores.js';
import { PLANES, PAQUETES_LECTURAS, FUNCIONES_SUELTAS, DIAS_PRUEBA } from './planes.js';
import {
  estadoSuscripcion, iniciarPago, confirmarSesion, procesarEvento, cambiarCancelacion, listarPagos,
} from './pagos.js';
import { stripe, stripeConfigurado } from './stripe.js';

const rutas = Router();

rutas.get('/planes', (_req, res) => {
  res.json({ planes: PLANES, paquetesLecturas: PAQUETES_LECTURAS, funcionesSueltas: FUNCIONES_SUELTAS, diasPrueba: DIAS_PRUEBA });
});

rutas.get('/', requiereSesion, async (req, res) => {
  res.json(await estadoSuscripcion(req.usuario.id));
});

rutas.post('/cambiar-plan', requiereSesion, async (req, res) => {
  res.json({ url: await iniciarPago(req.usuario.id, { tipo: 'plan', clave: String(req.body?.plan || '') }) });
});

rutas.post('/comprar-extra', requiereSesion, async (req, res) => {
  const id = String(req.body?.id || '');
  const tipo = PAQUETES_LECTURAS.some((p) => p.id === id) ? 'lecturas' : 'funcion';
  res.json({ url: await iniciarPago(req.usuario.id, { tipo, clave: id }) });
});

rutas.post('/confirmar', requiereSesion, async (req, res) => {
  res.json({ aplicado: await confirmarSesion(req.usuario.id, req.body?.sesion) });
});

rutas.post('/cancelar', requiereSesion, async (req, res) => {
  const funcion = req.body?.funcion ? String(req.body.funcion) : null;
  if (funcion && !FUNCIONES_SUELTAS.some((f) => f.id === funcion)) throw peticionIncorrecta('Esa función no existe');
  await cambiarCancelacion(req.usuario.id, { cancelar: true, funcion });
  res.json(await estadoSuscripcion(req.usuario.id));
});

rutas.post('/reactivar', requiereSesion, async (req, res) => {
  await cambiarCancelacion(req.usuario.id, { cancelar: false });
  res.json(await estadoSuscripcion(req.usuario.id));
});

rutas.get('/pagos', requiereSesion, async (req, res) => {
  res.json(await listarPagos(req.usuario.id));
});

// Sin sesión: lo llama Stripe. Solo se acepta si la firma es válida.
rutas.post('/webhook', async (req, res) => {
  if (!stripeConfigurado() || !config.stripe.webhookSecret) throw new ErrorHttp(503, 'Webhook de Stripe no configurado');
  let evento;
  try {
    evento = await stripe.leerEvento(req.cuerpoCrudo, req.get('stripe-signature'));
  } catch {
    throw peticionIncorrecta('Firma de Stripe no válida');
  }
  await procesarEvento(evento);
  res.json({ recibido: true });
});

export default rutas;
