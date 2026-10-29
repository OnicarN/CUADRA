// Validaciones compartidas.

// Comprueba el formato y la letra de control de un NIF, NIE o CIF español.
export function nifValido(valor) {
  const nif = normalizarNif(valor);
  if (!nif) return false;
  const letras = 'TRWAGMYFPDXBNJZSQVHLCKE';

  if (/^\d{8}[A-Z]$/.test(nif)) {
    return letras[Number(nif.slice(0, 8)) % 23] === nif[8];
  }
  if (/^[XYZ]\d{7}[A-Z]$/.test(nif)) {
    const numero = 'XYZ'.indexOf(nif[0]) + nif.slice(1, 8);
    return letras[Number(numero) % 23] === nif[8];
  }
  if (/^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(nif)) {
    const digitos = nif.slice(1, 8);
    let suma = 0;
    for (let i = 0; i < 7; i++) {
      let d = Number(digitos[i]);
      if (i % 2 === 0) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      suma += d;
    }
    const control = (10 - (suma % 10)) % 10;
    const ultimo = nif[8];
    return ultimo === String(control) || ultimo === 'JABCDEFGHI'[control];
  }
  return false;
}

// Quita espacios, guiones y prefijo de país, y pasa a mayúsculas: " es-12345678z" -> "12345678Z".
export function normalizarNif(valor) {
  if (!valor) return '';
  return String(valor).toUpperCase().replace(/[\s.-]/g, '').replace(/^ES/, '');
}

export function emailValido(valor) {
  return typeof valor === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim());
}
