// Subir facturas (RF-13 a RF-17, RF-23). Responsable: Dani (#12)
// Un único botón para elegir archivos (en el móvil ofrece cámara, galería y archivos),
// arrastrar en el ordenador y cámara dentro de la web con una foto o varias seguidas.
import { iniciarPagina, actualizarContadorAvisos } from '../core/layout.js';
import { api } from '../core/api.js';
import { t } from '../core/i18n.js';
import { icono } from '../core/iconos.js';
import { dinero } from '../core/formato.js';
import { html, seguro, mostrarToast, etiquetaEstado } from '../core/ui.js';
import { registrarServiceWorker, recogerCompartidos, alPoderInstalar, instalar, esIosSinInstalar } from '../pwa.js';

const textos = {
  es: {
    'subir.titulo': 'Subir facturas',
    'subir.zona.titulo': 'Sube tus tickets y facturas',
    'subir.zona.texto': 'PDF, JPG, PNG o HEIC, hasta 15 MB. Puedes subir varios a la vez: cada archivo es una factura.',
    'subir.zona.arrastra': 'o arrástralos aquí',
    'subir.zona.suelta': 'Suelta los archivos para subirlos',
    'subir.boton': 'Subir factura',
    'subir.foto': 'Hacer foto',
    'subir.perfil': 'Antes de subir tu primera factura completa tu perfil fiscal (NIF, dirección y actividad).',
    'subir.perfil.enlace': 'Completar perfil',
    'subir.camara.una': 'Una foto',
    'subir.camara.varias': 'Varias seguidas',
    'subir.camara.disparar': 'Hacer foto',
    'subir.camara.cancelar': 'Cancelar',
    'subir.camara.subirFotos': 'Subir {n} fotos',
    'subir.camara.ayuda': 'Pon el ticket sobre una superficie lisa y con buena luz.',
    'subir.camara.error': 'No hemos podido usar la cámara. Revisa el permiso del navegador o elige la foto de la galería.',
    'subir.lista.titulo': 'Subidas',
    'subir.lista.verTodas': 'Ver mis facturas',
    'subir.lista.revisar': 'Revisar',
    'subir.estado.subiendo': 'Subiendo…',
    'subir.estado.leyendo': 'Leyendo…',
    'subir.estado.leyendoTexto': 'Cuadra está leyendo los datos de la factura.',
    'subir.estado.leida': 'Leída: {datos}. Revísala y confírmala.',
    'subir.estado.leidaSinDatos': 'Leída. Revísala y confírmala.',
    'subir.estado.sinDatos': 'No hemos podido leerla. Rellena los datos al revisarla.',
    'subir.estado.tarda': 'Está tardando más de lo normal. La verás en tus facturas cuando termine.',
    'subir.estado.sinLeer': 'Guardada. Se leerá cuando amplíes tu plan o empiece el mes.',
    'subir.estado.error': 'Error',
    'subir.instalar.titulo': 'Cuadra en tu móvil',
    'subir.instalar.texto': 'Instálala y podrás mandarle PDF y fotos desde el botón Compartir de cualquier app.',
    'subir.instalar.boton': 'Instalar en el móvil',
    'subir.instalar.ios': 'En iPhone: pulsa Compartir y luego "Añadir a pantalla de inicio".',
    'subir.instalar.hecho': 'Cuadra instalada',
    'subir.compartido': 'Subiendo lo que has compartido…',
    'subir.compartidoVacio': 'No nos ha llegado ningún archivo. Prueba a compartirlo otra vez o súbelo desde aquí.',
    'subir.error.formato': 'Formato no admitido. Sube un PDF o una imagen (JPG, PNG o HEIC).',
    'subir.error.tamano': 'Es demasiado grande (máximo 15 MB).',
    'subir.limite': 'Has llegado al límite de facturas de tu plan. Las nuevas se guardan sin leer hasta que amplíes el plan o empiece el mes.',
    'subir.limite.enlace': 'Ver mi plan',
  },
  en: {
    'subir.titulo': 'Upload invoices',
    'subir.zona.titulo': 'Upload your receipts and invoices',
    'subir.zona.texto': 'PDF, JPG, PNG or HEIC, up to 15 MB. You can upload several at once: each file is one invoice.',
    'subir.zona.arrastra': 'or drag them here',
    'subir.zona.suelta': 'Drop the files to upload them',
    'subir.boton': 'Upload invoice',
    'subir.foto': 'Take photo',
    'subir.perfil': 'Before uploading your first invoice, complete your tax profile (tax ID, address and activity).',
    'subir.perfil.enlace': 'Complete profile',
    'subir.camara.una': 'One photo',
    'subir.camara.varias': 'Several in a row',
    'subir.camara.disparar': 'Take photo',
    'subir.camara.cancelar': 'Cancel',
    'subir.camara.subirFotos': 'Upload {n} photos',
    'subir.camara.ayuda': 'Place the receipt on a flat surface with good light.',
    'subir.camara.error': "We couldn't use the camera. Check the browser permission or pick the photo from your gallery.",
    'subir.lista.titulo': 'Uploads',
    'subir.lista.verTodas': 'See my invoices',
    'subir.lista.revisar': 'Review',
    'subir.estado.subiendo': 'Uploading…',
    'subir.estado.leyendo': 'Reading…',
    'subir.estado.leyendoTexto': 'Cuadra is reading the invoice data.',
    'subir.estado.leida': 'Read: {datos}. Review and confirm it.',
    'subir.estado.leidaSinDatos': 'Read. Review and confirm it.',
    'subir.estado.sinDatos': "We couldn't read it. Fill in the data when you review it.",
    'subir.estado.tarda': "It's taking longer than usual. You'll see it in your invoices when it's done.",
    'subir.estado.sinLeer': 'Saved. It will be read when you upgrade your plan or the month starts.',
    'subir.estado.error': 'Error',
    'subir.instalar.titulo': 'Cuadra on your phone',
    'subir.instalar.texto': 'Install it and send it PDFs and photos from the Share button in any app.',
    'subir.instalar.boton': 'Install on your phone',
    'subir.instalar.ios': 'On iPhone: tap Share and then "Add to Home Screen".',
    'subir.instalar.hecho': 'Cuadra installed',
    'subir.compartido': 'Uploading what you shared…',
    'subir.compartidoVacio': "We didn't receive any file. Try sharing it again or upload it from here.",
    'subir.error.formato': 'Format not supported. Upload a PDF or an image (JPG, PNG or HEIC).',
    'subir.error.tamano': 'It is too large (15 MB max).',
    'subir.limite': "You've reached your plan's invoice limit. New ones are saved unread until you upgrade or the month starts.",
    'subir.limite.enlace': 'See my plan',
  },
};

