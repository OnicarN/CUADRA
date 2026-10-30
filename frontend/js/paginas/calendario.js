// Google Calendar (RF-54 a RF-56). Responsable: Dani (#16)
// Conectar o desconectar el calendario y elegir qué fechas de Hacienda se apuntan en él.
import { iniciarPagina } from '../core/layout.js';
import { api } from '../core/api.js';
import { t } from '../core/i18n.js';
import { fecha } from '../core/formato.js';
import { icono } from '../core/iconos.js';
import { html, seguro, mostrarToast } from '../core/ui.js';

const textos = {
  es: {
    'calendario.titulo': 'Google Calendar',
    'calendario.intro': 'Conecta tu calendario y Cuadra:',
    'calendario.ventaja1': 'te sugiere a qué reunión o viaje corresponde cada gasto;',
    'calendario.ventaja2': 'te avisa si una reunión o un viaje se ha quedado sin ticket;',
    'calendario.ventaja3': 'apunta en tu calendario los cierres de trimestre y los plazos del 303 y el 130.',
    'calendario.conectar': 'Conectar Google Calendar',
    'calendario.permiso': 'Solo leemos tus eventos y creamos los de Hacienda. Puedes desconectarlo cuando quieras.',
    'calendario.conectadoComo': 'Conectado como {email}',
    'calendario.conectadoSinEmail': 'Conectado',
    'calendario.sincronizado': 'Última sincronización: {fecha}',
    'calendario.sincronizando': 'Sincronizando tus eventos…',
    'calendario.desconectar': 'Desconectar',
    'calendario.confirmarDesconectar': '¿Desconectar Google Calendar? Los eventos de Hacienda que ya estén en tu calendario se quedan.',
    'calendario.desconectado': 'Google Calendar desconectado',
    'calendario.recienConectado': '¡Listo! Tu Google Calendar está conectado.',
    'calendario.fechas': 'Fechas de Hacienda',
    'calendario.fechasTexto': 'Elige qué fechas quieres en tu calendario y con cuánta antelación te avisamos.',
    'calendario.fecha.trimestre': 'Cierre de cada trimestre',
    'calendario.fecha.trimestreTexto': '31 de marzo, 30 de junio, 30 de septiembre y 31 de diciembre',
    'calendario.fecha.303': 'Plazo del modelo 303 (IVA)',
    'calendario.fecha.303Texto': '20 de abril, julio y octubre, y 30 de enero',
    'calendario.fecha.130': 'Plazo del modelo 130 (IRPF)',
    'calendario.fecha.130Texto': 'Las mismas fechas que el 303',
    'calendario.antelacion': 'Avisarme antes con',
    'calendario.dias': 'días',
    'calendario.antelacionError': 'Escribe un número de días entre 0 y {max}.',
    'calendario.guardado': 'Fechas guardadas en tu calendario',
    'calendario.sinPlan': 'Google Calendar está incluido en el plan Pro, o puedes añadirlo a tu plan por 1,99 €/mes.',
    'calendario.verPlanes': 'Ver planes',
    'calendario.simular': 'Probar con un calendario de prueba (solo en local)',
    'calendario.sinConfigurar': 'La conexión con Google todavía no está activada en Cuadra. Vuelve a intentarlo más adelante.',
    'calendario.error.plan': 'Tu plan no incluye Google Calendar.',
    'calendario.error.configuracion': 'La conexión con Google todavía no está activada en Cuadra.',
    'calendario.error.cancelado': 'Has cancelado la conexión con Google.',
    'calendario.error.google': 'No hemos podido conectar con Google. Inténtalo de nuevo.',
  },
  en: {
    'calendario.titulo': 'Google Calendar',
    'calendario.intro': 'Connect your calendar and Cuadra will:',
    'calendario.ventaja1': 'suggest which meeting or trip each expense belongs to;',
    'calendario.ventaja2': 'let you know when a meeting or trip has no receipt;',
    'calendario.ventaja3': 'add quarter ends and the 303 and 130 deadlines to your calendar.',
    'calendario.conectar': 'Connect Google Calendar',
    'calendario.permiso': 'We only read your events and add the tax ones. You can disconnect at any time.',
    'calendario.conectadoComo': 'Connected as {email}',
    'calendario.conectadoSinEmail': 'Connected',
    'calendario.sincronizado': 'Last sync: {fecha}',
    'calendario.sincronizando': 'Syncing your events…',
    'calendario.desconectar': 'Disconnect',
    'calendario.confirmarDesconectar': 'Disconnect Google Calendar? Tax events already in your calendar will stay there.',
    'calendario.desconectado': 'Google Calendar disconnected',
    'calendario.recienConectado': 'Done! Your Google Calendar is connected.',
    'calendario.fechas': 'Tax dates',
    'calendario.fechasTexto': 'Choose which dates you want in your calendar and how early we remind you.',
    'calendario.fecha.trimestre': 'End of each quarter',
    'calendario.fecha.trimestreTexto': '31 March, 30 June, 30 September and 31 December',
    'calendario.fecha.303': 'Form 303 deadline (VAT)',
    'calendario.fecha.303Texto': '20 April, July and October, and 30 January',
    'calendario.fecha.130': 'Form 130 deadline (income tax)',
    'calendario.fecha.130Texto': 'Same dates as form 303',
    'calendario.antelacion': 'Remind me',
    'calendario.dias': 'days before',
    'calendario.antelacionError': 'Enter a number of days between 0 and {max}.',
    'calendario.guardado': 'Dates saved to your calendar',
    'calendario.sinPlan': 'Google Calendar is included in the Pro plan, or you can add it to your plan for €1.99/month.',
    'calendario.verPlanes': 'See plans',
    'calendario.simular': 'Try with a test calendar (local only)',
    'calendario.sinConfigurar': "The Google connection isn't enabled in Cuadra yet. Please try again later.",
    'calendario.error.plan': "Your plan doesn't include Google Calendar.",
    'calendario.error.configuracion': "The Google connection isn't enabled in Cuadra yet.",
    'calendario.error.cancelado': 'You cancelled the Google connection.',
    'calendario.error.google': "We couldn't connect to Google. Please try again.",
  },
};

