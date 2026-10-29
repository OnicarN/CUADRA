// Módulo facturas — /api/facturas
// Responsable: Rodrigo (#18 y #19).
//
// GET    /                 ?q&estado&desde&hasta&categoria&min&max&aviso&pagina      RF-37, RF-38 (hecho)
//                          -> { facturas: [...], total }  (30 por página)
// GET    /:id              factura con lineas_iva, avisos, cambios y categoría        RF-31 (hecho)
// PATCH  /:id              { campo: valor, ..., lineas_iva? } solo si está pendiente  RF-31, RF-32 (hecho)
// POST   /:id/confirmar                                                              RF-30 (hecho)
// POST   /:id/reabrir      vuelve a pendiente y registra el cambio                   RF-33 (hecho)
// DELETE /:id              solo si está pendiente o sin leer                         RF-34 (hecho)
// GET    /:id/original     el archivo original (?descargar=1 para descargar)         RF-39 (hecho)
// POST   /:id/duplicado    { accion: 'descartar' | 'guardar' }                       RF-36
//
// Todas las consultas filtran por req.usuario.id (RF-09).
import { Router } from 'express';
import { requiereSesion } from '../../core/auth.js';
import { aBuffer } from '../../core/db.js';
import { pendiente, peticionIncorrecta, noEncontrado } from '../../core/errores.js';
import { FORMATOS } from '../subida/servicio.js';
import { listarFacturas, obtenerOriginal } from './consultas.js';
import { obtenerFactura, editarFactura, confirmarFactura, reabrirFactura, borrarFactura } from './revision.js';

const rutas = Router();
rutas.use(requiereSesion);

function leerId(texto) {
  if (!/^\d+$/.test(texto)) throw peticionIncorrecta('Factura no válida');
  return Number(texto);
}

// inline o attachment, con el nombre del archivo aunque lleve tildes.
function disposicion(tipo, nombre) {
  const ascii = nombre.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `${tipo}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nombre)}`;
}

rutas.get('/', async (req, res) => {
  res.json(await listarFacturas(req.usuario.id, req.query));
});
rutas.get('/:id', async (req, res) => {
  res.json(await obtenerFactura(req.usuario.id, leerId(req.params.id)));
});
rutas.patch('/:id', async (req, res) => {
  res.json(await editarFactura(req.usuario.id, leerId(req.params.id), req.body));
});
rutas.post('/:id/confirmar', async (req, res) => {
  res.json(await confirmarFactura(req.usuario.id, leerId(req.params.id)));
});
rutas.post('/:id/reabrir', async (req, res) => {
  res.json(await reabrirFactura(req.usuario.id, leerId(req.params.id)));
});
rutas.delete('/:id', async (req, res) => {
  await borrarFactura(req.usuario.id, leerId(req.params.id));
  res.status(204).end();
});
rutas.get('/:id/original', async (req, res) => {
  const original = await obtenerOriginal(req.usuario.id, leerId(req.params.id));
  if (!original) throw noEncontrado('No hemos encontrado el original de esta factura');
  // Solo se abren en el navegador los formatos que acepta la subida; cualquier otro se
  // descarga como binario para que no se pueda ejecutar nada dentro de la web.
  const conocido = FORMATOS.includes(original.tipo_mime);
  const descargar = !conocido || req.query.descargar === '1';
  res.set({
    'Content-Type': conocido ? original.tipo_mime : 'application/octet-stream',
    'Content-Disposition': disposicion(descargar ? 'attachment' : 'inline', original.nombre_archivo),
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-store',
  });
  res.send(aBuffer(original.contenido));
});
rutas.post('/:id/duplicado', () => { throw pendiente('#20'); });

export default rutas;
