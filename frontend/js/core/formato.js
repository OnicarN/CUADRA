// Formato de importes y fechas según el idioma.
import { idioma } from './i18n.js';

const locale = () => (idioma() === 'en' ? 'en-GB' : 'es-ES');

export function dinero(cantidad, moneda = 'EUR') {
  if (cantidad === null || cantidad === undefined || cantidad === '') return '—';
  return new Intl.NumberFormat(locale(), { style: 'currency', currency: moneda }).format(Number(cantidad));
}

// 'AAAA-MM-DD' o fecha ISO -> "29 oct 2026"
export function fecha(valor, opciones = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!valor) return '—';
  const texto = String(valor);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(texto) ? new Date(`${texto}T12:00:00`) : new Date(texto);
  return new Intl.DateTimeFormat(locale(), opciones).format(d);
}

export function porcentaje(valor, decimales = 0) {
  return `${Number(valor).toLocaleString(locale(), { maximumFractionDigits: decimales })} %`;
}
