// Revisión de una factura: ver, corregir, confirmar, reabrir y borrar (RF-30 a RF-34).
// Responsable: Rodrigo (#19).
//
//   const factura = await obtenerFactura(usuarioId, facturaId);
//   await editarFactura(usuarioId, facturaId, { emisor: 'Movistar', lineas_iva: [...] });
//   await confirmarFactura(usuarioId, facturaId);
//   await reabrirFactura(usuarioId, facturaId);
//   await borrarFactura(usuarioId, facturaId);
//
// Todas filtran por usuario_id (RF-09). Solo se edita lo que está pendiente (RF-32) y
// cada cambio queda en factura_cambios (RF-33).
import { db } from '../../core/db.js';
import { cerrarAvisos, TIPOS_AVISO } from '../../core/avisos.js';
import { peticionIncorrecta, noEncontrado, conflicto } from '../../core/errores.js';
import { normalizarNif } from '../../core/validacion.js';
import { comprobarFactura } from './comprobaciones.js';

const redondear = (n) => Math.round(n * 100) / 100;

// Acepta 41.32, "41.32" y "41,32". Vacío -> null.
function aNumero(valor, campo, { positivo = false } = {}) {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = typeof valor === 'number' ? valor : Number(String(valor).trim().replace(',', '.'));
  if (!Number.isFinite(numero) || (positivo && numero <= 0)) throw peticionIncorrecta('El número no es válido', { campo });
  return numero;
}

function aTexto(valor, campo, maximo = 200) {
  const texto = String(valor ?? '').trim();
  if (texto.length > maximo) throw peticionIncorrecta('El texto es demasiado largo', { campo });
  return texto || null;
}

// Cómo se valida y se guarda cada campo editable.
const CAMPOS = {
  emisor: (v) => aTexto(v, 'emisor'),
  numero: (v) => aTexto(v, 'numero', 100),
  nif_emisor: (v) => (aTexto(v, 'nif_emisor', 30) ? normalizarNif(v) : null),
  nif_receptor: (v) => (aTexto(v, 'nif_receptor', 30) ? normalizarNif(v) : null),
  fecha: (v) => {
    if (!v) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) throw peticionIncorrecta('La fecha no es válida', { campo: 'fecha' });
    return v;
  },
  hora: (v) => {
    if (!v) return null;
    if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(v)) throw peticionIncorrecta('La hora no es válida', { campo: 'hora' });
    return v.slice(0, 5);
  },
  total: (v) => aNumero(v, 'total'),
  moneda: (v) => {
    const moneda = String(v ?? '').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(moneda)) throw peticionIncorrecta('La moneda tiene que ser un código de 3 letras, como EUR', { campo: 'moneda' });
    return moneda;
  },
  tipo_cambio: (v) => aNumero(v, 'tipo_cambio', { positivo: true }),
  categoria_id: (v) => (v === null || v === '' || v === undefined ? null : aNumero(v, 'categoria_id', { positivo: true })),
};

function leerLineas(lineas) {
  if (!Array.isArray(lineas) || lineas.length > 20) throw peticionIncorrecta('Las líneas de IVA no son válidas', { campo: 'lineas_iva' });
  return lineas.map((linea) => {
    const base = aNumero(linea?.base, 'lineas_iva');
    const tipo = aNumero(linea?.tipo, 'lineas_iva') ?? 0;
    if (base === null || tipo < 0 || tipo > 100) throw peticionIncorrecta('Cada línea de IVA necesita base y tipo', { campo: 'lineas_iva' });
    const cuota = aNumero(linea.cuota, 'lineas_iva') ?? redondear((base * tipo) / 100);
    return { base: redondear(base), tipo, cuota: redondear(cuota) };
  });
}

// Texto que se guarda en el historial. Las fechas y horas llegan de la base de datos ya como texto.
const comoTexto = (valor) => (valor === null || valor === undefined ? null : String(valor));
// La hora llega de la base de datos como "10:30:00"; en el historial basta con "10:30".
const valorDe = (campo, valor) => (campo === 'hora' && valor ? String(valor).slice(0, 5) : comoTexto(valor));
const textoLineas = (lineas) => JSON.stringify(lineas.map(({ base, tipo, cuota }) => ({ base, tipo, cuota })));

async function cargar(conexion, usuarioId, facturaId, { bloquear = false } = {}) {
  const { rows: [factura] } = await conexion.query(
    `SELECT * FROM facturas WHERE id = $1 AND usuario_id = $2 ${bloquear ? 'FOR UPDATE' : ''}`,
    [facturaId, usuarioId],
  );
  if (!factura) throw noEncontrado('No hemos encontrado esta factura');
  return factura;
}

