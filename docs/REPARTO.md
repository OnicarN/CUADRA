# Reparto del trabajo

Cada persona es responsable de unos módulos **completos** (su API, sus pantallas, sus estilos y sus tests). Así cada uno trabaja con su IA sin tocar los archivos de los demás y no hay conflictos.

| | Dani (@OnicarN) | Rodrigo (@rodrigoadelcano) | Ana (@miegomez2689-art) |
| --- | --- | --- | --- |
| Tema | Entrada de facturas e infraestructura | Facturas, revisión, avisos y panel | Cuenta, perfil, planes e informes |
| Migraciones | `100-199` | `200-299` | `300-399` |

## Issues y orden recomendado

Cada uno puede empezar ya con su primera issue: no depende de nadie. El orden es el recomendado, no obligatorio.

**Dani**
1. [#12](https://github.com/OnicarN/CUADRA/issues/12) Subida de facturas (RF-13 a 17, 23)
2. [#13](https://github.com/OnicarN/CUADRA/issues/13) Lectura automática con IA (RF-24 a 29)
3. [#14](https://github.com/OnicarN/CUADRA/issues/14) Correo propio de Cuadra (RF-18 a 21)
4. [#15](https://github.com/OnicarN/CUADRA/issues/15) App instalable y compartir (RF-22)
5. [#16](https://github.com/OnicarN/CUADRA/issues/16) Google Calendar (RF-54 a 56)
6. [#17](https://github.com/OnicarN/CUADRA/issues/17) Despliegue en Render + Neon (en cuanto se fusione la base)

**Rodrigo**
1. [#18](https://github.com/OnicarN/CUADRA/issues/18) Histórico, búsqueda y filtros (RF-37 a 39)
2. [#19](https://github.com/OnicarN/CUADRA/issues/19) Pantalla de revisión (RF-30 a 34)
3. [#20](https://github.com/OnicarN/CUADRA/issues/20) Comprobaciones y duplicados (RF-27, 28, 35, 36)
4. [#21](https://github.com/OnicarN/CUADRA/issues/21) Avisos (RF-40 a 42)
5. [#22](https://github.com/OnicarN/CUADRA/issues/22) Panel (RF-43 a 48)

**Ana**
1. [#23](https://github.com/OnicarN/CUADRA/issues/23) Cuenta: verificación, recuperación y Google (RF-05 a 08)
2. [#24](https://github.com/OnicarN/CUADRA/issues/24) Perfil fiscal y ajustes (RF-10 a 12, 19, 41, 42)
3. [#25](https://github.com/OnicarN/CUADRA/issues/25) Excel e informe trimestral (RF-49 a 53)
4. [#26](https://github.com/OnicarN/CUADRA/issues/26) Suscripción y pagos (RF-57 a 61)
5. [#27](https://github.com/OnicarN/CUADRA/issues/27) Eliminar cuenta (RF-62)

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
