// Textos de cada tipo de aviso (es/en) y adónde lleva. Responsable: Rodrigo (#21).
//
//   const { titulo, texto, accion } = textoAviso(aviso, 'es');
//
// Tono del documento de diseño: de tú, frases cortas y, si algo cuesta dinero, la solución.
// Los usa la pantalla de avisos (vienen en la API) y el email.
import { TIPOS_AVISO } from '../../core/avisos.js';
import { diasEntre, hoy } from '../../core/fiscal.js';

// Los que cuestan dinero van en rojo suave; el resto son sugerencias (naranja suave).
export const IMPORTANTES = [
  TIPOS_AVISO.SIN_NIF, TIPOS_AVISO.OTRO_NIF, TIPOS_AVISO.TOTAL_NO_CUADRA,
  TIPOS_AVISO.DUPLICADO, TIPOS_AVISO.TRIMESTRE, TIPOS_AVISO.EVENTO_SIN_TICKET,
];

const LOCALES = { es: 'es-ES', en: 'en-GB' };

function dinero(cantidad, moneda, idioma) {
  if (cantidad === null || cantidad === undefined) return '';
  try {
    return new Intl.NumberFormat(LOCALES[idioma], { style: 'currency', currency: moneda || 'EUR' }).format(Number(cantidad));
  } catch {
    return `${Number(cantidad).toFixed(2)} ${moneda || ''}`.trim();
  }
}

function fecha(valor, idioma) {
  if (!valor) return '';
  const dia = typeof valor === 'string' ? valor.slice(0, 10) : valor.toISOString().slice(0, 10);
  const [a, m, d] = dia.split('-').map(Number);
  // El año solo si no es el de hoy.
  const opciones = { day: 'numeric', month: 'long', timeZone: 'UTC', ...(a === Number(hoy().slice(0, 4)) ? {} : { year: 'numeric' }) };
  return new Intl.DateTimeFormat(LOCALES[idioma], opciones).format(new Date(Date.UTC(a, m - 1, d)));
}

// "El ticket de Repsol (41,32 €)" / "Repsol's receipt (€41.32)". Sin factura, el genérico.
function deQue(factura, idioma, { es, en }) {
  const nombre = factura?.emisor?.trim();
  const importe = dinero(factura?.total, factura?.moneda, idioma);
  if (idioma === 'en') {
    if (!nombre) return importe ? `${en} (${importe})` : en;
    return `${en} from ${nombre}${importe ? ` (${importe})` : ''}`;
  }
  if (!nombre) return importe ? `${es} (${importe})` : es;
  return `${es} de ${nombre}${importe ? ` (${importe})` : ''}`;
}

// Qué le falta a un ticket para poder deducir el IVA (datos.falta de comprobaciones.js).
// Los avisos antiguos no lo traen: entonces es el NIF.
const PIEZAS = {
  es: { emisor: 'el NIF del proveedor', receptor: 'tu NIF', iva: 'el IVA desglosado', nif: 'el NIF' },
  en: { emisor: "the supplier's tax ID", receptor: 'your tax ID', iva: 'the VAT breakdown', nif: 'the tax ID' },
};
function queFalta(datos) {
  const falta = (Array.isArray(datos.falta) ? datos.falta : []).filter((f) => f in PIEZAS.es);
  return falta.length ? falta : ['nif'];
}
function lista(falta, idioma) {
  const piezas = falta.map((f) => PIEZAS[idioma][f]);
  const y = idioma === 'en' ? ' and ' : ' y ';
  return piezas.length > 1 ? `${piezas.slice(0, -1).join(', ')}${y}${piezas.at(-1)}` : piezas[0];
}

