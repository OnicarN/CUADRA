// Módulo perfil — /api/perfil
// Responsable: Ana (#24).
//
// GET  /                       perfil fiscal o null                   RF-10   (hecho)
// PUT  /                       { nif, direccion, actividad, regimen_iva, email_gestoria }  RF-10..12 (pendiente)
// GET  /actividades            actividades y régimen de IVA propuesto RF-11   (pendiente)
// GET  /emails-confianza                                              RF-19   (pendiente)
// POST /emails-confianza       { email }                              RF-19   (pendiente)
// DELETE /emails-confianza/:id                                        RF-19   (pendiente)
// GET  /ajustes                días de aviso, avisos sin email        RF-41, RF-42 (hecho)
// PUT  /ajustes                                                       RF-41, RF-42 (pendiente)
import { Router } from 'express';
import { requiereSesion } from '../../core/auth.js';
import { pendiente } from '../../core/errores.js';
import { obtenerPerfil, obtenerAjustes } from './servicio.js';

const rutas = Router();
rutas.use(requiereSesion);

rutas.get('/', async (req, res) => {
  res.json(await obtenerPerfil(req.usuario.id));
});

rutas.put('/', () => { throw pendiente('#24'); });
rutas.get('/actividades', () => { throw pendiente('#24'); });
rutas.get('/emails-confianza', () => { throw pendiente('#24'); });
rutas.post('/emails-confianza', () => { throw pendiente('#24'); });
rutas.delete('/emails-confianza/:id', () => { throw pendiente('#24'); });

rutas.get('/ajustes', async (req, res) => {
  res.json(await obtenerAjustes(req.usuario.id));
});

rutas.put('/ajustes', () => { throw pendiente('#24'); });

export default rutas;
