// Privacidad (#51). Responsable: Ana
// Qué datos guarda Cuadra, para qué, quién los ve y cómo descargarlos o borrarlos.
// PROVISIONAL: el texto está pendiente de revisión legal (lo dice también la propia página).
// Si cambian los servicios externos (lectura con IA, pagos, email, alojamiento), actualiza "terceros" e "ia".
// El apartado "ia" describe lo que envía modulos/lectura (el archivo y los nombres de las categorías).
import { iniciarPagina } from '../core/layout.js';
import { t } from '../core/i18n.js';
import { icono } from '../core/iconos.js';
import { html, seguro } from '../core/ui.js';

const textos = {
  es: {
    'privacidad.titulo': 'Privacidad',
    'privacidad.subtitulo': 'Tus datos fiscales son tuyos y solo los ves tú. Aquí te contamos qué guardamos, para qué y cómo llevártelo o borrarlo.',
    'privacidad.provisional': 'Texto provisional: está pendiente de revisión legal y puede cambiar.',
    'privacidad.actualizado': 'Última actualización: 30 de octubre de 2026',

    'privacidad.datos.titulo': 'Qué datos guardamos',
    'privacidad.datos.1': 'Tu cuenta: nombre, email, contraseña cifrada (nunca la guardamos en claro) e idioma y tema elegidos.',
    'privacidad.datos.2': 'Tu perfil fiscal: NIF, dirección fiscal, actividad, régimen de IVA y, si lo añades, el email de tu gestoría.',
    'privacidad.datos.3': 'Tus facturas y tickets: la foto o el PDF original y los datos que se leen de ellos (fecha, emisor, NIF, importes, IVA, categoría).',
    'privacidad.datos.4': 'Lo que configuras: avisos, emails de confianza, plan contratado y, si la conectas, la relación con tu Google Calendar.',

    'privacidad.uso.titulo': 'Para qué los usamos',
    'privacidad.uso.1': 'Leer tus facturas y dejarlas listas para que las revises y confirmes.',
    'privacidad.uso.2': 'Avisarte de lo que puedes estar perdiendo: tickets sin NIF, duplicados, facturas pendientes o el trimestre a punto de cerrar.',
    'privacidad.uso.3': 'Preparar el Excel y el informe trimestral y, si tú lo pides, enviarlos a tu gestoría.',
    'privacidad.uso.4': 'Gestionar tu cuenta y tu plan, y escribirte por email solo para cosas de tu cuenta (verificación, contraseña, avisos que tengas activados).',

    'privacidad.quien.titulo': 'Quién los ve',
    'privacidad.quien.texto': 'Solo tú. Cada consulta de Cuadra se limita a los datos de tu cuenta, así que nadie más puede ver tus facturas. No vendemos tus datos ni los usamos para publicidad. Tu gestoría solo recibe lo que tú le envíes desde Informes.',

    'privacidad.terceros.titulo': 'Servicios que usamos',
    'privacidad.terceros.texto': 'Para funcionar, Cuadra se apoya en estos servicios, que solo reciben lo necesario para hacer su parte:',
    'privacidad.terceros.ia': 'Google Gemini: lee la foto o el PDF de cada factura para sacar sus datos (más abajo, los detalles).',
    'privacidad.terceros.google': 'Google: si entras con tu cuenta de Google o conectas Google Calendar.',
    'privacidad.terceros.pagos': 'Stripe: cobra los planes de pago. Cuadra no guarda los datos de tu tarjeta.',
    'privacidad.terceros.email': 'Nuestro proveedor de email: envía los correos de tu cuenta y los que mandas a tu gestoría.',
    'privacidad.terceros.alojamiento': 'Nuestro proveedor de alojamiento y base de datos: donde se guarda todo lo anterior.',

    'privacidad.ia.titulo': 'Cómo usamos la IA con tus datos',
    'privacidad.ia.texto': 'Cuadra usa inteligencia artificial (Google Gemini) solo para leer tus facturas y ahorrarte teclearlas.',
    'privacidad.ia.envia': 'Qué se envía: la foto o el PDF de cada factura que subes y la lista de nombres de tus categorías, para que proponga una.',
    'privacidad.ia.noEnvia': 'Qué no se envía: tu nombre, tu email, tu contraseña ni tu perfil fiscal. Aun así, la propia factura puede llevar datos tuyos, como tu NIF o tu dirección.',
    'privacidad.ia.cuando': 'Cuándo: solo al leer una factura nueva. No se envían tus otras facturas ni tu historial.',
    'privacidad.ia.decides': 'Tú decides: lo que lee la IA es una sugerencia. Nada cuenta en tus cifras, el Excel o el informe hasta que tú lo revisas y lo confirmas, y puedes corregirlo todo.',
    'privacidad.ia.entrenar': 'Cuadra no usa tus facturas para entrenar ningún modelo de IA.',
    'privacidad.ia.google': 'Google trata los archivos según las condiciones de la API de Gemini. Según el plan de la API que se use, Google puede conservarlos un tiempo o usarlos para mejorar sus servicios. Antes de la versión definitiva de este texto se indicará el plan contratado y sus condiciones.',
    'privacidad.ia.sinIa': 'Si prefieres que una factura no pase por la IA, no la subas a Cuadra: de momento no hay forma de leerla sin ella.',

    'privacidad.control.titulo': 'Tú tienes el control',
    'privacidad.control.ver': 'Ver y corregir tus datos: en tu perfil y en cada factura.',
    'privacidad.control.descargar': 'Llevártelo todo: en Ajustes, "Eliminar cuenta" te deja descargar una copia con todas tus facturas en Excel y todos los originales.',
    'privacidad.control.eliminar': 'Eliminar tu cuenta: también en Ajustes. Se borran tu cuenta y todos tus datos, y si tienes un plan de pago se cancela.',
    'privacidad.control.hacienda': 'Antes de eliminar la cuenta, descarga la copia: Hacienda puede pedirte las facturas y los justificantes durante varios años y, una vez borradas, no se pueden recuperar.',
    'privacidad.irAjustes': 'Ir a Ajustes',

    'privacidad.contacto.titulo': '¿Dudas?',
    'privacidad.contacto.texto': 'Escríbenos a {email} y te respondemos.',
  },
  en: {
    'privacidad.titulo': 'Privacy',
    'privacidad.subtitulo': 'Your tax data is yours and only you can see it. Here is what we keep, why, and how to take it with you or delete it.',
    'privacidad.provisional': 'Provisional text: it is pending legal review and may change.',
    'privacidad.actualizado': 'Last updated: 30 October 2026',

    'privacidad.datos.titulo': 'What data we keep',
    'privacidad.datos.1': 'Your account: name, email, encrypted password (we never store it in plain text), and your chosen language and theme.',
    'privacidad.datos.2': "Your tax profile: tax ID, tax address, activity, VAT scheme and, if you add it, your accountant's email.",
    'privacidad.datos.3': 'Your invoices and receipts: the original photo or PDF and the details read from them (date, issuer, tax ID, amounts, VAT, category).',
    'privacidad.datos.4': 'What you set up: alerts, trusted emails, your plan and, if you connect it, the link with your Google Calendar.',

    'privacidad.uso.titulo': 'What we use it for',
    'privacidad.uso.1': 'Reading your invoices and getting them ready for you to review and confirm.',
    'privacidad.uso.2': 'Alerting you to what you may be losing: receipts without a tax ID, duplicates, pending invoices or the quarter about to close.',
    'privacidad.uso.3': 'Preparing the Excel file and the quarterly report and, if you ask, sending them to your accountant.',
    'privacidad.uso.4': 'Managing your account and plan, and emailing you only about your account (verification, password, alerts you have turned on).',

    'privacidad.quien.titulo': 'Who can see it',
    'privacidad.quien.texto': 'Only you. Every query in Cuadra is limited to your account, so nobody else can see your invoices. We do not sell your data or use it for advertising. Your accountant only gets what you send from Reports.',

    'privacidad.terceros.titulo': 'Services we use',
    'privacidad.terceros.texto': 'To work, Cuadra relies on these services, which only receive what they need to do their part:',
    'privacidad.terceros.ia': 'Google Gemini: reads the photo or PDF of each invoice to extract its details (details below).',
    'privacidad.terceros.google': 'Google: if you sign in with your Google account or connect Google Calendar.',
    'privacidad.terceros.pagos': 'Stripe: charges the paid plans. Cuadra does not store your card details.',
    'privacidad.terceros.email': 'Our email provider: sends your account emails and the ones you send to your accountant.',
    'privacidad.terceros.alojamiento': 'Our hosting and database provider: where all of the above is stored.',

    'privacidad.ia.titulo': 'How we use AI with your data',
    'privacidad.ia.texto': 'Cuadra uses artificial intelligence (Google Gemini) only to read your invoices so you do not have to type them.',
    'privacidad.ia.envia': 'What is sent: the photo or PDF of each invoice you upload and the list of your category names, so it can suggest one.',
    'privacidad.ia.noEnvia': 'What is not sent: your name, email, password or tax profile. Even so, the invoice itself may contain your details, such as your tax ID or address.',
    'privacidad.ia.cuando': 'When: only when reading a new invoice. Your other invoices and your history are not sent.',
    'privacidad.ia.decides': 'You decide: what the AI reads is a suggestion. Nothing counts in your figures, the Excel file or the report until you review and confirm it, and you can correct everything.',
    'privacidad.ia.entrenar': 'Cuadra does not use your invoices to train any AI model.',
    'privacidad.ia.google': 'Google handles the files under the Gemini API terms. Depending on the API plan used, Google may keep them for a while or use them to improve its services. Before the final version of this text, the plan in use and its terms will be stated.',
    'privacidad.ia.sinIa': "If you'd rather an invoice did not go through the AI, don't upload it to Cuadra: for now there is no way to read it without it.",

    'privacidad.control.titulo': "You're in control",
    'privacidad.control.ver': 'See and correct your data: in your profile and on each invoice.',
    'privacidad.control.descargar': 'Take everything with you: in Settings, "Delete account" lets you download a copy with all your invoices in Excel and all the originals.',
    'privacidad.control.eliminar': 'Delete your account: also in Settings. Your account and all your data are deleted, and any paid plan is cancelled.',
    'privacidad.control.hacienda': 'Download the copy before deleting your account: the Spanish Tax Agency can ask for your invoices and receipts for several years and, once deleted, they cannot be recovered.',
    'privacidad.irAjustes': 'Go to Settings',

    'privacidad.contacto.titulo': 'Questions?',
    'privacidad.contacto.texto': 'Write to us at {email} and we will get back to you.',
  },
};

