// Módulo perfil — /api/perfil
// Responsable: Ana (#24).
//
// GET  /                       perfil fiscal o null                   RF-10   (hecho)
// PUT  /                       { nif, direccion, actividad, regimen_iva, email_gestoria }  RF-10..12 (hecho)
// GET  /actividades            actividades y régimen de IVA propuesto RF-11   (hecho)
// GET  /emails-confianza                                              RF-19   (hecho)
// POST /emails-confianza       { email }                              RF-19   (hecho)
// DELETE /emails-confianza/:id                                        RF-19   (hecho)
// GET  /ajustes                días de aviso, avisos sin email        RF-41, RF-42 (hecho)
// PUT  /ajustes                { dias_aviso_pendiente?, dias_aviso_trimestre?, avisos_sin_email? }  RF-41, RF-42 (hecho)
import { Router } from 'express';
import { requiereSesion } from '../../core/auth.js';
import { TIPOS_AVISO } from '../../core/avisos.js';
import {
  obtenerPerfil, obtenerAjustes, guardarPerfil, guardarAjustes, ACTIVIDADES, REGIMENES_IVA,
  listarEmailsConfianza, anadirEmailConfianza, borrarEmailConfianza,
} from './servicio.js';

const rutas = Router();
rutas.use(requiereSesion);

rutas.get('/', async (req, res) => {
  res.json(await obtenerPerfil(req.usuario.id));
});

rutas.put('/', async (req, res) => {
  res.json(await guardarPerfil(req.usuario.id, req.body));
});

rutas.get('/actividades', (_req, res) => {
  res.json({ actividades: ACTIVIDADES, regimenes: REGIMENES_IVA });
});

rutas.get('/emails-confianza', async (req, res) => {
  res.json(await listarEmailsConfianza(req.usuario.id));
});

rutas.post('/emails-confianza', async (req, res) => {
  res.status(201).json(await anadirEmailConfianza(req.usuario.id, req.body?.email));
});

rutas.delete('/emails-confianza/:id', async (req, res) => {
  await borrarEmailConfianza(req.usuario.id, req.params.id);
  res.status(204).end();
});

rutas.get('/ajustes', async (req, res) => {
  res.json({ ...(await obtenerAjustes(req.usuario.id)), tipos_aviso: Object.values(TIPOS_AVISO) });
});

rutas.put('/ajustes', async (req, res) => {
  const ajustes = await guardarAjustes(req.usuario.id, req.body);
  res.json({ ...ajustes, tipos_aviso: Object.values(TIPOS_AVISO) });
});

export default rutas;
