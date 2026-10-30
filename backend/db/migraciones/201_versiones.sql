-- Versión de empresa y versión personal (#50). Responsable: Rodrigo.
--
-- Cada usuario puede usar las dos a la vez y cambiar arriba en la web. Cada factura es de
-- una versión: empresa (facturas con NIF para la contabilidad y los impuestos) o personal
-- (tickets para llevar el control de sus gastos, sin NIF ni IVA).

-- Versión en la que está trabajando el usuario y los datos de la versión personal.
-- Sin fila: empresa y sin presupuesto.
CREATE TABLE versiones_usuario (
  usuario_id          INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  version_actual      TEXT NOT NULL DEFAULT 'empresa' CHECK (version_actual IN ('empresa', 'personal')),
  presupuesto_mensual NUMERIC(12, 2) CHECK (presupuesto_mensual IS NULL OR presupuesto_mensual > 0),
  actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Las facturas que ya existen son de empresa.
ALTER TABLE facturas ADD COLUMN version TEXT NOT NULL DEFAULT 'empresa' CHECK (version IN ('empresa', 'personal'));
CREATE INDEX facturas_usuario_version ON facturas (usuario_id, version);

-- Una factura nueva va a la versión en la que está el usuario al subirla, venga de donde
-- venga (subida, cámara, correo, compartir), sin tener que tocar cada módulo.
CREATE FUNCTION facturas_version_por_defecto() RETURNS trigger AS $$
BEGIN
  SELECT version_actual INTO NEW.version FROM versiones_usuario WHERE usuario_id = NEW.usuario_id;
  IF NEW.version IS NULL THEN
    NEW.version := 'empresa';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER facturas_version BEFORE INSERT ON facturas
  FOR EACH ROW EXECUTE FUNCTION facturas_version_por_defecto();
