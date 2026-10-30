// Cifras del panel (RF-43 a RF-48). Responsable: Rodrigo (#22).
//
//   const cifras = await calcularPanel(usuarioId, { periodo: 'mes', fecha: '2026-10-30' });
//
// Solo cuentan las facturas confirmadas (RF-48) y los importes van en euros (total_eur).
// La fecha de un gasto es la de la factura; si no tiene, el día en que se subió.
//
// Versión de empresa y personal (#50): solo cuentan las facturas de la versión en la que
// está. La de empresa trae además las casillas de los impresos (impresos.js); la personal,
// el presupuesto del periodo y nada de IVA ni trimestres.
import { db } from '../../core/db.js';
import { peticionIncorrecta } from '../../core/errores.js';
import { trimestreDe, rangoTrimestre, plazoPresentacion, diasEntre, hoy } from '../../core/fiscal.js';
import { obtenerVersiones } from '../versiones/servicio.js';
import { contarAbiertos } from '../avisos/servicio.js';
import { calcularImpresos } from './impresos.js';

export const PERIODOS = ['mes', 'trimestre', 'anio'];
const MESES = { mes: 1, trimestre: 3, anio: 12 };
const FECHA_GASTO = 'COALESCE(f.fecha, f.creado_en::date)';
const pad = (n) => String(n).padStart(2, '0');
const redondear = (n) => Math.round(Number(n) * 100) / 100;

function ultimoDiaMes(anio, mes) {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

// Desde y hasta del periodo que contiene la fecha, y el del periodo anterior.
export function rangoPeriodo(periodo, fecha) {
  const [anio, mes] = fecha.split('-').map(Number);
  if (periodo === 'mes') {
    const anterior = mes === 1 ? [anio - 1, 12] : [anio, mes - 1];
    return {
      desde: `${anio}-${pad(mes)}-01`, hasta: `${anio}-${pad(mes)}-${pad(ultimoDiaMes(anio, mes))}`,
      anterior: { desde: `${anterior[0]}-${pad(anterior[1])}-01`, hasta: `${anterior[0]}-${pad(anterior[1])}-${pad(ultimoDiaMes(...anterior))}` },
    };
  }
  if (periodo === 'trimestre') {
    const { trimestre } = trimestreDe(fecha);
    const anterior = trimestre === 1 ? rangoTrimestre(anio - 1, 4) : rangoTrimestre(anio, trimestre - 1);
    return { ...rangoTrimestre(anio, trimestre), anterior };
  }
  return { desde: `${anio}-01-01`, hasta: `${anio}-12-31`, anterior: { desde: `${anio - 1}-01-01`, hasta: `${anio - 1}-12-31` } };
}

function leerFiltros({ periodo = 'mes', fecha } = {}) {
  if (!PERIODOS.includes(periodo)) throw peticionIncorrecta('El periodo tiene que ser mes, trimestre o anio');
  const dia = fecha || hoy();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || Number.isNaN(Date.parse(dia))) throw peticionIncorrecta('La fecha no es válida');
  return { periodo, fecha: dia };
}

