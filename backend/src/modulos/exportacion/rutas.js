// Módulo exportación — /api/exportacion
// Responsable: Ana (#25). Solo facturas confirmadas (RF-51).
//
// GET  /excel     ?desde&hasta&categorias=1,2        descarga .xlsx                RF-49 a RF-51 (hecho)
// GET  /informe   ?anio&trimestre                    descarga el PDF trimestral    RF-52 (hecho, plan con 'informes')
// POST /enviar    { tipo: 'excel', desde, hasta, categorias } | { tipo: 'informe', anio, trimestre }
//                 lo envía a la gestoría                                          RF-53 (hecho, plan con 'gestoria')
// GET  /todo      ZIP con los Excel de todas las facturas y todos los originales  RF-62 (hecho, #27)
import { Router } from 'express';
import { db } from '../../core/db.js';
import { requiereSesion } from '../../core/auth.js';
import { enviarEmail } from '../../core/email.js';
import { peticionIncorrecta, prohibido } from '../../core/errores.js';
import { tieneFuncion } from '../suscripcion/uso.js';
import { FUNCIONES } from '../suscripcion/planes.js';
import { obtenerPerfil } from '../perfil/servicio.js';
import { facturasConfirmadas, datosInforme, idiomaDe } from './datos.js';
import { generarExcel } from './excel.js';
import { generarInforme } from './informe.js';
import { TEXTOS, rellenar } from './textos.js';
import { escribirCopia, nombreCopia } from './copia.js';

const rutas = Router();
rutas.use(requiereSesion);

const MIME_EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function fechaValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(valor ?? ''))) return false;
  const d = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === valor;
}

// RF-50: periodo a medida y categorías opcionales ("1,2,3" o [1, 2, 3]).
function leerPeriodo({ desde, hasta, categorias }) {
  if (!fechaValida(desde) || !fechaValida(hasta)) throw peticionIncorrecta('Elige las fechas de inicio y de fin', { campo: 'periodo' });
  if (desde > hasta) throw peticionIncorrecta('La fecha de inicio tiene que ser anterior a la de fin', { campo: 'periodo' });
  const lista = Array.isArray(categorias) ? categorias : String(categorias ?? '').split(',').filter(Boolean);
  const ids = lista.map(Number);
  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) throw peticionIncorrecta('Categorías no válidas', { campo: 'categorias' });
  return { desde, hasta, categorias: ids };
}

function leerTrimestre({ anio, trimestre }) {
  const a = Number(anio);
  const t = Number(trimestre);
  if (!Number.isInteger(a) || a < 2000 || a > 2100 || ![1, 2, 3, 4].includes(t)) {
    throw peticionIncorrecta('Elige un trimestre válido', { campo: 'trimestre' });
  }
  return { anio: a, trimestre: t };
}

async function comprobarFuncion(usuarioId, funcion) {
  if (!(await tieneFuncion(usuarioId, funcion))) {
    throw prohibido(funcion === FUNCIONES.INFORMES
      ? 'Tu plan no incluye el informe trimestral'
      : 'Tu plan no incluye el envío a la gestoría');
  }
}

async function prepararExcel(usuarioId, consulta) {
  const periodo = leerPeriodo(consulta);
  const idioma = await idiomaDe(usuarioId);
  const contenido = await generarExcel(await facturasConfirmadas(usuarioId, periodo), idioma);
  return { contenido, periodo, idioma, nombre: rellenar(TEXTOS[idioma].archivoExcel, periodo), mime: MIME_EXCEL };
}

async function prepararInforme(usuarioId, consulta) {
  const { anio, trimestre } = leerTrimestre(consulta);
  await comprobarFuncion(usuarioId, FUNCIONES.INFORMES);
  const idioma = await idiomaDe(usuarioId);
  const contenido = await generarInforme(await datosInforme(usuarioId, anio, trimestre), idioma);
  return { contenido, anio, trimestre, idioma, nombre: rellenar(TEXTOS[idioma].archivoInforme, { anio, trimestre }), mime: 'application/pdf' };
}

function descargar(res, { contenido, nombre, mime }) {
  res.set({
    'Content-Type': mime,
    'Content-Disposition': `attachment; filename="${nombre}"`,
    'Cache-Control': 'no-store',
  });
  res.send(contenido);
}

rutas.get('/excel', async (req, res) => {
  descargar(res, await prepararExcel(req.usuario.id, req.query));
});

rutas.get('/informe', async (req, res) => {
  descargar(res, await prepararInforme(req.usuario.id, req.query));
});

// RF-53. Sin email de gestoría en el perfil solo se puede descargar (RF-12).
rutas.post('/enviar', async (req, res) => {
  const usuarioId = req.usuario.id;
  const { tipo } = req.body ?? {};
  if (!['excel', 'informe'].includes(tipo)) throw peticionIncorrecta('Tipo de envío no válido');
  await comprobarFuncion(usuarioId, FUNCIONES.GESTORIA);
  const perfil = await obtenerPerfil(usuarioId);
  if (!perfil?.email_gestoria) {
    throw peticionIncorrecta(
      'No tienes el email de tu gestoría en el perfil. Puedes descargarlo y enviarlo tú, o añadir el email en tu perfil.',
      { codigo: 'sin_gestoria' },
    );
  }

  const archivo = tipo === 'excel' ? await prepararExcel(usuarioId, req.body) : await prepararInforme(usuarioId, req.body);
  const { rows: [usuario] } = await db.query('SELECT nombre, email FROM usuarios WHERE id = $1', [usuarioId]);
  const te = TEXTOS[archivo.idioma].email;
  const variables = { ...usuario, ...archivo.periodo, anio: archivo.anio, trimestre: archivo.trimestre };
  const que = rellenar(tipo === 'excel' ? te.queExcel : te.queInforme, variables);
  await enviarEmail({
    para: perfil.email_gestoria,
    asunto: rellenar(tipo === 'excel' ? te.asuntoExcel : te.asuntoInforme, variables),
    texto: rellenar(te.cuerpo, { ...variables, que }),
    adjuntos: [{ filename: archivo.nombre, content: archivo.contenido, contentType: archivo.mime }],
  });
  res.json({ ok: true, para: perfil.email_gestoria });
});

// RF-62. Copia de todo antes de eliminar la cuenta (ver copia.js). Para todos los planes.
rutas.get('/todo', async (req, res) => {
  res.set({
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${await nombreCopia(req.usuario.id)}"`,
    'Cache-Control': 'no-store',
  });
  await escribirCopia(req.usuario.id, res);
});

export default rutas;
