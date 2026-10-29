-- Esquema inicial de Cuadra. Cubre todas las especificaciones funcionales (RF-xx).
-- No edites este archivo: crea una migración nueva en tu rango (ver docs/ARQUITECTURA.md).

-- Usuarios y acceso (RF-05 a RF-09)
CREATE TABLE usuarios (
  id               SERIAL PRIMARY KEY,
  nombre           TEXT NOT NULL,
  email            TEXT NOT NULL UNIQUE,
  password_hash    TEXT,                          -- NULL si solo entra con Google
  google_id        TEXT UNIQUE,
  email_verificado BOOLEAN NOT NULL DEFAULT false,
  idioma           TEXT NOT NULL DEFAULT 'es' CHECK (idioma IN ('es', 'en')),
  tema             TEXT NOT NULL DEFAULT 'sistema' CHECK (tema IN ('sistema', 'claro', 'oscuro')),
  alias_correo     TEXT NOT NULL UNIQUE,          -- RF-18: <alias>@CORREO_DOMINIO
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tokens de un solo uso: verificar email (RF-07) y recuperar contraseña (RF-08)
CREATE TABLE tokens (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL CHECK (tipo IN ('verificar_email', 'recuperar_contrasena')),
  token_hash  TEXT NOT NULL UNIQUE,
  expira_en   TIMESTAMPTZ NOT NULL,
  usado_en    TIMESTAMPTZ,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Perfil fiscal (RF-10 a RF-12)
CREATE TABLE perfiles_fiscales (
  usuario_id     INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  nif            TEXT NOT NULL,
  direccion      TEXT NOT NULL,
  actividad      TEXT NOT NULL,
  regimen_iva    TEXT NOT NULL,
  email_gestoria TEXT,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Emails de confianza que pueden enviar facturas al correo de Cuadra (RF-19)
CREATE TABLE emails_confianza (
  id         SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, email)
);

-- Ajustes del usuario (RF-41, RF-42, RF-56)
CREATE TABLE ajustes (
  usuario_id            INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  dias_aviso_pendiente  INTEGER NOT NULL DEFAULT 7 CHECK (dias_aviso_pendiente > 0),
  dias_aviso_trimestre  INTEGER NOT NULL DEFAULT 15 CHECK (dias_aviso_trimestre > 0),
  avisos_sin_email      TEXT[] NOT NULL DEFAULT '{}'   -- tipos de aviso que NO se mandan por email
);

-- Categorías de gasto (RF-26). usuario_id NULL = categoría base para todos.
CREATE TABLE categorias (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  clave       TEXT,                                -- solo en las base, para traducirlas
  nombre      TEXT NOT NULL,
  actividades TEXT[] NOT NULL DEFAULT '{}',        -- vacío = vale para cualquier actividad
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX categorias_usuario_nombre ON categorias (COALESCE(usuario_id, 0), lower(nombre));

-- Archivos originales: foto o PDF (RF-39). Se guardan en la propia base de datos.
CREATE TABLE originales (
  id             SERIAL PRIMARY KEY,
  usuario_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre_archivo TEXT NOT NULL,
  tipo_mime      TEXT NOT NULL,
  tamano         INTEGER NOT NULL,
  contenido      BYTEA NOT NULL,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Eventos de Google Calendar (RF-54, RF-55)
CREATE TABLE eventos (
  id         SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  google_id  TEXT NOT NULL,
  titulo     TEXT NOT NULL,
  inicio     TIMESTAMPTZ NOT NULL,
  fin        TIMESTAMPTZ NOT NULL,
  ubicacion  TEXT,
  cliente    TEXT,                                  -- cliente o proyecto (RF-47)
  UNIQUE (usuario_id, google_id)
);

-- Facturas (RF-24, RF-30 a RF-37)
CREATE TABLE facturas (
  id                    SERIAL PRIMARY KEY,
  usuario_id            INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  original_id           INTEGER REFERENCES originales(id) ON DELETE SET NULL,
  estado                TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('sin_leer', 'pendiente', 'confirmada')),
  origen                TEXT NOT NULL DEFAULT 'subida' CHECK (origen IN ('subida', 'camara', 'correo', 'correo_texto', 'compartir')),
  fecha                 DATE,
  hora                  TIME,
  emisor                TEXT,
  nif_emisor            TEXT,
  nif_receptor          TEXT,
  numero                TEXT,
  base_imponible        NUMERIC(12, 2),            -- suma de las bases de factura_iva
  cuota_iva             NUMERIC(12, 2),            -- suma de las cuotas de factura_iva
  total                 NUMERIC(12, 2),            -- en la moneda original
  moneda                CHAR(3) NOT NULL DEFAULT 'EUR',
  tipo_cambio           NUMERIC(14, 6),            -- RF-25: euros por unidad de la moneda
  total_eur             NUMERIC(12, 2),            -- total en euros (= total si moneda EUR)
  categoria_id          INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
  evento_id             INTEGER REFERENCES eventos(id) ON DELETE SET NULL,
  duplicado_de          INTEGER REFERENCES facturas(id) ON DELETE SET NULL,  -- RF-36
  duplicado_aceptado    BOOLEAN NOT NULL DEFAULT false,                       -- el usuario la guardó igualmente
  datos_ia              JSONB,                     -- respuesta original de la lectura
  leida_en              TIMESTAMPTZ,
  confirmada_en         TIMESTAMPTZ,
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX facturas_usuario_estado ON facturas (usuario_id, estado);
CREATE INDEX facturas_usuario_fecha ON facturas (usuario_id, fecha);

-- Líneas de IVA: puede haber varios tipos en una misma factura (RF-24)
CREATE TABLE factura_iva (
  id         SERIAL PRIMARY KEY,
  factura_id INTEGER NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  base       NUMERIC(12, 2) NOT NULL,
  tipo       NUMERIC(5, 2) NOT NULL,               -- porcentaje: 21, 10, 4, 0...
  cuota      NUMERIC(12, 2) NOT NULL
);

-- Historial de cambios de una factura (RF-33)
CREATE TABLE factura_cambios (
  id             SERIAL PRIMARY KEY,
  factura_id     INTEGER NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  accion         TEXT NOT NULL CHECK (accion IN ('editar', 'confirmar', 'reabrir')),
  campo          TEXT,
  valor_anterior TEXT,
  valor_nuevo    TEXT,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sugerencias de asociar una factura a un evento del calendario (RF-55)
CREATE TABLE sugerencias_evento (
  factura_id INTEGER NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  evento_id  INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  estado     TEXT NOT NULL DEFAULT 'sugerida' CHECK (estado IN ('sugerida', 'aceptada', 'rechazada')),
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (factura_id, evento_id)
);

-- Avisos (RF-40 a RF-42). Ver backend/src/core/avisos.js para los tipos.
CREATE TABLE avisos (
  id              SERIAL PRIMARY KEY,
  usuario_id      INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL,
  factura_id      INTEGER REFERENCES facturas(id) ON DELETE CASCADE,
  clave           TEXT NOT NULL DEFAULT '',
  datos           JSONB NOT NULL DEFAULT '{}',
  estado          TEXT NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cerrado')),
  email_enviado_en TIMESTAMPTZ,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
  cerrado_en      TIMESTAMPTZ
);
CREATE UNIQUE INDEX avisos_abiertos_unicos ON avisos (usuario_id, tipo, clave) WHERE estado = 'abierto';

-- Correos recibidos en la dirección de Cuadra (RF-18 a RF-21)
CREATE TABLE correos_entrantes (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  remitente   TEXT NOT NULL,
  asunto      TEXT,
  aceptado    BOOLEAN NOT NULL,
  num_facturas INTEGER NOT NULL DEFAULT 0,
  recibido_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conexión con Google Calendar (RF-54, RF-56)
CREATE TABLE calendario_conexiones (
  usuario_id       INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  email_google     TEXT,
  refresh_token    TEXT NOT NULL,
  fechas_fiscales  TEXT[] NOT NULL DEFAULT '{}',   -- p. ej. {'trimestre','303','130'}
  dias_antelacion  INTEGER NOT NULL DEFAULT 7,
  conectado_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
  sincronizado_en  TIMESTAMPTZ
);

-- Suscripción (RF-57 a RF-61). Los planes están en src/modulos/suscripcion/planes.js
CREATE TABLE suscripciones (
  usuario_id             INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  plan                   TEXT NOT NULL DEFAULT 'gratis',
  estado                 TEXT NOT NULL DEFAULT 'prueba' CHECK (estado IN ('prueba', 'activa', 'cancelada')),
  prueba_hasta           TIMESTAMPTZ,
  periodo_inicio         TIMESTAMPTZ NOT NULL DEFAULT now(),
  periodo_fin            TIMESTAMPTZ,
  cancelar_al_final      BOOLEAN NOT NULL DEFAULT false,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT
);

-- Extras comprados: paquetes de lecturas y funciones sueltas (RF-58)
CREATE TABLE extras (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL CHECK (tipo IN ('lecturas', 'funcion')),
  clave       TEXT NOT NULL,                      -- id del paquete o de la función
  cantidad    INTEGER NOT NULL DEFAULT 0,         -- lecturas compradas (si tipo = 'lecturas')
  valido_hasta TIMESTAMPTZ,                       -- NULL = sin caducidad
  stripe_ref  TEXT,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Facturas que Cuadra emite al usuario (RF-59)
CREATE TABLE pagos (
  id            SERIAL PRIMARY KEY,
  usuario_id    INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  concepto      TEXT NOT NULL,
  importe       NUMERIC(10, 2) NOT NULL,
  moneda        CHAR(3) NOT NULL DEFAULT 'EUR',
  url_factura   TEXT,
  stripe_ref    TEXT,
  pagado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Categorías base (RF-26)
INSERT INTO categorias (clave, nombre, actividades) VALUES
  ('suministros',      'Suministros (luz, agua, gas)', '{}'),
  ('telefono',         'Teléfono e internet',          '{}'),
  ('software',         'Software y suscripciones',     '{}'),
  ('equipos',          'Equipos informáticos',         '{}'),
  ('material_oficina', 'Material de oficina',          '{}'),
  ('combustible',      'Combustible y transporte',     '{}'),
  ('viajes',           'Viajes y alojamiento',         '{}'),
  ('comidas',          'Comidas con clientes',         '{}'),
  ('formacion',        'Formación',                    '{}'),
  ('servicios_prof',   'Servicios profesionales',      '{}'),
  ('alquiler',         'Alquiler',                     '{}'),
  ('seguros',          'Seguros',                      '{}'),
  ('publicidad',       'Publicidad y marketing',       '{}'),
  ('cuotas',           'Cuotas y colegios profesionales', '{abogacia,arquitectura,consultoria}'),
  ('material_diseno',  'Material de diseño y fotografía', '{diseno}'),
  ('vehiculo',         'Mantenimiento del vehículo',   '{transporte,comercio}'),
  ('otros',            'Otros',                        '{}');
