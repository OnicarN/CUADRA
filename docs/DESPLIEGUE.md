# Despliegue

Cuadra se publica como **un único servicio en Render** que sirve la web y la API, con la base de datos en **Neon** (PostgreSQL). Los dos tienen plan gratis. Responsable: Dani.

Resultado: un enlace tipo `https://cuadra.onrender.com` que se actualiza solo cada vez que se fusiona una PR en `master`.

## 1. Base de datos en Neon (5 minutos)

1. Entra en https://neon.tech y pulsa **Sign up** → **Continue with GitHub**.
2. Crea un proyecto:
   - **Project name:** `cuadra`
   - **Postgres version:** la que venga por defecto
   - **Region:** `AWS Europe Central 1 (Frankfurt)` (la misma zona que Render, para que vaya rápido)
3. En el panel del proyecto, pulsa **Connect** y copia la **connection string**. Es algo así:
   `postgresql://neondb_owner:XXXX@ep-algo-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require`
4. Guárdala: la necesitas en el paso 2. **No la subas a GitHub**, porque lleva la contraseña.

No hay que crear tablas: se crean solas la primera vez que arranca el servidor.

## 2. Servicio en Render (10 minutos)

1. Entra en https://render.com y pulsa **Get Started** → **GitHub**.
2. Arriba a la derecha: **New +** → **Blueprint**.
3. Conecta GitHub si te lo pide y elige el repositorio **OnicarN/CUADRA**. Render lee el archivo `render.yaml` y te enseña el servicio `cuadra`.
4. Te pide dos valores:
   - **DATABASE_URL:** la connection string de Neon.
   - **URL_PUBLICA:** pon `https://cuadra.onrender.com`. Si al final Render te da otra URL, la cambias en el paso 6.
5. Pulsa **Apply** (o **Deploy Blueprint**). La primera vez tarda 3-5 minutos. En **Logs** debe salir `Migración aplicada: 001_esquema_inicial.sql` y `Base de datos: PostgreSQL`.
6. Arriba del servicio verás la URL real (por ejemplo `https://cuadra-abcd.onrender.com`). Si no coincide con la del paso 4, ve a **Environment**, cambia `URL_PUBLICA` y guarda (se redespliega solo).
7. Comprueba que funciona: abre `TU_URL/api/salud` y debe responder `{"ok":true}`. Luego abre `TU_URL` y crea una cuenta.

El plan gratis de Render **se duerme tras 15 minutos sin visitas**: la primera visita después tarda unos 30-50 segundos en despertar. Es normal.

## 3. Usuario demo en producción (opcional)

Para tener el usuario `demo@cuadra.app` con facturas de ejemplo también en la web publicada, desde tu ordenador, en PowerShell y dentro de `backend`:

```bash
$env:DATABASE_URL="PEGA_AQUI_LA_CONNECTION_STRING_DE_NEON"
```
```bash
npm.cmd run db:semilla
```
```bash
Remove-Item Env:DATABASE_URL
```

El último comando hace que tu ordenador vuelva a usar la base de datos local.

## 4. Variables que se añaden más adelante

Cuando cada parte esté hecha, se añaden en **Render → cuadra → Environment → Add Environment Variable** (ver `backend/.env.example`):

| Variable | Para qué | Issue |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Leer facturas con IA | #13 |
| `SMTP_HOST`, `SMTP_PUERTO`, `SMTP_USUARIO`, `SMTP_CONTRASENA`, `EMAIL_REMITENTE` | Enviar emails | #23, #21, #25 |
| `CORREO_DOMINIO`, `CORREO_WEBHOOK_SECRETO` | Correo propio de Cuadra | #14 |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Entrar con Google y Calendar | #23, #16 |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Pagos | #26 |

`JWT_SECRETO` lo genera Render solo. No lo cambies: si lo cambias, se cierran todas las sesiones.

## Si algo falla

- **El despliegue falla en `npm ci`:** `package.json` y `package-lock.json` no coinciden. Ejecuta `npm install` en local y sube el `package-lock.json`.
- **`Falló la migración`** en los logs: revisa la última migración que se ha añadido en `backend/db/migraciones/`.
- **`password authentication failed` o `ENOTFOUND`:** la `DATABASE_URL` está mal copiada. Cópiala otra vez de Neon.
- **No puedo iniciar sesión:** comprueba que entras por `https://` (la cookie de sesión solo viaja por HTTPS en producción).
