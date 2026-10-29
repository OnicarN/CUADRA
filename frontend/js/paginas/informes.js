// Informes (RF-49 a RF-53). Responsable: Ana (#25)
// Excel de un periodo a medida (con filtro de categorías) e informe trimestral en PDF,
// para descargar o enviar a la gestoría. Solo cuentan las facturas confirmadas (RF-51).
import { iniciarPagina } from '../core/layout.js';
import { api } from '../core/api.js';
import { t } from '../core/i18n.js';
import { icono } from '../core/iconos.js';
import { html, seguro, mostrarToast } from '../core/ui.js';

const textos = {
  es: {
    'informes.titulo': 'Informes',
    'informes.soloConfirmadas': 'Solo se incluyen las facturas que has confirmado.',
    'informes.excel': 'Excel de facturas',
    'informes.excelTexto': 'Una fila por factura con todos sus datos, lista para tu gestoría.',
    'informes.desde': 'Desde',
    'informes.hasta': 'Hasta',
    'informes.esteTrimestre': 'Este trimestre',
    'informes.trimestreAnterior': 'Trimestre anterior',
    'informes.esteAnio': 'Este año',
    'informes.categorias': 'Categorías',
    'informes.categoriasAyuda': 'Si no marcas ninguna, se incluyen todas.',
    'informes.descargarExcel': 'Descargar Excel',
    'informes.informe': 'Informe trimestral',
    'informes.informeTexto': 'Resumen con gasto, IVA deducible, categorías y avisos, y el detalle de cada factura.',
    'informes.trimestre': 'Trimestre',
    'informes.opcionTrimestre': '{t}.º trimestre de {anio}',
    'informes.descargarInforme': 'Descargar informe (PDF)',
    'informes.enviar': 'Enviar a mi gestoría',
    'informes.enviarA': 'Se enviará a {email}.',
    'informes.enviado': 'Enviado a {email}',
    'informes.descargado': 'Descarga lista',
    'informes.sinGestoria': 'Para enviarlo, añade el email de tu gestoría en tu perfil. Mientras, puedes descargarlo y enviarlo tú.',
    'informes.irPerfil': 'Ir al perfil',
    'informes.planSinGestoria': 'Tu plan no incluye el envío a la gestoría. Puedes descargarlo y enviarlo tú.',
    'informes.planSinInforme': 'Tu plan no incluye el informe trimestral.',
    'informes.verPlanes': 'Ver planes',
    'informes.errorPeriodo': 'Elige una fecha de inicio anterior a la de fin.',
  },
  en: {
    'informes.titulo': 'Reports',
    'informes.soloConfirmadas': 'Only invoices you have confirmed are included.',
    'informes.excel': 'Invoices Excel',
    'informes.excelTexto': 'One row per invoice with all its details, ready for your accountant.',
    'informes.desde': 'From',
    'informes.hasta': 'To',
    'informes.esteTrimestre': 'This quarter',
    'informes.trimestreAnterior': 'Last quarter',
    'informes.esteAnio': 'This year',
    'informes.categorias': 'Categories',
    'informes.categoriasAyuda': 'If you tick none, all are included.',
    'informes.descargarExcel': 'Download Excel',
    'informes.informe': 'Quarterly report',
    'informes.informeTexto': 'Summary with spending, deductible VAT, categories and alerts, plus the details of each invoice.',
    'informes.trimestre': 'Quarter',
    'informes.opcionTrimestre': 'Q{t} {anio}',
    'informes.descargarInforme': 'Download report (PDF)',
    'informes.enviar': 'Send to my accountant',
    'informes.enviarA': 'It will be sent to {email}.',
    'informes.enviado': 'Sent to {email}',
    'informes.descargado': 'Download ready',
    'informes.sinGestoria': "To send it, add your accountant's email in your profile. Meanwhile, you can download it and send it yourself.",
    'informes.irPerfil': 'Go to profile',
    'informes.planSinGestoria': "Your plan doesn't include sending to your accountant. You can download it and send it yourself.",
    'informes.planSinInforme': "Your plan doesn't include the quarterly report.",
    'informes.verPlanes': 'See plans',
    'informes.errorPeriodo': 'Choose a start date before the end date.',
  },
};

await iniciarPagina({ pagina: 'informes', privada: true, textos });

const [uso, perfil, categorias] = await Promise.all([
  api('/suscripcion'),
  api('/perfil'),
  api('/categorias').catch(() => []),
]);
const conInforme = uso.funciones.includes('informes');
const conGestoria = uso.funciones.includes('gestoria');
const emailGestoria = perfil?.email_gestoria || '';

