// Lectura automática de facturas con IA (Gemini, de Google). Responsable: Dani (#13).
//
//   await leerFactura(facturaId);      // lee el original, guarda los datos, deja la factura 'pendiente'
//                                      // y llama a comprobarFactura() de facturas/comprobaciones.js
//   await leerSinLeer(usuarioId);      // lee las 'sin_leer' mientras queden lecturas (al ampliar plan)
//
// Si falla la llamada a la IA (red, error del servicio) lanza el error y la factura se queda
// sin datos: quien la llamó decide qué hacer (la subida la devuelve a 'sin_leer').
// Si no hay clave de API o la IA no puede leerla, la deja 'pendiente' con los campos vacíos
// para que el usuario los rellene en la revisión, y explica el motivo en datos_ia.
import { db, aBuffer } from '../../core/db.js';
import { config } from '../../config.js';
import { cerrarAvisos, TIPOS_AVISO } from '../../core/avisos.js';
import { comprobarFactura } from '../facturas/comprobaciones.js';
import { obtenerUso } from '../suscripcion/uso.js';
import { EsquemaFactura, limpiarLectura } from './esquema.js';
import { leerConGemini, claveGemini, modeloGemini } from './gemini.js';
import { tipoDeCambio as tipoDeCambioBce } from './cambio.js';

// Gemini admite hasta 20 MB por petición (el archivo va en base64, que ocupa un tercio más).
const ARCHIVO_MAXIMO = 14 * 1024 * 1024;

const INSTRUCCIONES = `Eres el lector de facturas de Cuadra, una app de gastos para autónomos en España.
Extrae los datos de la factura o ticket que te pasan. Reglas:
- No inventes nada. Si un dato no aparece o no se lee bien, pon null.
- fecha en formato AAAA-MM-DD; hora en HH:MM solo si aparece (habitual en tickets).
- emisor: el comercio o empresa que cobra, no el cliente.
- nif_emisor y nif_receptor tal como aparecen. El receptor es el cliente; en un ticket simplificado normalmente no aparece: pon null.
- lineas_iva: una línea por cada tipo de IVA distinto (los tickets de supermercado suelen tener 4 %, 10 % y 21 %).
  Si solo aparece el total con "IVA incluido" y el tipo, calcula base y cuota. Si la factura no lleva IVA
  (por ejemplo, una suscripción extranjera con inversión del sujeto pasivo), pon una línea con tipo 0, base = total y cuota 0.
  Si no hay ninguna información de impuestos, deja la lista vacía.
- total: el importe final pagado, con impuestos, en la moneda de la factura.
- moneda: código ISO 4217 (EUR, USD, GBP…).
- categoria: elige la que mejor encaje de esta lista, copiando su nombre exacto, o null si ninguna encaja:`;

let lectorIa = leerConGemini;
let tipoDeCambio = tipoDeCambioBce;

// Para los tests: sustituir la IA y el tipo de cambio por versiones falsas.
// El lector recibe { instrucciones, archivo, mime } y devuelve { datos, motivo }.
export function usarLectorIa(funcion) { lectorIa = funcion; }
export function usarTipoDeCambio(funcion) { tipoDeCambio = funcion; }

// En los tests nunca se llama a la IA de verdad, aunque haya clave en el .env.
const hayIa = () => lectorIa !== leerConGemini || (Boolean(claveGemini()) && !config.pruebas);

async function categoriasDelUsuario(usuarioId) {
  const { rows } = await db.query(
    `SELECT c.id, c.nombre FROM categorias c
       LEFT JOIN perfiles_fiscales p ON p.usuario_id = $1
      WHERE c.usuario_id = $1
         OR (c.usuario_id IS NULL AND (cardinality(c.actividades) = 0 OR p.actividad = ANY(c.actividades)))
      ORDER BY c.nombre`,
    [usuarioId],
  );
  return rows;
}

async function guardarSinDatos(facturaId, motivo) {
  await db.query(
    `UPDATE facturas SET estado = 'pendiente', datos_ia = $2, leida_en = COALESCE(leida_en, now()), actualizado_en = now()
      WHERE id = $1 AND estado <> 'confirmada'`,
    [facturaId, JSON.stringify({ motivo })],
  );
}

