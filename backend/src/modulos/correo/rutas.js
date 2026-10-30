// Módulo correo — /api/correo
// Responsable: Dani (#14). RF-18 a RF-21. La lógica está en servicio.js.
//
// POST /entrante   webhook del proveedor de correo entrante. Cabecera x-cuadra-secreto = CORREO_WEBHOOK_SECRETO.
//                  multipart/form-data: para, de, asunto, texto y los archivos en "adjuntos".
//                  -> 200 { aceptado, motivo?, facturas: [ids] }
// POST /simular    igual, sin secreto, solo fuera de producción: para probar en local sin proveedor.
//
// Cómo se conecta el correo de verdad (Cloudflare Email Routing, gratis):
//   1. El dominio de CORREO_DOMINIO en Cloudflare, con Email Routing activado.
//   2. Un Email Worker con el código de cloudflare-worker.js (en esta carpeta), con las variables
//      CUADRA_URL (la URL de Render) y CUADRA_SECRETO (el mismo valor que CORREO_WEBHOOK_SECRETO).
//   3. En Email Routing, regla "catch-all" del dominio -> "Send to a Worker" -> ese worker.
// El worker lee el correo, quita las imágenes incrustadas (logos, firmas) y lo manda aquí.
import crypto from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import { config } from '../../config.js';
import { ErrorHttp, noEncontrado } from '../../core/errores.js';
import { TAMANO_MAXIMO } from '../subida/servicio.js';
import { procesarCorreo } from './servicio.js';

const recibir = multer({ storage: multer.memoryStorage(), limits: { fileSize: TAMANO_MAXIMO, files: 20 } });
const rutas = Router();

function secretoCorrecto(recibido) {
  const esperado = Buffer.from(config.correoWebhookSecreto);
  const dado = Buffer.from(String(recibido || ''));
  return esperado.length > 0 && esperado.length === dado.length && crypto.timingSafeEqual(esperado, dado);
}

async function atender(req, res) {
  const adjuntos = (req.files || []).map((archivo) => ({
    // multer entrega el nombre en latin1; lo pasamos a UTF-8.
    nombre: Buffer.from(archivo.originalname, 'latin1').toString('utf8'),
    buffer: archivo.buffer,
  }));
  const { para, de, asunto, texto } = req.body;
  res.json(await procesarCorreo({ para, de, asunto, texto, adjuntos }));
}

rutas.post('/entrante', (req, _res, next) => {
  if (!config.correoWebhookSecreto) throw new ErrorHttp(503, 'El correo entrante no está configurado');
  if (!secretoCorrecto(req.get('x-cuadra-secreto'))) throw new ErrorHttp(401, 'Secreto no válido');
  next();
}, recibir.array('adjuntos', 20), atender);

rutas.post('/simular', (_req, _res, next) => {
  if (config.produccion) throw noEncontrado('Ruta no encontrada');
  next();
}, recibir.array('adjuntos', 20), atender);

export default rutas;