// ---------- Fechas ----------
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hoy = new Date();
const trimestreDe = (d) => ({ anio: d.getFullYear(), t: Math.floor(d.getMonth() / 3) + 1 });
const rango = ({ anio, t: tri }) => ({ desde: iso(new Date(anio, (tri - 1) * 3, 1)), hasta: iso(new Date(anio, tri * 3, 0)) });
const anterior = ({ anio, t: tri }) => (tri === 1 ? { anio: anio - 1, t: 4 } : { anio, t: tri - 1 });
const actual = trimestreDe(hoy);
const PERIODOS = {
  esteTrimestre: () => rango(actual),
  trimestreAnterior: () => rango(anterior(actual)),
  esteAnio: () => ({ desde: `${hoy.getFullYear()}-01-01`, hasta: `${hoy.getFullYear()}-12-31` }),
};
// Los últimos 8 trimestres, del actual hacia atrás.
const trimestres = [];
for (let q = actual, i = 0; i < 8; i++, q = anterior(q)) trimestres.push(q);

// ---------- Envío: activado o explicado (RF-12, RF-53) ----------
function bloqueEnvio(tipo) {
  if (!conGestoria) {
    return html`
      <button type="button" class="boton boton-secundario" disabled aria-describedby="envio-${tipo}">${seguro(icono('correo'))}${t('informes.enviar')}</button>
      <p class="campo-ayuda" id="envio-${tipo}">${t('informes.planSinGestoria')} <a class="boton-texto" href="/app/suscripcion">${t('informes.verPlanes')}</a></p>`;
  }
  if (!emailGestoria) {
    return html`
      <button type="button" class="boton boton-secundario" disabled aria-describedby="envio-${tipo}">${seguro(icono('correo'))}${t('informes.enviar')}</button>
      <p class="campo-ayuda" id="envio-${tipo}">${t('informes.sinGestoria')} <a class="boton-texto" href="/app/perfil">${t('informes.irPerfil')}</a></p>`;
  }
  return html`
    <button type="button" class="boton boton-secundario" data-enviar="${tipo}" aria-describedby="envio-${tipo}">${seguro(icono('correo'))}${t('informes.enviar')}</button>
    <p class="campo-ayuda" id="envio-${tipo}">${t('informes.enviarA', { email: emailGestoria })}</p>`;
}

const inicial = PERIODOS.esteTrimestre();

document.getElementById('contenido').innerHTML = html`
  <div class="cabecera-pagina">
    <h1 class="titulo-pagina">${t('informes.titulo')}</h1>
  </div>
  <p class="texto-2 informes-aviso">${t('informes.soloConfirmadas')}</p>
  <div class="informes-rejilla">
    <section class="tarjeta" aria-labelledby="titulo-excel">
      <h2 class="titulo-seccion" id="titulo-excel">${t('informes.excel')}</h2>
      <p class="texto-2 informes-texto">${t('informes.excelTexto')}</p>
      <form class="formulario" id="form-excel" novalidate>
        <div class="pestanas informes-atajos" role="group" aria-label="${t('informes.desde')} / ${t('informes.hasta')}">
          ${Object.keys(PERIODOS).map((clave) => seguro(html`<button type="button" class="pestana" data-periodo="${clave}" aria-pressed="${clave === 'esteTrimestre'}">${t(`informes.${clave}`)}</button>`))}
        </div>
        <div class="informes-fechas">
          <div class="campo">
            <label for="desde">${t('informes.desde')}</label>
            <input id="desde" name="desde" type="date" required value="${inicial.desde}">
          </div>
          <div class="campo">
            <label for="hasta">${t('informes.hasta')}</label>
            <input id="hasta" name="hasta" type="date" required value="${inicial.hasta}">
          </div>
        </div>
        ${categorias.length ? seguro(html`
          <fieldset class="informes-categorias">
            <legend class="campo-etiqueta">${t('informes.categorias')}</legend>
            <p class="campo-ayuda">${t('informes.categoriasAyuda')}</p>
            <div class="informes-chips">
              ${categorias.map((c) => seguro(html`<label class="informes-chip"><input type="checkbox" name="categoria" value="${c.id}"><span>${c.nombre}</span></label>`))}
            </div>
          </fieldset>`) : ''}
        <p class="error-formulario" id="error-excel" role="alert" hidden></p>
        <div class="informes-acciones">
          <button type="submit" class="boton boton-principal">${seguro(icono('descargar'))}${t('informes.descargarExcel')}</button>
          <div class="informes-envio">${seguro(bloqueEnvio('excel'))}</div>
        </div>
      </form>
    </section>

    <section class="tarjeta" aria-labelledby="titulo-informe">
      <h2 class="titulo-seccion" id="titulo-informe">${t('informes.informe')}</h2>
      <p class="texto-2 informes-texto">${t('informes.informeTexto')}</p>
      ${conInforme ? seguro(html`
        <div class="formulario">
          <div class="campo">
            <label for="trimestre">${t('informes.trimestre')}</label>
            <select id="trimestre">
              ${trimestres.map((q) => seguro(html`<option value="${q.anio}-${q.t}">${t('informes.opcionTrimestre', { t: q.t, anio: q.anio })}</option>`))}
            </select>
          </div>
          <div class="informes-acciones">
            <button type="button" class="boton boton-secundario" id="descargar-informe">${seguro(icono('descargar'))}${t('informes.descargarInforme')}</button>
            <div class="informes-envio">${seguro(bloqueEnvio('informe'))}</div>
          </div>
        </div>`) : seguro(html`
        <div class="informes-acciones">
          <button type="button" class="boton boton-secundario" disabled aria-describedby="sin-informe">${seguro(icono('descargar'))}${t('informes.descargarInforme')}</button>
          <p class="campo-ayuda" id="sin-informe">${t('informes.planSinInforme')} <a class="boton-texto" href="/app/suscripcion">${t('informes.verPlanes')}</a></p>
        </div>`)}
    </section>
  </div>`;

