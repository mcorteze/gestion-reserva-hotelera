import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api, conToken, fechaFutura, ingresar } from './ayudante.js';

test('HU-04: el catálogo muestra cada habitación con 3 fotografías y su ficha completa', async () => {
  const respuesta = await api().get('/api/habitaciones');
  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.length, 6);
  for (const habitacion of respuesta.body) {
    assert.ok(habitacion.imagenes.length >= 3);
    for (const campo of ['categoria', 'ubicacion', 'numero', 'caracteristicas', 'equipamiento', 'precio_diario']) {
      assert.ok(habitacion[campo], `falta ${campo} en la habitación ${habitacion.numero}`);
    }
  }
});

test('HU-04: una habitación inexistente responde 404', async () => {
  const respuesta = await api().get('/api/habitaciones/999');
  assert.equal(respuesta.status, 404);
});

test('HU-03: la consulta por fechas excluye las habitaciones ocupadas', async () => {
  const llegada = fechaFutura(100);
  const salida = fechaFutura(103);
  const token = await ingresar('cliente');
  await api().post('/api/reservas').set(conToken(token)).send({ habitacion_id: 3, fecha_inicio: llegada, fecha_fin: salida });

  const respuesta = await api().get(`/api/habitaciones/disponibles?desde=${llegada}&hasta=${salida}`);
  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.noches, 3);
  assert.equal(respuesta.body.habitaciones.length, 5);
  assert.ok(!respuesta.body.habitaciones.some((h) => h.id === 3));
});

test('HU-03: la consulta valida el rango de fechas', async () => {
  const invertido = await api().get(`/api/habitaciones/disponibles?desde=${fechaFutura(10)}&hasta=${fechaFutura(8)}`);
  assert.equal(invertido.status, 400);
  const pasado = await api().get('/api/habitaciones/disponibles?desde=2020-01-01&hasta=2020-01-03');
  assert.equal(pasado.status, 400);
  const formato = await api().get('/api/habitaciones/disponibles?desde=mañana&hasta=luego');
  assert.equal(formato.status, 400);
});

test('HU-03: el calendario visual entrega los días ocupados del mes', async () => {
  const respuesta = await api().get('/api/habitaciones/1/ocupacion?mes=2026-10');
  assert.equal(respuesta.status, 200);
  assert.deepEqual(respuesta.body.ocupados[0], { fecha_inicio: '2026-10-01', fecha_fin: '2026-10-04' });
});

test('HU-13: el administrador de reservas actualiza características y equipamiento', async () => {
  const token = await ingresar('administrador_reservas');
  const respuesta = await api().put('/api/habitaciones/2').set(conToken(token))
    .send({ caracteristicas: 'Cama king, balcón, sofá cama', equipamiento: 'Aire acondicionado, TV, minibar, wifi' });
  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.caracteristicas, 'Cama king, balcón, sofá cama');

  const vacio = await api().put('/api/habitaciones/2').set(conToken(token)).send({ caracteristicas: '', equipamiento: 'TV' });
  assert.equal(vacio.status, 400);

  const cliente = await ingresar('cliente');
  const sinPermiso = await api().put('/api/habitaciones/2').set(conToken(cliente)).send({ caracteristicas: 'x', equipamiento: 'y' });
  assert.equal(sinPermiso.status, 403);
});

test('HU-16: el administrador del hotel actualiza precios por categoría Turista y Premium', async () => {
  const token = await ingresar('administrador_hotel');
  const respuesta = await api().put('/api/habitaciones/precios').set(conToken(token))
    .send({ cambios: [{ id: 1, precio_diario: 48000 }, { id: 3, precio_diario: 95000 }] });
  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.find((h) => h.id === 1).precio_diario, 48000);
  assert.equal(respuesta.body.find((h) => h.id === 3).categoria_precio, 'premium');

  const negativo = await api().put('/api/habitaciones/precios').set(conToken(token)).send({ cambios: [{ id: 1, precio_diario: -5 }] });
  assert.equal(negativo.status, 400);

  const reservas = await ingresar('administrador_reservas');
  const sinPermiso = await api().put('/api/habitaciones/precios').set(conToken(reservas)).send({ cambios: [{ id: 1, precio_diario: 1 }] });
  assert.equal(sinPermiso.status, 403);
});
