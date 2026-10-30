// Datos que se exportan: solo facturas confirmadas (RF-51), siempre del usuario de la sesión (RF-09).
// Responsable: Ana (#25).
import { db } from '../../core/db.js';
import { rangoTrimestre } from '../../core/fiscal.js';

// Tipos de IVA con columna propia en el Excel; el resto se suma en "otros".
export const TIPOS_IVA = [21, 10, 4, 0];

const redondear = (n) => Math.round(n * 100) / 100;

// Facturas confirmadas entre dos fechas (incluidas), con sus líneas de IVA agrupadas por tipo.
export async function facturasConfirmadas(usuarioId, { desde, hasta, categorias = [] }) {
  const params = [usuarioId, desde, hasta];
  let filtroCategorias = '';
  if (categorias.length) {
    params.push(categorias);
    filtroCategorias = `AND f.categoria_id = ANY($${params.length}::int[])`;
  }
  return consultarFacturas(
    // Solo las de la versión de empresa: los tickets personales no van a Hacienda (#50).
    `f.usuario_id = $1 AND f.version = 'empresa' AND f.estado = 'confirmada' AND f.fecha BETWEEN $2::text::date AND $3::text::date ${filtroCategorias}`,
    params,
  );
}

// Todas las facturas del usuario en los estados indicados, sin límite de fechas (copia antes de la baja, RF-62).
export async function facturasPorEstado(usuarioId, estados) {
  return consultarFacturas('f.usuario_id = $1 AND f.estado = ANY($2::text[])', [usuarioId, estados]);
}

async function consultarFacturas(condicion, params) {
  const { rows: facturas } = await db.query(
    `SELECT f.id, f.fecha, f.emisor, f.nif_emisor, f.nif_receptor, f.numero, f.base_imponible, f.cuota_iva,
            f.total, f.moneda, f.tipo_cambio, f.total_eur, f.categoria_id, c.nombre AS categoria
       FROM facturas f LEFT JOIN categorias c ON c.id = f.categoria_id
      WHERE ${condicion}
      ORDER BY f.fecha NULLS LAST, f.id`,
    params,
  );
  if (!facturas.length) return [];

  const { rows: lineas } = await db.query(
    'SELECT factura_id, base, tipo, cuota FROM factura_iva WHERE factura_id = ANY($1::int[])',
    [facturas.map((f) => f.id)],
  );
  const porFactura = new Map();
  for (const l of lineas) {
    const iva = porFactura.get(l.factura_id) || {};
    const clave = TIPOS_IVA.includes(Number(l.tipo)) ? String(Number(l.tipo)) : 'otros';
    iva[clave] = { base: redondear((iva[clave]?.base || 0) + l.base), cuota: redondear((iva[clave]?.cuota || 0) + l.cuota) };
    porFactura.set(l.factura_id, iva);
  }
  return facturas.map((f) => {
    const cambio = f.moneda === 'EUR' ? 1 : f.tipo_cambio || 1;
    return {
      ...f,
      iva: porFactura.get(f.id) || {},
      // Importes pasados a euros para poder sumar facturas en distintas monedas (RF-25).
      base_eur: redondear((f.base_imponible || 0) * cambio),
      cuota_eur: redondear((f.cuota_iva || 0) * cambio),
      total_eur: f.total_eur ?? redondear((f.total || 0) * cambio),
      cambio,
    };
  });
}

function trimestreAnterior(anio, trimestre) {
  return trimestre === 1 ? { anio: anio - 1, trimestre: 4 } : { anio, trimestre: trimestre - 1 };
}

function resumir(facturas) {
  const gasto = redondear(facturas.reduce((s, f) => s + f.total_eur, 0));
  const iva = redondear(facturas.reduce((s, f) => s + f.cuota_eur, 0));
  const base = redondear(facturas.reduce((s, f) => s + f.base_eur, 0));
  return { gasto, iva, base, cantidad: facturas.length };
}

// Todo lo que lleva el informe trimestral (RF-52).
export async function datosInforme(usuarioId, anio, trimestre) {
  const rango = rangoTrimestre(anio, trimestre);
  const facturas = await facturasConfirmadas(usuarioId, rango);
  const anterior = trimestreAnterior(anio, trimestre);
  const facturasAnterior = await facturasConfirmadas(usuarioId, rangoTrimestre(anterior.anio, anterior.trimestre));

  const categorias = new Map();
  for (const f of facturas) {
    const nombre = f.categoria || null;
    const c = categorias.get(nombre) || { nombre, gasto: 0, cantidad: 0 };
    c.gasto = redondear(c.gasto + f.total_eur);
    c.cantidad += 1;
    categorias.set(nombre, c);
  }

  const ivaPorTipo = new Map();
  for (const f of facturas) {
    for (const [tipo, l] of Object.entries(f.iva)) {
      const actual = ivaPorTipo.get(tipo) || { tipo, base: 0, cuota: 0 };
      actual.base = redondear(actual.base + l.base * f.cambio);
      actual.cuota = redondear(actual.cuota + l.cuota * f.cambio);
      ivaPorTipo.set(tipo, actual);
    }
  }

  const { rows: avisos } = await db.query(
    `SELECT tipo, count(*)::int AS cantidad FROM avisos
      WHERE usuario_id = $1 AND estado = 'abierto' GROUP BY tipo ORDER BY cantidad DESC, tipo`,
    [usuarioId],
  );
  const { rows: [sinConfirmar] } = await db.query(
    `SELECT count(*)::int AS cantidad FROM facturas
      WHERE usuario_id = $1 AND estado <> 'confirmada' AND version = 'empresa'
        AND COALESCE(fecha, creado_en::date) BETWEEN $2::text::date AND $3::text::date`,
    [usuarioId, rango.desde, rango.hasta],
  );
  const { rows: [usuario] } = await db.query(
    `SELECT u.nombre, u.idioma, p.nif FROM usuarios u LEFT JOIN perfiles_fiscales p ON p.usuario_id = u.id WHERE u.id = $1`,
    [usuarioId],
  );

  return {
    anio, trimestre, ...rango, usuario,
    resumen: resumir(facturas),
    anterior: { ...anterior, ...resumir(facturasAnterior) },
    categorias: [...categorias.values()].sort((a, b) => b.gasto - a.gasto),
    ivaPorTipo: [...ivaPorTipo.values()].sort((a, b) => Number(b.tipo === 'otros' ? -1 : b.tipo) - Number(a.tipo === 'otros' ? -1 : a.tipo)),
    avisos,
    sinConfirmar: sinConfirmar.cantidad,
    facturas,
  };
}

export async function idiomaDe(usuarioId) {
  const { rows } = await db.query('SELECT idioma FROM usuarios WHERE id = $1', [usuarioId]);
  return rows[0]?.idioma === 'en' ? 'en' : 'es';
}
