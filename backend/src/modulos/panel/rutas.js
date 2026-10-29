// Módulo panel — /api/panel
// Responsable: Rodrigo (#22).
//
// GET / ?periodo=mes|trimestre|anio&fecha=AAAA-MM-DD     RF-43 a RF-48
//   -> { periodo: { desde, hasta }, numFacturas, gastoTotal, gastoAnterior,
//        porCategoria: [{ categoria, total }], ivaSoportadoTrimestre,
//        pendientes, avisosAbiertos, diasCierreTrimestre, porCliente: [{ cliente, total }] }
// Solo cuentan las facturas confirmadas (RF-48). Importes en euros (total_eur).
import { Router } from 'express';
import { requiereSesion } from '../../core/auth.js';
import { pendiente } from '../../core/errores.js';

const rutas = Router();
rutas.use(requiereSesion);

rutas.get('/', () => { throw pendiente('#22'); });

export default rutas;