await iniciarPagina({ pagina: 'calendario', privada: true, textos });

const FECHAS = ['trimestre', '303', '130'];
const contenido = document.getElementById('contenido');
let estado = await api('/calendario');

// Mensajes de la vuelta de Google (?conectado=1 o ?error=...): se enseñan una vez y se quitan de la URL.
const parametros = new URLSearchParams(location.search);
const error = parametros.get('error');
if (parametros.has('conectado')) mostrarToast(t('calendario.recienConectado'));
if (parametros.size) history.replaceState(null, '', location.pathname);

const bannerError = () => (error && t(`calendario.error.${error}`) !== `calendario.error.${error}`
  ? html`<div class="banner banner-aviso" role="alert">${seguro(icono('alerta'))}<span class="banner-texto">${t(`calendario.error.${error}`)}</span></div>`
  : '');

const tarjetaSinPlan = () => html`
  <section class="tarjeta calendario-centro">
    <span class="calendario-icono">${seguro(icono('calendario'))}</span>
    <p>${t('calendario.sinPlan')}</p>
    <a class="boton boton-principal" href="/app/suscripcion">${t('calendario.verPlanes')}</a>
  </section>`;

const tarjetaConectar = () => html`
  <section class="tarjeta calendario-centro">
    <span class="calendario-icono">${seguro(icono('calendario'))}</span>
    <div class="calendario-ventajas">
      <p>${t('calendario.intro')}</p>
      <ul>
        <li>${t('calendario.ventaja1')}</li>
        <li>${t('calendario.ventaja2')}</li>
        <li>${t('calendario.ventaja3')}</li>
      </ul>
    </div>
    ${estado.configurado
      ? seguro(html`<a class="boton boton-principal" href="/api/calendario/conectar">${seguro(icono('google'))}${t('calendario.conectar')}</a>
        <p class="texto-2 calendario-nota">${t('calendario.permiso')}</p>`)
      : seguro(html`<p class="texto-2">${t('calendario.sinConfigurar')}</p>`)}
    ${estado.simulable ? seguro(html`<button type="button" class="boton boton-texto" id="simular">${t('calendario.simular')}</button>`) : ''}
  </section>`;

const filaFecha = (tipo) => html`
  <li class="fila">
    <label class="calendario-interruptor">
      <span class="fila-centro">
        <span class="fila-titulo">${t(`calendario.fecha.${tipo}`)}</span>
        <span class="fila-sub">${t(`calendario.fecha.${tipo}Texto`)}</span>
      </span>
      <input type="checkbox" role="switch" name="fecha" value="${tipo}" ${seguro(estado.fechas_fiscales.includes(tipo) ? 'checked' : '')}>
    </label>
  </li>`;

