// Módulo panel — /api/panel
// Responsable: Rodrigo (#22).
//
// GET / ?periodo=mes|trimestre|anio&fecha=AAAA-MM-DD     RF-43 a RF-48 (hecho)
//   -> { periodo: { tipo, fecha, desde, hasta, anterior: { desde, hasta } }, numFacturas, gastoTotal,
//        gastoAnterior, numFacturasAnterior, variacion (% o null), porCategoria: [{ id, clave, categoria, total, num }],
//        trimestre: { anio, trimestre, desde, hasta, plazo }, ivaSoportadoTrimestre,
//        pendientes, avisosAbiertos, diasCierreTrimestre, cierre: { anio, trimestre, plazo },
//        porCliente: [{ cliente, total, num }] }
// Solo cuentan las facturas confirmadas (RF-48). Importes en euros (total_eur).
// Sin fecha, se usa la de hoy. El IVA es del trimestre que contiene esa fecha; los días para
// el cierre cuentan siempre desde hoy hasta el plazo del trimestre en curso.
import { Router } from 'express';
import { requiereSesion } from '../../core/auth.js';
import { calcularPanel } from './cifras.js';

const rutas = Router();
rutas.use(requiereSesion);

rutas.get('/', async (req, res) => {
  const { periodo, fecha } = req.query;
  res.json(await calcularPanel(req.usuario.id, {
    periodo: typeof periodo === 'string' && periodo ? periodo : undefined,
    fecha: typeof fecha === 'string' && fecha ? fecha : undefined,
  }));
});

export default rutas;
