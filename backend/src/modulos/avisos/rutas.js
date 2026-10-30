// Módulo avisos — /api/avisos
// Responsable: Rodrigo (#21).
//
// GET  /              ?estado=abierto|cerrado  lista con el texto de cada aviso   RF-40
// GET  /contador      { abiertos }  (lo usa la cabecera de la web)            RF-40 (hecho)
// POST /:id/cerrar                         { abiertos }  el usuario lo descarta RF-40
import { Router } from 'express';
import { db } from '../../core/db.js';
import { requiereSesion } from '../../core/auth.js';
import { peticionIncorrecta } from '../../core/errores.js';
import { listarAvisos, cerrarAviso } from './servicio.js';

const rutas = Router();
rutas.use(requiereSesion);

rutas.get('/contador', async (req, res) => {
  const { rows } = await db.query(
    "SELECT count(*) AS abiertos FROM avisos WHERE usuario_id = $1 AND estado = 'abierto'",
    [req.usuario.id],
  );
  res.json(rows[0]);
});

rutas.get('/', async (req, res) => {
  res.json({ avisos: await listarAvisos(req.usuario.id, req.query.estado || 'abierto') });
});

rutas.post('/:id/cerrar', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw peticionIncorrecta('El aviso no es válido');
  res.json(await cerrarAviso(req.usuario.id, id));
});

export default rutas;