const TEXTOS = {
  [TIPOS_AVISO.SIN_NIF]: (a, l) => {
    const falta = queFalta(a.datos);
    const nif = falta.some((f) => f !== 'iva');
    const iva = falta.includes('iva');
    return {
      es: {
        titulo: nif && iva ? 'Ticket sin NIF ni IVA desglosado' : iva ? 'Ticket sin IVA desglosado' : 'Ticket sin NIF',
        texto: `Con ${deQue(a.factura, l, { es: 'este ticket' })} no vas a poder deducirte el IVA: le falta ${lista(falta, 'es')}. Pide la factura completa al proveedor.`,
        accion: 'Ver el ticket',
      },
      en: {
        titulo: nif && iva ? 'Receipt without tax ID or VAT breakdown' : iva ? 'Receipt without VAT breakdown' : 'Receipt without tax ID',
        texto: `With ${deQue(a.factura, l, { en: 'this receipt' })} you won't be able to deduct the VAT: it's missing ${lista(falta, 'en')}. Ask the supplier for the full invoice.`,
        accion: 'See the receipt',
      },
    };
  },
  [TIPOS_AVISO.OTRO_NIF]: (a, l) => ({
    es: { titulo: 'Factura a otro NIF', texto: `${deQue(a.factura, l, { es: 'La factura' })} está a nombre de otro NIF${a.datos.nif_receptor ? ` (${a.datos.nif_receptor})` : ''}. Pide que te la hagan a tu nombre o no la podrás deducir.`, accion: 'Ver la factura' },
    en: { titulo: 'Invoice to another tax ID', texto: `${deQue(a.factura, l, { en: 'The invoice' })} is made out to another tax ID${a.datos.nif_receptor ? ` (${a.datos.nif_receptor})` : ''}. Ask for one in your name or you won't be able to deduct it.`, accion: 'See the invoice' },
  }),
  [TIPOS_AVISO.TOTAL_NO_CUADRA]: (a, l) => ({
    es: { titulo: 'El total no cuadra', texto: `En ${deQue(a.factura, l, { es: 'la factura' })}, la base más el IVA no da el total. Revisa los importes antes de confirmarla.`, accion: 'Revisar importes' },
    en: { titulo: "The total doesn't add up", texto: `In ${deQue(a.factura, l, { en: 'the invoice' })}, the base plus VAT doesn't match the total. Check the amounts before confirming it.`, accion: 'Check amounts' },
  }),
  [TIPOS_AVISO.DUPLICADO]: (a, l) => ({
    es: { titulo: 'Posible duplicado', texto: `${deQue(a.factura, l, { es: 'Esta factura' })} se parece mucho a otra que ya tienes. Si la cuentas dos veces, te puede dar problemas con Hacienda. Compáralas y quédate con una.`, accion: 'Compararlas' },
    en: { titulo: 'Possible duplicate', texto: `${deQue(a.factura, l, { en: 'This invoice' })} looks a lot like one you already have. Counting it twice can get you in trouble with the tax office. Compare them and keep one.`, accion: 'Compare them' },
  }),
  [TIPOS_AVISO.PENDIENTE_REVISAR]: (a, l) => {
    const dias = a.factura?.creado_en ? diasEntre(fechaDe(a.factura.creado_en), hoy()) : null;
    return {
      es: { titulo: 'Pendiente de revisar', texto: `${deQue(a.factura, l, { es: 'Una factura' })} lleva ${dias ? `${dias} días` : 'días'} sin confirmar. Hasta que la confirmes no cuenta en tus cifras.`, accion: 'Revisarla' },
      en: { titulo: 'Waiting for review', texto: `${deQue(a.factura, l, { en: 'An invoice' })} has been waiting ${dias ? `${dias} days` : 'days'} for you to confirm it. It won't count in your figures until you do.`, accion: 'Review it' },
    };
  },
  [TIPOS_AVISO.TRIMESTRE]: (a, l) => {
    const { trimestre, plazo } = a.datos;
    const dias = plazo ? diasEntre(hoy(), plazo) : null;
    const cuandoEs = dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : `en ${dias} días`;
    const cuandoEn = dias === 0 ? 'today' : dias === 1 ? 'tomorrow' : `in ${dias} days`;
    return {
      es: { titulo: 'El trimestre está a punto de cerrar', texto: `El plazo del ${trimestre}T acaba ${cuandoEs} (${fecha(plazo, 'es')}). Confirma las facturas que te falten para no dejarte gastos sin deducir.`, accion: 'Preparar el trimestre' },
      en: { titulo: 'The quarter is about to close', texto: `The Q${trimestre} deadline is ${cuandoEn} (${fecha(plazo, 'en')}). Confirm any invoices you have left so no expense goes undeducted.`, accion: 'Get the quarter ready' },
    };
  },
  [TIPOS_AVISO.EVENTO_SIN_TICKET]: (a) => {
    const titulo = a.datos.titulo?.trim();
    const cuando = { es: fecha(a.datos.fecha, 'es'), en: fecha(a.datos.fecha, 'en') };
    return {
      es: { titulo: 'Evento sin ticket', texto: `${titulo ? `«${titulo}»` : 'Un evento de tu calendario'}${cuando.es ? ` (${cuando.es})` : ''} no tiene ningún gasto. Si pagaste algo, sube el ticket y desgrávatelo.`, accion: 'Subir el ticket' },
      en: { titulo: 'Event without a receipt', texto: `${titulo ? `"${titulo}"` : 'An event in your calendar'}${cuando.en ? ` (${cuando.en})` : ''} has no expense. If you paid for anything, upload the receipt and deduct it.`, accion: 'Upload the receipt' },
    };
  },
  [TIPOS_AVISO.TEXTO_CORREO]: (a) => {
    const asunto = a.datos.asunto?.trim();
    return {
      es: { titulo: 'Factura sacada del texto del correo', texto: `El correo${asunto ? ` «${asunto}»` : ''} no traía adjunto y hemos leído la factura del texto. Comprueba que los datos están bien.`, accion: 'Comprobarla' },
      en: { titulo: 'Invoice taken from the email text', texto: `The email${asunto ? ` "${asunto}"` : ''} had no attachment, so we read the invoice from its text. Check the details are right.`, accion: 'Check it' },
    };
  },
  [TIPOS_AVISO.SIN_LEER]: () => ({
    es: { titulo: 'Tienes facturas sin leer', texto: 'Has llegado al límite de tu plan y las nuevas facturas esperan sin leer. Amplía el plan o se leerán cuando se renueve el mes.', accion: 'Ver mi plan' },
    en: { titulo: 'You have unread invoices', texto: "You've reached your plan's limit, so new invoices are waiting unread. Upgrade your plan or they'll be read when the month renews.", accion: 'See my plan' },
  }),
  [TIPOS_AVISO.CORREO_NO_AUTORIZADO]: (a) => {
    const quien = a.datos.remitente?.trim();
    return {
      es: { titulo: 'Correo no autorizado', texto: `Nos ha llegado una factura desde ${quien || 'un email'} que no es de confianza y no la hemos guardado. Si es tuyo, añádelo a tus emails de confianza.`, accion: 'Añadir el email' },
      en: { titulo: 'Unauthorised email', texto: `We got an invoice from ${quien || 'an email'}, which isn't a trusted address, so we didn't save it. If it's yours, add it to your trusted emails.`, accion: 'Add the email' },
    };
  },
};

