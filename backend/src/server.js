// Punto de entrada: aplica las migraciones pendientes, arranca las tareas y el servidor.
import { config } from './config.js';
import { crearApp, carpetaModulos } from './app.js';
import { migrar } from '../db/migrar.js';
import { iniciarTareas } from './core/tareas.js';

await migrar();
const app = await crearApp();
await iniciarTareas(carpetaModulos);

app.listen(config.puerto, () => {
  console.log(`Cuadra en ${config.urlPublica} (puerto ${config.puerto})`);
  console.log(config.databaseUrl ? 'Base de datos: PostgreSQL' : 'Base de datos: PGlite local (backend/.data)');
});
