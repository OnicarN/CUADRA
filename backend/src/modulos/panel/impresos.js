// Impresos para la declaración (#50). Responsable: Rodrigo.
//
//   const impresos = await calcularImpresos(usuarioId);
//   const { cuota } = await ivaDeducible(usuarioId, desde, hasta);   // para la tarjeta del panel
//
// Cuadra no presenta nada: calcula, con las facturas de empresa confirmadas, las casillas de
// gastos de los modelos del próximo plazo, para copiarlas en la Sede de Hacienda o pasárselas
// a la gestoría. Los ingresos (lo que factura el autónomo) no están en Cuadra: esas casillas
// las rellena él. Cuánto se deduce de cada factura lo decide deducibilidad.js.
//   - Modelo 303 (IVA, régimen general), del trimestre:
//       10 y 11  IVA que declaras por las compras a proveedores de la UE (inversión del sujeto pasivo)
//       28 y 29  IVA soportado en compras corrientes en España
//       30 y 31  IVA soportado en bienes de inversión (equipos de más de 3.005,06 €)
//       36 y 37  IVA que te deduces de las compras a proveedores de la UE
//   - Modelo 130 (IRPF, estimación directa), casilla 02: gastos deducibles del 1 de enero al
//     final del trimestre (es acumulado), más la cuota de autónomos de esos meses.
import { db } from '../../core/db.js';
import { rangoTrimestre } from '../../core/fiscal.js';
import { obtenerPerfil } from '../perfil/servicio.js';
import { proximoPlazo } from '../avisos/servicio.js';
import { obtenerVersiones } from '../versiones/servicio.js';
import { clasificarFactura } from './deducibilidad.js';

export const SEDE_HACIENDA = 'https://sede.agenciatributaria.gob.es';
const redondear = (n) => Math.round(Number(n) * 100) / 100;
const FECHA = 'COALESCE(f.fecha, f.creado_en::date)';

async function contexto(usuarioId) {
  const [perfil, versiones] = await Promise.all([obtenerPerfil(usuarioId), obtenerVersiones(usuarioId)]);
  return {
    regimen: perfil?.regimen_iva ?? null,
    actividad: perfil?.actividad ?? null,
    viviendaPct: versiones.empresa.vivienda_afecta_pct,
    cuotaAutonomos: versiones.empresa.cuota_autonomos_mensual,
  };
}

// Facturas de empresa confirmadas entre dos fechas, con lo que necesita clasificarFactura.
async function facturasEntre(usuarioId, desde, hasta) {
  const { rows } = await db.query(
    `SELECT f.id, ${FECHA}::text AS dia, f.base_imponible, f.cuota_iva, f.total_eur, f.moneda, f.nif_emisor, f.nif_receptor,
            c.clave AS categoria, (SELECT count(*)::int FROM factura_iva i WHERE i.factura_id = f.id) AS lineas
       FROM facturas f LEFT JOIN categorias c ON c.id = f.categoria_id
      WHERE f.usuario_id = $1 AND f.version = 'empresa' AND f.estado = 'confirmada'
        AND ${FECHA} BETWEEN $2::date AND $3::date`,
    [usuarioId, desde, hasta],
  );
  return rows.map((f) => ({
    ...f,
    base_imponible: f.base_imponible === null ? null : Number(f.base_imponible),
    cuota_iva: f.cuota_iva === null ? null : Number(f.cuota_iva),
    total_eur: f.total_eur === null ? null : Number(f.total_eur),
  }));
}

function sumar(clasificadas, regimen) {
  const casillas = {};
  const poner = (numero, importe) => { casillas[numero] = redondear((casillas[numero] ?? 0) + importe); };
  for (const { r } of clasificadas) {
    if (!r.iva) continue;
    const [baseDed, cuotaDed] = r.iva.casillas.deducible;
    poner(baseDed, r.iva.base);
    poner(cuotaDed, r.iva.cuota);
    if (r.iva.casillas.devengado) {
      const [baseDev, cuotaDev] = r.iva.casillas.devengado;
      poner(baseDev, r.iva.devengadoBase);
      poner(cuotaDev, r.iva.devengadoCuota);
    }
  }
  // Las de siempre salen aunque sean 0, para que se vea que están calculadas.
  if (regimen === 'general') { poner('28', 0); poner('29', 0); }
  return casillas;
}

