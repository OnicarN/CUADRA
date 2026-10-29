// Textos en español e inglés (RF-04, RF-63).
//
// Cada pantalla registra sus propios textos al arrancar, así no hay un archivo de
// traducciones que toque todo el mundo:
//   iniciarPagina({ textos: { es: { 'panel.titulo': 'Panel' }, en: { 'panel.titulo': 'Dashboard' } } })
// Luego:  t('panel.titulo')  o, en el HTML,  <h1 data-t="panel.titulo"></h1>
// Variables:  t('subida.archivos', { n: 3 })  con el texto 'Has subido {n} archivos'.
//
// Aquí solo van los textos comunes (menú, estados, botones generales).
const CLAVE = 'cuadra-idioma';

const diccionario = {
  es: {
    'nav.panel': 'Panel',
    'nav.inicio': 'Inicio',
    'nav.facturas': 'Facturas',
    'nav.subir': 'Subir',
    'nav.subirFactura': 'Subir factura',
    'nav.avisos': 'Avisos',
    'nav.informes': 'Informes',
    'nav.perfil': 'Perfil',
    'nav.buscar': 'Buscar facturas',
    'nav.precios': 'Precios',
    'nav.entrar': 'Entrar',
    'nav.crearCuenta': 'Crear cuenta',
    'nav.irAlPanel': 'Ir a mi panel',
    'nav.idioma': 'Idioma',
    'pie.derechos': '© 2026 Cuadra. Hecho para autónomos.',
    'pie.privacidad': 'Privacidad',
    'pie.contacto': 'Contacto',
    'estado.sin_leer': 'Sin leer',
    'estado.pendiente': 'Pendiente',
    'estado.confirmada': 'Confirmada',
    'comun.guardar': 'Guardar',
    'comun.cancelar': 'Cancelar',
    'comun.cargando': 'Cargando…',
    'comun.verTodo': 'Ver todo',
    'comun.enConstruccion': 'En construcción',
    'comun.error': 'Algo ha fallado. Inténtalo de nuevo.',
  },
  en: {
    'nav.panel': 'Dashboard',
    'nav.inicio': 'Home',
    'nav.facturas': 'Invoices',
    'nav.subir': 'Upload',
    'nav.subirFactura': 'Upload invoice',
    'nav.avisos': 'Alerts',
    'nav.informes': 'Reports',
    'nav.perfil': 'Profile',
    'nav.buscar': 'Search invoices',
    'nav.precios': 'Pricing',
    'nav.entrar': 'Log in',
    'nav.crearCuenta': 'Sign up',
    'nav.irAlPanel': 'Go to my dashboard',
    'nav.idioma': 'Language',
    'pie.derechos': '© 2026 Cuadra. Made for freelancers.',
    'pie.privacidad': 'Privacy',
    'pie.contacto': 'Contact',
    'estado.sin_leer': 'Not read',
    'estado.pendiente': 'To review',
    'estado.confirmada': 'Confirmed',
    'comun.guardar': 'Save',
    'comun.cancelar': 'Cancel',
    'comun.cargando': 'Loading…',
    'comun.verTodo': 'See all',
    'comun.enConstruccion': 'Under construction',
    'comun.error': 'Something went wrong. Please try again.',
  },
};

export function idioma() {
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado === 'es' || guardado === 'en') return guardado;
  } catch { /* sin almacenamiento */ }
  return navigator.language?.startsWith('en') ? 'en' : 'es';
}

// Cambia el idioma y recarga la página para que todo se pinte de nuevo.
export function cambiarIdioma(nuevo) {
  try { localStorage.setItem(CLAVE, nuevo); } catch { /* sin almacenamiento */ }
  location.reload();
}

export function agregarTextos(textos = {}) {
  for (const lengua of ['es', 'en']) Object.assign(diccionario[lengua], textos[lengua] || {});
}

export function t(clave, variables = {}) {
  const texto = diccionario[idioma()][clave] ?? diccionario.es[clave] ?? clave;
  return texto.replace(/\{(\w+)\}/g, (_, v) => variables[v] ?? `{${v}}`);
}

// Rellena los elementos con data-t, data-t-placeholder, data-t-aria y data-t-title.
export function aplicarTextos(raiz = document) {
  document.documentElement.lang = idioma();
  raiz.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
  raiz.querySelectorAll('[data-t-html]').forEach((el) => { el.innerHTML = t(el.dataset.tHtml); });
  raiz.querySelectorAll('[data-t-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.tPlaceholder); });
  raiz.querySelectorAll('[data-t-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.tAria)); });
  raiz.querySelectorAll('[data-t-title]').forEach((el) => { el.title = t(el.dataset.tTitle); });
}
