// Módulo avisos — /api/avisos
// Responsable: Rodrigo (#21).
//
// GET  /              ?estado=abierto|cerrado  lista con el texto de cada aviso   RF-40
// GET  /contador      { abiertos }  (lo usa la cabecera de la web)            RF-40 (hecho)
// POST /:id/cerrar                                                         RF-40
import { Router } from 'express';
import { db } from '../../core/db.js';
import { requiereSesion } from '../../core/auth.js';
import { pendiente } from '../../core/errores.js';

const rutas = Router();
rutas.use(requiereSesion);

rutas.get('/contador', async (req, res) => {
  const { rows } = await db.query(
    "SELECT count(*) AS abiertos FROM avisos WHERE usuario_id = $1 AND estado = 'abierto'",
    [req.usuario.id],
  );
  res.json(rows[0]);
});

rutas.get('/', () => { throw pendiente('#21'); });
rutas.post('/:id/cerrar', () => { throw pendiente('#21'); });

export default rutas;
