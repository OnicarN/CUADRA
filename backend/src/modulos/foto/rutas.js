// Módulo foto — /api/foto. Foto de perfil del usuario. Responsable: Dani.
//
// GET    /          la foto (JPG o PNG) o 404 si no tiene
// GET    /estado    { tiene, version }   version cambia con cada foto nueva (para la caché)
// PUT    /          multipart: "foto" (JPG o PNG, hasta 2 MB)  -> { tiene: true, version }
// DELETE /          quita la foto -> 204
//
// La web recorta y reduce la foto a 256×256 antes de subirla (js/componentes/foto-perfil.js),
// así que aquí solo comprobamos que de verdad es una imagen y que no es enorme.
import { Router } from 'express';
import multer from 'multer';
import { db, aBuffer } from '../../core/db.js';
import { requiereSesion } from '../../core/auth.js';
import { peticionIncorrecta, noEncontrado } from '../../core/errores.js';
import { detectarTipo } from '../subida/servicio.js';

export const TAMANO_MAXIMO_FOTO = 2 * 1024 * 1024;
const TIPOS = ['image/jpeg', 'image/png'];
const recibir = multer({ storage: multer.memoryStorage(), limits: { fileSize: TAMANO_MAXIMO_FOTO, files: 1 } });

const rutas = Router();
rutas.use(requiereSesion);

const estado = (fila) => ({ tiene: Boolean(fila), version: fila ? new Date(fila.actualizada_en).getTime() : null });

rutas.get('/estado', async (req, res) => {
  const { rows: [fila] } = await db.query('SELECT actualizada_en FROM fotos_perfil WHERE usuario_id = $1', [req.usuario.id]);
  res.json(estado(fila));
});

rutas.get('/', async (req, res) => {
  const { rows: [foto] } = await db.query('SELECT contenido, tipo_mime FROM fotos_perfil WHERE usuario_id = $1', [req.usuario.id]);
  if (!foto) throw noEncontrado('No tienes foto de perfil');
  res.set({
    'Content-Type': foto.tipo_mime,
    'X-Content-Type-Options': 'nosniff',
    // La URL lleva ?v=version: si cambia la foto, cambia la URL, así que se puede guardar en caché.
    'Cache-Control': req.query.v ? 'private, max-age=31536000, immutable' : 'private, no-cache',
  });
  res.send(aBuffer(foto.contenido));
});

rutas.put('/', (req, res, next) => {
  recibir.single('foto')(req, res, (error) => {
    if (error?.code === 'LIMIT_FILE_SIZE') return next(peticionIncorrecta('La foto es demasiado grande (máximo 2 MB)'));
    if (error) return next(peticionIncorrecta('No hemos podido recibir la foto'));
    next();
  });
}, async (req, res) => {
  const buffer = req.file?.buffer;
  if (!buffer?.length) throw peticionIncorrecta('No has elegido ninguna foto');
  const tipo = detectarTipo(buffer);
  if (!TIPOS.includes(tipo)) throw peticionIncorrecta('La foto tiene que ser JPG o PNG');
  const { rows: [fila] } = await db.query(
    `INSERT INTO fotos_perfil (usuario_id, contenido, tipo_mime) VALUES ($1, $2, $3)
     ON CONFLICT (usuario_id) DO UPDATE SET contenido = $2, tipo_mime = $3, actualizada_en = now()
     RETURNING actualizada_en`,
    [req.usuario.id, buffer, tipo],
  );
  res.json(estado(fila));
});

rutas.delete('/', async (req, res) => {
  await db.query('DELETE FROM fotos_perfil WHERE usuario_id = $1', [req.usuario.id]);
  res.status(204).end();
});

export default rutas;
