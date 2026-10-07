import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api } from './ayudante.js';

test('E0-HU2: el servidor responde y la base de datos tiene los datos de prueba', async () => {
  const respuesta = await api().get('/api/estado');
  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.base_datos, 'conectada');
  assert.equal(respuesta.body.habitaciones, 6);
});

test('E0-HU3: la API publica su documentación para otras aplicaciones', async () => {
  const respuesta = await api().get('/api');
  assert.equal(respuesta.status, 200);
  assert.ok(respuesta.body.recursos.length >= 20);
});

test('E0: una ruta inexistente de la API responde 404 con mensaje', async () => {
  const respuesta = await api().get('/api/no-existe');
  assert.equal(respuesta.status, 404);
  assert.ok(respuesta.body.mensaje);
});
