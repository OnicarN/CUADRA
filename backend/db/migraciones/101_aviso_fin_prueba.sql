-- RF-60: cuándo avisamos de que se acaba la prueba gratuita (para avisar una sola vez). Dani (#26).
ALTER TABLE suscripciones ADD COLUMN IF NOT EXISTS aviso_fin_prueba_en TIMESTAMPTZ;