async function guardarLectura(factura, datos, respuesta, categorias) {
  const base = datos.lineas_iva.length ? datos.lineas_iva.reduce((s, l) => s + l.base, 0) : null;
  const cuota = datos.lineas_iva.length ? datos.lineas_iva.reduce((s, l) => s + l.cuota, 0) : null;
  const cambio = datos.moneda === 'EUR' ? 1 : await tipoDeCambio(datos.moneda, datos.fecha);
  const totalEur = datos.total !== null && cambio ? Math.round(datos.total * cambio * 100) / 100 : null;
  const nombre = datos.categoria?.toLowerCase();
  const categoria = categorias.find((c) => c.nombre.toLowerCase() === nombre);

  await db.transaccion(async (tx) => {
    const { rowCount } = await tx.query(
      `UPDATE facturas SET
         estado = 'pendiente', fecha = $2, hora = $3, emisor = $4, nif_emisor = $5, nif_receptor = $6, numero = $7,
         base_imponible = $8, cuota_iva = $9, total = $10, moneda = $11, tipo_cambio = $12, total_eur = $13,
         categoria_id = $14, datos_ia = $15, leida_en = COALESCE(leida_en, now()), actualizado_en = now()
       WHERE id = $1 AND estado <> 'confirmada'`,
      [factura.id, datos.fecha, datos.hora, datos.emisor, datos.nif_emisor, datos.nif_receptor, datos.numero,
        base === null ? null : Math.round(base * 100) / 100, cuota === null ? null : Math.round(cuota * 100) / 100,
        datos.total, datos.moneda, datos.moneda === 'EUR' ? null : cambio, totalEur,
        categoria?.id ?? null, JSON.stringify({ ...respuesta, categoria_propuesta: datos.categoria })],
    );
    if (!rowCount) return;
    await tx.query('DELETE FROM factura_iva WHERE factura_id = $1', [factura.id]);
    for (const linea of datos.lineas_iva) {
      await tx.query('INSERT INTO factura_iva (factura_id, base, tipo, cuota) VALUES ($1, $2, $3, $4)',
        [factura.id, linea.base, linea.tipo, linea.cuota]);
    }
  });
}

export async function leerFactura(facturaId) {
  const { rows: [factura] } = await db.query(
    `SELECT f.id, f.usuario_id, f.estado, o.tipo_mime, o.contenido
       FROM facturas f JOIN originales o ON o.id = f.original_id WHERE f.id = $1`,
    [facturaId],
  );
  if (!factura) throw new Error(`La factura ${facturaId} no existe o no tiene original`);
  if (factura.estado === 'confirmada') return;

  if (!hayIa()) {
    console.warn('[lectura] Sin GEMINI_API_KEY: la factura queda para rellenar a mano.');
    await guardarSinDatos(facturaId, 'sin_clave_api');
    return comprobarFactura(facturaId);
  }

  const archivo = aBuffer(factura.contenido);
  if (archivo.length > ARCHIVO_MAXIMO) {
    await guardarSinDatos(facturaId, 'archivo_demasiado_grande');
    return comprobarFactura(facturaId);
  }

  const categorias = await categoriasDelUsuario(factura.usuario_id);
  const { datos: leidos, motivo } = await lectorIa({
    instrucciones: `${INSTRUCCIONES}\n${categorias.map((c) => `- ${c.nombre}`).join('\n')}`,
    archivo,
    mime: factura.tipo_mime,
  });
  const valida = leidos ? EsquemaFactura.safeParse(leidos) : null;
  if (!valida?.success) {
    await guardarSinDatos(facturaId, motivo || 'respuesta_no_valida');
    return comprobarFactura(facturaId);
  }

  const datos = limpiarLectura(valida.data);
  await guardarLectura(factura, datos, { modelo: modeloGemini(), lectura: valida.data }, categorias);
  return comprobarFactura(facturaId);
}

// Lee las facturas 'sin_leer' del usuario, de la más antigua a la más nueva, mientras queden
// lecturas en su plan. Devuelve cuántas ha leído.
export async function leerSinLeer(usuarioId) {
  let leidas = 0;
  while ((await obtenerUso(usuarioId)).restantes > 0) {
    // Reservamos la lectura antes de llamar a la IA, igual que en la subida.
    const { rows: [factura] } = await db.query(
      `UPDATE facturas SET estado = 'pendiente', leida_en = now()
        WHERE id = (SELECT id FROM facturas WHERE usuario_id = $1 AND estado = 'sin_leer'
                     AND original_id IS NOT NULL ORDER BY creado_en, id LIMIT 1)
        RETURNING id`,
      [usuarioId],
    );
    if (!factura) break;
    try {
      await leerFactura(factura.id);
      leidas += 1;
    } catch (error) {
      console.warn(`[lectura] No se pudo leer la factura ${factura.id}: ${error.message}`);
      await db.query("UPDATE facturas SET estado = 'sin_leer', leida_en = NULL WHERE id = $1 AND datos_ia IS NULL", [factura.id]);
      break;
    }
  }
  const { rows } = await db.query("SELECT 1 FROM facturas WHERE usuario_id = $1 AND estado = 'sin_leer' LIMIT 1", [usuarioId]);
  if (!rows.length) await cerrarAvisos({ usuarioId, tipo: TIPOS_AVISO.SIN_LEER });
  return leidas;
}
