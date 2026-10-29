// Llamadas a la API. Devuelve el JSON o lanza un ErrorApi con el mensaje del servidor.
//   const facturas = await api('/facturas?estado=pendiente');
//   await api('/facturas/3/confirmar', { metodo: 'POST' });
//   await api('/perfil', { metodo: 'PUT', cuerpo: { nif: '...' } });
//   await api('/subida', { metodo: 'POST', formulario: formData });
export class ErrorApi extends Error {
  constructor(estado, mensaje, datos = {}) {
    super(mensaje);
    this.estado = estado;
    this.codigo = datos.codigo;
    this.detalles = datos.detalles;
  }
}

export async function api(ruta, { metodo = 'GET', cuerpo, formulario } = {}) {
  const opciones = { method: metodo, credentials: 'same-origin', headers: {} };
  if (formulario) {
    opciones.body = formulario;
  } else if (cuerpo !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(cuerpo);
  }
  let respuesta;
  try {
    respuesta = await fetch(`/api${ruta}`, opciones);
  } catch {
    throw new ErrorApi(0, 'No hay conexión. Comprueba tu internet.');
  }
  if (respuesta.status === 204) return null;
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new ErrorApi(respuesta.status, datos.error || 'Algo ha fallado', datos);
  return datos;
}
