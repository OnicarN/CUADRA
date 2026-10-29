// Módulo facturas — /api/facturas
// Responsable: Rodrigo (#18 y #19).
//
// GET    /                 ?q&estado&desde&hasta&categoria&min&max&aviso&pagina      RF-37, RF-38
//                          -> { facturas: [...], total }
// GET    /:id              factura con lineas_iva, avisos, cambios y categoría        RF-31
// PATCH  /:id              { campo: valor, ..., lineas_iva? } solo si está pendiente  RF-31, RF-32
// POST   /:id/confirmar                                                              RF-30
// POST   /:id/reabrir      vuelve a pendiente y registra el cambio                   RF-33
// DELETE /:id              solo si está pendiente o sin leer                         RF-34
// GET    /:id/original     el archivo original (?descargar=1 para descargar)         RF-39
// POST   /:id/duplicado    { accion: 'descartar' | 'guardar' }                       RF-36
//
// Todas las consultas filtran por req.usuario.id (RF-09).
import { Router } from 'express';
import { requiereSesion } from '../../core/auth.js';
import { pendiente } from '../../core/errores.js';

const rutas = Router();
rutas.use(requiereSesion);

rutas.get('/', () => { throw pendiente('#18'); });
rutas.get('/:id', () => { throw pendiente('#19'); });
rutas.patch('/:id', () => { throw pendiente('#19'); });
rutas.post('/:id/confirmar', () => { throw pendiente('#19'); });
rutas.post('/:id/reabrir', () => { throw pendiente('#19'); });
rutas.delete('/:id', () => { throw pendiente('#19'); });
rutas.get('/:id/original', () => { throw pendiente('#18'); });
rutas.post('/:id/duplicado', () => { throw pendiente('#20'); });

export default rutas;
