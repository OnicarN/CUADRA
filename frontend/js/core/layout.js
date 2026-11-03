// Arranque común de todas las páginas: idioma, tema, cabecera y menú.
//
// En cada página:
//   import { iniciarPagina } from '../core/layout.js';
//   const { usuario } = await iniciarPagina({ pagina: 'panel', privada: true, textos });
//
// - privada: true  -> si no hay sesión, manda a /entrar. Pinta el menú de la app.
// - privada: false -> pinta la cabecera y el pie de la web pública.
// - pagina: marca la sección activa del menú (panel, facturas, subir, avisos, informes, perfil,
//   o en la web pública: inicio, precios, entrar, registro).
import { api } from './api.js';
import { icono, logo, pintarIconos } from './iconos.js';
import { t, agregarTextos, aplicarTextos, idioma, cambiarIdioma } from './i18n.js';
import { aplicarTema, temaGuardado } from './tema.js';
import { escapar } from './ui.js';

const SECCIONES_APP = [
  { id: 'panel', href: '/app/panel', icono: 'panel', texto: 'nav.panel' },
  { id: 'facturas', href: '/app/facturas', icono: 'facturas', texto: 'nav.facturas' },
  { id: 'informes', href: '/app/informes', icono: 'informes', texto: 'nav.informes', soloOrdenador: true },
];

// Versión de empresa y personal (#50): se elige arriba y cada una tiene sus facturas.
const TEXTOS_VERSION = {
  es: { 'version.titulo': 'Versión', 'version.empresa': 'Empresa', 'version.personal': 'Personal' },
  en: { 'version.titulo': 'Version', 'version.empresa': 'Business', 'version.personal': 'Personal' },
};

// Páginas que, en el menú, cuentan como otra sección.
const SECCION_DE = { factura: 'facturas', ajustes: 'perfil', suscripcion: 'perfil', calendario: 'perfil' };

export async function iniciarPagina({ pagina, privada = false, textos } = {}) {
  agregarTextos(TEXTOS_VERSION);
  agregarTextos(textos);
  aplicarTema();
  let usuario = null;
  let version = null;

  if (privada) {
    try {
      [usuario, version] = await Promise.all([
        api('/auth/yo'),
        api('/versiones').then((v) => v.actual).catch(() => 'empresa'),
      ]);
    } catch (error) {
      if (error.estado === 401) {
        location.href = `/entrar?volver=${encodeURIComponent(location.pathname + location.search)}`;
        return new Promise(() => {});
      }
      throw error;
    }
    const temaLocal = temaGuardado();
    aplicarTema(temaLocal !== 'sistema' ? temaLocal : usuario.tema);
    pintarApp(usuario, SECCION_DE[pagina] || pagina, version);
    actualizarContadorAvisos();
    api('/foto/estado').then((f) => ponerFotoPerfil(f.version)).catch(() => {});
    if (pagina !== 'suscripcion') avisarFinDePrueba();
  } else {
    usuario = await api('/auth/sesion').catch(() => null);
    pintarWeb(usuario, pagina);
  }

  aplicarTextos();
  pintarIconos();
  return { usuario, version };
}

// Los últimos días de la prueba gratuita (RF-60), un aviso arriba en la app con un enlace a
// elegir plan. Al acabar pasa sola al plan gratis: no se cobra nada sin que el usuario lo elija.
// Se puede cerrar y no vuelve a salir ese día.
const DIAS_AVISO_PRUEBA = 3;
const TEXTOS_PRUEBA = {
  es: {
    'prueba.quedan': 'Te quedan {n} días de prueba con todo incluido. Después pasarás al plan gratis.',
    'prueba.ultimo': 'Hoy es el último día de tu prueba con todo incluido. Mañana pasarás al plan gratis.',
    'prueba.elegir': 'Elegir plan',
    'prueba.cerrar': 'Cerrar aviso',
  },
  en: {
    'prueba.quedan': "You have {n} days left of your trial with everything included. Then you'll move to the free plan.",
    'prueba.ultimo': "Today is the last day of your trial with everything included. Tomorrow you'll move to the free plan.",
    'prueba.elegir': 'Choose a plan',
    'prueba.cerrar': 'Close notice',
  },
};

