// Tests del módulo auth (#23): verificar email, recuperar contraseña, Google y límite de intentos.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { arrancar, crearCliente } from './ayuda.js';
import { db } from '../src/core/db.js';
import { config } from '../src/config.js';
import { entrarConGoogle } from '../src/modulos/auth/rutas.js';

let servidor;
before(async () => { servidor = await arrancar(); });
after(async () => { await servidor.cerrar(); });

// Sin SMTP, enviarEmail() imprime el email en la consola: lo capturamos para sacar el enlace.
async function capturarEmails(accion) {
  const emails = [];
  const original = console.log;
  console.log = (...args) => { emails.push(args.join(' ')); };
  try {
    await accion();
  } finally {
    console.log = original;
  }
  return emails.join('\n');
}
const tokenDe = (texto, ruta) => texto.match(new RegExp(`/${ruta}\\?token=([a-f0-9]+)`))?.[1];

async function registrar(email, extra = {}) {
  const cliente = crearCliente(servidor.url);
  let respuesta;
  const emails = await capturarEmails(async () => {
    respuesta = await cliente.post('/api/auth/registro', { nombre: 'Ana', email, password: '12345678', ...extra });
  });
  return { cliente, respuesta, emails };
}

test('al registrarse llega el email de verificación y el enlace funciona una sola vez', async () => {
  const { cliente, respuesta, emails } = await registrar('verificar@prueba.es');
  assert.equal(respuesta.estado, 201);
  assert.equal(respuesta.datos.email_verificado, false);
  assert.match(emails, /Para: verificar@prueba\.es/);
  assert.match(emails, /Confirma tu email/);
  const token = tokenDe(emails, 'verificar');
  assert.ok(token);

  // Solo se guarda el hash del token.
  const { rows } = await db.query("SELECT token_hash FROM tokens WHERE tipo = 'verificar_email'");
  assert.ok(rows.every((r) => r.token_hash !== token));

  const otroDispositivo = crearCliente(servidor.url);
  const verificado = await otroDispositivo.post('/api/auth/verificar', { token });
  assert.equal(verificado.estado, 200);
  assert.equal(verificado.datos.email_verificado, true);
  assert.equal((await otroDispositivo.get('/api/auth/yo')).estado, 200);

  const repetido = await cliente.post('/api/auth/verificar', { token });
  assert.equal(repetido.estado, 400);
  assert.equal(repetido.datos.detalles.codigo, 'enlace_no_valido');

  assert.equal((await cliente.post('/api/auth/reenviar-verificacion')).estado, 400);
});

test('el email de verificación sale en el idioma elegido y se puede reenviar', async () => {
  const { cliente, emails } = await registrar('english@prueba.es', { idioma: 'en' });
  assert.match(emails, /Confirm your email/);
  const primero = tokenDe(emails, 'verificar');

  const reenvio = await capturarEmails(async () => {
    assert.equal((await cliente.post('/api/auth/reenviar-verificacion')).estado, 200);
  });
  const segundo = tokenDe(reenvio, 'verificar');
  assert.ok(segundo && segundo !== primero);

  // El reenvío anula el enlace anterior.
  assert.equal((await cliente.post('/api/auth/verificar', { token: primero })).estado, 400);
  assert.equal((await cliente.post('/api/auth/verificar', { token: segundo })).estado, 200);
  assert.equal((await cliente.post('/api/auth/reenviar-verificacion')).estado, 400);
});

test('un enlace de verificación caducado no vale', async () => {
  const { cliente, emails } = await registrar('caducado@prueba.es');
  await db.query("UPDATE tokens SET expira_en = now() - interval '1 minute' WHERE tipo = 'verificar_email' AND usado_en IS NULL");
  assert.equal((await cliente.post('/api/auth/verificar', { token: tokenDe(emails, 'verificar') })).estado, 400);
  assert.equal((await cliente.post('/api/auth/verificar', { token: 'inventado' })).estado, 400);
  assert.equal((await cliente.post('/api/auth/verificar', {})).estado, 400);
});

test('recuperar la contraseña', async () => {
  await registrar('olvido@prueba.es');
  const anonimo = crearCliente(servidor.url);

  // Responde igual exista o no la cuenta, y solo manda email si existe.
  let respuestaFalsa;
  const nada = await capturarEmails(async () => {
    respuestaFalsa = await anonimo.post('/api/auth/recuperar', { email: 'nadie@prueba.es' });
  });
  assert.equal(respuestaFalsa.estado, 200);
  assert.doesNotMatch(nada, /restablecer/);

  let respuesta;
  const emails = await capturarEmails(async () => {
    respuesta = await anonimo.post('/api/auth/recuperar', { email: 'OLVIDO@prueba.es' });
  });
  assert.deepEqual(respuesta.datos, respuestaFalsa.datos);
  const token = tokenDe(emails, 'restablecer');
  assert.ok(token);

  // Una contraseña corta no gasta el enlace.
  assert.equal((await anonimo.post('/api/auth/restablecer', { token, password: '123' })).estado, 400);

  const cambio = await anonimo.post('/api/auth/restablecer', { token, password: 'nueva-clave-1' });
  assert.equal(cambio.estado, 200);
  assert.equal(cambio.datos.email_verificado, true);
  assert.equal((await anonimo.post('/api/auth/restablecer', { token, password: 'otra-clave-2' })).estado, 400);

  const cliente = crearCliente(servidor.url);
  assert.equal((await cliente.post('/api/auth/entrar', { email: 'olvido@prueba.es', password: '12345678' })).estado, 401);
  assert.equal((await cliente.post('/api/auth/entrar', { email: 'olvido@prueba.es', password: 'nueva-clave-1' })).estado, 200);
});

