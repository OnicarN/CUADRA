// Aplicación Express: sirve la API en /api y la web (carpeta frontend/) en el resto.
//
// Los módulos se cargan solos: cada carpeta de src/modulos/ con un archivo rutas.js
// se monta en /api/<nombre-de-la-carpeta>. Así nadie tiene que tocar este archivo
// para añadir rutas.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { ErrorHttp } from './core/errores.js';

export const carpetaModulos = path.join(path.dirname(fileURLToPath(import.meta.url)), 'modulos');

export async function crearApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Guardamos el cuerpo original para los webhooks que firman la petición (Stripe, correo).
  app.use(express.json({ limit: '2mb', verify: (req, _res, buf) => { req.cuerpoCrudo = buf; } }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());

  app.get('/api/salud', (_req, res) => res.json({ ok: true }));

  for (const modulo of fs.readdirSync(carpetaModulos).sort()) {
    const archivo = path.join(carpetaModulos, modulo, 'rutas.js');
    if (!fs.existsSync(archivo)) continue;
    const { default: rutas } = await import(pathToFileURL(archivo).href);
    app.use(`/api/${modulo}`, rutas);
  }

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

  app.use(express.static(config.carpetaFrontend, { extensions: ['html'] }));
  app.use((_req, res) => res.status(404).sendFile(path.join(config.carpetaFrontend, '404.html')));

  app.use((error, _req, res, _next) => {
    if (error instanceof ErrorHttp) {
      return res.status(error.estado).json({ error: error.message, detalles: error.detalles });
    }
    if (error.type === 'entity.too.large' || error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'El archivo es demasiado grande' });
    }
    console.error(error);
    res.status(500).json({ error: 'Algo ha fallado. Inténtalo de nuevo.' });
  });

  return app;
}
