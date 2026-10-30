// Impresos para la declaración (#50). Responsable: Rodrigo.
//
//   const impresos = await calcularImpresos(usuarioId);
//
// Cuadra no presenta nada: calcula, con las facturas de empresa confirmadas, las casillas de
// gastos de los modelos del próximo plazo, para copiarlas en la Sede de Hacienda o pasárselas
// a la gestoría. Los ingresos (lo que factura el autónomo) no están en Cuadra: esas casillas
// las rellena él.
//
// Solo cuenta lo que se puede deducir: factura completa (NIF del proveedor y el suyo) con el
// IVA desglosado y en euros. Las demás se cuentan aparte para avisarle.
//   - Modelo 303 (IVA, régimen general): casillas 28 y 29, IVA soportado en operaciones
//     interiores corrientes. Del trimestre.
//   - Modelo 130 (IRPF, estimación directa): casilla 02, gastos fiscalmente deducibles. Del
//     1 de enero al final del trimestre (es acumulado). Sin el IVA, que ya se deduce en el 303;
//     en régimen exento el IVA no se deduce y cuenta como gasto.
import { db } from '../../core/db.js';
import { rangoTrimestre } from '../../core/fiscal.js';
import { obtenerPerfil } from '../perfil/servicio.js';
import { proximoPlazo } from '../avisos/servicio.js';

export const SEDE_HACIENDA = 'https://sede.agenciatributaria.gob.es';
const redondear = (n) => Math.round(Number(n) * 100) / 100;

const DEDUCIBLE = `f.nif_emisor IS NOT NULL AND f.nif_receptor IS NOT NULL AND f.moneda = 'EUR'
  AND f.cuota_iva IS NOT NULL AND EXISTS (SELECT 1 FROM factura_iva i WHERE i.factura_id = f.id)`;

export async function calcularImpresos(usuarioId, dia) {
  const { anio, trimestre, plazo } = proximoPlazo(dia);
  const { desde, hasta } = rangoTrimestre(anio, trimestre);
  const regimen = (await obtenerPerfil(usuarioId))?.regimen_iva ?? null;
  const confirmadas = `f.usuario_id = $1 AND f.version = 'empresa' AND f.estado = 'confirmada'
    AND COALESCE(f.fecha, f.creado_en::date) BETWEEN $2::date AND $3::date`;

  const [trimestral, anual, noDeducibles] = await Promise.all([
    db.query(
      `SELECT COUNT(*)::int AS num, COALESCE(SUM(f.base_imponible), 0) AS base, COALESCE(SUM(f.cuota_iva), 0) AS cuota
         FROM facturas f WHERE ${confirmadas} AND ${DEDUCIBLE}`,
      [usuarioId, desde, hasta],
    ),
    db.query(
      `SELECT COUNT(*)::int AS num, COALESCE(SUM(f.base_imponible), 0) AS base, COALESCE(SUM(f.total_eur), 0) AS total
         FROM facturas f WHERE ${confirmadas} AND ${DEDUCIBLE}`,
      [usuarioId, `${anio}-01-01`, hasta],
    ),
    db.query(
      `SELECT COUNT(*)::int AS num, COALESCE(SUM(f.total_eur), 0) AS total
         FROM facturas f WHERE ${confirmadas} AND NOT (${DEDUCIBLE})`,
      [usuarioId, desde, hasta],
    ),
  ]);

  const t = trimestral.rows[0];
  const a = anual.rows[0];
  const impresos = [];
  // El 303 con estas casillas es del régimen general. En los demás regímenes de IVA el
  // cálculo es otro (o no se presenta) y se lo decimos.
  impresos.push(regimen === 'general'
    ? {
      modelo: '303', aplica: true, numFacturas: t.num,
      casillas: [
        { casilla: '28', concepto: 'base_soportado', importe: redondear(t.base) },
        { casilla: '29', concepto: 'cuota_soportado', importe: redondear(t.cuota) },
      ],
    }
    : { modelo: '303', aplica: false, motivo: regimen ? `regimen_${regimen}` : 'sin_perfil' });
  // El 130 es de estimación directa; con módulos (simplificado) se presenta el 131.
  impresos.push(regimen && regimen !== 'simplificado'
    ? {
      modelo: '130', aplica: true, numFacturas: a.num,
      casillas: [
        { casilla: '02', concepto: 'gastos_deducibles', importe: redondear(regimen === 'exento' ? a.total : a.base) },
      ],
    }
    : { modelo: '130', aplica: false, motivo: regimen ? `regimen_${regimen}` : 'sin_perfil' });

  return {
    anio, trimestre, plazo, desde, hasta, regimen,
    impresos,
    noDeducibles: { num: noDeducibles.rows[0].num, total: redondear(noDeducibles.rows[0].total) },
    sede: SEDE_HACIENDA,
  };
}
