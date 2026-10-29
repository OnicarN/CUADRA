// Tests del histórico de facturas (#18): listado, búsqueda, filtros y original.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { arrancar, crearCliente } from './ayuda.js';
import { db } from '../src/core/db.js';
import { leerImporte } from '../src/modulos/facturas/consultas.js';

let servidor;
let lucia;
let pablo;
const ids = {};

async function registrar(nombre, email) {
  const cliente = crearCliente(servidor.url);
  await cliente.post('/api/auth/registro', { nombre, email, password: '12345678' });
  const { rows: [usuario] } = await db.query('SELECT id FROM usuarios WHERE email = $1', [email]);
  // Cookie aparte para las peticiones que no devuelven JSON (el original).
  const entrar = await fetch(`${servidor.url}/api/auth/entrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: '12345678' }),
  });
  const cookie = entrar.headers.get('set-cookie').split(';')[0];
  return { cliente, id: usuario.id, cabeceras: { cookie } };
}

async function crearFactura(usuarioId, datos) {
  const { rows: [original] } = await db.query(
    `INSERT INTO originales (usuario_id, nombre_archivo, tipo_mime, tamano, contenido)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [usuarioId, datos.archivo ?? 'factura.pdf', datos.mime ?? 'application/pdf', 4, Buffer.from('%PDF')],
  );
  const categoria = datos.categoria
    ? (await db.query('SELECT id FROM categorias WHERE clave = $1 AND usuario_id IS NULL', [datos.categoria])).rows[0].id
    : null;
  const { rows: [factura] } = await db.query(
    `INSERT INTO facturas (usuario_id, original_id, estado, fecha, emisor, nif_emisor, numero,
                           base_imponible, total, total_eur, categoria_id, creado_en)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $10, $11) RETURNING id`,
    [usuarioId, original.id, datos.estado ?? 'pendiente', datos.fecha ?? null, datos.emisor ?? null,
      datos.nif ?? null, datos.numero ?? null, datos.base ?? null, datos.total ?? null, categoria,
      datos.subida ?? datos.fecha ?? '2026-10-28'],
  );
  return factura.id;
}

before(async () => {
  servidor = await arrancar();
  lucia = await registrar('Lucía', 'lucia@prueba.es');
  pablo = await registrar('Pablo', 'pablo@prueba.es');

  ids.movistar = await crearFactura(lucia.id, {
    estado: 'confirmada', fecha: '2026-09-20', emisor: 'Movistar', nif: 'A82018474', numero: 'TF-55102',
    base: 41.32, total: 50, categoria: 'telefono',
  });
  ids.repsol = await crearFactura(lucia.id, {
    estado: 'pendiente', fecha: '2026-10-25', emisor: 'Repsol Estación 4521', nif: 'A78374725',
    base: 49.59, total: 60, categoria: 'combustible',
  });
  ids.equipo = await crearFactura(lucia.id, {
    estado: 'confirmada', fecha: '2026-08-02', emisor: 'MediaMarkt', numero: 'MM-339120',
    base: 743.8, total: 900, categoria: 'equipos', archivo: 'portátil ñ.png', mime: 'image/png',
  });
  ids.sinLeer = await crearFactura(lucia.id, { estado: 'sin_leer', subida: '2026-10-28', archivo: 'raro.html', mime: 'text/html' });
  ids.dePablo = await crearFactura(pablo.id, {
    estado: 'confirmada', fecha: '2026-10-01', emisor: 'Movistar', numero: 'TF-99999', base: 41.32, total: 50,
  });

  await db.query(`INSERT INTO avisos (usuario_id, tipo, factura_id) VALUES ($1, 'SIN_NIF', $2)`, [lucia.id, ids.repsol]);
  await db.query(
    `INSERT INTO avisos (usuario_id, tipo, factura_id, estado) VALUES ($1, 'TOTAL_NO_CUADRA', $2, 'cerrado')`,
    [lucia.id, ids.movistar],
  );
});
after(async () => { await servidor.cerrar(); });

const listar = async (cliente, consulta = '') => {
  const { estado, datos } = await cliente.get(`/api/facturas${consulta}`);
  assert.equal(estado, 200, JSON.stringify(datos));
  return datos;
};
const idsDe = (datos) => datos.facturas.map((f) => f.id);

test('cada usuario ve solo sus facturas (RF-09)', async () => {
  const deLucia = await listar(lucia.cliente);
  assert.equal(deLucia.total, 4);
  assert.ok(!idsDe(deLucia).includes(ids.dePablo));

  const dePablo = await listar(pablo.cliente);
  assert.deepEqual(idsDe(dePablo), [ids.dePablo]);

  const buscando = await listar(pablo.cliente, '?q=repsol');
  assert.equal(buscando.total, 0);
});

test('el listado trae los datos y va de la más reciente a la más antigua', async () => {
  const { facturas } = await listar(lucia.cliente);
  // La sin leer no tiene fecha: cuenta el día en que se subió (28 oct), así que va primera.
  assert.deepEqual(facturas.map((f) => f.id), [ids.sinLeer, ids.repsol, ids.movistar, ids.equipo]);

  const movistar = facturas.find((f) => f.id === ids.movistar);
  assert.equal(movistar.emisor, 'Movistar');
  assert.equal(movistar.estado, 'confirmada');
  assert.equal(movistar.fecha, '2026-09-20');
  assert.equal(movistar.total, 50);
  assert.equal(movistar.total_eur, 50);
  assert.equal(movistar.moneda, 'EUR');
  assert.equal(typeof movistar.categoria, 'string');
  assert.equal(movistar.avisos_abiertos, 0, 'los avisos cerrados no cuentan');
  assert.equal(facturas.find((f) => f.id === ids.repsol).avisos_abiertos, 1);
});