const ACEPTADOS = 'application/pdf,image/jpeg,image/png,image/heic,image/heif,.pdf,.jpg,.jpeg,.png,.heic,.heif';
const EXTENSIONES = /\.(pdf|jpe?g|png|heic|heif)$/i;
const TAMANO_MAXIMO = 15 * 1024 * 1024;

const { usuario } = await iniciarPagina({ pagina: 'subir', privada: true, textos });

const contenido = document.getElementById('contenido');
contenido.innerHTML = html`
  <div class="cabecera-pagina">
    <h1 class="titulo-pagina">${t('subir.titulo')}</h1>
  </div>
  <div class="pila">
    <a class="banner banner-aviso" href="/app/perfil" id="aviso-perfil" ${usuario.perfil_completo ? 'hidden' : ''}>
      ${seguro(icono('alerta'))}
      <span class="banner-texto">${t('subir.perfil')} <strong>${t('subir.perfil.enlace')}</strong></span>
      ${seguro(icono('flecha', 'banner-flecha'))}
    </a>

    <section class="tarjeta zona-subida" id="zona">
      <span class="zona-icono">${seguro(icono('nube'))}</span>
      <h2 class="titulo-seccion">${t('subir.zona.titulo')}</h2>
      <p class="texto-2">${t('subir.zona.texto')}</p>
      <div class="zona-acciones">
        <button type="button" class="boton boton-principal" id="elegir">${seguro(icono('subir'))}${t('subir.boton')}</button>
        <button type="button" class="boton boton-secundario" id="abrir-camara">${seguro(icono('camara'))}${t('subir.foto')}</button>
      </div>
      <p class="texto-2 solo-ordenador">${t('subir.zona.arrastra')}</p>
      <p class="zona-suelta" aria-hidden="true">${t('subir.zona.suelta')}</p>
      <input type="file" id="archivos" accept="${ACEPTADOS}" multiple hidden>
      <input type="file" id="foto-sistema" accept="image/*" capture="environment" hidden>
    </section>

    <section class="tarjeta camara" id="camara" hidden>
      <div class="pestanas" role="tablist">
        <button type="button" class="pestana" role="tab" data-modo="una" aria-selected="true">${t('subir.camara.una')}</button>
        <button type="button" class="pestana" role="tab" data-modo="varias" aria-selected="false">${t('subir.camara.varias')}</button>
      </div>
      <div class="camara-visor">
        <video id="video" playsinline muted></video>
      </div>
      <p class="texto-2">${t('subir.camara.ayuda')}</p>
      <div class="camara-miniaturas" id="miniaturas"></div>
      <div class="camara-acciones">
        <button type="button" class="boton boton-secundario" id="cancelar-camara">${t('subir.camara.cancelar')}</button>
        <button type="button" class="camara-disparador" id="disparar" aria-label="${t('subir.camara.disparar')}"><span></span></button>
        <button type="button" class="boton boton-secundario" id="subir-fotos" hidden></button>
      </div>
    </section>

    <a class="banner" href="/app/suscripcion" id="aviso-limite" hidden>
      ${seguro(icono('destello'))}
      <span class="banner-texto">${t('subir.limite')} <strong>${t('subir.limite.enlace')}</strong></span>
      ${seguro(icono('flecha', 'banner-flecha'))}
    </a>

    <section class="tarjeta" id="subidas" hidden>
      <div class="tarjeta-cabecera">
        <h2 class="titulo-seccion">${t('subir.lista.titulo')}</h2>
        <a class="boton-texto" href="/app/facturas">${t('subir.lista.verTodas')}</a>
      </div>
      <ul class="lista" id="lista"></ul>
    </section>

    <section class="tarjeta instalar" id="instalar" hidden>
      <span class="zona-icono">${seguro(icono('movil'))}</span>
      <div class="instalar-texto">
        <h2 class="titulo-seccion">${t('subir.instalar.titulo')}</h2>
        <p class="texto-2" id="instalar-detalle">${t('subir.instalar.texto')}</p>
      </div>
      <button type="button" class="boton boton-secundario" id="boton-instalar" hidden>${t('subir.instalar.boton')}</button>
    </section>
  </div>`;

