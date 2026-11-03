-- Foto de perfil (Dani). Tabla aparte para no cargar la imagen en cada consulta de usuarios.
-- Se borra sola con la cuenta.
CREATE TABLE fotos_perfil (
  usuario_id     INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  contenido      BYTEA NOT NULL,
  tipo_mime      TEXT NOT NULL CHECK (tipo_mime IN ('image/jpeg', 'image/png')),
  actualizada_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
