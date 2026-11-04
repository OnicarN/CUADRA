-- Datos de la versión de empresa para calcular las deducciones (#50). Responsable: Rodrigo.
--   cuota_autonomos_mensual: lo que paga cada mes a la Seguridad Social. Es gasto deducible en
--     el IRPF (modelo 130) aunque no tenga factura.
--   vivienda_afecta_pct: si trabaja desde casa, el % de la vivienda que usa para trabajar. Con él
--     se calcula la parte deducible de luz, agua, gas e internet de casa. NULL = no trabaja en casa.
ALTER TABLE versiones_usuario
  ADD COLUMN cuota_autonomos_mensual NUMERIC(10, 2) CHECK (cuota_autonomos_mensual IS NULL OR cuota_autonomos_mensual >= 0),
  ADD COLUMN vivienda_afecta_pct NUMERIC(5, 2) CHECK (vivienda_afecta_pct IS NULL OR (vivienda_afecta_pct > 0 AND vivienda_afecta_pct <= 100));