const zona = document.getElementById('zona');
const entrada = document.getElementById('archivos');
const entradaFoto = document.getElementById('foto-sistema');
const lista = document.getElementById('lista');
let perfilCompleto = usuario.perfil_completo;

function pedirPerfil() {
  document.getElementById('aviso-perfil').hidden = false;
  document.getElementById('aviso-perfil').focus();
}

// ---------- Subida ----------

function tamano(bytes) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function pintarFila(fila, archivo, { estado, id, error, emisor, total, moneda }) {
  const leidos = [emisor, total !== null && total !== undefined ? dinero(total, moneda || 'EUR') : null].filter(Boolean).join(' · ');
  const etiqueta = {
    subiendo: html`<span class="etiqueta etiqueta-sin-leer">${t('subir.estado.subiendo')}</span>`,
    leyendo: html`<span class="etiqueta etiqueta-pendiente">${t('subir.estado.leyendo')}</span>`,
    leida: etiquetaEstado('pendiente'),
    sin_datos: etiquetaEstado('pendiente'),
    tarda: etiquetaEstado('pendiente'),
    sin_leer: etiquetaEstado('sin_leer'),
    confirmada: etiquetaEstado('confirmada'),
    error: html`<span class="etiqueta etiqueta-aviso">${t('subir.estado.error')}</span>`,
  }[estado];
  const detalle = {
    subiendo: tamano(archivo.size),
    leyendo: t('subir.estado.leyendoTexto'),
    leida: leidos ? t('subir.estado.leida', { datos: leidos }) : t('subir.estado.leidaSinDatos'),
    sin_datos: t('subir.estado.sinDatos'),
    tarda: t('subir.estado.tarda'),
    sin_leer: t('subir.estado.sinLeer'),
    confirmada: leidos,
    error,
  }[estado];
  const cargando = estado === 'subiendo' || estado === 'leyendo';
  fila.innerHTML = html`
    <span class="fila-icono">${seguro(icono(estado === 'error' ? 'alerta' : 'archivo'))}</span>
    <span class="fila-centro">
      <span class="fila-titulo">${archivo.name}</span>
      <span class="fila-sub">${detalle}</span>
      ${cargando ? seguro('<span class="progreso progreso-cargando" role="progressbar" aria-busy="true"><span></span></span>') : ''}
    </span>
    <span class="fila-derecha">
      ${seguro(etiqueta)}
      ${id && !cargando ? seguro(html`<a class="boton-texto subida-revisar" href="/app/factura?id=${id}">${t('subir.lista.revisar')}</a>`) : ''}
    </span>`;
}

