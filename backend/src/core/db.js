// Acceso a la base de datos PostgreSQL.
// - Con DATABASE_URL (producción): PostgreSQL real con `pg`.
// - Sin DATABASE_URL (local): PGlite, un PostgreSQL que corre dentro de Node y guarda
//   los datos en backend/.data/db. No hay que instalar nada. En los tests, en memoria.
// Las dos opciones hablan el mismo SQL, así que el código es el mismo.
//
// Uso:
//   import { db } from '../../core/db.js';
//   const { rows } = await db.query('SELECT * FROM facturas WHERE usuario_id = $1', [id]);
//   await db.transaccion(async (tx) => { await tx.query(...); await tx.query(...); });
//
// Los NUMERIC llegan como número, los DATE como texto 'AAAA-MM-DD' y los BYTEA como
// Buffer o Uint8Array (usa aBuffer() si necesitas un Buffer).
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

const NUMERIC = 1700;
const INT8 = 20;
const DATE = 1082;

let motor = null;

async function conectarPg() {
  const { default: pg } = await import('pg');
  pg.types.setTypeParser(NUMERIC, (v) => (v === null ? null : Number(v)));
  pg.types.setTypeParser(INT8, (v) => (v === null ? null : Number(v)));
  pg.types.setTypeParser(DATE, (v) => v);
  const local = /localhost|127\.0\.0\.1/.test(config.databaseUrl);
  const pool = new pg.Pool({
    connectionString: config.databaseUrl,
    ssl: local ? false : { rejectUnauthorized: false },
    max: 5,
  });
  const normalizar = (r) => ({ rows: r.rows, rowCount: r.rowCount });
  return {
    query: async (texto, params) => normalizar(await pool.query(texto, params)),
    exec: async (texto) => { await pool.query(texto); },
    transaccion: async (fn) => {
      const cliente = await pool.connect();
      try {
        await cliente.query('BEGIN');
        const tx = { query: async (t, p) => normalizar(await cliente.query(t, p)) };
        const resultado = await fn(tx);
        await cliente.query('COMMIT');
        return resultado;
      } catch (error) {
        await cliente.query('ROLLBACK');
        throw error;
      } finally {
        cliente.release();
      }
    },
    cerrar: () => pool.end(),
  };
}

async function conectarPglite() {
  const { PGlite } = await import('@electric-sql/pglite');
  const carpeta = path.join(config.carpetaDatos, 'db');
  fs.mkdirSync(carpeta, { recursive: true });
  const opciones = {
    parsers: {
      [NUMERIC]: (v) => (v === null ? null : Number(v)),
      [INT8]: (v) => (v === null ? null : Number(v)),
      [DATE]: (v) => v,
    },
  };
  // En los tests la base de datos vive solo en memoria.
  const pglite = config.pruebas ? new PGlite(opciones) : new PGlite(carpeta, opciones);
  await pglite.waitReady;
  const normalizar = (r) => ({ rows: r.rows, rowCount: r.affectedRows ?? r.rows.length });
  return {
    query: async (texto, params) => normalizar(await pglite.query(texto, params)),
    exec: async (texto) => { await pglite.exec(texto); },
    transaccion: (fn) =>
      pglite.transaction(async (t) => fn({ query: async (q, p) => normalizar(await t.query(q, p)) })),
    cerrar: () => pglite.close(),
  };
}

async function obtenerMotor() {
  if (!motor) motor = config.databaseUrl ? conectarPg() : conectarPglite();
  return motor;
}

export const db = {
  query: async (texto, params = []) => (await obtenerMotor()).query(texto, params),
  exec: async (texto) => (await obtenerMotor()).exec(texto),
  transaccion: async (fn) => (await obtenerMotor()).transaccion(fn),
  cerrar: async () => {
    if (!motor) return;
    const m = await motor;
    motor = null;
    await m.cerrar();
  },
};

export function aBuffer(bytes) {
  return Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
}