function fechaDe(valor) {
  return typeof valor === 'string' ? valor.slice(0, 10) : valor.toISOString().slice(0, 10);
}

// Adónde lleva la flecha del aviso.
export function destinoAviso({ tipo, factura_id: facturaId }) {
  switch (tipo) {
    case TIPOS_AVISO.TRIMESTRE: return '/app/informes';
    case TIPOS_AVISO.EVENTO_SIN_TICKET: return '/app/subir';
    case TIPOS_AVISO.SIN_LEER: return '/app/suscripcion';
    case TIPOS_AVISO.CORREO_NO_AUTORIZADO: return '/app/perfil';
    case TIPOS_AVISO.DUPLICADO: return facturaId ? `/app/factura?id=${facturaId}#duplicado` : '/app/facturas';
    default: return facturaId ? `/app/factura?id=${facturaId}` : '/app/facturas';
  }
}

// aviso: { tipo, datos, factura: { emisor, total, moneda, creado_en } | null }
export function textosAviso(aviso) {
  const crear = TEXTOS[aviso.tipo];
  const datos = aviso.datos || {};
  if (!crear) return { es: { titulo: aviso.tipo, texto: '', accion: '' }, en: { titulo: aviso.tipo, texto: '', accion: '' } };
  // Cada idioma con su formato de dinero y fechas.
  return { es: crear({ ...aviso, datos }, 'es').es, en: crear({ ...aviso, datos }, 'en').en };
}

export function textoAviso(aviso, idioma = 'es') {
  return textosAviso(aviso)[idioma === 'en' ? 'en' : 'es'];
}
