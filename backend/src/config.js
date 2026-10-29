// Configuración leída de las variables de entorno (ver backend/.env.example).
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const config = {
  puerto: Number(process.env.PORT) || 3000,
  produccion: process.env.NODE_ENV === 'production',
  // node --test pone NODE_TEST_CONTEXT en los procesos de los tests.
  pruebas: process.env.NODE_ENV === 'test' || Boolean(process.env.NODE_TEST_CONTEXT),
  urlPublica: process.env.URL_PUBLICA || 'http://localhost:3000',

  databaseUrl: process.env.DATABASE_URL || '',
  carpetaDatos: path.join(raiz, '.data'),
  carpetaFrontend: path.resolve(raiz, '..', 'frontend'),
  carpetaMigraciones: path.join(raiz, 'db', 'migraciones'),

  jwtSecreto: process.env.JWT_SECRETO || 'solo-para-desarrollo',

  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  modeloIa: process.env.MODELO_IA || 'claude-opus-5-5',

  smtp: {
    host: process.env.SMTP_HOST || '',
    puerto: Number(process.env.SMTP_PUERTO) || 587,
    usuario: process.env.SMTP_USUARIO || '',
    contrasena: process.env.SMTP_CONTRASENA || '',
  },
  emailRemitente: process.env.EMAIL_REMITENTE || 'Cuadra <hola@cuadra.app>',

  correoDominio: process.env.CORREO_DOMINIO || 'facturas.cuadra.app',
  correoWebhookSecreto: process.env.CORREO_WEBHOOK_SECRETO || '',

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },
};
