import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api, conToken, ingresar } from './ayudante.js';

const nuevoCliente = { nombre: 'Tomás Silva', correo: 'tomas.silva@correo.com', contrasena: 'Turista2026', telefono: '+56 9 5555 1234' };

test('HU-01: un turista se registra y obtiene su sesión', async () => {
  const respuesta = await api().post('/api/auth/registro').send(nuevoCliente);
  assert.equal(respuesta.status, 201);
  assert.equal(respuesta.body.usuario.rol, 'cliente');
  assert.ok(respuesta.body.token);
  assert.equal(respuesta.body.usuario.contrasena_hash, undefined);
});

test('HU-01: el registro rechaza contraseñas débiles y correos repetidos', async () => {
  const debil = await api().post('/api/auth/registro').send({ ...nuevoCliente, correo: 'otro@correo.com', contrasena: '1234' });
  assert.equal(debil.status, 400);
  const repetido = await api().post('/api/auth/registro').send(nuevoCliente);
  assert.equal(repetido.status, 409);
});

test('HU-02: los cuatro roles inician sesión y la contraseña errónea se rechaza', async () => {
  for (const rol of ['cliente', 'administrador_reservas', 'administrador_hotel', 'personal_hotel']) {
    const token = await ingresar(rol);
    const yo = await api().get('/api/auth/yo').set(conToken(token));
    assert.equal(yo.body.rol, rol);
  }
  const fallido = await api().post('/api/auth/ingreso').send({ correo: 'ana.torres@correo.com', contrasena: 'Incorrecta1' });
  assert.equal(fallido.status, 401);
});

test('HU-02: las rutas protegidas exigen sesión', async () => {
  const respuesta = await api().get('/api/reservas/mias');
  assert.equal(respuesta.status, 401);
});

test('HU-11: el usuario guarda su idioma preferido', async () => {
  const token = await ingresar('cliente');
  const cambio = await api().put('/api/auth/yo/idioma').set(conToken(token)).send({ idioma: 'en' });
  assert.equal(cambio.status, 200);
  const yo = await api().get('/api/auth/yo').set(conToken(token));
  assert.equal(yo.body.idioma, 'en');
  const invalido = await api().put('/api/auth/yo/idioma').set(conToken(token)).send({ idioma: 'fr' });
  assert.equal(invalido.status, 400);
});

test('HU-14: el administrador de reservas crea cuentas del personal, pero no de administradores', async () => {
  const token = await ingresar('administrador_reservas');
  const creada = await api().post('/api/usuarios').set(conToken(token))
    .send({ nombre: 'Rosa Vera', correo: 'rosa.vera@pacificreef.cl', contrasena: 'Personal2026', rol: 'personal_hotel' });
  assert.equal(creada.status, 201);
  const prohibida = await api().post('/api/usuarios').set(conToken(token))
    .send({ nombre: 'Otro Admin', correo: 'admin2@pacificreef.cl', contrasena: 'Admin2026', rol: 'administrador_hotel' });
  assert.equal(prohibida.status, 403);
  const nuevoIngreso = await api().post('/api/auth/ingreso').send({ correo: 'rosa.vera@pacificreef.cl', contrasena: 'Personal2026' });
  assert.equal(nuevoIngreso.status, 200);
});

test('HU-15: el administrador del hotel crea, modifica, ve y elimina cuentas de clientes', async () => {
  const token = await ingresar('administrador_hotel');
  const creada = await api().post('/api/usuarios').set(conToken(token))
    .send({ nombre: 'Sofía Morales', correo: 'sofia.morales@correo.com', contrasena: 'Cliente2026', rol: 'cliente' });
  assert.equal(creada.status, 201);

  const modificada = await api().put(`/api/usuarios/${creada.body.id}`).set(conToken(token)).send({ telefono: '+56 9 1111 2222' });
  assert.equal(modificada.body.telefono, '+56 9 1111 2222');

  const lista = await api().get('/api/usuarios?rol=cliente').set(conToken(token));
  assert.ok(lista.body.some((u) => u.correo === 'sofia.morales@correo.com'));

  const eliminada = await api().delete(`/api/usuarios/${creada.body.id}`).set(conToken(token));
  assert.equal(eliminada.status, 204);
});

test('HU-15: no se elimina un cliente con reservas ni la propia cuenta, y el cliente no administra cuentas', async () => {
  const token = await ingresar('administrador_hotel');
  const conReservas = await api().delete('/api/usuarios/1').set(conToken(token));
  assert.equal(conReservas.status, 409);
  const propia = await api().delete('/api/usuarios/4').set(conToken(token));
  assert.equal(propia.status, 409);
  const cliente = await ingresar('cliente');
  const sinPermiso = await api().get('/api/usuarios').set(conToken(cliente));
  assert.equal(sinPermiso.status, 403);
});
