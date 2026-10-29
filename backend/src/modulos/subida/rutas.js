// Módulo subida — /api/subida
// Responsable: Dani (#12).
//
// POST /          multipart: archivos[] (uno o varios), origen = subida|camara|compartir   RF-13 a RF-17, RF-23
//                 -> [{ id, estado }]  una factura por archivo
//                 409 { error, codigo: 'perfil_incompleto' } si no hay perfil fiscal (RF-10)
import { Router } from 'express';
import { requiereSesion } from '../../core/auth.js';
import { pendiente } from '../../core/errores.js';

const rutas = Router();
rutas.use(requiereSesion);

rutas.post('/', () => { throw pendiente('#12'); });

export default rutas;