async function avisarFinDePrueba() {
  const hoy = new Date().toISOString().slice(0, 10);
  try { if (localStorage.getItem('cuadra-aviso-prueba') === hoy) return; } catch { /* sin almacenamiento */ }
  let uso;
  try { uso = await api('/suscripcion'); } catch { return; }
  if (!uso.enPrueba || !uso.pruebaHasta) return;
  const dias = Math.ceil((new Date(uso.pruebaHasta) - Date.now()) / 86400000);
  if (dias > DIAS_AVISO_PRUEBA) return;

  agregarTextos(TEXTOS_PRUEBA);
  const aviso = document.createElement('div');
  aviso.className = 'banner aviso-prueba';
  aviso.setAttribute('role', 'status');
  aviso.innerHTML = `${icono('reloj')}
    <span class="banner-texto">${escapar(dias > 1 ? t('prueba.quedan', { n: dias }) : t('prueba.ultimo'))}
      <a href="/app/suscripcion"><strong>${escapar(t('prueba.elegir'))}</strong></a></span>
    <button type="button" class="boton-icono" aria-label="${escapar(t('prueba.cerrar'))}">${icono('cerrar')}</button>`;
  // Fuera de #contenido: cada pantalla repinta su contenido y lo borraría.
  const caja = document.createElement('div');
  caja.className = 'contenedor aviso-prueba-caja';
  caja.append(aviso);
  aviso.querySelector('button').addEventListener('click', () => {
    try { localStorage.setItem('cuadra-aviso-prueba', hoy); } catch { /* sin almacenamiento */ }
    caja.remove();
  });
  document.querySelector('main')?.before(caja);
}

// Foto de perfil: cambia la inicial de la cabecera (y el icono de Perfil del móvil) por la foto.
// Con version = null vuelve a lo de antes. La usa también js/componentes/foto-perfil.js.
const contenidoSinFoto = new WeakMap();
export function ponerFotoPerfil(version) {
  document.querySelectorAll('[data-foto-perfil]').forEach((elemento) => {
    if (!contenidoSinFoto.has(elemento)) contenidoSinFoto.set(elemento, elemento.innerHTML);
    elemento.classList.toggle('con-foto', Boolean(version));
    elemento.innerHTML = version
      ? `<img src="/api/foto?v=${encodeURIComponent(version)}" alt="" decoding="async">`
      : contenidoSinFoto.get(elemento);
  });
}

export async function actualizarContadorAvisos() {
  try {
    const { abiertos } = await api('/avisos/contador');
    document.querySelectorAll('[data-contador-avisos]').forEach((el) => {
      el.textContent = abiertos > 99 ? '99+' : abiertos;
      el.hidden = !abiertos;
    });
  } catch { /* el contador no es imprescindible */ }
}

function selectorIdioma() {
  const actual = idioma();
  const otro = actual === 'es' ? 'en' : 'es';
  return `<button type="button" class="selector-idioma" data-idioma="${otro}" aria-label="${t('nav.idioma')}">${otro.toUpperCase()}</button>`;
}

function activarSelectorIdioma(raiz) {
  raiz.querySelectorAll('[data-idioma]').forEach((boton) => {
    boton.addEventListener('click', async () => {
      api('/auth/preferencias', { metodo: 'PUT', cuerpo: { idioma: boton.dataset.idioma } }).catch(() => {});
      cambiarIdioma(boton.dataset.idioma);
    });
  });
}

// Cambia de versión y vuelve a cargar. En el detalle de una factura se va a la lista, porque
// esa factura es de la otra versión.
async function elegirVersion(version) {
  await api('/versiones/actual', { metodo: 'PUT', cuerpo: { version } });
  if (location.pathname === '/app/factura') location.href = '/app/facturas';
  else location.reload();
}

