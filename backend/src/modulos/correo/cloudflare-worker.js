// Cloudflare Email Worker para el correo propio de Cuadra (#14).
// NO lo carga el servidor de Cuadra: se pega en Cloudflare (Workers & Pages -> Create -> Worker).
// Instrucciones en rutas.js. Necesita el paquete postal-mime en el worker
// (en el editor de Cloudflare: añadir "postal-mime" como dependencia, o desplegar con wrangler).
//
// Variables del worker: CUADRA_URL (p. ej. https://cuadra-n1tq.onrender.com) y CUADRA_SECRETO.
import PostalMime from 'postal-mime';

export default {
  async email(mensaje, env) {
    const correo = await PostalMime.parse(mensaje.raw);
    const formulario = new FormData();
    formulario.append('para', mensaje.to);
    formulario.append('de', correo.from?.address || mensaje.from);
    formulario.append('asunto', correo.subject || '');
    formulario.append('texto', correo.text || '');
    for (const adjunto of correo.attachments || []) {
      if (adjunto.disposition === 'inline') continue; // logos y firmas dentro del correo
      formulario.append('adjuntos', new Blob([adjunto.content], { type: adjunto.mimeType }), adjunto.filename || 'adjunto');
    }
    const respuesta = await fetch(`${env.CUADRA_URL}/api/correo/entrante`, {
      method: 'POST',
      headers: { 'x-cuadra-secreto': env.CUADRA_SECRETO },
      body: formulario,
    });
    if (!respuesta.ok) mensaje.setReject('Cuadra no ha podido recibir el correo. Inténtalo más tarde.');
  },
};
