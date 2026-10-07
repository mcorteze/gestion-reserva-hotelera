import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api, conToken, fechaFutura, ingresar, respuestaPng, simularFetch } from './ayudante.js';

const tarjeta = { titular: 'Ana Torres', numero: '4242 4242 4242 4242', vencimiento: '08/29', cvv: '123', metodo: 'tarjeta_credito' };

async function nuevaReserva(token, habitacion, desde, hasta) {
  const respuesta = await api().post('/api/reservas').set(conToken(token))
    .send({ habitacion_id: habitacion, fecha_inicio: fechaFutura(desde), fecha_fin: fechaFutura(hasta) });
  return respuesta.body;
}

test('HU-09 y HU-10: el pago aprobado del 30% confirma la reserva y emite el ticket con QR', async () => {
  const restaurar = simularFetch((url) => {
    assert.match(url, /api\.qrserver\.com/);
    return respuestaPng();
  });
  try {
    const token = await ingresar('cliente');
    const reserva = await nuevaReserva(token, 6, 40, 42);
    const pago = await api().post(`/api/reservas/${reserva.id}/pagos`).set(conToken(token)).send(tarjeta);
    assert.equal(pago.status, 201);
    assert.equal(pago.body.estado, 'aprobado');
    assert.equal(pago.body.reserva.estado, 'confirmada');
    assert.equal(pago.body.reserva.monto_pagado, Math.round(2 * 130000 * 0.3));
    assert.equal(pago.body.ticket.codigo, `QR-RES-${String(reserva.id).padStart(4, '0')}`);
    assert.match(pago.body.ticket.qr_imagen, /^data:image\/png;base64,/);
    assert.equal(pago.body.ticket.simulado, true);

    const ticket = await api().get(`/api/reservas/${reserva.id}/ticket`).set(conToken(token));
    assert.equal(ticket.status, 200);
    assert.equal(ticket.body.codigo, pago.body.ticket.codigo);

    const repetido = await api().post(`/api/reservas/${reserva.id}/pagos`).set(conToken(token)).send(tarjeta);
    assert.equal(repetido.status, 409);
  } finally {
    restaurar();
  }
});

test('HU-09: la tarjeta rechazada deja la reserva pendiente y se puede reintentar', async () => {
  const token = await ingresar('cliente');
  const reserva = await nuevaReserva(token, 5, 44, 45);
  const rechazado = await api().post(`/api/reservas/${reserva.id}/pagos`).set(conToken(token))
    .send({ ...tarjeta, numero: '4000 0000 0000 0002' });
  assert.equal(rechazado.status, 402);
  assert.equal(rechazado.body.estado, 'rechazado');
  assert.equal(rechazado.body.reserva.estado, 'pendiente');
});

test('HU-09: se validan número de tarjeta, vencimiento, CVV y método', async () => {
  const token = await ingresar('cliente');
  const reserva = await nuevaReserva(token, 5, 46, 47);
  const casos = [
    { numero: '1234 5678 9012 3456' },
    { vencimiento: '01/20' },
    { vencimiento: '13/30' },
    { cvv: '12' },
    { metodo: 'efectivo' }
  ];
  for (const cambio of casos) {
    const respuesta = await api().post(`/api/reservas/${reserva.id}/pagos`).set(conToken(token)).send({ ...tarjeta, ...cambio });
    assert.equal(respuesta.status, 400, JSON.stringify(cambio));
  }
});

test('HU-10: si el servicio de QR no responde, el ticket se emite igual y el QR se genera después', async () => {
  let restaurar = simularFetch(() => { throw new Error('sin conexión'); });
  const token = await ingresar('cliente');
  const reserva = await nuevaReserva(token, 4, 48, 50);
  const pago = await api().post(`/api/reservas/${reserva.id}/pagos`).set(conToken(token)).send(tarjeta);
  restaurar();
  assert.equal(pago.status, 201);
  assert.equal(pago.body.ticket.qr_imagen, null);

  restaurar = simularFetch(() => respuestaPng());
  const ticket = await api().get(`/api/reservas/${reserva.id}/ticket`).set(conToken(token));
  restaurar();
  assert.match(ticket.body.qr_imagen, /^data:image\/png;base64,/);
});

test('HU-09: el administrador valida el pago pendiente de la reserva 2 (prueba 3 del CRUD)', async () => {
  const restaurar = simularFetch(() => respuestaPng());
  try {
    const admin = await ingresar('administrador_reservas');
    const respuesta = await api().post('/api/reservas/2/confirmar-pago').set(conToken(admin));
    assert.equal(respuesta.status, 200);
    assert.equal(respuesta.body.reserva.estado, 'confirmada');
    assert.equal(respuesta.body.reserva.monto_pagado, 54000);
  } finally {
    restaurar();
  }
});

test('HU-10: un cliente no puede ver el ticket de otro cliente', async () => {
  const ana = await ingresar('cliente');
  const ajeno = await api().get('/api/reservas/3/ticket').set(conToken(ana));
  assert.equal(ajeno.status, 403);
});