export async function obtenerFactura(usuarioId, facturaId) {
  const factura = await cargar(db, usuarioId, facturaId);
  const [lineas, avisos, cambios, categoria, duplicado, original, siguiente] = await Promise.all([
    db.query('SELECT id, base, tipo, cuota FROM factura_iva WHERE factura_id = $1 ORDER BY id', [facturaId]),
    db.query(
      `SELECT id, tipo, datos, creado_en FROM avisos
        WHERE factura_id = $1 AND usuario_id = $2 AND estado = 'abierto' ORDER BY creado_en`,
      [facturaId, usuarioId],
    ),
    db.query(
      `SELECT id, accion, campo, valor_anterior, valor_nuevo, creado_en FROM factura_cambios
        WHERE factura_id = $1 ORDER BY creado_en DESC, id DESC`,
      [facturaId],
    ),
    factura.categoria_id
      ? db.query('SELECT id, clave, nombre FROM categorias WHERE id = $1', [factura.categoria_id])
      : { rows: [] },
    factura.duplicado_de
      ? db.query(
        `SELECT id, estado, fecha, emisor, numero, total, moneda FROM facturas WHERE id = $1 AND usuario_id = $2`,
        [factura.duplicado_de, usuarioId],
      )
      : { rows: [] },
    factura.original_id
      ? db.query('SELECT nombre_archivo, tipo_mime, tamano FROM originales WHERE id = $1 AND usuario_id = $2', [factura.original_id, usuarioId])
      : { rows: [] },
    // Para el botón "Siguiente pendiente": la siguiente del histórico (más reciente primero).
    db.query(
      `SELECT id FROM facturas
        WHERE usuario_id = $1 AND estado = 'pendiente' AND id <> $2
        ORDER BY COALESCE(fecha, creado_en::date) DESC, creado_en DESC, id DESC LIMIT 1`,
      [usuarioId, facturaId],
    ),
  ]);

  const { datos_ia: datosIa, ...resto } = factura;
  return {
    ...resto,
    leida_por_ia: datosIa !== null,
    lineas_iva: lineas.rows,
    avisos: avisos.rows,
    cambios: cambios.rows,
    categoria: categoria.rows[0] ?? null,
    duplicado_de: duplicado.rows[0] ?? null,
    original: original.rows[0] ?? null,
    siguiente_pendiente: siguiente.rows[0]?.id ?? null,
  };
}

