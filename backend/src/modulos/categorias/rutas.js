// Módulo categorías — /api/categorias
// Responsable: Rodrigo (#19).
//
// GET  /          categorías base de su actividad + las propias del usuario   RF-26 (hecho, falta filtrar por actividad)
// POST /          { nombre } crea una categoría propia                       RF-26 (pendiente)
import { Router } from 'express';
import { db } from '../../core/db.js';
import { requiereSesion } from '../../core/auth.js';
import { pendiente } from '../../core/errores.js';

const rutas = Router();
rutas.use(requiereSesion);

rutas.get('/', async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, clave, nombre, (usuario_id IS NOT NULL) AS propia
       FROM categorias WHERE usuario_id IS NULL OR usuario_id = $1
      ORDER BY propia, nombre`,
    [req.usuario.id],
  );
  res.json(rows);
});

rutas.post('/', () => { throw pendiente('#19'); });

export default rutas;
