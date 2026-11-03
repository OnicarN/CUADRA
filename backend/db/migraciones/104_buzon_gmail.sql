-- Buzón de Gmail de Cuadra para recibir facturas por correo sin dominio propio (Dani, #14).
-- Cada usuario escribe a buzon+<alias>@gmail.com y Cuadra revisa el buzón cada minuto.
-- Solo hay uno (id = 1).
CREATE TABLE buzon_correo (
  id             INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  email          TEXT NOT NULL,
  refresh_token  TEXT NOT NULL,
  conectado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  revisado_en    TIMESTAMPTZ
);
