// Llamadas a Stripe (modo prueba con STRIPE_SECRET_KEY = sk_test_...). Responsable: Dani (#26).
// Solo se usan unas pocas: clientes, Checkout, suscripciones y la firma de los webhooks.
// Los tests cambian estas llamadas por unas falsas con usarStripe({ ... }).
import { config } from '../../config.js';

let sdk = null;
async function cliente() {
  if (!sdk) {
    const { default: Stripe } = await import('stripe');
    sdk = new Stripe(config.stripe.secretKey);
  }
  return sdk;
}

export const stripeConfigurado = () => Boolean(config.stripe.secretKey);

const reales = {
  async crearCliente({ email, nombre, usuarioId }) {
    const c = await (await cliente()).customers.create({ email, name: nombre, metadata: { usuario_id: String(usuarioId) } });
    return c.id;
  },

  // Sesión de Stripe Checkout. Devuelve la URL a la que mandar al usuario.
  async crearSesion(datos) {
    const sesion = await (await cliente()).checkout.sessions.create(datos);
    return sesion.url;
  },

  // La sesión ya pagada, con la suscripción y la factura desplegadas.
  async leerSesion(id) {
    return (await cliente()).checkout.sessions.retrieve(id, { expand: ['invoice', 'subscription.latest_invoice'] });
  },

  async leerSuscripcion(id) {
    return (await cliente()).subscriptions.retrieve(id);
  },

  async cancelarAlFinal(id, cancelar) {
    return (await cliente()).subscriptions.update(id, { cancel_at_period_end: cancelar });
  },

  async cancelarYa(id) {
    try {
      await (await cliente()).subscriptions.cancel(id);
    } catch (error) {
      if (error.code !== 'resource_missing') throw error; // ya no existía
    }
  },

  // Comprueba la firma del webhook y devuelve el evento. Lanza un error si no es de Stripe.
  async leerEvento(cuerpoCrudo, firma) {
    return (await cliente()).webhooks.constructEvent(cuerpoCrudo, firma, config.stripe.webhookSecret);
  },
};

export const stripe = { ...reales };

export function usarStripe(falso) {
  Object.assign(stripe, falso || reales);
}
