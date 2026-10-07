import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api, conToken, ingresar, simularFetch } from './ayudante.js';
import { limpiarCacheDolar } from '../src/servicios/externos.js';

test('HU-17: el reporte por rango de fechas suma solo reservas vigentes', async () => {
  const token = await ingresar('administrador_hotel');
  const respuesta = await api().get('/api/reportes/reservas?desde=2026-10-01&hasta=2026-10-31').set(conToken(token));
  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.totales.cantidad, 4);
  assert.equal(respuesta.body.totales.noches, 11);
  assert.equal(respuesta.body.totales.monto_total, 135000 + 180000 + 390000 + 330000);
  assert.equal(respuesta.body.totales.ticket_promedio, Math.round(1035000 / 4));
});

test('HU-17: el reporte diario usa el mismo día como desde y hasta', async () => {
  const token = await ingresar('administrador_hotel');
  const respuesta = await api().get('/api/reportes/reservas?desde=2026-10-12&hasta=2026-10-12').set(conToken(token));
  assert.equal(respuesta.body.reservas.length, 1);
  assert.equal(respuesta.body.reservas[0].habitacion.numero, '301');
});

test('HU-17: el reporte valida el periodo y es exclusivo del administrador del hotel', async () => {
  const token = await ingresar('administrador_hotel');
  const invertido = await api().get('/api/reportes/reservas?desde=2026-10-31&hasta=2026-10-01').set(conToken(token));
  assert.equal(invertido.status, 400);
  const reservas = await ingresar('administrador_reservas');
  const sinPermiso = await api().get('/api/reportes/reservas?desde=2026-10-01&hasta=2026-10-31').set(conToken(reservas));
  assert.equal(sinPermiso.status, 403);
});

test('Panel: el resumen del mes entrega indicadores, alertas de pago y actividad', async () => {
  const token = await ingresar('administrador_hotel');
  const respuesta = await api().get('/api/reportes/resumen?mes=2026-10').set(conToken(token));
  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.body.totales.confirmadas, 3);
  assert.ok(respuesta.body.ocupacion > 0);
  assert.ok(respuesta.body.alertas.some((a) => a.reserva_id === 2));
  assert.ok(respuesta.body.actividad.some((a) => a.accion === 'ingreso'));
});

test('Servicio externo: el valor del dólar se obtiene desde mindicador.cl', async () => {
  limpiarCacheDolar();
  const restaurar = simularFetch((url) => {
    assert.equal(url, 'https://mindicador.cl/api/dolar');
    return new Response(JSON.stringify({ serie: [{ fecha: '2026-10-02T03:00:00.000Z', valor: 935.4 }] }), { status: 200 });
  });
  try {
    const respuesta = await api().get('/api/indicadores/dolar');
    assert.equal(respuesta.status, 200);
    assert.equal(respuesta.body.valor, 935.4);
    assert.equal(respuesta.body.fecha, '2026-10-02');
  } finally {
    restaurar();
  }
});

test('Servicio externo: si mindicador.cl falla la API responde 503 sin caerse', async () => {
  limpiarCacheDolar();
  const restaurar = simularFetch(() => new Response('error', { status: 500 }));
  try {
    const respuesta = await api().get('/api/indicadores/dolar');
    assert.equal(respuesta.status, 503);
  } finally {
    restaurar();
  }
});
