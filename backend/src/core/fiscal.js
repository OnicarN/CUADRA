// Fechas fiscales: trimestres y plazos de los modelos 303 y 130.
// Las fechas se manejan como texto 'AAAA-MM-DD' para evitar líos de zona horaria.

export function trimestreDe(fecha) {
  const [anio, mes] = String(fecha).slice(0, 10).split('-').map(Number);
  return { anio, trimestre: Math.ceil(mes / 3) };
}

export function rangoTrimestre(anio, trimestre) {
  const mesInicio = (trimestre - 1) * 3 + 1;
  const mesFin = mesInicio + 2;
  const ultimoDia = new Date(Date.UTC(anio, mesFin, 0)).getUTCDate();
  return {
    desde: `${anio}-${pad(mesInicio)}-01`,
    hasta: `${anio}-${pad(mesFin)}-${pad(ultimoDia)}`,
  };
}

// Último día para presentar el 303 y el 130 de ese trimestre.
// T1: 20 de abril, T2: 20 de julio, T3: 20 de octubre, T4: 30 de enero del año siguiente.
export function plazoPresentacion(anio, trimestre) {
  if (trimestre === 4) return `${anio + 1}-01-30`;
  return `${anio}-${pad(trimestre * 3 + 1)}-20`;
}

export function diasEntre(desde, hasta) {
  const a = Date.UTC(...partes(desde));
  const b = Date.UTC(...partes(hasta));
  return Math.round((b - a) / 86400000);
}

export function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function partes(fecha) {
  const [a, m, d] = String(fecha).slice(0, 10).split('-').map(Number);
  return [a, m - 1, d];
}

function pad(n) {
  return String(n).padStart(2, '0');
}
