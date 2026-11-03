// Páginas legales: /privacidad y /condiciones (#51). Responsable: Dani.
// El HTML de cada una solo dice cuál es (<body data-legal="privacidad">); el texto está aquí,
// en español e inglés, como una lista de secciones. Al cambiar algo, cambia ACTUALIZADO.
import { iniciarPagina } from '../core/layout.js';
import { t, idioma } from '../core/i18n.js';
import { fecha } from '../core/formato.js';
import { html, seguro } from '../core/ui.js';

const ACTUALIZADO = '2026-11-03';
const EMAIL = 'hola@cuadra.app';

const PRIVACIDAD = {
  es: {
    titulo: 'Política de privacidad',
    intro: 'Aquí te contamos, sin letra pequeña, qué datos guarda Cuadra, para qué los usa y con quién los comparte.',
    secciones: [
      ['responsable', 'Quién es el responsable', [
        `Cuadra es un proyecto para ayudar a los autónomos con sus gastos. Para cualquier cosa sobre tus datos, escríbenos a ${EMAIL}.`,
      ]],
      ['datos', 'Qué datos guardamos', [
        'Tu cuenta: nombre, email y contraseña (cifrada; nunca la vemos). Si entras con Google, tu identificador de Google.',
        'Tu perfil fiscal: NIF, dirección fiscal, actividad, régimen de IVA y, si lo pones, el email de tu gestoría.',
        'Las facturas y tickets que subes (el archivo original) y los datos que se leen de ellos: fecha, emisor, NIF, importes, IVA y categoría.',
        'Los correos que reenvías a tu dirección de Cuadra: el remitente, el asunto y los adjuntos o el texto.',
        'Si conectas Google Calendar, los eventos de los últimos 90 días y los próximos 30 (título, fecha y lugar).',
        'Tu plan y tus pagos. La tarjeta la gestiona Stripe: Cuadra nunca ve ni guarda sus números.',
        'Tus preferencias (idioma, tema y avisos) y, si la pones, tu foto de perfil.',
      ]],
      ['para-que', 'Para qué los usamos', [
        'Para leer y ordenar tus facturas, avisarte de lo que falta o no cuadra, preparar tu Excel y tu informe trimestral y cobrarte el plan que elijas.',
        'No vendemos tus datos ni los usamos para publicidad.',
      ]],
      ['ia', 'La lectura con inteligencia artificial', [
        'Para leer tus facturas, Cuadra envía el archivo a Google Gemini, que devuelve los datos. Lo que propone la IA solo es una sugerencia: cuenta lo que tú confirmas.',
        'Mientras Cuadra use la versión gratuita de Gemini, Google puede usar lo que se le envía para mejorar sus servicios. Por eso, en esta fase, te recomendamos no subir documentos con datos especialmente sensibles.',
      ]],
      ['terceros', 'Con quién los compartimos', [
        'Solo con los servicios que hacen funcionar Cuadra, y solo lo necesario: Google (lectura con IA, entrar con Google y Calendar si lo usas), Stripe (pagos), Render y Neon (el servidor y la base de datos, en la Unión Europea, en Frankfurt) y el servicio que envía nuestros emails.',
      ]],
      ['calendario', 'Google Calendar', [
        'Si lo conectas, pedimos permiso para ver y crear eventos (calendar.events). Leemos tus eventos solo para sugerirte a qué viaje o reunión corresponde un gasto y avisarte de los que se quedaron sin ticket, y creamos en tu calendario los plazos de Hacienda que elijas.',
        'Puedes desconectarlo cuando quieras en Perfil → Google Calendar. También puedes quitar el permiso desde tu cuenta de Google.',
      ]],
      ['tiempo', 'Cuánto tiempo los guardamos', [
        'Mientras tengas la cuenta. Si la eliminas, borramos tus facturas, archivos y datos. Los pagos se conservan el tiempo que exige la ley.',
      ]],
      ['derechos', 'Tus derechos', [
        'Puedes ver, corregir, descargar (en Excel, desde Informes) y borrar tus datos, y oponerte a su uso. Escríbenos a ' + EMAIL + ' y te respondemos en menos de un mes.',
        'Si no te convence la respuesta, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).',
      ]],
      ['cookies', 'Cookies', [
        'Solo usamos una cookie técnica para mantener tu sesión iniciada (cuadra_sesion) y guardamos en tu navegador el tema y el idioma. No usamos cookies de publicidad ni de analítica.',
      ]],
    ],
  },
  en: {
    titulo: 'Privacy policy',
    intro: 'Here we explain, with no small print, what data Cuadra keeps, what it uses it for and who it shares it with.',
    secciones: [
      ['responsable', 'Who is responsible', [
        `Cuadra is a project to help freelancers with their expenses. For anything about your data, write to ${EMAIL}.`,
      ]],
      ['datos', 'What data we keep', [
        'Your account: name, email and password (encrypted; we never see it). If you log in with Google, your Google identifier.',
        'Your tax profile: tax ID, tax address, activity, VAT scheme and, if you add it, your accountant’s email.',
        'The invoices and receipts you upload (the original file) and the data read from them: date, issuer, tax ID, amounts, VAT and category.',
        'The emails you forward to your Cuadra address: sender, subject and attachments or text.',
        'If you connect Google Calendar, events from the last 90 days and the next 30 (title, date and place).',
        'Your plan and payments. Your card is handled by Stripe: Cuadra never sees or stores its numbers.',
        'Your preferences (language, theme and alerts) and, if you add one, your profile photo.',
      ]],
      ['para-que', 'What we use it for', [
        'To read and organise your invoices, alert you to what is missing or does not add up, prepare your Excel file and quarterly report, and charge the plan you choose.',
        'We do not sell your data or use it for advertising.',
      ]],
      ['ia', 'Reading with artificial intelligence', [
        'To read your invoices, Cuadra sends the file to Google Gemini, which returns the data. What the AI proposes is only a suggestion: what counts is what you confirm.',
        'While Cuadra uses the free version of Gemini, Google may use what it receives to improve its services. So, at this stage, we recommend not uploading documents with especially sensitive data.',
      ]],
      ['terceros', 'Who we share it with', [
        'Only with the services that make Cuadra work, and only what is needed: Google (AI reading, Google login and Calendar if you use it), Stripe (payments), Render and Neon (server and database, in the European Union, in Frankfurt) and the service that sends our emails.',
      ]],
      ['calendario', 'Google Calendar', [
        'If you connect it, we ask for permission to see and create events (calendar.events). We read your events only to suggest which trip or meeting an expense belongs to and to alert you about those without a receipt, and we add the tax deadlines you choose to your calendar.',
        'You can disconnect it at any time in Profile → Google Calendar, or remove the permission from your Google account.',
      ]],
      ['tiempo', 'How long we keep it', [
        'As long as you have an account. If you delete it, we delete your invoices, files and data. Payments are kept for as long as the law requires.',
      ]],
      ['derechos', 'Your rights', [
        'You can see, correct, download (as Excel, from Reports) and delete your data, and object to its use. Write to ' + EMAIL + ' and we will reply within a month.',
        'If you are not happy with the answer, you can complain to the Spanish Data Protection Agency (aepd.es).',
      ]],
      ['cookies', 'Cookies', [
        'We only use one technical cookie to keep you logged in (cuadra_sesion) and we store your theme and language in your browser. We do not use advertising or analytics cookies.',
      ]],
    ],
  },
};

