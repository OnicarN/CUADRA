// Módulo correo — /api/correo
// Responsable: Dani (#14).
//
// POST /entrante     webhook del proveedor de correo entrante                 RF-18 a RF-21
//                    Comprueba CORREO_WEBHOOK_SECRETO, busca al usuario por alias, comprueba el
//                    remitente (su email o emails_confianza), crea una factura por adjunto y,
//                    si no hay adjuntos, un PDF con el texto del correo (origen 'correo_texto').
// POST /simular      (solo en desarrollo) simula un correo entrante para probar sin proveedor
import { Router } from 'express';
import { pendiente } from '../../core/errores.js';

const rutas = Router();

rutas.post('/entrante', () => { throw pendiente('#14'); });
rutas.post('/simular', () => { throw pendiente('#14'); });

export default rutas;
