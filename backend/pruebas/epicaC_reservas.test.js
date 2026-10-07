import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api, conToken, fechaFutura, ingresar } from './ayudante.js';

const llegada = fechaFutura(60);
const salida = fechaFutura(63);

test('HU-05 y HU-08: al elegir habitación y días se calcula el valor total y el 30%', async () => {
  const respuesta = await api().get(`/api/habitaciones/1/disponibilidad?desde=${llegada}&hasta=${salida}`);
  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.disponible, true);
  assert.equal(respuesta.body.noches, 3);
  assert.equal(respuesta.body.valor_total, 135000);
  assert.equal(respuesta.body.monto_abono, 40500);
});

test('HU-07: la reserva queda registrada y asociada a la cuenta del cliente', async () => {
  const token = await ingresar('cliente');
  const creada = await api().post('/api/reservas').set(conToken(token))
    .send({ habitacion_id: 1, fecha_inicio: llegada, fecha_fin: salida });
  assert.equal(creada.status, 201);
  assert.equal(creada.body.estado, 'pendiente');
  assert.equal(creada.body.cliente.correo, 'ana.torres@correo.com');

  const mias = await api().get('/api/reservas/mias').set(conToken(token));
  assert.ok(mias.body.some((r) => r.id === creada.body.id));
});

test('HU-06: si el rango choca se sugiere reducir noches u otra habitación', async () => {
  const respuesta = await api().get(`/api/habitaciones/1/disponibilidad?desde=${fechaFutura(58)}&hasta=${fechaFutura(62)}`);
  assert.equal(respuesta.body.disponible, false);
  assert.deepEqual(respuesta.body.sugerencias.reducir_noches, { noches: 2, fecha_fin: llegada });
  assert.ok(respuesta.body.sugerencias.otras_habitaciones.length > 0);
  assert.ok(!respuesta.body.sugerencias.otras_habitaciones.some((h) => h.id === 1));

  const token = await ingresar('cliente');
  const doble = await api().post('/api/reservas').set(conToken(token))
    .send({ habitacion_id: 1, fecha_inicio: fechaFutura(61), fecha_fin: fechaFutura(64) });
  assert.equal(doble.status, 409);
});

test('HU-07: solo un cliente con sesión puede reservar', async () => {
  const sinSesion = await api().post('/api/reservas').send({ habitacion_id: 2, fecha_inicio: llegada, fecha_fin: salida });
  assert.equal(sinSesion.status, 401);
  const personal = await ingresar('personal_hotel');
  const conPersonal = await api().post('/api/reservas').set(conToken(personal))
    .send({ habitacion_id: 2, fecha_inicio: llegada, fecha_fin: salida });
  assert.equal(conPersonal.status, 403);
});

test('HU-12: el administrador de reservas modifica fechas y el valor se recalcula', async () => {
  const cliente = await ingresar('cliente');
  const creada = await api().post('/api/reservas').set(conToken(cliente))
    .send({ habitacion_id: 4, fecha_inicio: fechaFutura(70), fecha_fin: fechaFutura(72) });

  const admin = await ingresar('administrador_reservas');
  const modificada = await api().put(`/api/reservas/${creada.body.id}`).set(conToken(admin))
    .send({ fecha_fin: fechaFutura(74) });
  assert.equal(modificada.status, 200);
  assert.equal(modificada.body.noches, 4);
  assert.equal(modificada.body.valor_total, 4 * 38000);
});

test('HU-12: el administrador cancela reservas y el cliente solo las suyas pendientes', async () => {
  const cliente = await ingresar('cliente');
  const creada = await api().post('/api/reservas').set(conToken(cliente))
    .send({ habitacion_id: 2, fecha_inicio: fechaFutura(80), fecha_fin: fechaFutura(81) });
  const propia = await api().post(`/api/reservas/${creada.body.id}/cancelar`).set(conToken(cliente));
  assert.equal(propia.body.estado, 'cancelada');

  const ajena = await api().post('/api/reservas/3/cancelar').set(conToken(cliente));
  assert.equal(ajena.status, 403);

  const admin = await ingresar('administrador_reservas');
  const otra = await api().post('/api/reservas').set(conToken(cliente))
    .send({ habitacion_id: 2, fecha_inicio: fechaFutura(82), fecha_fin: fechaFutura(84) });
  const porAdmin = await api().post(`/api/reservas/${otra.body.id}/cancelar`).set(conToken(admin));
  assert.equal(porAdmin.body.estado, 'cancelada');

  const libre = await api().get(`/api/habitaciones/2/disponibilidad?desde=${fechaFutura(82)}&hasta=${fechaFutura(84)}`);
  assert.equal(libre.body.disponible, true);
});

test('HU-18: el personal ve las reservas con el servicio contratado, pero no puede cancelarlas', async () => {
  const personal = await ingresar('personal_hotel');
  const lista = await api().get('/api/reservas?desde=2026-10-01&hasta=2026-10-31').set(conToken(personal));
  assert.equal(lista.status, 200);
  assert.ok(lista.body.length >= 4);
  assert.match(lista.body[0].servicio_contratado, /Alojamiento \d+ noches en habitación/);

  const cancelar = await api().post('/api/reservas/1/cancelar').set(conToken(personal));
  assert.equal(cancelar.status, 403);

  const cliente = await ingresar('cliente');
  const listaCliente = await api().get('/api/reservas').set(conToken(cliente));
  assert.equal(listaCliente.status, 403);
});