const tarjetasConectado = () => html`
  <section class="tarjeta calendario-conexion">
    <span class="calendario-icono">${seguro(icono('calendario'))}</span>
    <div class="fila-centro">
      <span class="fila-titulo">${estado.email_google ? t('calendario.conectadoComo', { email: estado.email_google }) : t('calendario.conectadoSinEmail')}</span>
      <span class="fila-sub">${estado.sincronizado_en
        ? t('calendario.sincronizado', { fecha: fecha(estado.sincronizado_en, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) })
        : t('calendario.sincronizando')}</span>
    </div>
    <button type="button" class="boton boton-secundario" id="desconectar">${t('calendario.desconectar')}</button>
  </section>
  <section class="tarjeta">
    <h2 class="titulo-seccion">${t('calendario.fechas')}</h2>
    <p class="texto-2 calendario-texto">${t('calendario.fechasTexto')}</p>
    <form class="formulario" id="form-fechas" novalidate>
      <ul class="lista">${FECHAS.map((tipo) => seguro(filaFecha(tipo)))}</ul>
      <div class="campo">
        <label for="dias">${t('calendario.antelacion')}</label>
        <div class="calendario-dias">
          <input id="dias" name="dias" type="number" inputmode="numeric" min="0" max="${estado.max_dias_antelacion}" step="1" required value="${estado.dias_antelacion}" aria-describedby="dias-error">
          <span>${t('calendario.dias')}</span>
        </div>
        <p class="campo-error" id="dias-error" hidden>${t('calendario.antelacionError', { max: estado.max_dias_antelacion })}</p>
      </div>
      <button type="submit" class="boton boton-principal">${t('comun.guardar')}</button>
    </form>
  </section>`;

function pintar() {
  let cuerpo;
  if (!estado.disponible) cuerpo = tarjetaSinPlan();
  else if (!estado.conectado) cuerpo = tarjetaConectar();
  else cuerpo = tarjetasConectado();
  contenido.innerHTML = html`
    <div class="cabecera-pagina"><h1 class="titulo-pagina">${t('calendario.titulo')}</h1></div>
    <div class="pila">${seguro(bannerError())}${seguro(cuerpo)}</div>`;
  if (estado.disponible && estado.conectado) activarFormulario();
  document.getElementById('simular')?.addEventListener('click', async (evento) => {
    evento.currentTarget.disabled = true;
    try {
      await api('/calendario/simular', { metodo: 'POST' });
      estado = await api('/calendario');
      mostrarToast(t('calendario.recienConectado'));
      pintar();
    } catch (e) {
      mostrarToast(e.message || t('comun.error'));
    }
  });
}

function activarFormulario() {
  const desconectar = document.getElementById('desconectar');
  desconectar.addEventListener('click', async () => {
    if (!confirm(t('calendario.confirmarDesconectar'))) return;
    desconectar.disabled = true;
    try {
      await api('/calendario', { metodo: 'DELETE' });
      mostrarToast(t('calendario.desconectado'));
      estado = await api('/calendario');
      pintar();
    } catch (e) {
      mostrarToast(e.message || t('comun.error'));
      desconectar.disabled = false;
    }
  });

  const formulario = document.getElementById('form-fechas');
  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const campo = formulario.elements.dias;
    const dias = Number(campo.value);
    const valido = campo.value !== '' && Number.isInteger(dias) && dias >= 0 && dias <= estado.max_dias_antelacion;
    document.getElementById('dias-error').hidden = valido;
    campo.setAttribute('aria-invalid', String(!valido));
    if (!valido) { campo.focus(); return; }

    const boton = formulario.querySelector('[type=submit]');
    boton.disabled = true;
    const fechas = [...formulario.querySelectorAll('[name=fecha]:checked')].map((c) => c.value);
    try {
      await api('/calendario/ajustes', { metodo: 'PUT', cuerpo: { fechas_fiscales: fechas, dias_antelacion: dias } });
      estado = { ...estado, fechas_fiscales: fechas, dias_antelacion: dias };
      mostrarToast(t('calendario.guardado'));
    } catch (e) {
      mostrarToast(e.message || t('comun.error'));
    } finally {
      boton.disabled = false;
    }
  });
}

pintar();
