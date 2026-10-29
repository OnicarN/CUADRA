// Módulo calendario — /api/calendario
// Responsable: Dani (#16). Solo para planes con la función 'calendario'.
//
// GET    /                     estado de la conexión y ajustes                      RF-54, RF-56
// GET    /conectar             redirige al consentimiento de Google                 RF-54
// GET    /callback             vuelta de Google, guarda el refresh_token            RF-54
// DELETE /                     desconectar                                          RF-54
// PUT    /ajustes              { fechas_fiscales, dias_antelacion }                 RF-56
// GET    /sugerencias?factura=ID   eventos sugeridos para una factura               RF-55
// POST   /sugerencias/:facturaId/:eventoId  { aceptar: true|false }                RF-55
import { Router } from 'express';
import { requiereSesion } from '../../core/auth.js';
import { pendiente } from '../../core/errores.js';

const rutas = Router();
rutas.use(requiereSesion);

rutas.get('/', () => { throw pendiente('#16'); });
rutas.get('/conectar', () => { throw pendiente('#16'); });
rutas.get('/callback', () => { throw pendiente('#16'); });
rutas.delete('/', () => { throw pendiente('#16'); });
rutas.put('/ajustes', () => { throw pendiente('#16'); });
rutas.get('/sugerencias', (_req, res) => res.json([]));
rutas.post('/sugerencias/:facturaId/:eventoId', () => { throw pendiente('#16'); });

export default rutas;
