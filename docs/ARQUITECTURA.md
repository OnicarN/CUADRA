# Arquitectura de Cuadra

## Resumen

```
Navegador (HTML + CSS + JS, sin frameworks)
        │  fetch('/api/...')  cookie de sesión
        ▼
Express 5 (backend/src)  ──►  PostgreSQL (PGlite en local, Neon en producción)
        │
        ├─► Claude (lectura de facturas)
        ├─► SMTP (emails)          ├─► Google (login y Calendar)
        └─► Stripe (pagos)         └─► Proveedor de correo entrante (webhook)
```

Un solo servidor sirve la API (`/api/*`) y la web (`frontend/`), así que en producción hay **un único enlace**.

## Backend

| Pieza | Qué hace |
| --- | --- |
| `src/server.js` | Aplica migraciones, carga tareas periódicas y arranca. |
| `src/app.js` | Monta cada `src/modulos/<x>/rutas.js` en `/api/<x>` y sirve `frontend/`. |
| `src/config.js` | Variables de entorno (ver `.env.example`). |
| `src/core/db.js` | `db.query(sql, params)` y `db.transaccion(fn)`. Mismo código con PGlite y con PostgreSQL. |
| `src/core/auth.js` | Sesión con JWT en cookie httpOnly. Middleware `requiereSesion` → `req.usuario.id`. |
| `src/core/errores.js` | `peticionIncorrecta`, `noEncontrado`, `conflicto`, `pendiente`… |
| `src/core/avisos.js` | `crearAviso()` y `cerrarAvisos()` + lista `TIPOS_AVISO`. Cualquier módulo los usa. |
| `src/core/email.js` | `enviarEmail()`. Sin SMTP, imprime el email en la consola. |
| `src/core/validacion.js` | `nifValido()`, `normalizarNif()`, `emailValido()`. |
| `src/core/fiscal.js` | Trimestres y plazos de los modelos 303 y 130. |
| `src/core/tareas.js` | Ejecuta cada `src/modulos/<x>/tareas.js` cada N minutos. |

### Módulos y su API

Cada `rutas.js` empieza con un comentario con todas sus rutas: es el contrato. Lo marcado como `(hecho)` ya funciona; lo `(pendiente)` responde 501 hasta que se haga.

| Módulo | Ruta | Responsable |
| --- | --- | --- |
| auth | `/api/auth` | Ana |
| perfil | `/api/perfil` | Ana |
| suscripcion | `/api/suscripcion` | Ana |
| exportacion | `/api/exportacion` | Ana |
| facturas | `/api/facturas` | Rodrigo |
| categorias | `/api/categorias` | Rodrigo |
| avisos | `/api/avisos` | Rodrigo |
| panel | `/api/panel` | Rodrigo |
| subida | `/api/subida` | Dani |
| lectura | (servicio interno) | Dani |
| correo | `/api/correo` | Dani |
| calendario | `/api/calendario` | Dani |

### Contratos entre módulos

Son las únicas "costuras" entre el trabajo de dos personas. Las firmas ya existen; cada responsable rellena la suya sin cambiarla.

| Función | Archivo | La hace | La usa |
| --- | --- | --- | --- |
| `crearFacturaDesdeArchivo({ usuarioId, buffer, nombre, mime, origen })` | `modulos/subida/servicio.js` | Dani | correo, compartir (Dani) |
| `leerFactura(facturaId)`, `leerSinLeer(usuarioId)` | `modulos/lectura/servicio.js` | Dani | subida (Dani), suscripción (Ana) al ampliar plan |
| `comprobarFactura(facturaId)` | `modulos/facturas/comprobaciones.js` | Rodrigo | lectura (Dani), revisión (Rodrigo) |
| `obtenerPerfil(usuarioId)`, `obtenerAjustes(usuarioId)` | `modulos/perfil/servicio.js` | Ana | subida (Dani), comprobaciones y avisos (Rodrigo) |
| `obtenerUso(usuarioId)`, `tieneFuncion(usuarioId, f)` | `modulos/suscripcion/uso.js` | Ana | subida, calendario (Dani), exportación (Ana) |
| `pintarSugerenciaEvento(contenedor, facturaId)` | `frontend/js/componentes/sugerencia-evento.js` | Dani | pantalla de revisión (Rodrigo) |
| `crearAviso()`, `cerrarAvisos()` | `core/avisos.js` | (base) | todos |

