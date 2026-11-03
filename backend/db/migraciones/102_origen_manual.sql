-- Gastos añadidos a mano en la versión personal, sin archivo (#54). Responsable: Dani.
ALTER TABLE facturas DROP CONSTRAINT IF EXISTS facturas_origen_check;
ALTER TABLE facturas ADD CONSTRAINT facturas_origen_check
  CHECK (origen IN ('subida', 'camara', 'correo', 'correo_texto', 'compartir', 'manual'));
