// Módulo suscripción — /api/suscripcion
// Responsable: Ana (#26).
//
// GET  /planes          (público) planes, extras y prueba          RF-02   (hecho)
// GET  /                plan actual, uso del mes y renovación      RF-57   (hecho, ampliable)
// POST /cambiar-plan    { plan } -> { url } de pago (Stripe)       RF-58   (pendiente)
// POST /comprar-extra   { id } -> { url } de pago                  RF-58   (pendiente)
// POST /cancelar                                                   RF-61   (pendiente)
// GET  /pagos           facturas emitidas por Cuadra               RF-59   (pendiente)
// POST /webhook         eventos de Stripe (usa req.cuerpoCrudo)    RF-59   (pendiente)
import { Router } from 'express';
import { requiereSesion } from '../../core/auth.js';
import { pendiente } from '../../core/errores.js';
import { PLANES, PAQUETES_LECTURAS, FUNCIONES_SUELTAS, DIAS_PRUEBA } from './planes.js';
import { obtenerUso } from './uso.js';

const rutas = Router();

rutas.get('/planes', (_req, res) => {
  res.json({ planes: PLANES, paquetesLecturas: PAQUETES_LECTURAS, funcionesSueltas: FUNCIONES_SUELTAS, diasPrueba: DIAS_PRUEBA });
});

rutas.get('/', requiereSesion, async (req, res) => {
  res.json(await obtenerUso(req.usuario.id));
});

rutas.post('/cambiar-plan', requiereSesion, () => { throw pendiente('#26'); });
rutas.post('/comprar-extra', requiereSesion, () => { throw pendiente('#26'); });
rutas.post('/cancelar', requiereSesion, () => { throw pendiente('#26'); });
rutas.get('/pagos', requiereSesion, () => { throw pendiente('#26'); });
rutas.post('/webhook', () => { throw pendiente('#26'); });

export default rutas;