const EMAIL_CONTACTO = 'hola@cuadra.app';

const { usuario } = await iniciarPagina({ pagina: 'privacidad', textos });

const seccion = (clave, contenido) => html`
  <section class="tarjeta privacidad-seccion" aria-labelledby="titulo-${clave}">
    <h2 class="titulo-seccion" id="titulo-${clave}">${t(`privacidad.${clave}.titulo`)}</h2>
    ${seguro(contenido)}
  </section>`;
const lista = (claves) => html`<ul class="privacidad-lista">${claves.map((c) => seguro(html`<li>${t(c)}</li>`))}</ul>`;

// El texto del contacto lleva el email como enlace: se parte el texto traducido por {email}.
const [antesEmail, despuesEmail] = t('privacidad.contacto.texto', { email: '\u0000' }).split('\u0000');

document.getElementById('contenido').innerHTML = html`
  <header class="privacidad-cabecera">
    <h1 class="titulo-pagina">${t('privacidad.titulo')}</h1>
    <p class="texto-2">${t('privacidad.subtitulo')}</p>
    <p class="privacidad-fecha">${t('privacidad.actualizado')}</p>
  </header>
  <div class="pila privacidad-cuerpo">
    <div class="banner" role="note">${seguro(icono('alerta'))}<span class="banner-texto">${t('privacidad.provisional')}</span></div>
    ${seguro(seccion('datos', lista(['privacidad.datos.1', 'privacidad.datos.2', 'privacidad.datos.3', 'privacidad.datos.4'])))}
    ${seguro(seccion('uso', lista(['privacidad.uso.1', 'privacidad.uso.2', 'privacidad.uso.3', 'privacidad.uso.4'])))}
    ${seguro(seccion('quien', html`<p>${t('privacidad.quien.texto')}</p>`))}
    ${seguro(seccion('terceros', html`
      <p>${t('privacidad.terceros.texto')}</p>
      ${seguro(lista(['privacidad.terceros.ia', 'privacidad.terceros.google', 'privacidad.terceros.pagos', 'privacidad.terceros.email', 'privacidad.terceros.alojamiento']))}`))}
    ${seguro(seccion('ia', html`
      <p>${t('privacidad.ia.texto')}</p>
      ${seguro(lista(['privacidad.ia.envia', 'privacidad.ia.noEnvia', 'privacidad.ia.cuando', 'privacidad.ia.decides']))}
      <p class="privacidad-destacado">${seguro(icono('escudo'))}<span>${t('privacidad.ia.entrenar')}</span></p>
      <p class="texto-2">${t('privacidad.ia.google')}</p>
      <p class="texto-2">${t('privacidad.ia.sinIa')}</p>`))}
    ${seguro(seccion('control', html`
      ${seguro(lista(['privacidad.control.ver', 'privacidad.control.descargar', 'privacidad.control.eliminar']))}
      <div class="banner banner-aviso">${seguro(icono('alerta'))}<span class="banner-texto">${t('privacidad.control.hacienda')}</span></div>
      ${usuario ? seguro(html`<a class="boton boton-secundario" href="/app/ajustes">${seguro(icono('ajustes'))}${t('privacidad.irAjustes')}</a>`) : ''}`))}
    ${seguro(seccion('contacto', html`<p>${antesEmail}<a class="boton-texto" href="mailto:${EMAIL_CONTACTO}">${EMAIL_CONTACTO}</a>${despuesEmail}</p>`))}
  </div>`;
