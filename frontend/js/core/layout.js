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

const SECCIONES_APP = [
  { id: 'panel', href: '/app/panel', icono: 'inicio', texto: 'nav.panel', movil: 'nav.inicio' },
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
  } else {
    usuario = await api('/auth/sesion').catch(() => null);
    pintarWeb(usuario, pagina);
  }

  aplicarTextos();
  pintarIconos();
  return { usuario, version };
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
      <a class="logo" href="/app/panel">${logo()}<span class="logo-nombre">Cuadra</span></a>
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
        <a class="avatar solo-ordenador" href="/app/perfil" data-t-aria="nav.perfil">${inicial}</a>
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
    <a href="/app/panel" ${actual('panel')}>${icono('inicio')}<span data-t="nav.inicio"></span></a>
    <a href="/app/facturas" ${actual('facturas')}>${icono('facturas')}<span data-t="nav.facturas"></span></a>
    <a href="/app/subir" class="barra-subir" ${actual('subir')}><span class="barra-subir-circulo">${icono('subir')}</span><span data-t="nav.subir"></span></a>
    <a href="/app/avisos" ${actual('avisos')}>${icono('avisos')}<span data-t="nav.avisos"></span><span class="contador" data-contador-avisos hidden></span></a>
    <a href="/app/perfil" ${actual('perfil')}>${icono('perfil')}<span data-t="nav.perfil"></span></a>`;
  document.body.append(barra);
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

  const pie = document.createElement('footer');
  pie.className = 'web-pie';
  pie.innerHTML = `
    <div class="contenedor web-pie-fila">
      <a class="logo" href="/">${logo()}<span class="logo-nombre">Cuadra</span></a>
      <nav class="web-nav" style="margin-left:0">
        <a class="web-nav-enlace" href="/precios" data-t="nav.precios"></a>
        <a class="web-nav-enlace" href="mailto:hola@cuadra.app" data-t="pie.contacto"></a>
      </nav>
      <p class="texto-2" data-t="pie.derechos"></p>
    </div>`;
  document.body.append(pie);

  activarSelectorIdioma(document);
}
