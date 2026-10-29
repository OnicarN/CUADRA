// Aplica en orden los archivos .sql de db/migraciones que aún no se han aplicado.
// Se ejecuta solo al arrancar el servidor; también a mano con `npm run db:migrar`.
//
// Para cambiar la base de datos NO edites una migración ya existente: crea un archivo
// nuevo en tu rango de números (ver docs/ARQUITECTURA.md):
//   Dani 100-199 · Rodrigo 200-299 · Ana 300-399
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../src/core/db.js';
import { config } from '../src/config.js';

export async function migrar() {
  await db.exec(`CREATE TABLE IF NOT EXISTS migraciones (
    nombre TEXT PRIMARY KEY,
    aplicada_en TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  const { rows } = await db.query('SELECT nombre FROM migraciones');
  const aplicadas = new Set(rows.map((r) => r.nombre));
  const archivos = fs.readdirSync(config.carpetaMigraciones).filter((f) => f.endsWith('.sql')).sort();

  for (const archivo of archivos) {
    if (aplicadas.has(archivo)) continue;
    const sql = fs.readFileSync(path.join(config.carpetaMigraciones, archivo), 'utf8');
    try {
      await db.exec(`BEGIN;\n${sql}\n;INSERT INTO migraciones (nombre) VALUES ('${archivo}');\nCOMMIT;`);
      console.log(`Migración aplicada: ${archivo}`);
    } catch (error) {
      await db.exec('ROLLBACK').catch(() => {});
      throw new Error(`Falló la migración ${archivo}: ${error.message}`);
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await migrar();
  await db.cerrar();
}
