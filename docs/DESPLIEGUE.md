# Despliegue

Cuadra se publica como **un único servicio** (Render) que sirve la web y la API, con la base de datos en **Neon** (PostgreSQL gratis). Responsable: Dani.

## 1. Base de datos en Neon

1. Crea una cuenta en https://neon.tech y un proyecto `cuadra` (región Europa).
2. Copia la *connection string* (empieza por `postgresql://`, con `?sslmode=require`).

Las tablas se crean solas la primera vez que arranca el servidor.

## 2. Servicio en Render

1. Crea una cuenta en https://render.com con GitHub.
2. *New → Blueprint* y elige el repositorio `OnicarN/CUADRA`. Render lee `render.yaml`.
3. Rellena las variables que pide:
   - `DATABASE_URL`: la de Neon.
   - `URL_PUBLICA`: la URL que te da Render (por ejemplo `https://cuadra.onrender.com`).
   - El resto (`ANTHROPIC_API_KEY`, SMTP, Google, Stripe…) cuando cada parte esté lista.
4. Cada vez que se fusiona una PR en `master`, Render despliega solo.

El plan gratis de Render se duerme tras 15 minutos sin uso: la primera visita tarda unos segundos.

## 3. Datos de prueba en producción (opcional)

Desde tu ordenador, con la URL de Neon en `backend/.env` (`DATABASE_URL=...`):

```bash
cd backend
npm run db:semilla
```

Quita `DATABASE_URL` del `.env` después para volver a la base de datos local.
