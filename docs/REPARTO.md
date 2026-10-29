# Reparto del trabajo

Cada persona es responsable de unos módulos **completos** (su API, sus pantallas, sus estilos y sus tests). Así cada uno trabaja con su IA sin tocar los archivos de los demás y no hay conflictos.

| | Dani (@OnicarN) | Rodrigo (@rodrigoadelcano) | Ana (@miegomez2689-art) |
| --- | --- | --- | --- |
| Tema | Entrada de facturas e infraestructura | Facturas, revisión, avisos y panel | Cuenta, perfil, planes e informes |
| Migraciones | `100-199` | `200-299` | `300-399` |

## Orden de las tareas

Las tareas van **en este orden** porque unas necesitan lo que hacen otras. Regla:

- Una tarea puede empezar cuando **todas las de su columna "Necesita" están fusionadas** en `master`.
- Cada uno coge **su siguiente tarea de la lista** en cuanto se cumpla eso. Puede que dos personas trabajen a la vez, pero nunca en algo que dependa de una tarea sin fusionar.
- Una PR de una tarea que se adelanta a su turno se queda en espera hasta que se fusionen las que necesita.

| Paso | Quién | Issue | Necesita | Estado |
| --- | --- | --- | --- | --- |
| 0 | Ana | [#24](https://github.com/OnicarN/CUADRA/issues/24) Perfil fiscal y ajustes | — | ✅ Hecha |
| 1 | Dani | [#17](https://github.com/OnicarN/CUADRA/issues/17) Publicar en Render + Neon | — | En curso |
| 2 | Dani | [#12](https://github.com/OnicarN/CUADRA/issues/12) Subida de facturas | #24 | |
| 3 | Rodrigo | [#18](https://github.com/OnicarN/CUADRA/issues/18) Histórico, búsqueda y filtros | #12 | PR #32 en espera |
| 4 | Ana | [#23](https://github.com/OnicarN/CUADRA/issues/23) Cuenta: verificación, recuperación y Google | — | |
| 5 | Dani | [#13](https://github.com/OnicarN/CUADRA/issues/13) Lectura automática con IA | #12 | |
| 6 | Rodrigo | [#19](https://github.com/OnicarN/CUADRA/issues/19) Pantalla de revisión | #18, #13 | |
| 7 | Rodrigo | [#20](https://github.com/OnicarN/CUADRA/issues/20) Comprobaciones y duplicados | #19 | |
| 8 | Ana | [#25](https://github.com/OnicarN/CUADRA/issues/25) Excel e informe trimestral | #19 | |
| 9 | Rodrigo | [#22](https://github.com/OnicarN/CUADRA/issues/22) Panel con cifras | #19 | |
| 10 | Dani | [#14](https://github.com/OnicarN/CUADRA/issues/14) Correo propio de Cuadra | #12 | |
| 11 | Rodrigo | [#21](https://github.com/OnicarN/CUADRA/issues/21) Avisos | #20 | |
| 12 | Ana | [#26](https://github.com/OnicarN/CUADRA/issues/26) Suscripción y pagos | #13 | |
| 13 | Dani | [#15](https://github.com/OnicarN/CUADRA/issues/15) App instalable y compartir | #12 | |
| 14 | Dani | [#16](https://github.com/OnicarN/CUADRA/issues/16) Google Calendar | #19, #23 | |
| 15 | Ana | [#27](https://github.com/OnicarN/CUADRA/issues/27) Eliminar cuenta | #23, #25 | |

Por qué este orden:

- **#12 Subida** va pronto porque sin facturas reales no se puede probar casi nada.
- **#18 Histórico** necesita facturas subidas para verlas; **#19 Revisión** necesita el histórico (abrir el original) y la lectura (datos que revisar).
- **#20, #22 y #25** trabajan con facturas confirmadas, que salen de la revisión.
- **#21 Avisos** muestra lo que generan las comprobaciones.
- **#26 Suscripción** vuelve a lanzar la lectura al comprar lecturas extra.
- **#16 Calendar** pinta su sugerencia en la revisión y comparte el acceso de Google con #23.
- **#27 Eliminar cuenta** reutiliza el acceso (#23) y la exportación (#25).

Si la línea "Orden" de una issue no coincide con esta tabla, manda esta tabla.

Ya hecho en la base: web pública (RF-01 a 04), registro y acceso con email (RF-05, RF-09), esquema completo de la base de datos, sistema de diseño, idioma es/en, modo claro/oscuro, menú de la app y datos de prueba.

## Quién es dueño de cada archivo

### Dani
```
backend/src/modulos/subida/  lectura/  correo/  calendario/
frontend/app/subir.html  calendario.html
frontend/js/paginas/subir.js  calendario.js
frontend/css/paginas/subir.css  calendario.css
frontend/js/componentes/sugerencia-evento.js
frontend/manifest.webmanifest  frontend/sw.js  frontend/js/pwa.js  frontend/img/
render.yaml  docs/DESPLIEGUE.md
backend/db/semilla.js
```

### Rodrigo
```
backend/src/modulos/facturas/  categorias/  avisos/  panel/
frontend/app/panel.html  facturas.html  factura.html  avisos.html
frontend/js/paginas/panel.js  facturas.js  factura.js  avisos.js
frontend/css/paginas/panel.css  facturas.css  factura.css  avisos.css
```

### Ana
```
backend/src/modulos/auth/  perfil/  suscripcion/  exportacion/
frontend/entrar.html  registro.html  recuperar.html  restablecer.html  verificar.html
frontend/app/perfil.html  ajustes.html  suscripcion.html  informes.html
frontend/js/paginas/acceso-textos.js  entrar.js  registro.js  recuperar.js  restablecer.js  verificar.js
frontend/js/paginas/perfil.js  ajustes.js  suscripcion.js  informes.js
frontend/css/paginas/acceso.css  perfil.css  ajustes.css  suscripcion.css  informes.css
```

### Compartido (congelado, lo cambia solo Dani en PR aparte)
```
backend/src/app.js  server.js  config.js  backend/src/core/*
backend/package.json  package-lock.json  .env.example
backend/db/migrar.js  reset.js  migraciones/001_esquema_inicial.sql
backend/test/ayuda.js  base.test.js
frontend/index.html  precios.html  404.html
frontend/css/base.css  inicio.css  precios.css
frontend/js/core/*  frontend/js/paginas/inicio.js  precios.js
AGENTS.md  CLAUDE.md  README.md  docs/*  .github/*
```

## Puntos de contacto entre personas

Son funciones que una persona hace y otra usa. Ya existen con su firma definitiva; cada uno rellena la suya sin cambiarla (detalle en `docs/ARQUITECTURA.md`).

| Qué | La hace | La usa |
| --- | --- | --- |
| `comprobarFactura()` | Rodrigo (#20) | Dani en la lectura (#13) |
| `obtenerPerfil()`, `obtenerAjustes()` | Ana (#24) | Dani (#12), Rodrigo (#20, #21) |
| `obtenerUso()`, `tieneFuncion()` | Ana (#26) | Dani (#12, #16), Ana (#25) |
| `leerSinLeer()` | Dani (#13) | Ana al comprar lecturas (#26) |
| `pintarSugerenciaEvento()` | Dani (#16) | Rodrigo en la revisión (#19) |

Mientras la otra parte no está hecha, la función existe y devuelve algo vacío, así que nadie se queda bloqueado.
