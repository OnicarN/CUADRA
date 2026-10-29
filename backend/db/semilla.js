// Carga datos de prueba en la base de datos local: un usuario demo con facturas,
// avisos y perfil fiscal, para poder trabajar en el panel, el histórico o la revisión
// sin tener hecha la subida ni la lectura.
//
//   npm run db:semilla      ->  entra con demo@cuadra.app / cuadra1234
//
// Si el usuario demo ya existe, lo borra y lo vuelve a crear.
import PDFDocument from 'pdfkit';
import { db } from '../src/core/db.js';
import { migrar } from './migrar.js';
import { cifrarContrasena } from '../src/core/auth.js';
import { crearUsuario } from '../src/modulos/auth/rutas.js';
import { crearAviso, TIPOS_AVISO } from '../src/core/avisos.js';

const EMAIL = 'demo@cuadra.app';
const NIF_DEMO = '12345678Z';

function haceDias(dias) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

function pdfFactura(f) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'A5', margin: 36 });
    const partes = [];
    doc.on('data', (p) => partes.push(p));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.fontSize(16).text(f.emisor).fontSize(9).text(`NIF ${f.nif_emisor || '—'}`).moveDown();
    doc.fontSize(11).text(`Factura ${f.numero || '(ticket)'}   ·   ${f.fecha}`).moveDown();
    doc.text(`Cliente: Demo Cuadra · NIF ${f.nif_receptor || '—'}`).moveDown();
    for (const l of f.iva) doc.text(`Base ${l.base.toFixed(2)} €   IVA ${l.tipo}%   ${l.cuota.toFixed(2)} €`);
    doc.moveDown().fontSize(14).text(`TOTAL ${f.total.toFixed(2)} ${f.moneda}`);
    doc.end();
  });
}

const FACTURAS = [
  { dias: 2,   emisor: 'Repsol Estación 4521', nif_emisor: 'A78374725', numero: null, categoria: 'combustible', iva: [[49.59, 21]], estado: 'pendiente', sinNifReceptor: true },
  { dias: 3,   emisor: 'Mercadona S.A.', nif_emisor: 'A46103834', numero: 'FS-2026-118273', categoria: 'comidas', iva: [[18.20, 10], [6.40, 21], [3.10, 4]], estado: 'pendiente' },
  { dias: 5,   emisor: 'Figma, Inc.', nif_emisor: null, numero: 'INV-88213', categoria: 'software', iva: [[15.00, 0]], moneda: 'USD', cambio: 0.92, estado: 'pendiente' },
  { dias: 9,   emisor: 'Movistar', nif_emisor: 'A82018474', numero: 'TF-55102', categoria: 'telefono', iva: [[41.32, 21]], estado: 'confirmada' },
  { dias: 12,  emisor: 'Renfe Viajeros', nif_emisor: 'A86868189', numero: '7712-AX', categoria: 'viajes', iva: [[62.73, 10]], estado: 'confirmada' },
  { dias: 16,  emisor: 'Amazon EU S.à r.l.', nif_emisor: 'W0184081H', numero: 'ES6123AEUI', categoria: 'material_oficina', iva: [[24.79, 21]], estado: 'confirmada' },
  { dias: 21,  emisor: 'Iberdrola Clientes', nif_emisor: 'A95758389', numero: '21000384712', categoria: 'suministros', iva: [[55.10, 21]], estado: 'confirmada' },
  { dias: 27,  emisor: 'Restaurante La Tagliatella', nif_emisor: 'B64458911', numero: 'T-0091', categoria: 'comidas', iva: [[38.18, 10]], estado: 'confirmada' },
  { dias: 33,  emisor: 'Adobe Systems Software', nif_emisor: 'IE6364992H', numero: 'IEE2026-11', categoria: 'software', iva: [[24.18, 21]], estado: 'confirmada' },
  { dias: 40,  emisor: 'Movistar', nif_emisor: 'A82018474', numero: 'TF-54011', categoria: 'telefono', iva: [[41.32, 21]], estado: 'confirmada' },
  { dias: 48,  emisor: 'MediaMarkt', nif_emisor: 'A62416061', numero: 'MM-339120', categoria: 'equipos', iva: [[743.80, 21]], estado: 'confirmada' },
  { dias: 63,  emisor: 'Colegio Oficial', nif_emisor: 'Q2863006I', numero: 'C-2026-301', categoria: 'cuotas', iva: [[90.00, 0]], estado: 'confirmada' },
  { dias: 75,  emisor: 'Iberdrola Clientes', nif_emisor: 'A95758389', numero: '21000377001', categoria: 'suministros', iva: [[61.40, 21]], estado: 'confirmada' },
  { dias: 96,  emisor: 'Udemy Ireland', nif_emisor: 'IE3365211OH', numero: 'UD-2219', categoria: 'formacion', iva: [[12.40, 21]], estado: 'confirmada' },
  { dias: 120, emisor: 'Repsol Estación 0187', nif_emisor: 'A78374725', numero: null, categoria: 'combustible', iva: [[57.85, 21]], estado: 'confirmada' },
  { dias: 1,   emisor: null, estado: 'sin_leer' },
];