const CONDICIONES = {
  es: {
    titulo: 'Condiciones de uso',
    intro: 'Estas son las reglas para usar Cuadra. Al crear tu cuenta las aceptas.',
    secciones: [
      ['que-es', 'Qué es Cuadra', [
        'Una web para que los autónomos suban sus tickets y facturas, revisen los datos que lee la IA y lleguen al cierre del trimestre con todo en orden.',
      ]],
      ['cuenta', 'Tu cuenta y la prueba gratuita', [
        'Necesitas una cuenta con un email válido. Eres responsable de lo que se haga con ella: no compartas tu contraseña.',
        'Al crearla tienes 14 días de prueba con todo incluido. Después pasas al plan gratis, salvo que elijas otro.',
      ]],
      ['planes', 'Planes, pagos y cancelación', [
        'Los planes de pago se cobran cada mes por adelantado con tarjeta, a través de Stripe, y se renuevan solos.',
        'Puedes cancelar cuando quieras desde Tu plan: mantienes lo pagado hasta el final del mes y luego pasas al plan gratis, sin perder ninguna factura.',
        'Las lecturas extra son un pago único para ese mes.',
      ]],
      ['ia', 'La IA puede equivocarse', [
        'Cuadra lee las facturas con inteligencia artificial y puede cometer errores. Revisa siempre los datos antes de confirmarlos: lo que cuenta es lo que tú confirmas.',
        'Cuadra te ayuda a ordenar tus gastos, pero no es una gestoría ni un asesor fiscal y no presenta impuestos por ti. Las decisiones fiscales son tuyas o de tu gestoría.',
      ]],
      ['uso', 'Uso aceptable', [
        'Sube solo documentos tuyos o que tengas derecho a usar. No uses Cuadra para nada ilegal ni intentes acceder a datos de otras personas o romper el servicio.',
      ]],
      ['responsabilidad', 'Responsabilidad', [
        'Hacemos lo posible para que Cuadra funcione siempre y tus datos estén seguros, pero puede haber cortes o errores. No respondemos de daños indirectos, como sanciones por datos que no se revisaron.',
      ]],
      ['baja', 'Darte de baja', [
        'Puedes eliminar tu cuenta cuando quieras. Antes, descarga tu Excel si quieres conservar tus datos.',
      ]],
      ['cambios', 'Cambios', [
        'Si cambiamos estas condiciones, te avisaremos con antelación. Si sigues usando Cuadra después, entendemos que las aceptas.',
      ]],
      ['ley', 'Contacto y ley aplicable', [
        `Para cualquier duda, ${EMAIL}. Estas condiciones se rigen por la ley española.`,
      ]],
    ],
  },
  en: {
    titulo: 'Terms of use',
    intro: 'These are the rules for using Cuadra. By creating your account you accept them.',
    secciones: [
      ['que-es', 'What Cuadra is', [
        'A website for freelancers to upload their receipts and invoices, check the data read by the AI and reach the end of the quarter with everything in order.',
      ]],
      ['cuenta', 'Your account and free trial', [
        'You need an account with a valid email. You are responsible for what is done with it: do not share your password.',
        'When you create it you get a 14-day trial with everything included. After that you move to the free plan unless you choose another.',
      ]],
      ['planes', 'Plans, payments and cancellation', [
        'Paid plans are charged monthly in advance by card, through Stripe, and renew automatically.',
        'You can cancel at any time from Your plan: you keep what you paid for until the end of the month and then move to the free plan, without losing any invoice.',
        'Extra reads are a one-off payment for that month.',
      ]],
      ['ia', 'The AI can make mistakes', [
        'Cuadra reads invoices with artificial intelligence and can make mistakes. Always check the data before confirming it: what counts is what you confirm.',
        'Cuadra helps you organise your expenses, but it is not an accountant or tax adviser and does not file taxes for you. Tax decisions are yours or your accountant’s.',
      ]],
      ['uso', 'Acceptable use', [
        'Only upload documents that are yours or that you have the right to use. Do not use Cuadra for anything illegal or try to access other people’s data or break the service.',
      ]],
      ['responsabilidad', 'Liability', [
        'We do our best to keep Cuadra running and your data safe, but there may be outages or errors. We are not liable for indirect damages, such as penalties for data that was not checked.',
      ]],
      ['baja', 'Leaving', [
        'You can delete your account at any time. Before that, download your Excel file if you want to keep your data.',
      ]],
      ['cambios', 'Changes', [
        'If we change these terms, we will let you know in advance. If you keep using Cuadra afterwards, we understand that you accept them.',
      ]],
      ['ley', 'Contact and applicable law', [
        `For any questions, ${EMAIL}. These terms are governed by Spanish law.`,
      ]],
    ],
  },
};