test('el enlace para recuperar la contraseña caduca', async () => {
  await registrar('caduca@prueba.es');
  const anonimo = crearCliente(servidor.url);
  const emails = await capturarEmails(() => anonimo.post('/api/auth/recuperar', { email: 'caduca@prueba.es' }));
  const { rows } = await db.query(
    `SELECT round(EXTRACT(EPOCH FROM t.expira_en - t.creado_en) / 3600) AS horas FROM tokens t JOIN usuarios u ON u.id = t.usuario_id
      WHERE u.email = 'caduca@prueba.es' AND t.tipo = 'recuperar_contrasena'`,
  );
  assert.equal(Number(rows[0].horas), 1);

  await db.query("UPDATE tokens SET expira_en = now() - interval '1 minute' WHERE tipo = 'recuperar_contrasena' AND usado_en IS NULL");
  const respuesta = await anonimo.post('/api/auth/restablecer', { token: tokenDe(emails, 'restablecer'), password: 'nueva-clave-1' });
  assert.equal(respuesta.estado, 400);
});

test('límite de intentos al entrar', async () => {
  await registrar('limite@prueba.es');
  const cliente = crearCliente(servidor.url);
  for (let i = 0; i < 10; i++) {
    assert.equal((await cliente.post('/api/auth/entrar', { email: 'limite@prueba.es', password: 'mala' })).estado, 401);
  }
  const bloqueado = await cliente.post('/api/auth/entrar', { email: 'limite@prueba.es', password: '12345678' });
  assert.equal(bloqueado.estado, 429);
  // Otro email desde la misma IP no está bloqueado.
  await registrar('libre@prueba.es');
  assert.equal((await cliente.post('/api/auth/entrar', { email: 'libre@prueba.es', password: '12345678' })).estado, 200);
});

test('Google: sin configurar responde 503', async () => {
  const respuesta = await fetch(`${servidor.url}/api/auth/google`, { redirect: 'manual' });
  assert.equal(respuesta.status, 503);
  const vuelta = await fetch(`${servidor.url}/api/auth/google/callback?code=x&state=y`, { redirect: 'manual' });
  assert.equal(vuelta.status, 302);
  assert.equal(vuelta.headers.get('location'), '/entrar?error=google');
});

test('Google: configurado redirige al consentimiento y comprueba el estado', async () => {
  const anterior = { ...config.google };
  Object.assign(config.google, { clientId: 'cliente-prueba', clientSecret: 'secreto-prueba' });
  try {
    const respuesta = await fetch(`${servidor.url}/api/auth/google?volver=/app/facturas`, { redirect: 'manual' });
    assert.equal(respuesta.status, 302);
    const destino = new URL(respuesta.headers.get('location'));
    assert.equal(destino.hostname, 'accounts.google.com');
    assert.equal(destino.searchParams.get('client_id'), 'cliente-prueba');
    assert.equal(destino.searchParams.get('redirect_uri'), `${config.urlPublica}/api/auth/google/callback`);
    assert.ok(destino.searchParams.get('state'));
    assert.match(respuesta.headers.get('set-cookie'), /cuadra_google=.*HttpOnly/i);

    // Sin la cookie con el mismo estado, no se acepta la vuelta.
    const falsa = await fetch(`${servidor.url}/api/auth/google/callback?code=x&state=${destino.searchParams.get('state')}`, { redirect: 'manual' });
    assert.equal(falsa.headers.get('location'), '/entrar?error=google');
  } finally {
    Object.assign(config.google, anterior);
  }
});

test('Google: crea la cuenta o entra en la que ya existe', async () => {
  const nueva = await entrarConGoogle({ googleId: 'g-1', email: 'google@prueba.es', emailVerificado: true, nombre: 'Gina' });
  assert.equal(nueva.nuevo, true);
  const { rows } = await db.query('SELECT nombre, email_verificado, password_hash FROM usuarios WHERE id = $1', [nueva.id]);
  assert.deepEqual(rows[0], { nombre: 'Gina', email_verificado: true, password_hash: null });

  const otraVez = await entrarConGoogle({ googleId: 'g-1', email: 'google@prueba.es', emailVerificado: true, nombre: 'Gina' });
  assert.deepEqual(otraVez, { id: nueva.id, nuevo: false });

  // Cuenta creada con email y contraseña: se enlaza con Google si Google verifica el email.
  const { respuesta } = await registrar('enlazar@prueba.es');
  const enlazada = await entrarConGoogle({ googleId: 'g-2', email: 'enlazar@prueba.es', emailVerificado: true, nombre: 'Ana' });
  assert.deepEqual(enlazada, { id: respuesta.datos.id, nuevo: false });

  await registrar('sinverificar@prueba.es');
  await assert.rejects(
    entrarConGoogle({ googleId: 'g-3', email: 'sinverificar@prueba.es', emailVerificado: false, nombre: 'X' }),
    (error) => error.estado === 409,
  );
});
