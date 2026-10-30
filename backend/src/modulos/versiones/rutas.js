// Módulo versiones — /api/versiones
// Responsable: Rodrigo (#50).
//
// GET  /           { actual, personal: { presupuesto_mensual } }
// PUT  /actual     { version: 'empresa' | 'personal' }   cambia la versión de arriba
// PUT  /personal   { presupuesto_mensual }               datos de la versión personal (Ajustes)
import { Router } from 'express';
import { requiereSesion } from '../../core/auth.js';
import { obtenerVersiones, cambiarVersion, guardarPersonal } from './servicio.js';

const rutas = Router();
rutas.use(requiereSesion);

rutas.get('/', async (req, res) => {
  res.json(await obtenerVersiones(req.usuario.id));
});

rutas.put('/actual', async (req, res) => {
  res.json(await cambiarVersion(req.usuario.id, req.body?.version));
});

rutas.put('/personal', async (req, res) => {
  res.json(await guardarPersonal(req.usuario.id, req.body));
});

export default rutas;
