// Tipo de cambio a euros en la fecha de la factura (RF-25), con los datos del Banco Central
// Europeo que publica Frankfurter (gratis, sin clave). Si no se puede obtener, devuelve null
// y el usuario lo corrige en la revisión.
// Responsable: Dani (#13).
const URL_CAMBIO = 'https://api.frankfurter.app';

export async function tipoDeCambio(moneda, fecha) {
  if (!moneda || moneda === 'EUR') return 1;
  const dia = fecha || 'latest';
  try {
    const respuesta = await fetch(`${URL_CAMBIO}/${dia}?from=${encodeURIComponent(moneda)}&to=EUR`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!respuesta.ok) return null;
    const { rates } = await respuesta.json();
    return typeof rates?.EUR === 'number' ? rates.EUR : null;
  } catch {
    return null;
  }
}
