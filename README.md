# Cuadra

Web para autónomos que lee sola sus tickets y facturas y les avisa de lo que están perdiendo antes de que cierre el trimestre.

> Lo que no se guarda no se deduce, y lo que no se deduce se paga.

**Web publicada:** _pendiente del primer despliegue (ver [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md))_

## Arrancar en local

Necesitas [Node.js](https://nodejs.org) 20 o superior. Nada más: la base de datos (PGlite) va incluida.

**En Windows, lo fácil:** doble clic en `arrancar.bat`. La primera vez instala Node.js si no lo tienes, las dependencias y carga los datos de prueba; luego abre http://localhost:3000 sola. Para pararla, cierra la ventana.

A mano (o en Mac/Linux):

```bash
cd backend
npm install
npm run db:semilla
npm run dev
```

Abre http://localhost:3000 y entra con **demo@cuadra.app** / **cuadra1234**.

| Comando (en `backend/`) | Qué hace |
| --- | --- |
| `npm run dev` | Arranca y se reinicia al guardar |
| `npm test` | Pasa los tests |
| `npm run db:semilla` | Carga el usuario demo con facturas |
| `npm run db:reset` | Borra la base de datos local |

## Cómo trabajamos

- Normas para personas e IAs: [AGENTS.md](AGENTS.md)
- Quién hace qué: [docs/REPARTO.md](docs/REPARTO.md)
- Cómo está hecho: [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)
- Qué tiene que hacer: [docs/especificaciones/](docs/especificaciones/)
- Publicarla: [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md)

Para resolver una tarea con tu IA: «Lee AGENTS.md y resuelve la issue #N».

## Tecnología

Node.js + Express 5 · PostgreSQL (PGlite en local, Neon en producción) · HTML, CSS y JavaScript sin frameworks · Claude para leer las facturas · Render para publicarla.