function pintarApp(usuario, seccion, version = 'empresa') {
  const actual = (id) => (id === seccion ? 'aria-current="page"' : '');
  const inicial = (usuario.nombre || usuario.email || '?').trim()[0].toUpperCase();

  const cabecera = document.createElement('header');
  cabecera.className = 'app-cabecera';
  cabecera.innerHTML = `
    <div class="contenedor app-cabecera-fila">
      <a class="logo" href="/">${logo()}<span class="logo-nombre">Cuadra</span></a>
      <div class="pestanas selector-version" role="group" data-t-aria="version.titulo">
        ${['empresa', 'personal'].map((v) => `<button type="button" class="pestana" data-version="${v}" aria-pressed="${v === version}" data-t="version.${v}"></button>`).join('')}
      </div>
      <div class="app-cabecera-centro solo-ordenador">
        <nav class="pestanas" aria-label="Secciones">
          ${SECCIONES_APP.map((s) => `<a class="pestana" href="${s.href}" ${actual(s.id)} data-t="${s.texto}"></a>`).join('')}
        </nav>
      </div>
      <div class="app-cabecera-acciones">
        <form class="buscador solo-ordenador" action="/app/facturas" role="search">
          ${icono('buscar')}
          <input type="search" name="q" data-t-placeholder="nav.buscar" data-t-aria="nav.buscar">
        </form>
        <a class="boton boton-principal solo-ordenador" href="/app/subir">${icono('subir')}<span data-t="nav.subirFactura"></span></a>
        <a class="boton-icono solo-movil" href="/app/facturas" data-t-aria="nav.buscar">${icono('buscar')}</a>
        <a class="boton-icono solo-ordenador" href="/app/avisos" data-t-aria="nav.avisos" ${actual('avisos')}>
          ${icono('avisos')}<span class="contador" data-contador-avisos hidden></span>
        </a>
        <a class="avatar solo-ordenador" href="/app/perfil" data-t-aria="nav.perfil" data-foto-perfil>${inicial}</a>
      </div>
    </div>`;
  document.body.prepend(cabecera);
  cabecera.querySelector('.selector-version').addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-version]');
    if (!boton || boton.getAttribute('aria-pressed') === 'true') return;
    boton.disabled = true;
    elegirVersion(boton.dataset.version).catch(() => { boton.disabled = false; });
  });

  const barra = document.createElement('nav');
  barra.className = 'barra-movil';
  barra.setAttribute('aria-label', 'Menú');
  barra.innerHTML = `
    <a href="/app/panel" ${actual('panel')}>${icono('panel')}<span data-t="nav.panel"></span></a>
    <a href="/app/facturas" ${actual('facturas')}>${icono('facturas')}<span data-t="nav.facturas"></span></a>
    <a href="/app/subir" class="barra-subir" ${actual('subir')}><span class="barra-subir-circulo">${icono('subir')}</span><span data-t="nav.subir"></span></a>
    <a href="/app/avisos" ${actual('avisos')}>${icono('avisos')}<span data-t="nav.avisos"></span><span class="contador" data-contador-avisos hidden></span></a>
    <a href="/app/perfil" ${actual('perfil')}><span class="barra-foto" data-foto-perfil>${icono('perfil')}</span><span data-t="nav.perfil"></span></a>`;
  document.body.append(barra);
}

// Pie de la web pública (#51): marca, producto y legal; debajo, derechos e idioma.
// En la app (/app/...) no hay pie: allí está la barra de abajo del móvil.
function crearPie() {
  const enlace = (href, clave) => `<li><a class="web-pie-enlace" href="${href}" data-t="${clave}"></a></li>`;
  const pie = document.createElement('footer');
  pie.className = 'web-pie';
  pie.innerHTML = `
    <div class="contenedor">
      <div class="web-pie-columnas">
        <div class="web-pie-marca">
          <a class="logo" href="/">${logo()}<span class="logo-nombre">Cuadra</span></a>
          <p class="texto-2" data-t="pie.frase"></p>
          <a class="web-pie-enlace" href="mailto:hola@cuadra.app">hola@cuadra.app</a>
        </div>
        <nav class="web-pie-columna" aria-labelledby="pie-producto">
          <h2 class="web-pie-titulo" id="pie-producto" data-t="pie.producto"></h2>
          <ul>
            ${enlace('/precios', 'nav.precios')}
            ${enlace('/entrar', 'nav.entrar')}
            ${enlace('/registro', 'nav.crearCuenta')}
          </ul>
        </nav>
        <nav class="web-pie-columna" aria-labelledby="pie-legal">
          <h2 class="web-pie-titulo" id="pie-legal" data-t="pie.legal"></h2>
          <ul>
            ${enlace('/privacidad', 'pie.privacidad')}
            ${enlace('/condiciones', 'pie.condiciones')}
            ${enlace('mailto:hola@cuadra.app', 'pie.contacto')}
          </ul>
        </nav>
      </div>
      <div class="web-pie-inferior">
        <p class="texto-2">${t('pie.derechos', { anio: new Date().getFullYear() })}</p>
        ${selectorIdioma()}
      </div>
    </div>`;
  return pie;
}

function pintarWeb(usuario, pagina) {
  const actual = (id) => (id === pagina ? 'aria-current="page"' : '');
  const acciones = usuario
    ? `<a class="boton boton-principal" href="/app/panel" data-t="nav.irAlPanel"></a>`
    : `<a class="web-nav-enlace" href="/entrar" ${actual('entrar')} data-t="nav.entrar"></a>
       <a class="boton boton-principal" href="/registro" data-t="nav.crearCuenta"></a>`;

  const cabecera = document.createElement('header');
  cabecera.className = 'web-cabecera';
  cabecera.innerHTML = `
    <div class="contenedor web-cabecera-fila">
      <a class="logo" href="/">${logo()}<span class="logo-nombre">Cuadra</span></a>
      <nav class="web-nav">
        <a class="web-nav-enlace ocultar-movil" href="/precios" ${actual('precios')} data-t="nav.precios"></a>
        ${acciones}
        ${selectorIdioma()}
      </nav>
    </div>`;
  document.body.prepend(cabecera);

  document.body.append(crearPie());
  activarSelectorIdioma(document);
}
