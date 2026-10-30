// Módulo subida — /api/subida
// Responsable: Dani (#12).
//
// POST /          multipart: archivos (uno o varios), origen = subida|camara|compartir   RF-13 a RF-17, RF-23
//                 -> 201 [{ nombre, id, estado }]  una factura por archivo
//                    estado: 'pendiente' (se está leyendo), 'sin_leer' (límite del plan) o
//                    'rechazado' (con su motivo en `error`; el resto de archivos sí se sube)
//                 409 { error, codigo: 'perfil_incompleto' } si no hay perfil fiscal (RF-10)
// GET  /:id/estado  cómo va la lectura de una factura recién subida
//                 -> { estado: 'leyendo' | 'leida' | 'sin_datos' | 'sin_leer' | 'confirmada', emisor, total, moneda, motivo }
import { Router } from 'express';
import multer from 'multer';
import { requiereSesion } from '../../core/auth.js';
import { peticionIncorrecta, noEncontrado, ErrorHttp } from '../../core/errores.js';
import { db } from '../../core/db.js';
import { obtenerPerfil } from '../perfil/servicio.js';
import { crearFacturaDesdeArchivo, TAMANO_MAXIMO } from './servicio.js';

const MAXIMO_ARCHIVOS = 20;
const subida = multer({ storage: multer.memoryStorage(), limits: { fileSize: TAMANO_MAXIMO, files: MAXIMO_ARCHIVOS } });

const rutas = Router();
rutas.use(requiereSesion);

rutas.post('/', subida.array('archivos', MAXIMO_ARCHIVOS), async (req, res) => {
  if (!(await obtenerPerfil(req.usuario.id))) {
    return res.status(409).json({
      error: 'Antes de subir tu primera factura completa tu perfil fiscal.',
      codigo: 'perfil_incompleto',
    });
  }
  const archivos = req.files || [];
  if (!archivos.length) throw peticionIncorrecta('No has elegido ningún archivo');
  const origen = ['subida', 'camara', 'compartir'].includes(req.body.origen) ? req.body.origen : 'subida';

  // Uno detrás de otro: así cada archivo cuenta para el límite del plan antes del siguiente.
  const resultado = [];
  for (const archivo of archivos) {
    // multer entrega el nombre en latin1; lo pasamos a UTF-8 para no romper tildes y eñes.
    const nombre = Buffer.from(archivo.originalname, 'latin1').toString('utf8');
    try {
      const factura = await crearFacturaDesdeArchivo({ usuarioId: req.usuario.id, buffer: archivo.buffer, nombre, origen });
      resultado.push({ nombre, ...factura });
    } catch (error) {
      if (!(error instanceof ErrorHttp)) throw error;
      resultado.push({ nombre, id: null, estado: 'rechazado', error: error.message });
    }
  }
  res.status(201).json(resultado);
});

rutas.get('/:id/estado', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw noEncontrado('Factura no encontrada');
  const { rows: [f] } = await db.query(
    'SELECT estado, emisor, total, moneda, datos_ia FROM facturas WHERE id = $1 AND usuario_id = $2',
    [id, req.usuario.id],
  );
  if (!f) throw noEncontrado('Factura no encontrada');
  let estado = f.estado;
  if (f.estado === 'pendiente') {
    if (!f.datos_ia) estado = 'leyendo';
    else estado = f.datos_ia.motivo ? 'sin_datos' : 'leida';
  }
  res.json({ estado, emisor: f.emisor, total: f.total, moneda: f.moneda, motivo: f.datos_ia?.motivo ?? null });
});

// Errores de multer (archivo demasiado grande, demasiados archivos) con un mensaje claro.
rutas.use((error, _req, res, next) => {
  if (!(error instanceof multer.MulterError)) return next(error);
  const mensajes = {
    LIMIT_FILE_SIZE: 'Algún archivo es demasiado grande (máximo 15 MB).',
    LIMIT_FILE_COUNT: `Puedes subir hasta ${MAXIMO_ARCHIVOS} archivos a la vez.`,
  };
  res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: mensajes[error.code] || 'No se pudo subir el archivo' });
});

export default rutas;