const textos = {
  es: { 'legal.indice': 'En esta página', 'legal.actualizado': 'Última actualización: {fecha}' },
  en: { 'legal.indice': 'On this page', 'legal.actualizado': 'Last updated: {fecha}' },
};

const pagina = document.body.dataset.legal === 'condiciones' ? 'condiciones' : 'privacidad';
await iniciarPagina({ pagina, textos });

const contenido = (pagina === 'condiciones' ? CONDICIONES : PRIVACIDAD)[idioma()] || PRIVACIDAD.es;
document.title = `${contenido.titulo} · Cuadra`;

document.getElementById('contenido').innerHTML = html`
  <article class="legal">
    <header class="legal-cabecera">
      <h1 class="titulo-pagina">${contenido.titulo}</h1>
      <p class="texto-2">${t('legal.actualizado', { fecha: fecha(ACTUALIZADO, { day: 'numeric', month: 'long', year: 'numeric' }) })}</p>
      <p class="legal-intro">${contenido.intro}</p>
    </header>
    <nav class="legal-indice tarjeta" aria-labelledby="legal-indice">
      <h2 class="titulo-seccion" id="legal-indice">${t('legal.indice')}</h2>
      <ol>${contenido.secciones.map(([id, titulo]) => seguro(html`<li><a href="#${id}">${titulo}</a></li>`))}</ol>
    </nav>
    ${contenido.secciones.map(([id, titulo, parrafos]) => seguro(html`
      <section class="legal-seccion" id="${id}" aria-labelledby="${id}-titulo">
        <h2 class="titulo-seccion" id="${id}-titulo">${titulo}</h2>
        ${parrafos.map((p) => seguro(html`<p>${p}</p>`))}
      </section>`))}
  </article>`;

// Si se entra con #seccion, que baje hasta ella una vez pintado el texto.
if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
