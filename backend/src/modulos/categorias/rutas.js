// Módulo categorías — /api/categorias
// Responsable: Rodrigo (#19).
//
// GET  /          categorías base de su actividad + las propias del usuario   RF-26 (hecho)
// POST /          { nombre } crea una categoría propia                       RF-26 (hecho)
import { Router } from 'express';
import { db } from '../../core/db.js';
import { requiereSesion } from '../../core/auth.js';
import { peticionIncorrecta, conflicto } from '../../core/errores.js';
import { obtenerPerfil } from '../perfil/servicio.js';

const rutas = Router();
rutas.use(requiereSesion);

// Las base con actividades vacías valen para todos; el resto, solo para esas actividades.
// Sin perfil fiscal todavía, se enseñan todas las base.
rutas.get('/', async (req, res) => {
  const perfil = await obtenerPerfil(req.usuario.id);
  const { rows } = await db.query(
    `SELECT id, clave, nombre, (usuario_id IS NOT NULL) AS propia
       FROM categorias
      WHERE usuario_id = $1
         OR (usuario_id IS NULL AND ($2::text IS NULL OR cardinality(actividades) = 0 OR $2 = ANY(actividades)))
      ORDER BY propia, nombre`,
    [req.usuario.id, perfil?.actividad ?? null],
  );
  res.json(rows);
});

rutas.post('/', async (req, res) => {
  const nombre = String(req.body?.nombre ?? '').trim().replace(/\s+/g, ' ');
  if (!nombre) throw peticionIncorrecta('Escribe el nombre de la categoría', { campo: 'nombre' });
  if (nombre.length > 60) throw peticionIncorrecta('El nombre es demasiado largo', { campo: 'nombre' });

  const { rows: [repetida] } = await db.query(
    `SELECT id FROM categorias WHERE (usuario_id IS NULL OR usuario_id = $1) AND lower(nombre) = lower($2)`,
    [req.usuario.id, nombre],
  );
  if (repetida) throw conflicto('Ya tienes una categoría con ese nombre', { campo: 'nombre', id: repetida.id });

  const { rows: [categoria] } = await db.query(
    `INSERT INTO categorias (usuario_id, nombre) VALUES ($1, $2)
     ON CONFLICT DO NOTHING
     RETURNING id, clave, nombre, true AS propia`,
    [req.usuario.id, nombre],
  );
  if (!categoria) throw conflicto('Ya tienes una categoría con ese nombre', { campo: 'nombre' });
  res.status(201).json(categoria);
});

export default rutas;