## Estados de una factura

```
            (límite del plan superado)
 subida ──► sin_leer ──(se amplía el plan / nuevo mes)──┐
   │                                                     ▼
   └──────────────────────────────────────────────► lectura IA ──► pendiente ──(usuario confirma)──► confirmada
                                                                     ▲                                   │
                                                                     └────────(usuario reabre, RF-33)────┘
```

Solo las `confirmada` cuentan en panel, exportación e informes (RF-48, RF-51). Las `pendiente` y `sin_leer` se pueden borrar; las `confirmada` nunca (RF-34).

## Base de datos

Esquema completo en `backend/db/migraciones/001_esquema_inicial.sql`. Tablas principales:

| Tabla | Para qué |
| --- | --- |
| `usuarios`, `tokens` | Cuenta, Google, verificación y recuperación. `alias_correo` = dirección de Cuadra (RF-18). |
| `perfiles_fiscales`, `ajustes`, `emails_confianza` | Perfil fiscal (RF-10 a 12), preferencias de avisos (RF-41, 42), remitentes de confianza (RF-19). |
| `originales` | Foto o PDF original en `BYTEA` (RF-39). |
| `facturas`, `factura_iva`, `factura_cambios` | Datos leídos, líneas de IVA (varias por factura), historial de cambios (RF-33). |
| `categorias` | Base (usuario_id NULL) y propias del usuario (RF-26). |
| `avisos` | Un aviso abierto por (usuario, tipo, clave). |
| `eventos`, `sugerencias_evento`, `calendario_conexiones` | Google Calendar (RF-54 a 56). |
| `suscripciones`, `extras`, `pagos` | Plan, paquetes y funciones sueltas, facturas de Cuadra (RF-57 a 61). |
| `correos_entrantes` | Registro de correos recibidos (RF-18 a 21). |

Importes: `NUMERIC(12,2)` (llegan a JS como número). Fechas de factura: `DATE` (llegan como `'AAAA-MM-DD'`). Los totales en euros están en `total_eur` (RF-25).

**Migraciones nuevas**: un archivo `.sql` por cambio, en tu rango: Dani `100-199`, Rodrigo `200-299`, Ana `300-399`.

## Frontend

- Una página HTML por pantalla. Cada una carga `css/base.css`, su `css/paginas/<pantalla>.css` y su `js/paginas/<pantalla>.js`.
- `js/core/layout.js` → `iniciarPagina({ pagina, privada, textos })`: aplica idioma y tema, pinta cabecera/menú (menú superior en ordenador, barra inferior en móvil) y devuelve el usuario.
- `js/core/i18n.js` → `t('clave')` y `data-t="clave"` en el HTML. Cada pantalla trae sus textos es/en.
- `js/core/api.js` → `api('/ruta', { metodo, cuerpo, formulario })`.
- `js/core/ui.js` → `` html`...` `` (escapa), `vacio()`, `mostrarToast()`, `etiquetaEstado()`.
- `js/core/formato.js` → `dinero()`, `fecha()`, `porcentaje()`.
- `js/core/iconos.js` → `icono('nombre')`, `logo()` y `data-icono="nombre"` en el HTML.
- Las URLs no llevan `.html`: `/app/panel` sirve `frontend/app/panel.html`.

## Decisiones tomadas

- **Tipografía Inter**: tiene números tabulares seguro (el documento de diseño lo deja pendiente). Para cambiarla basta con `--fuente` en `base.css`.
- **Precios provisionales** en `modulos/suscripcion/planes.js` hasta que exista el documento de precios.
- **Originales en la base de datos** (BYTEA) para no depender de otro servicio de almacenamiento.
- **Lectura con Claude** (`@anthropic-ai/sdk`), modelo configurable en `MODELO_IA` (por defecto `claude-opus-5-5`).
