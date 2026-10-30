// Llamada a Gemini (Google) para leer una factura. Responsable: Dani (#13).
// Usa la API REST con fetch, sin librerías. Variables de entorno:
//   GEMINI_API_KEY   clave de https://aistudio.google.com/apikey (tiene plan gratis)
//   GEMINI_MODELO    modelo a usar; por defecto el Flash más reciente
//
// OJO: en el plan gratis Google puede usar lo que se envía para mejorar sus modelos.
// Para datos reales de usuarios hay que pasar a un plan de pago (pendiente legal/privacidad).
import 'dotenv/config';

const URL_API = 'https://generativelanguage.googleapis.com/v1beta/models';

export const claveGemini = () => process.env.GEMINI_API_KEY || '';
export const modeloGemini = () => process.env.GEMINI_MODELO || 'gemini-flash-latest';

// Esquema de la respuesta en el formato de Gemini (subconjunto de OpenAPI).
const nulo = (tipo, descripcion) => ({ type: tipo, nullable: true, description: descripcion });
const ESQUEMA_RESPUESTA = {
  type: 'OBJECT',
  properties: {
    fecha: nulo('STRING', 'Fecha de la factura en formato AAAA-MM-DD'),
    hora: nulo('STRING', 'Hora HH:MM si aparece, si no null'),
    emisor: nulo('STRING', 'Comercio o empresa que emite la factura'),
    nif_emisor: nulo('STRING', 'NIF/CIF/VAT del emisor'),
    nif_receptor: nulo('STRING', 'NIF del cliente, si aparece'),
    numero: nulo('STRING', 'Número de factura o ticket'),
    lineas_iva: {
      type: 'ARRAY',
      description: 'Una línea por cada tipo de IVA distinto',
      items: {
        type: 'OBJECT',
        properties: { base: { type: 'NUMBER' }, tipo: { type: 'NUMBER' }, cuota: { type: 'NUMBER' } },
        required: ['base', 'tipo', 'cuota'],
      },
    },
    total: nulo('NUMBER', 'Importe total con impuestos'),
    moneda: nulo('STRING', 'Código ISO 4217: EUR, USD…'),
    categoria: nulo('STRING', 'Nombre exacto de una categoría de la lista'),
  },
  required: ['fecha', 'hora', 'emisor', 'nif_emisor', 'nif_receptor', 'numero', 'lineas_iva', 'total', 'moneda', 'categoria'],
};

// Devuelve { datos, motivo }: datos es el objeto leído, o null con el motivo si no se pudo.
// Lanza un error si falla la conexión o la API responde con error (para reintentarlo luego).
export async function leerConGemini({ instrucciones, archivo, mime }) {
  const respuesta = await fetch(`${URL_API}/${modeloGemini()}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': claveGemini() },
    signal: AbortSignal.timeout(120000),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: instrucciones }] },
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType: mime, data: archivo.toString('base64') } },
          { text: 'Extrae los datos de esta factura.' },
        ],
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: ESQUEMA_RESPUESTA,
        temperature: 0,
      },
    }),
  });

  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new Error(`Gemini respondió ${respuesta.status}: ${cuerpo.error?.message || 'sin detalle'}`);
  }
  if (cuerpo.promptFeedback?.blockReason) return { datos: null, motivo: `bloqueada_${cuerpo.promptFeedback.blockReason}` };

  const candidato = cuerpo.candidates?.[0];
  const texto = candidato?.content?.parts?.map((p) => p.text || '').join('') || '';
  if (candidato?.finishReason && candidato.finishReason !== 'STOP') {
    return { datos: null, motivo: `no_leida_${candidato.finishReason}` };
  }
  try {
    return { datos: JSON.parse(texto), motivo: null };
  } catch {
    return { datos: null, motivo: 'respuesta_no_valida' };
  }
}