async function main() {
  await migrar();
  await db.query('DELETE FROM usuarios WHERE email = $1', [EMAIL]);
  const usuarioId = await crearUsuario({
    nombre: 'Lucía Demo', email: EMAIL, passwordHash: await cifrarContrasena('cuadra1234'), verificado: true,
  });
  await db.query(
    `INSERT INTO perfiles_fiscales (usuario_id, nif, direccion, actividad, regimen_iva, email_gestoria)
     VALUES ($1, $2, 'Calle Mayor 1, 28013 Madrid', 'diseno', 'general', 'gestoria@ejemplo.com')`,
    [usuarioId, NIF_DEMO],
  );
  const { rows: cats } = await db.query('SELECT id, clave FROM categorias WHERE usuario_id IS NULL');
  const categoria = Object.fromEntries(cats.map((c) => [c.clave, c.id]));

  for (const f of FACTURAS) {
    const fecha = haceDias(f.dias);
    const moneda = f.moneda || 'EUR';
    const iva = (f.iva || []).map(([base, tipo]) => ({ base, tipo, cuota: Math.round(base * tipo) / 100 }));
    const base = iva.reduce((s, l) => s + l.base, 0);
    const cuota = iva.reduce((s, l) => s + l.cuota, 0);
    const total = Math.round((base + cuota) * 100) / 100;
    const datos = { ...f, fecha, moneda, iva, total, nif_receptor: f.sinNifReceptor ? null : NIF_DEMO };

    const pdf = await pdfFactura(f.emisor ? datos : { emisor: 'Ticket sin leer', fecha, iva: [], total: 0, moneda });
    const { rows: [original] } = await db.query(
      `INSERT INTO originales (usuario_id, nombre_archivo, tipo_mime, tamano, contenido)
       VALUES ($1, $2, 'application/pdf', $3, $4) RETURNING id`,
      [usuarioId, `factura-${fecha}.pdf`, pdf.length, pdf],
    );

    if (f.estado === 'sin_leer') {
      await db.query(
        `INSERT INTO facturas (usuario_id, original_id, estado, creado_en) VALUES ($1, $2, 'sin_leer', $3)`,
        [usuarioId, original.id, fecha],
      );
      continue;
    }

    const tipoCambio = moneda === 'EUR' ? null : f.cambio;
    const totalEur = moneda === 'EUR' ? total : Math.round(total * f.cambio * 100) / 100;
    const { rows: [factura] } = await db.query(
      `INSERT INTO facturas (usuario_id, original_id, estado, fecha, hora, emisor, nif_emisor, nif_receptor, numero,
                             base_imponible, cuota_iva, total, moneda, tipo_cambio, total_eur, categoria_id,
                             datos_ia, leida_en, confirmada_en, creado_en)
       VALUES ($1, $2, $3, $4::text::date, '10:30', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
               $4::text::timestamptz, $17, $4::text::timestamptz)
       RETURNING id`,
      [usuarioId, original.id, f.estado, fecha, f.emisor, f.nif_emisor, datos.nif_receptor, f.numero,
        base, cuota, total, moneda, tipoCambio, totalEur, categoria[f.categoria], JSON.stringify(datos),
        f.estado === 'confirmada' ? fecha : null],
    );
    for (const l of iva) {
      await db.query('INSERT INTO factura_iva (factura_id, base, tipo, cuota) VALUES ($1, $2, $3, $4)',
        [factura.id, l.base, l.tipo, l.cuota]);
    }
    if (f.sinNifReceptor) await crearAviso({ usuarioId, tipo: TIPOS_AVISO.SIN_NIF, facturaId: factura.id });
  }

  await crearAviso({ usuarioId, tipo: TIPOS_AVISO.SIN_LEER, clave: 'mes', datos: { cantidad: 1 } });
  console.log(`Datos de prueba cargados. Entra con ${EMAIL} / cuadra1234`);
}

await main();
await db.cerrar();