// ---------- Excel ----------
const formExcel = document.getElementById('form-excel');
const inputDesde = document.getElementById('desde');
const inputHasta = document.getElementById('hasta');
const errorExcel = document.getElementById('error-excel');

document.querySelectorAll('[data-periodo]').forEach((boton) => {
  boton.addEventListener('click', () => {
    const { desde, hasta } = PERIODOS[boton.dataset.periodo]();
    inputDesde.value = desde;
    inputHasta.value = hasta;
    marcarAtajo(boton);
    errorExcel.hidden = true;
  });
});
const marcarAtajo = (elegido) => document.querySelectorAll('[data-periodo]').forEach((b) => b.setAttribute('aria-pressed', String(b === elegido)));
[inputDesde, inputHasta].forEach((input) => input.addEventListener('input', () => { marcarAtajo(null); errorExcel.hidden = true; }));

function filtrosExcel() {
  const desde = inputDesde.value;
  const hasta = inputHasta.value;
  if (!desde || !hasta || desde > hasta) {
    errorExcel.textContent = t('informes.errorPeriodo');
    errorExcel.hidden = false;
    return null;
  }
  const categoriasElegidas = [...formExcel.querySelectorAll('input[name="categoria"]:checked')].map((c) => Number(c.value));
  return { desde, hasta, categorias: categoriasElegidas };
}

formExcel.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const filtros = filtrosExcel();
  if (!filtros) return;
  const consulta = new URLSearchParams({ desde: filtros.desde, hasta: filtros.hasta });
  if (filtros.categorias.length) consulta.set('categorias', filtros.categorias.join(','));
  await descargar(`/api/exportacion/excel?${consulta}`, formExcel.querySelector('button[type="submit"]'));
});

// ---------- Informe ----------
const trimestreElegido = () => {
  const [anio, trimestre] = document.getElementById('trimestre').value.split('-').map(Number);
  return { anio, trimestre };
};
document.getElementById('descargar-informe')?.addEventListener('click', async (evento) => {
  const { anio, trimestre } = trimestreElegido();
  await descargar(`/api/exportacion/informe?anio=${anio}&trimestre=${trimestre}`, evento.currentTarget);
});

// ---------- Envío a la gestoría ----------
document.querySelectorAll('[data-enviar]').forEach((boton) => {
  boton.addEventListener('click', async () => {
    const tipo = boton.dataset.enviar;
    const cuerpo = tipo === 'excel' ? filtrosExcel() : trimestreElegido();
    if (!cuerpo) return;
    boton.disabled = true;
    try {
      const { para } = await api('/exportacion/enviar', { metodo: 'POST', cuerpo: { tipo, ...cuerpo } });
      mostrarToast(t('informes.enviado', { email: para }));
    } catch (e) {
      mostrarToast(e.message || t('comun.error'));
    } finally {
      boton.disabled = false;
    }
  });
});

// Descarga un archivo de la API con la sesión y lo guarda con el nombre que manda el servidor.
async function descargar(url, boton) {
  boton.disabled = true;
  try {
    const respuesta = await fetch(url, { credentials: 'same-origin' });
    if (!respuesta.ok) {
      const datos = await respuesta.json().catch(() => ({}));
      throw new Error(datos.error || t('comun.error'));
    }
    const nombre = /filename="([^"]+)"/.exec(respuesta.headers.get('content-disposition') || '')?.[1] || 'cuadra';
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(await respuesta.blob());
    enlace.download = nombre;
    document.body.append(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(enlace.href), 10000);
    mostrarToast(t('informes.descargado'));
  } catch (e) {
    mostrarToast(e.message || t('comun.error'));
  } finally {
    boton.disabled = false;
  }
}