export async function calcularPanel(usuarioId, filtros) {
  const { periodo, fecha } = leerFiltros(filtros);
  const rango = rangoPeriodo(periodo, fecha);
  const { anio, trimestre } = trimestreDe(fecha);
  const trimestreActual = rangoTrimestre(anio, trimestre);
  const plazo = plazoPresentacion(anio, trimestre);
  // Los días para el cierre cuentan siempre desde hoy, hasta el plazo del trimestre de hoy.
  const actual = trimestreDe(hoy());
  const plazoCierre = plazoPresentacion(actual.anio, actual.trimestre);

  const versiones = await obtenerVersiones(usuarioId);
  const version = versiones.actual;
  // La versión va como texto fijo: solo puede ser 'empresa' o 'personal' (CHECK de la tabla).
  const confirmadasEn = (desde, hasta) =>
    `f.usuario_id = $1 AND f.version = '${version}' AND f.estado = 'confirmada' AND ${FECHA_GASTO} BETWEEN ${desde}::date AND ${hasta}::date`;

  const [resumen, anterior, categorias, iva, pendientes, avisosAbiertos, clientes, impresos] = await Promise.all([
    db.query(
      `SELECT COUNT(*)::int AS num, COALESCE(SUM(f.total_eur), 0) AS gasto FROM facturas f WHERE ${confirmadasEn('$2', '$3')}`,
      [usuarioId, rango.desde, rango.hasta],
    ),
    db.query(
      `SELECT COUNT(*)::int AS num, COALESCE(SUM(f.total_eur), 0) AS gasto FROM facturas f WHERE ${confirmadasEn('$2', '$3')}`,
      [usuarioId, rango.anterior.desde, rango.anterior.hasta],
    ),
    db.query(
      `SELECT c.id, c.clave, c.nombre AS categoria, SUM(f.total_eur) AS total, COUNT(*)::int AS num
         FROM facturas f LEFT JOIN categorias c ON c.id = f.categoria_id
        WHERE ${confirmadasEn('$2', '$3')} AND f.total_eur IS NOT NULL
        GROUP BY c.id, c.clave, c.nombre
        ORDER BY total DESC, categoria`,
      [usuarioId, rango.desde, rango.hasta],
    ),
    // RF-45: el IVA soportado se pasa a euros con el tipo de cambio de cada factura.
    db.query(
      `SELECT COALESCE(SUM(CASE WHEN f.moneda = 'EUR' THEN f.cuota_iva ELSE f.cuota_iva * f.tipo_cambio END), 0) AS iva
         FROM facturas f WHERE ${confirmadasEn('$2', '$3')}`,
      [usuarioId, trimestreActual.desde, trimestreActual.hasta],
    ),
    db.query(`SELECT COUNT(*)::int AS n FROM facturas WHERE usuario_id = $1 AND estado = 'pendiente' AND version = $2`, [usuarioId, version]),
    contarAbiertos(usuarioId, version),
    // RF-47: gasto por cliente o proyecto, de las facturas asociadas a un evento del calendario.
    db.query(
      `SELECT COALESCE(NULLIF(trim(e.cliente), ''), e.titulo) AS cliente, SUM(f.total_eur) AS total, COUNT(*)::int AS num
         FROM facturas f JOIN eventos e ON e.id = f.evento_id AND e.usuario_id = f.usuario_id
        WHERE ${confirmadasEn('$2', '$3')} AND f.total_eur IS NOT NULL
        GROUP BY 1 ORDER BY total DESC, cliente`,
      [usuarioId, rango.desde, rango.hasta],
    ),
    version === 'empresa' ? calcularImpresos(usuarioId) : null,
  ]);

  const gastoTotal = redondear(resumen.rows[0].gasto);
  const gastoAnterior = redondear(anterior.rows[0].gasto);
  const mensual = versiones.personal.presupuesto_mensual;
  const comun = {
    version,
    periodo: { tipo: periodo, fecha, desde: rango.desde, hasta: rango.hasta, anterior: rango.anterior },
    numFacturas: resumen.rows[0].num,
    gastoTotal,
    gastoAnterior,
    numFacturasAnterior: anterior.rows[0].num,
    // null si el periodo anterior no tiene gasto (no hay con qué comparar).
    variacion: gastoAnterior > 0 ? Math.round(((gastoTotal - gastoAnterior) / gastoAnterior) * 1000) / 10 : null,
    porCategoria: categorias.rows.map((c) => ({
      id: c.id, clave: c.clave, categoria: c.categoria, total: redondear(c.total), num: c.num,
    })),
    pendientes: pendientes.rows[0].n,
    avisosAbiertos,
  };
  if (version === 'personal') {
    // El presupuesto es mensual; para el trimestre o el año se multiplica.
    const presupuesto = mensual ? redondear(mensual * MESES[periodo]) : null;
    return {
      ...comun,
      presupuesto: presupuesto && { total: presupuesto, mensual, restante: redondear(presupuesto - gastoTotal) },
      diasPeriodo: diasEntre(rango.desde, rango.hasta) + 1,
    };
  }
  return {
    ...comun,
    trimestre: { anio, trimestre, desde: trimestreActual.desde, hasta: trimestreActual.hasta, plazo },
    ivaSoportadoTrimestre: redondear(iva.rows[0].iva),
    diasCierreTrimestre: diasEntre(hoy(), plazoCierre),
    cierre: { anio: actual.anio, trimestre: actual.trimestre, plazo: plazoCierre },
    porCliente: clientes.rows.map((c) => ({ cliente: c.cliente, total: redondear(c.total), num: c.num })),
    impresos,
  };
}
