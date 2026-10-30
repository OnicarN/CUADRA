// Comprobaciones automáticas de una factura. Crea o cierra los avisos que tocan.
// Se llama después de leer una factura (módulo lectura) y después de cada edición.
//
//   const avisos = await comprobarFactura(facturaId);   // avisos abiertos de la factura
//   await resolverDuplicado(usuarioId, facturaId, 'guardar' | 'descartar');
//
// Responsable: Rodrigo (#20).
// Comprueba:
//   - RF-27 base + cuotas = total            -> aviso TOTAL_NO_CUADRA
//   - RF-28 NIF del receptor = NIF del perfil -> aviso OTRO_NIF
//   - falta NIF del emisor o del receptor, o  -> aviso SIN_NIF (con datos.falta: emisor,
//     el IVA desglosado: sin IVA no se deduce    receptor y/o iva)
//   - RF-35 posible duplicado                 -> aviso DUPLICADO y facturas.duplicado_de
// Y cierra los avisos que ya no apliquen (por ejemplo, tras corregir el total).
import { db } from '../../core/db.js';
import { crearAviso, cerrarAvisos, TIPOS_AVISO } from '../../core/avisos.js';
import { normalizarNif } from '../../core/validacion.js';
import { peticionIncorrecta, noEncontrado, conflicto } from '../../core/errores.js';
import { obtenerPerfil } from '../perfil/servicio.js';
import { borrarFactura } from './revision.js';

// Diferencia que se permite entre base + IVA y el total, por los redondeos de cada ticket.
const TOLERANCIA = 0.02;

// Crea el aviso si se cumple la condición y lo cierra si no.
async function avisarSi(condicion, { usuarioId, facturaId, tipo, datos }) {
  if (condicion) await crearAviso({ usuarioId, tipo, facturaId, datos });
  else await cerrarAvisos({ usuarioId, tipo, facturaId });
}

// RF-35. Busca una factura anterior del mismo usuario que parezca la misma: con número,
// mismo NIF del emisor, número y total; sin número (tickets), mismo emisor, fecha, hora y total.
// Solo se compara con las anteriores, así la repetida es siempre la que llegó después.
async function buscarDuplicado(f) {
  const comun = `usuario_id = $1 AND id <> $2 AND estado <> 'sin_leer' AND NOT duplicado_aceptado
    AND (creado_en, id) < ($3::timestamptz, $2) AND total = $4`;
  if (f.numero && f.nif_emisor) {
    const { rows } = await db.query(
      `SELECT id FROM facturas
        WHERE ${comun}
          AND upper(regexp_replace(nif_emisor, '[\\s.-]', '', 'g')) = $5
          AND lower(trim(numero)) = lower(trim($6))
        ORDER BY creado_en, id LIMIT 1`,
      [f.usuario_id, f.id, f.creado_en, f.total, normalizarNif(f.nif_emisor), f.numero],
    );
    return rows[0]?.id ?? null;
  }
  if (!f.numero && f.emisor && f.fecha) {
    const { rows } = await db.query(
      `SELECT id FROM facturas
        WHERE ${comun} AND numero IS NULL
          AND lower(trim(emisor)) = lower(trim($5)) AND fecha = $6::text::date
          AND hora IS NOT DISTINCT FROM $7::text::time
        ORDER BY creado_en, id LIMIT 1`,
      [f.usuario_id, f.id, f.creado_en, f.total, f.emisor, f.fecha, f.hora],
    );
    return rows[0]?.id ?? null;
  }
  return null;
}

