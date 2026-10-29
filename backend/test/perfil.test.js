// Tests del módulo perfil (#24): perfil fiscal, actividades, emails de confianza y ajustes.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { arrancar, crearCliente } from './ayuda.js';

let servidor;
let ana;
before(async () => {
  servidor = await arrancar();
  ana = crearCliente(servidor.url);
  await ana.post('/api/auth/registro', { nombre: 'Ana', email: 'ana@perfil.es', password: '12345678' });
});
after(async () => { await servidor.cerrar(); });

const perfilValido = {
  nif: '12345678Z', direccion: 'Calle Mayor 1, Madrid', actividad: 'diseno', regimen_iva: 'general', email_gestoria: '',
};

test('al registrarse no hay perfil fiscal', async () => {
  const { estado, datos } = await ana.get('/api/perfil');
  assert.equal(estado, 200);
  assert.equal(datos, null);
});

test('no se guarda un NIF inválido', async () => {
  const { estado, datos } = await ana.put('/api/perfil', { ...perfilValido, nif: '12345678A' });
  assert.equal(estado, 400);
  assert.equal(datos.detalles.campo, 'nif');
  assert.equal((await ana.get('/api/perfil')).datos, null);
});

test('se guardan NIF, NIE y CIF válidos, normalizados', async () => {
  for (const [nif, guardado] of [['es-12345678z', '12345678Z'], ['x1234567l', 'X1234567L'], ['B12345674', 'B12345674']]) {
    const { estado, datos } = await ana.put('/api/perfil', { ...perfilValido, nif });
    assert.equal(estado, 200, nif);
    assert.equal(datos.nif, guardado);
  }
  const yo = await ana.get('/api/auth/yo');
  assert.equal(yo.datos.perfil_completo, true);
});

test('el email de la gestoría es opcional pero tiene que ser válido', async () => {
  const vacio = await ana.put('/api/perfil', perfilValido);
  assert.equal(vacio.datos.email_gestoria, null);

  const malo = await ana.put('/api/perfil', { ...perfilValido, email_gestoria: 'gestoria' });
  assert.equal(malo.estado, 400);
  assert.equal(malo.datos.detalles.campo, 'email_gestoria');

  const bueno = await ana.put('/api/perfil', { ...perfilValido, email_gestoria: 'Gestoria@Ejemplo.com' });
  assert.equal(bueno.datos.email_gestoria, 'gestoria@ejemplo.com');
});

test('faltan campos obligatorios', async () => {
  for (const campo of ['direccion', 'actividad', 'regimen_iva']) {
    const { estado, datos } = await ana.put('/api/perfil', { ...perfilValido, [campo]: '' });
    assert.equal(estado, 400, campo);
    assert.equal(datos.detalles.campo, campo);
  }
});

test('las actividades proponen un régimen de IVA que se puede cambiar', async () => {
  const { datos } = await ana.get('/api/perfil/actividades');
  const regimen = (clave) => datos.actividades.find((a) => a.clave === clave)?.regimen_iva;
  assert.equal(regimen('diseno'), 'general');
  assert.equal(regimen('comercio'), 'recargo_equivalencia');
  assert.equal(regimen('formacion'), 'exento');
  for (const a of datos.actividades) assert.ok(datos.regimenes.includes(a.regimen_iva), a.clave);

  // El usuario confirma otro régimen distinto del propuesto.
  const cambiado = await ana.put('/api/perfil', { ...perfilValido, actividad: 'comercio', regimen_iva: 'general' });
  assert.equal(cambiado.estado, 200);
  assert.equal(cambiado.datos.regimen_iva, 'general');
});

test('emails de confianza: añadir, listar y borrar', async () => {
  const nuevo = await ana.post('/api/perfil/emails-confianza', { email: ' Socio@Ejemplo.com ' });
  assert.equal(nuevo.estado, 201);
  assert.equal(nuevo.datos.email, 'socio@ejemplo.com');

  assert.equal((await ana.post('/api/perfil/emails-confianza', { email: 'socio@ejemplo.com' })).estado, 409);
  assert.equal((await ana.post('/api/perfil/emails-confianza', { email: 'no-es-email' })).estado, 400);
  assert.equal((await ana.post('/api/perfil/emails-confianza', { email: 'ana@perfil.es' })).estado, 400);

  const lista = await ana.get('/api/perfil/emails-confianza');
  assert.deepEqual(lista.datos.map((e) => e.email), ['socio@ejemplo.com']);

  // Otro usuario no puede ver ni borrar los emails de Ana (RF-09).
  const otro = crearCliente(servidor.url);
  await otro.post('/api/auth/registro', { nombre: 'Otro', email: 'otro@perfil.es', password: '12345678' });
  assert.deepEqual((await otro.get('/api/perfil/emails-confianza')).datos, []);
  assert.equal((await otro.delete(`/api/perfil/emails-confianza/${nuevo.datos.id}`)).estado, 404);

  assert.equal((await ana.delete(`/api/perfil/emails-confianza/${nuevo.datos.id}`)).estado, 204);
  assert.deepEqual((await ana.get('/api/perfil/emails-confianza')).datos, []);
});

test('ajustes de avisos', async () => {
  const inicial = await ana.get('/api/perfil/ajustes');
  assert.equal(inicial.datos.dias_aviso_pendiente, 7);
  assert.ok(inicial.datos.tipos_aviso.includes('pendiente_revisar'));

  const guardado = await ana.put('/api/perfil/ajustes', {
    dias_aviso_pendiente: 10, dias_aviso_trimestre: 20, avisos_sin_email: ['duplicado', 'sin_nif'],
  });
  assert.equal(guardado.estado, 200);
  assert.equal(guardado.datos.dias_aviso_pendiente, 10);
  assert.deepEqual([...guardado.datos.avisos_sin_email].sort(), ['duplicado', 'sin_nif']);

  // Solo cambia lo que llega.
  const parcial = await ana.put('/api/perfil/ajustes', { dias_aviso_trimestre: 5 });
  assert.equal(parcial.datos.dias_aviso_pendiente, 10);
  assert.equal(parcial.datos.dias_aviso_trimestre, 5);

  assert.equal((await ana.put('/api/perfil/ajustes', { dias_aviso_pendiente: 0 })).estado, 400);
  assert.equal((await ana.put('/api/perfil/ajustes', { avisos_sin_email: ['inventado'] })).estado, 400);
});

test('idioma y tema se guardan en la cuenta', async () => {
  await ana.put('/api/auth/preferencias', { idioma: 'en', tema: 'oscuro' });
  await ana.post('/api/auth/salir');
  await ana.post('/api/auth/entrar', { email: 'ana@perfil.es', password: '12345678' });
  const yo = await ana.get('/api/auth/yo');
  assert.equal(yo.datos.idioma, 'en');
  assert.equal(yo.datos.tema, 'oscuro');
});