test('la búsqueda libre encuentra por emisor, NIF, número, categoría e importe (RF-38)', async () => {
  assert.deepEqual(idsDe(await listar(lucia.cliente, '?q=movistar')), [ids.movistar]);
  assert.deepEqual(idsDe(await listar(lucia.cliente, '?q=41,32')), [ids.movistar]);
  assert.deepEqual(idsDe(await listar(lucia.cliente, '?q=41.32')), [ids.movistar]);
  assert.deepEqual(idsDe(await listar(lucia.cliente, '?q=A78374725')), [ids.repsol]);
  assert.deepEqual(idsDe(await listar(lucia.cliente, '?q=mm-339')), [ids.equipo]);
  assert.deepEqual(idsDe(await listar(lucia.cliente, '?q=900')), [ids.equipo]);

  const { rows: [cat] } = await db.query(`SELECT nombre FROM categorias WHERE clave = 'combustible' AND usuario_id IS NULL`);
  assert.deepEqual(idsDe(await listar(lucia.cliente, `?q=${encodeURIComponent(cat.nombre)}`)), [ids.repsol]);

  // % y _ se buscan como texto, no como comodines.
  assert.equal((await listar(lucia.cliente, '?q=%25')).total, 0);
});

test('los filtros se combinan', async () => {
  assert.deepEqual(idsDe(await listar(lucia.cliente, '?estado=confirmada')), [ids.movistar, ids.equipo]);
  assert.deepEqual(idsDe(await listar(lucia.cliente, '?estado=confirmada&min=100')), [ids.equipo]);
  assert.deepEqual(idsDe(await listar(lucia.cliente, '?desde=2026-09-01&hasta=2026-10-31&max=55')), [ids.movistar]);
  assert.deepEqual(idsDe(await listar(lucia.cliente, '?aviso=1')), [ids.repsol]);
  assert.deepEqual(idsDe(await listar(lucia.cliente, '?aviso=1&estado=confirmada')), []);

  const { rows: [cat] } = await db.query(`SELECT id FROM categorias WHERE clave = 'telefono' AND usuario_id IS NULL`);
  assert.deepEqual(idsDe(await listar(lucia.cliente, `?categoria=${cat.id}&q=movistar`)), [ids.movistar]);
  assert.deepEqual(idsDe(await listar(lucia.cliente, `?categoria=${cat.id}&estado=pendiente`)), []);
});

test('los filtros mal escritos dan 400', async () => {
  for (const consulta of ['?estado=borrada', '?desde=ayer', '?min=mucho', '?categoria=uno']) {
    assert.equal((await lucia.cliente.get(`/api/facturas${consulta}`)).estado, 400, consulta);
  }
});

test('paginación de 30 en 30', async () => {
  const pagina = await listar(lucia.cliente, '?pagina=2');
  assert.equal(pagina.total, 4);
  assert.deepEqual(pagina.facturas, []);
});

test('se puede ver y descargar el original (RF-39)', async () => {
  const ver = await fetch(`${servidor.url}/api/facturas/${ids.movistar}/original`, { headers: lucia.cabeceras });
  assert.equal(ver.status, 200);
  assert.equal(ver.headers.get('content-type'), 'application/pdf');
  assert.match(ver.headers.get('content-disposition'), /^inline/);
  assert.equal(await ver.text(), '%PDF');

  const bajar = await fetch(`${servidor.url}/api/facturas/${ids.equipo}/original?descargar=1`, { headers: lucia.cabeceras });
  assert.equal(bajar.headers.get('content-type'), 'image/png');
  assert.match(bajar.headers.get('content-disposition'), /^attachment;.*filename\*=UTF-8''port%C3%A1til%20%C3%B1\.png/);

  // Un tipo que no es de factura nunca se abre dentro de la web.
  const raro = await fetch(`${servidor.url}/api/facturas/${ids.sinLeer}/original`, { headers: lucia.cabeceras });
  assert.equal(raro.headers.get('content-type'), 'application/octet-stream');
  assert.match(raro.headers.get('content-disposition'), /^attachment/);
});

test('el original de otro usuario no se puede ver', async () => {
  assert.equal((await pablo.cliente.get(`/api/facturas/${ids.movistar}/original`)).estado, 404);
  assert.equal((await lucia.cliente.get('/api/facturas/abc/original')).estado, 400);
  assert.equal((await crearCliente(servidor.url).get(`/api/facturas/${ids.movistar}/original`)).estado, 401);
});

test('leerImporte entiende importes escritos a la española', () => {
  assert.equal(leerImporte('41,32'), 41.32);
  assert.equal(leerImporte('1.234,56 €'), 1234.56);
  assert.equal(leerImporte('41.32'), 41.32);
  assert.equal(leerImporte('movistar'), null);
  assert.equal(leerImporte('TF-55102'), null);
});