// IVA que podrá deducir entre dos fechas: lo de las casillas 29 y 31 (el de la UE no cuenta,
// porque lo declara y se lo deduce a la vez). Lo usa la tarjeta del panel.
export async function ivaDeducible(usuarioId, desde, hasta) {
  const ctx = await contexto(usuarioId);
  const clasificadas = (await facturasEntre(usuarioId, desde, hasta)).map((f) => ({ f, r: clasificarFactura(f, ctx) }));
  const casillas = sumar(clasificadas, ctx.regimen);
  return { cuota: redondear((casillas['29'] ?? 0) + (casillas['31'] ?? 0)), regimen: ctx.regimen };
}

// Cuántas facturas y cuánto dinero hay detrás de cada motivo (para explicarlo en el panel).
function resumirMotivos(clasificadas) {
  const motivos = {};
  for (const { f, r } of clasificadas) {
    for (const motivo of r.motivos) {
      motivos[motivo] ??= { num: 0, total: 0 };
      motivos[motivo].num += 1;
      motivos[motivo].total = redondear(motivos[motivo].total + Number(f.total_eur ?? 0));
    }
  }
  return motivos;
}

export async function calcularImpresos(usuarioId, dia) {
  const { anio, trimestre, plazo } = proximoPlazo(dia);
  const { desde, hasta } = rangoTrimestre(anio, trimestre);
  const ctx = await contexto(usuarioId);
  const delAnio = (await facturasEntre(usuarioId, `${anio}-01-01`, hasta)).map((f) => ({ f, r: clasificarFactura(f, ctx) }));
  const delTrimestre = delAnio.filter(({ f }) => f.dia >= desde);
  const cuentan = ({ r }) => r.tipo === 'interior' || r.tipo === 'intracomunitaria';

  const impresos = [];
  // El 303 con estas casillas es del régimen general. En los demás regímenes de IVA el
  // cálculo es otro (o no se presenta) y se lo decimos.
  if (ctx.regimen === 'general') {
    const casillas = sumar(delTrimestre, ctx.regimen);
    impresos.push({
      modelo: '303', aplica: true, numFacturas: delTrimestre.filter(cuentan).length,
      casillas: Object.keys(casillas).sort((a, b) => Number(a) - Number(b)).map((casilla) => ({ casilla, importe: casillas[casilla] })),
    });
  } else {
    impresos.push({ modelo: '303', aplica: false, motivo: ctx.regimen ? `regimen_${ctx.regimen}` : 'sin_perfil' });
  }
  // El 130 es de estimación directa; con módulos (simplificado) se presenta el 131.
  if (ctx.regimen && ctx.regimen !== 'simplificado') {
    const gastos = redondear(delAnio.reduce((suma, { r }) => suma + r.irpf, 0));
    // La cuota de autónomos de cada mes desde enero hasta el final del trimestre.
    const cuota = ctx.cuotaAutonomos ? redondear(ctx.cuotaAutonomos * trimestre * 3) : 0;
    impresos.push({
      modelo: '130', aplica: true, numFacturas: delAnio.filter(cuentan).length,
      casillas: [{ casilla: '02', importe: redondear(gastos + cuota) }],
      cuotaAutonomos: ctx.cuotaAutonomos ? { mensual: ctx.cuotaAutonomos, meses: trimestre * 3, total: cuota } : null,
    });
  } else {
    impresos.push({ modelo: '130', aplica: false, motivo: ctx.regimen ? `regimen_${ctx.regimen}` : 'sin_perfil' });
  }

  return {
    anio, trimestre, plazo, desde, hasta, regimen: ctx.regimen,
    impresos,
    // Por qué algo no cuenta entero, del trimestre: incompleta, fuera_ue, vehiculo, atenciones,
    // suministros, amortizar, intracomunitaria. Cada uno con { num, total }.
    motivos: resumirMotivos(delTrimestre),
    sinCuotaAutonomos: ctx.regimen !== null && ctx.regimen !== 'simplificado' && !ctx.cuotaAutonomos,
    sede: SEDE_HACIENDA,
  };
}