// Pregunta cada 2 segundos cómo va la lectura hasta que termina (máximo 2 minutos).
async function seguirLectura(fila, archivo, id) {
  const limite = Date.now() + 2 * 60 * 1000;
  while (Date.now() < limite) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    try {
      const lectura = await api(`/subida/${id}/estado`);
      if (lectura.estado !== 'leyendo') {
        pintarFila(fila, archivo, { ...lectura, id });
        if (lectura.estado === 'sin_leer') document.getElementById('aviso-limite').hidden = false;
        actualizarContadorAvisos();
        return;
      }
    } catch { /* fallo puntual de red: lo volvemos a intentar */ }
  }
  pintarFila(fila, archivo, { estado: 'tarda', id });
}

function validar(archivo) {
  if (!EXTENSIONES.test(archivo.name) && !ACEPTADOS.split(',').includes(archivo.type)) return t('subir.error.formato');
  if (archivo.size > TAMANO_MAXIMO) return t('subir.error.tamano');
  return null;
}

async function subirArchivos(archivos, origen = 'subida') {
  if (!archivos.length) return;
  if (!perfilCompleto) return pedirPerfil();
  document.getElementById('subidas').hidden = false;

  const pendientes = archivos.map((archivo) => {
    const fila = document.createElement('li');
    fila.className = 'fila';
    lista.prepend(fila);
    const error = validar(archivo);
    pintarFila(fila, archivo, error ? { estado: 'error', error } : { estado: 'subiendo' });
    return { archivo, fila, error };
  });

  // De uno en uno: cada archivo se ve avanzar y cuenta para el límite del plan antes del siguiente.
  for (const { archivo, fila, error } of pendientes) {
    if (error) continue;
    const formulario = new FormData();
    formulario.append('archivos', archivo, archivo.name);
    formulario.append('origen', origen);
    try {
      const [resultado] = await api('/subida', { metodo: 'POST', formulario });
      if (resultado.estado === 'rechazado') {
        pintarFila(fila, archivo, { estado: 'error', error: resultado.error });
      } else if (resultado.estado === 'pendiente') {
        pintarFila(fila, archivo, { estado: 'leyendo', id: resultado.id });
        seguirLectura(fila, archivo, resultado.id);
      } else {
        pintarFila(fila, archivo, resultado);
        if (resultado.estado === 'sin_leer') document.getElementById('aviso-limite').hidden = false;
      }
    } catch (e) {
      if (e.codigo === 'perfil_incompleto') {
        perfilCompleto = false;
        fila.remove();
        pedirPerfil();
        break;
      }
      pintarFila(fila, archivo, { estado: 'error', error: e.message });
    }
  }
  actualizarContadorAvisos();
}

document.getElementById('elegir').addEventListener('click', () => {
  if (!perfilCompleto) return pedirPerfil();
  entrada.click();
});
entrada.addEventListener('change', () => {
  subirArchivos([...entrada.files]);
  entrada.value = '';
});
entradaFoto.addEventListener('change', () => {
  subirArchivos([...entradaFoto.files], 'camara');
  entradaFoto.value = '';
});

// Arrastrar y soltar (ordenador). Evitamos que el navegador abra el archivo si cae fuera de la zona.
['dragover', 'drop'].forEach((evento) => window.addEventListener(evento, (e) => e.preventDefault()));
let profundidad = 0;
zona.addEventListener('dragenter', () => { profundidad += 1; zona.classList.add('zona-activa'); });
zona.addEventListener('dragleave', () => { profundidad -= 1; if (profundidad <= 0) zona.classList.remove('zona-activa'); });
zona.addEventListener('drop', (e) => {
  profundidad = 0;
  zona.classList.remove('zona-activa');
  subirArchivos([...(e.dataTransfer?.files || [])]);
});