export async function comprobarFactura(facturaId) {
  const { rows: [f] } = await db.query('SELECT * FROM facturas WHERE id = $1', [facturaId]);
  if (!f) return [];
  const usuarioId = f.usuario_id;
  const contexto = { usuarioId, facturaId };

  // Sin leer, o leída sin sacar nada (la IA no pudo): no hay datos que comprobar todavía.
  const conDatos = f.estado !== 'sin_leer' && (f.emisor || f.total !== null || f.numero);
  if (!conDatos) {
    for (const tipo of [TIPOS_AVISO.TOTAL_NO_CUADRA, TIPOS_AVISO.OTRO_NIF, TIPOS_AVISO.SIN_NIF, TIPOS_AVISO.DUPLICADO]) {
      await cerrarAvisos({ usuarioId, tipo, facturaId });
    }
  } else {
    // RF-27: base + IVA = total. Si falta alguno de los tres no se puede comprobar.
    const sePuedeSumar = f.total !== null && f.base_imponible !== null && f.cuota_iva !== null;
    const diferencia = sePuedeSumar ? Math.round((f.base_imponible + f.cuota_iva - f.total) * 100) / 100 : 0;
    await avisarSi(Math.abs(diferencia) > TOLERANCIA, {
      ...contexto, tipo: TIPOS_AVISO.TOTAL_NO_CUADRA,
      datos: { base: f.base_imponible, cuota: f.cuota_iva, total: f.total, diferencia },
    });

    // RF-28: la factura tiene que ir a nombre del NIF del perfil.
    const perfil = await obtenerPerfil(usuarioId);
    const receptor = normalizarNif(f.nif_receptor);
    await avisarSi(Boolean(perfil?.nif && receptor && receptor !== normalizarNif(perfil.nif)), {
      ...contexto, tipo: TIPOS_AVISO.OTRO_NIF, datos: { nif_receptor: f.nif_receptor },
    });

    // Sin el NIF del emisor o del receptor, o sin el IVA desglosado, no se puede deducir el IVA:
    // hay que pedir la factura completa. Las facturas en otra moneda no se miran por el IVA,
    // porque las de fuera de España no lo llevan.
    const { rows: [{ lineas }] } = await db.query('SELECT count(*)::int AS lineas FROM factura_iva WHERE factura_id = $1', [facturaId]);
    const sinDesglose = f.moneda === 'EUR' && !lineas && f.cuota_iva === null;
    const falta = [!f.nif_emisor && 'emisor', !f.nif_receptor && 'receptor', sinDesglose && 'iva'].filter(Boolean);
    await avisarSi(falta.length > 0, { ...contexto, tipo: TIPOS_AVISO.SIN_NIF, datos: { falta } });
    // Si ya estaba abierto y ahora falta otra cosa (por ejemplo, ha puesto el NIF), se actualiza el texto.
    if (falta.length) {
      await db.query(
        "UPDATE avisos SET datos = $3 WHERE factura_id = $1 AND tipo = $2 AND estado = 'abierto' AND datos IS DISTINCT FROM $3::jsonb",
        [facturaId, TIPOS_AVISO.SIN_NIF, JSON.stringify({ falta })],
      );
    }

    // RF-35: posible duplicado. Si el usuario ya dijo que la guarda, no se vuelve a preguntar.
    const duplicadoDe = f.duplicado_aceptado || f.total === null ? null : await buscarDuplicado(f);
    if (duplicadoDe !== f.duplicado_de) {
      await db.query('UPDATE facturas SET duplicado_de = $2 WHERE id = $1', [facturaId, duplicadoDe]);
    }
    if (duplicadoDe) {
      // Si apunta a otra factura distinta, el aviso viejo ya no vale.
      const { rows: [abierto] } = await db.query(
        `SELECT datos FROM avisos WHERE factura_id = $1 AND tipo = $2 AND estado = 'abierto'`,
        [facturaId, TIPOS_AVISO.DUPLICADO],
      );
      if (abierto && abierto.datos?.duplicado_de !== duplicadoDe) await cerrarAvisos({ usuarioId, tipo: TIPOS_AVISO.DUPLICADO, facturaId });
    }
    await avisarSi(Boolean(duplicadoDe), { ...contexto, tipo: TIPOS_AVISO.DUPLICADO, datos: { duplicado_de: duplicadoDe } });
  }

  const { rows } = await db.query(
    `SELECT id, tipo, datos, creado_en FROM avisos WHERE factura_id = $1 AND estado = 'abierto' ORDER BY creado_en, id`,
    [facturaId],
  );
  return rows;
}

// RF-36. El usuario decide: 'descartar' borra la factura repetida (si no está confirmada) y
// 'guardar' la deja y no vuelve a avisar.
export async function resolverDuplicado(usuarioId, facturaId, accion) {
  if (!['descartar', 'guardar'].includes(accion)) throw peticionIncorrecta('La acción tiene que ser "descartar" o "guardar"');
  const { rows: [f] } = await db.query(
    'SELECT id, duplicado_de FROM facturas WHERE id = $1 AND usuario_id = $2',
    [facturaId, usuarioId],
  );
  if (!f) throw noEncontrado('No hemos encontrado esta factura');
  if (!f.duplicado_de) throw conflicto('Esta factura no está marcada como posible duplicado');

  if (accion === 'descartar') {
    await borrarFactura(usuarioId, facturaId); // ya se niega si está confirmada (RF-34)
    return { borrada: true, duplicado_de: f.duplicado_de };
  }
  await db.query(
    'UPDATE facturas SET duplicado_aceptado = true, duplicado_de = NULL, actualizado_en = now() WHERE id = $1 AND usuario_id = $2',
    [facturaId, usuarioId],
  );
  await cerrarAvisos({ usuarioId, tipo: TIPOS_AVISO.DUPLICADO, facturaId });
  return { borrada: false };
}
