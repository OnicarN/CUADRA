# AGENTS.md

Normas para cualquier IA (Claude, Codex…) o persona que trabaje en este repositorio. Léelas enteras antes de empezar una tarea.

## Proyecto

Cuadra es una web para autónomos: suben tickets y facturas, la IA lee los datos, el usuario los revisa y Cuadra le avisa de lo que está perdiendo antes de que cierre el trimestre.

Documentos de referencia (mandan sobre cualquier duda de qué hacer):

- `docs/especificaciones/especificaciones-funcionales.md`: qué tiene que hacer la web (requisitos RF-01 a RF-65).
- `docs/especificaciones/documento-diseno.md`: cómo se ve (colores, tipografía, componentes).
- `docs/especificaciones/documento-negocio.md`: para quién es y por qué.
- `docs/ARQUITECTURA.md`: cómo está hecho el código, la base de datos y la API.
- `docs/REPARTO.md`: quién es responsable de cada archivo y qué issue toca cada cosa.

## Arrancar en local

Solo hace falta Node.js 20 o superior. No hay que instalar ninguna base de datos (en local se usa PGlite).

```bash
cd backend
npm install
npm run db:semilla   # datos de prueba: demo@cuadra.app / cuadra1234
npm run dev          # http://localhost:3000
```

`npm test` pasa los tests. `npm run db:reset` borra la base de datos local.

## Estructura

```
backend/
  src/app.js, server.js, config.js   arranque (compartido)
  src/core/                          utilidades comunes: db, auth, avisos, email, validación (compartido)
  src/modulos/<modulo>/rutas.js      API de cada módulo, se monta sola en /api/<modulo>
  db/migraciones/                    cambios de la base de datos (.sql numerados)
  test/                              tests (node --test)
frontend/
  *.html                             web pública (inicio, precios, entrar, registro…)
  app/*.html                         pantallas de la app (requieren sesión)
  css/base.css                       sistema de diseño (compartido)
  css/paginas/<pantalla>.css         estilos de cada pantalla
  js/core/                           api, idioma, tema, menú, formato (compartido)
  js/paginas/<pantalla>.js           lógica de cada pantalla
  js/componentes/                    piezas que una pantalla presta a otra
docs/                                especificaciones, arquitectura y reparto
```

## Regla de oro: no pisarse

Somos tres (Dani, Rodrigo y Ana) y cada archivo tiene un único responsable (ver `docs/REPARTO.md` y `.github/CODEOWNERS`). Así nunca hay conflictos.

1. **Toca solo los archivos que tu issue dice.** Cada issue trae la lista de "Archivos que puedes tocar". Si no está en la lista, no lo cambies.
2. **Archivos compartidos congelados.** No se cambian dentro de una tarea:
   - `backend/src/app.js`, `server.js`, `config.js`, `backend/src/core/*`
   - `backend/package.json`, `backend/package-lock.json`, `backend/.env.example`
   - `backend/db/migraciones/001_esquema_inicial.sql`
   - `frontend/css/base.css`, `frontend/js/core/*`
   - `AGENTS.md`, `CLAUDE.md`, `docs/*`, `.github/*`, `render.yaml`
   Si de verdad necesitas cambiar uno, **no lo hagas en tu rama**: comenta en tu issue qué necesitas y por qué, y Dani lo hace en una PR aparte pequeña. Mientras tanto, resuélvelo dentro de tus archivos.
3. **Necesitas algo de otro módulo:** úsalo tal cual (importar una función, llamar a su API) pero no edites sus archivos. Si falta algo, pídeselo en su issue.
4. **Rutas nuevas:** no hay que registrarlas. Cualquier `backend/src/modulos/<x>/rutas.js` se monta solo en `/api/<x>`, y cualquier `tareas.js` de un módulo se ejecuta solo.
5. **Textos:** cada pantalla lleva sus textos (es y en) dentro de su propio `.js`, no en un archivo común.
6. **Estilos:** cada pantalla tiene su `css/paginas/<pantalla>.css`. Usa las variables y clases de `base.css` (`--acento`, `.tarjeta`, `.boton-principal`…); no copies colores a mano.
7. **Dependencias:** ya están instaladas todas las previstas (Express, pg, PGlite, Anthropic SDK, exceljs, pdfkit, stripe, googleapis, nodemailer, multer…). No añadas otras sin hablarlo: cambiar `package.json` a la vez entre dos personas da conflictos.

## Base de datos

- PostgreSQL. En local, PGlite (se guarda en `backend/.data/`); en producción, Neon. Mismo SQL.
- El esquema completo ya existe en `001_esquema_inicial.sql` (todas las tablas de todos los RF). Lo normal es que no necesites cambiarlo.
- Si necesitas un cambio, crea un archivo nuevo en `backend/db/migraciones/` **dentro de tu rango** de números: Dani `100-199`, Rodrigo `200-299`, Ana `300-399`. Ejemplo: `201_indice_busqueda.sql`. Nunca edites una migración que ya está en `master`.
- Las migraciones se aplican solas al arrancar el servidor.

## Cómo se escribe el código

- Todo en español: nombres de variables, funciones, archivos, comentarios y commits.
- JavaScript moderno con módulos (`import`/`export`). Sin frameworks en el frontend: HTML, CSS y JS.
- Backend con Express 5: en las rutas `async` lanza errores con `throw peticionIncorrecta('…')` (ver `core/errores.js`), no hace falta try/catch.
- Seguridad (RF-09): toda consulta filtra por `req.usuario.id`. Nunca devuelvas datos de otro usuario.
- Frontend: pinta HTML con la plantilla `` html`...` `` de `js/core/ui.js`, que escapa los datos. Nunca metas en `innerHTML` texto del usuario o de la IA sin escapar.
- Diseño móvil primero (documento de diseño): todo debe funcionar en móvil y en ordenador, con zonas táctiles de 44 px y estados con texto, no solo color.
- Lo que propone la IA se muestra como sugerencia; solo cuenta lo que el usuario confirma.
- Añade tests de tu módulo en `backend/test/<modulo>.test.js` (mira `base.test.js` y `ayuda.js`).

## Flujo de trabajo (obligatorio)

1. Antes de empezar: `git checkout master` y `git pull`.
2. Crea una rama por issue: `issue-N-descripcion-corta` (por ejemplo `issue-14-pantalla-subida`).
3. Nunca hagas commit ni push directo a `master`.
4. Commits pequeños con mensajes claros en español.
5. Antes de subir: `cd backend && npm test`, y prueba la pantalla en el navegador (móvil y ordenador).
6. **Para y deja que la persona lo revise en su local.** Antes de hacer push o abrir la PR, la IA se detiene y le dice a la persona con la que trabaja:
   - qué ha cambiado, en dos o tres frases;
   - cómo verlo: con `arrancar.bat` abierto (o `npm run dev`), qué URL abrir (por ejemplo `http://localhost:3000/app/facturas`), con qué usuario entrar (demo@cuadra.app / cuadra1234) y qué probar;
   - que recargue con F5 si ya tenía la web abierta.
   Después **espera a que la persona diga que está bien**. Si pide cambios, se hacen y se vuelve a este paso. Sin su visto bueno no se hace push ni PR.
7. Si `master` ha cambiado mientras trabajabas: `git pull origin master` en tu rama (merge, no rebase) y vuelve a probar.
8. Sube la rama: `git push -u origin <rama>`.
9. Abre la PR contra `master` con `gh pr create`, rellenando la plantilla y con `Closes #N` en la descripción.
10. No fusiones la PR: la revisa y fusiona una persona.
