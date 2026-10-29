// Módulo exportación — /api/exportacion
// Responsable: Ana (#25). Solo facturas confirmadas (RF-51).
//
// GET  /excel     ?desde&hasta&categorias=1,2        descarga .xlsx                RF-49 a RF-51
// GET  /informe   ?anio&trimestre                    descarga el PDF trimestral    RF-52
// POST /enviar    { tipo: 'excel'|'informe', ... }   lo envía a la gestoría        RF-53
// GET  /todo      Excel completo + ZIP con todos los originales (antes de la baja) RF-62
import { Router } from 'express';
import { requiereSesion } from '../../core/auth.js';
import { pendiente } from '../../core/errores.js';

const rutas = Router();
rutas.use(requiereSesion);

rutas.get('/excel', () => { throw pendiente('#25'); });
rutas.get('/informe', () => { throw pendiente('#25'); });
rutas.post('/enviar', () => { throw pendiente('#25'); });
rutas.get('/todo', () => { throw pendiente('#27'); });

export default rutas;
