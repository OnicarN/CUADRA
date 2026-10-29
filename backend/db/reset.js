// Borra la base de datos LOCAL (PGlite) para empezar de cero. No toca producción.
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../src/config.js';

if (config.databaseUrl) {
  console.error('db:reset solo funciona con la base de datos local. Quita DATABASE_URL del .env.');
  process.exit(1);
}
fs.rmSync(path.join(config.carpetaDatos, 'db'), { recursive: true, force: true });
console.log('Base de datos local borrada. Ejecuta `npm run db:semilla` para cargar datos de prueba.');
