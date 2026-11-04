// Cuánto se puede deducir de cada factura (#50). Responsable: Rodrigo.
//
//   const r = clasificarFactura(factura, { regimen, actividad, viviendaPct });
//   // { tipo, iva: { casillas, base, cuota }, irpf, motivos }
//
// Es una ayuda orientativa: sigue las reglas generales de la Ley del IVA (37/1992) y del
// IRPF (35/2006) para un autónomo en estimación directa, no cubre todos los casos y no
// sustituye a una gestoría. Lo que hace con cada factura de empresa confirmada:
//
// 1. Tipo de factura
//    - interior: completa (NIF del proveedor y el tuyo) y con el IVA desglosado.
//    - intracomunitaria: de un proveedor de otro país de la UE (NIF con prefijo IE, DE, FR…),
//      a tu NIF y sin IVA español. Va con inversión del sujeto pasivo: tú declaras el IVA
//      (casillas 10 y 11 del 303) y te lo deduces a la vez (36 y 37). Suponemos el 21 %.
//    - fuera_ue: en otra moneda o con NIF de fuera de la UE. No la calculamos: díselo a tu gestoría.
//    - incompleta: le falta tu NIF, el del proveedor o el IVA desglosado. No se deduce.
// 2. IVA (303), según la categoría (art. 95 y 96 de la Ley del IVA):
//    - Coche (combustible, mantenimiento): 50 %, salvo transporte, que es el 100 %.
//    - Comidas con clientes: 0 %, porque las atenciones a clientes no dan derecho a deducir.
//    - Suministros de casa: el % de la vivienda que usas para trabajar (si trabajas en casa).
//    - Equipos de más de 3.005,06 € sin IVA: son bienes de inversión (casillas 30 y 31).
//    - El resto: 100 % (casillas 28 y 29).
// 3. Gasto en el IRPF (130): la base, más el IVA que no te has podido deducir, según la categoría:
//    - Coche: 0 %, salvo transporte (solo se deduce si el vehículo es solo para trabajar).
//    - Suministros de casa: el 30 % de la parte de la vivienda que usas para trabajar (art. 30 LIRPF).
//    - Equipos de más de 300 €: no van enteros, se amortizan en varios años.
//    - Comidas con clientes: sí, con el límite del 1 % de tus ingresos (eso no lo podemos mirar).
import { normalizarNif } from '../../core/validacion.js';

export const LIMITE_BIEN_INVERSION = 3005.06;
export const LIMITE_AMORTIZAR = 300;
export const TIPO_INTRACOMUNITARIO = 21;
const SUMINISTROS_IRPF = 0.3;
const PAISES_UE = ['AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'GR', 'FI', 'FR', 'HR', 'HU', 'IE', 'IT',
  'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK', 'XI'];
const NIF_UE = new RegExp(`^(${PAISES_UE.join('|')})[0-9A-Z]{2,13}$`);
const VEHICULO = ['combustible', 'vehiculo'];

const redondear = (n) => Math.round(n * 100) / 100;

// "IE6388047V" -> true. Un NIF español (B12345674, 12345678Z, X1234567L) -> false.
export function esNifUe(nif) {
  return NIF_UE.test(normalizarNif(nif));
}

// Qué % del IVA y del gasto se deduce por la categoría. motivo explica por qué no es el 100 %.
export function reglaCategoria(clave, { actividad, viviendaPct } = {}) {
  if (VEHICULO.includes(clave)) {
    return actividad === 'transporte' ? { iva: 1, irpf: 1 } : { iva: 0.5, irpf: 0, motivo: 'vehiculo' };
  }
  if (clave === 'comidas') return { iva: 0, irpf: 1, motivo: 'atenciones' };
  if (clave === 'suministros' && viviendaPct) {
    const parte = viviendaPct / 100;
    return { iva: parte, irpf: parte * SUMINISTROS_IRPF, motivo: 'suministros' };
  }
  return { iva: 1, irpf: 1 };
}

function tipoDe(f) {
  const tieneIva = f.lineas > 0 && f.cuota_iva !== null;
  if (f.moneda !== 'EUR') return 'fuera_ue';
  if (esNifUe(f.nif_emisor)) return f.nif_receptor && !tieneIva ? 'intracomunitaria' : (tieneIva ? 'fuera_ue' : 'incompleta');
  if (!f.nif_emisor || !f.nif_receptor || !tieneIva) return 'incompleta';
  return 'interior';
}

// f: { base_imponible, cuota_iva, total_eur, moneda, nif_emisor, nif_receptor, lineas, categoria }
// contexto: { regimen, actividad, viviendaPct }
export function clasificarFactura(f, { regimen, actividad, viviendaPct } = {}) {
  const tipo = tipoDe(f);
  const motivos = [];
  const sinCalculo = { tipo, iva: null, irpf: 0, motivos: [tipo] };
  if (tipo === 'incompleta' || tipo === 'fuera_ue') return sinCalculo;

  const regla = reglaCategoria(f.categoria, { actividad, viviendaPct });
  if (regla.motivo) motivos.push(regla.motivo);
  // Solo en régimen general se deduce el IVA; en el resto, el IVA es parte del gasto.
  const deduceIva = regimen === 'general';

  let base;
  let cuota;
  if (tipo === 'intracomunitaria') {
    base = Number(f.total_eur ?? f.base_imponible ?? 0);
    cuota = redondear(base * TIPO_INTRACOMUNITARIO / 100);
    motivos.push('intracomunitaria');
  } else {
    base = Number(f.base_imponible ?? 0);
    cuota = Number(f.cuota_iva ?? 0);
  }

  const parteIva = deduceIva ? regla.iva : 0;
  const cuotaDeducible = redondear(cuota * parteIva);
  const inversion = tipo === 'interior' && f.categoria === 'equipos' && base > LIMITE_BIEN_INVERSION;
  let iva = null;
  if (deduceIva) {
    const casillas = tipo === 'intracomunitaria' ? { devengado: ['10', '11'], deducible: ['36', '37'] }
      : { deducible: inversion ? ['30', '31'] : ['28', '29'] };
    // La base que va con la cuota deducible es la parte proporcional.
    iva = { casillas, base: redondear(base * parteIva), cuota: cuotaDeducible, devengadoBase: redondear(base), devengadoCuota: cuota };
  }

  // IRPF: la base, más el IVA que no te deduces (en la intracomunitaria el IVA se compensa
  // solo, así que no es gasto).
  const ivaNoDeducido = tipo === 'intracomunitaria' ? 0 : cuota - cuotaDeducible;
  let irpf = redondear((base + ivaNoDeducido) * regla.irpf);
  if (f.categoria === 'equipos' && base > LIMITE_AMORTIZAR) {
    irpf = 0;
    motivos.push('amortizar');
  }
  return { tipo, iva, irpf, motivos };
}