// ---------- Cámara dentro de la web (RF-14, RF-15) ----------

const seccionCamara = document.getElementById('camara');
const video = document.getElementById('video');
const miniaturas = document.getElementById('miniaturas');
const botonSubirFotos = document.getElementById('subir-fotos');
let flujo = null;
let modo = 'una';
let fotos = [];

function pintarFotos() {
  miniaturas.innerHTML = fotos.map((foto) => html`<img src="${foto.url}" alt="">`).join('');
  botonSubirFotos.hidden = !fotos.length;
  botonSubirFotos.textContent = t('subir.camara.subirFotos', { n: fotos.length });
}

function cerrarCamara() {
  flujo?.getTracks().forEach((pista) => pista.stop());
  flujo = null;
  fotos.forEach((foto) => URL.revokeObjectURL(foto.url));
  fotos = [];
  pintarFotos();
  seccionCamara.hidden = true;
  zona.hidden = false;
}

async function abrirCamara() {
  if (!perfilCompleto) return pedirPerfil();
  // Sin cámara en la web (navegador antiguo o página sin HTTPS): usamos la cámara del sistema.
  if (!navigator.mediaDevices?.getUserMedia) return entradaFoto.click();
  try {
    flujo = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    });
  } catch {
    mostrarToast(t('subir.camara.error'));
    return entradaFoto.click();
  }
  zona.hidden = true;
  seccionCamara.hidden = false;
  video.srcObject = flujo;
  await video.play().catch(() => {});
}

function hacerFoto() {
  if (!video.videoWidth) return;
  const lienzo = document.createElement('canvas');
  lienzo.width = video.videoWidth;
  lienzo.height = video.videoHeight;
  lienzo.getContext('2d').drawImage(video, 0, 0);
  lienzo.toBlob((blob) => {
    const marca = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const archivo = new File([blob], `foto-${marca}-${fotos.length + 1}.jpg`, { type: 'image/jpeg' });
    if (modo === 'una') {
      cerrarCamara();
      subirArchivos([archivo], 'camara');
    } else {
      fotos.push({ archivo, url: URL.createObjectURL(blob) });
      pintarFotos();
    }
  }, 'image/jpeg', 0.9);
}

document.getElementById('abrir-camara').addEventListener('click', abrirCamara);
document.getElementById('cancelar-camara').addEventListener('click', cerrarCamara);
document.getElementById('disparar').addEventListener('click', hacerFoto);
botonSubirFotos.addEventListener('click', () => {
  const archivos = fotos.map((foto) => foto.archivo);
  cerrarCamara();
  subirArchivos(archivos, 'camara');
});
seccionCamara.querySelectorAll('[data-modo]').forEach((pestana) => {
  pestana.addEventListener('click', () => {
    modo = pestana.dataset.modo;
    seccionCamara.querySelectorAll('[data-modo]').forEach((p) => p.setAttribute('aria-selected', String(p === pestana)));
  });
});
window.addEventListener('pagehide', () => flujo?.getTracks().forEach((pista) => pista.stop()));

// ---- App instalable y compartir (RF-22, #15) ----
registrarServiceWorker();

const tarjetaInstalar = document.getElementById('instalar');
const botonInstalar = document.getElementById('boton-instalar');
if (esIosSinInstalar()) {
  // Safari no tiene botón de instalar: explicamos cómo hacerlo a mano.
  document.getElementById('instalar-detalle').textContent = `${t('subir.instalar.texto')} ${t('subir.instalar.ios')}`;
  tarjetaInstalar.hidden = false;
}
alPoderInstalar((puede) => {
  botonInstalar.hidden = !puede;
  if (!esIosSinInstalar()) tarjetaInstalar.hidden = !puede;
});
botonInstalar.addEventListener('click', async () => {
  if (await instalar()) mostrarToast(t('subir.instalar.hecho'));
});

// Archivos compartidos desde otra app: el service worker los dejó guardados y nos manda aquí.
if (new URLSearchParams(location.search).has('compartido')) {
  history.replaceState(null, '', location.pathname);
  const compartidos = await recogerCompartidos();
  if (compartidos.length) {
    mostrarToast(t('subir.compartido'));
    subirArchivos(compartidos, 'compartir');
  } else {
    mostrarToast(t('subir.compartidoVacio'));
  }
}