export async function editarFactura(usuarioId, facturaId, datos = {}) {
  if (!datos || typeof datos !== 'object') throw peticionIncorrecta('No hay nada que cambiar');
  const campos = Object.keys(datos).filter((c) => c in CAMPOS);
  const conLineas = 'lineas_iva' in datos;
  if (!campos.length && !conLineas) throw peticionIncorrecta('No hay nada que cambiar');

  const nuevos = Object.fromEntries(campos.map((c) => [c, CAMPOS[c](datos[c])]));
  const lineas = conLineas ? leerLineas(datos.lineas_iva) : null;

  if (nuevos.categoria_id) {
    const { rows } = await db.query(
      'SELECT id FROM categorias WHERE id = $1 AND (usuario_id IS NULL OR usuario_id = $2)',
      [nuevos.categoria_id, usuarioId],
    );
    if (!rows[0]) throw peticionIncorrecta('Esa categoría no existe', { campo: 'categoria_id' });
  }

  await db.transaccion(async (tx) => {
    const factura = await cargar(tx, usuarioId, facturaId, { bloquear: true });
    if (factura.estado !== 'pendiente') {
      throw conflicto(factura.estado === 'confirmada'
        ? 'Esta factura ya está confirmada. Reábrela para cambiarla.'
        : 'Esta factura aún no se ha leído.');
    }

    const cambios = [];
    for (const [campo, valor] of Object.entries(nuevos)) {
      const anterior = valorDe(campo, factura[campo]);
      if (anterior !== valorDe(campo, valor)) cambios.push([campo, anterior, valorDe(campo, valor)]);
    }

    // Líneas de IVA: se reemplazan todas y se recalculan base y cuota.
    let base = factura.base_imponible;
    let cuota = factura.cuota_iva;
    if (lineas) {
      const { rows: antes } = await tx.query('SELECT base, tipo, cuota FROM factura_iva WHERE factura_id = $1 ORDER BY id', [facturaId]);
      if (textoLineas(antes) !== textoLineas(lineas)) {
        cambios.push(['lineas_iva', textoLineas(antes), textoLineas(lineas)]);
        await tx.query('DELETE FROM factura_iva WHERE factura_id = $1', [facturaId]);
        for (const l of lineas) {
          await tx.query('INSERT INTO factura_iva (factura_id, base, tipo, cuota) VALUES ($1, $2, $3, $4)', [facturaId, l.base, l.tipo, l.cuota]);
        }
      }
      base = lineas.length ? redondear(lineas.reduce((s, l) => s + l.base, 0)) : null;
      cuota = lineas.length ? redondear(lineas.reduce((s, l) => s + l.cuota, 0)) : null;
    }
    if (!cambios.length) return;

    // Total en euros (RF-25): igual al total si es en euros; si no, con el tipo de cambio.
    const final = { ...factura, ...nuevos };
    if (final.moneda === 'EUR') final.tipo_cambio = null;
    const totalEur = final.total === null ? null
      : final.moneda === 'EUR' ? final.total
        : final.tipo_cambio ? redondear(final.total * final.tipo_cambio) : null;

    await tx.query(
      `UPDATE facturas SET emisor = $3, numero = $4, nif_emisor = $5, nif_receptor = $6, fecha = $7::text::date,
              hora = $8::text::time, total = $9, moneda = $10, tipo_cambio = $11, categoria_id = $12,
              base_imponible = $13, cuota_iva = $14, total_eur = $15, actualizado_en = now()
        WHERE id = $1 AND usuario_id = $2`,
      [facturaId, usuarioId, final.emisor, final.numero, final.nif_emisor, final.nif_receptor, final.fecha,
        final.hora, final.total, final.moneda, final.tipo_cambio, final.categoria_id, base, cuota, totalEur],
    );
    for (const [campo, anterior, nuevo] of cambios) {
      await tx.query(
        `INSERT INTO factura_cambios (factura_id, accion, campo, valor_anterior, valor_nuevo) VALUES ($1, 'editar', $2, $3, $4)`,
        [facturaId, campo, anterior, nuevo],
      );
    }
  });

  await comprobarFactura(facturaId);
  return obtenerFactura(usuarioId, facturaId);
}

export async function confirmarFactura(usuarioId, facturaId) {
  await db.transaccion(async (tx) => {
    const factura = await cargar(tx, usuarioId, facturaId, { bloquear: true });
    if (factura.estado === 'confirmada') throw conflicto('Esta factura ya está confirmada');
    if (factura.estado !== 'pendiente') throw conflicto('Esta factura aún no se ha leído');
    await tx.query(
      `UPDATE facturas SET estado = 'confirmada', confirmada_en = now(), actualizado_en = now() WHERE id = $1`,
      [facturaId],
    );
    await tx.query(`INSERT INTO factura_cambios (factura_id, accion) VALUES ($1, 'confirmar')`, [facturaId]);
    await cerrarAvisos({ usuarioId, tipo: TIPOS_AVISO.PENDIENTE_REVISAR, facturaId }, tx);
  });
  return obtenerFactura(usuarioId, facturaId);
}

export async function reabrirFactura(usuarioId, facturaId) {
  await db.transaccion(async (tx) => {
    const factura = await cargar(tx, usuarioId, facturaId, { bloquear: true });
    if (factura.estado !== 'confirmada') throw conflicto('Solo se puede reabrir una factura confirmada');
    await tx.query(
      `UPDATE facturas SET estado = 'pendiente', confirmada_en = NULL, actualizado_en = now() WHERE id = $1`,
      [facturaId],
    );
    await tx.query(`INSERT INTO factura_cambios (factura_id, accion) VALUES ($1, 'reabrir')`, [facturaId]);
  });
  return obtenerFactura(usuarioId, facturaId);
}

export async function borrarFactura(usuarioId, facturaId) {
  await db.transaccion(async (tx) => {
    const factura = await cargar(tx, usuarioId, facturaId, { bloquear: true });
    if (factura.estado === 'confirmada') throw conflicto('Una factura confirmada no se puede borrar');
    await tx.query('DELETE FROM facturas WHERE id = $1 AND usuario_id = $2', [facturaId, usuarioId]);
    if (factura.original_id) {
      await tx.query('DELETE FROM originales WHERE id = $1 AND usuario_id = $2', [factura.original_id, usuarioId]);
    }
  });
}
