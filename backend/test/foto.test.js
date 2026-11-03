// Tests de la foto de perfil.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { arrancar } from './ayuda.js';

const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 1)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 2)]);
const PDF = Buffer.from('%PDF-1.4\n1 0 obj << >> endobj\n%%EOF\n');

let servidor;
before(async () => { servidor = await arrancar(); });
after(async () => { await servidor.cerrar(); });

async function usuario(email) {
  const r = await fetch(`${servidor.url}/api/auth/registro`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre: 'Prueba', email, password: '12345678' }),
  });
  return r.headers.get('set-cookie').split(';')[0];
}

const pedir = (cookie, metodo = 'GET', ruta = '', cuerpo) => fetch(`${servidor.url}/api/foto${ruta}`, { method: metodo, headers: { cookie }, body: cuerpo });

function formulario(contenido, nombre = 'foto.jpg') {
  const f = new FormData();
  f.append('foto', new Blob([contenido]), nombre);
  return f;
}

test('subir, ver, cambiar y quitar la foto de perfil', async () => {
  const cookie = await usuario('foto1@prueba.es');
  assert.deepEqual(await (await pedir(cookie, 'GET', '/estado')).json(), { tiene: false, version: null });
  assert.equal((await pedir(cookie)).status, 404);

  const subida = await (await pedir(cookie, 'PUT', '', formulario(JPG))).json();
  assert.equal(subida.tiene, true);
  const foto = await pedir(cookie, 'GET', `?v=${subida.version}`);
  assert.equal(foto.status, 200);
  assert.equal(foto.headers.get('content-type'), 'image/jpeg');
  assert.deepEqual(Buffer.from(await foto.arrayBuffer()), JPG);

  await pedir(cookie, 'PUT', '', formulario(PNG, 'foto.png'));
  assert.equal((await pedir(cookie)).headers.get('content-type'), 'image/png');

  assert.equal((await pedir(cookie, 'DELETE')).status, 204);
  assert.equal((await (await pedir(cookie, 'GET', '/estado')).json()).tiene, false);
});

test('solo acepta imágenes JPG o PNG pequeñas, y cada uno ve solo la suya', async () => {
  const cookie = await usuario('foto2@prueba.es');
  const otra = await usuario('foto3@prueba.es');
  assert.equal((await pedir(cookie, 'PUT', '', formulario(PDF, 'foto.jpg'))).status, 400);
  assert.equal((await pedir(cookie, 'PUT', '', formulario(Buffer.concat([JPG, Buffer.alloc(3 * 1024 * 1024)])))).status, 400);
  assert.equal((await pedir(cookie, 'PUT', '', formulario(JPG))).status, 200);
  assert.equal((await pedir(otra)).status, 404);
  assert.equal((await fetch(`${servidor.url}/api/foto`)).status, 401);
});
