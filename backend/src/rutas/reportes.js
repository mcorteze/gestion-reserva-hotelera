import { Router } from 'express';
import { obtenerDb } from '../db/conexion.js';
import { permitirRoles, requiereSesion } from '../autenticacion.js';
import { contarNoches, formatearReserva, listarReservas } from '../servicios/reservas.js';
import { ErrorNegocio } from '../utilidades.js';

const rutas = Router();

rutas.use(requiereSesion, permitirRoles('administrador_hotel'));

function validarPeriodo(desde, hasta) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde || '') || !/^\d{4}-\d{2}-\d{2}$/.test(hasta || '')) {
    throw new ErrorNegocio(400, 'Debes indicar desde y hasta con formato AAAA-MM-DD.');
  }
  if (hasta < desde) throw new ErrorNegocio(400, 'La fecha hasta no puede ser anterior a la fecha desde.');
}

function calcularTotales(reservas) {
  const vigentes = reservas.filter((r) => r.estado !== 'cancelada');
  const montoTotal = vigentes.reduce((suma, r) => suma + r.valor_total, 0);
  return {
    cantidad: vigentes.length,
    confirmadas: vigentes.filter((r) => r.estado === 'confirmada').length,
    pendientes: vigentes.filter((r) => r.estado === 'pendiente').length,
    canceladas: reservas.length - vigentes.length,
    noches: vigentes.reduce((suma, r) => suma + r.noches, 0),
    monto_total: montoTotal,
    monto_pagado: vigentes.reduce((suma, r) => suma + r.monto_pagado, 0),
    ticket_promedio: vigentes.length ? Math.round(montoTotal / vigentes.length) : 0
  };
}

// HU-17 / RF.17: reporte de reservas por periodo
rutas.get('/reservas', (req, res) => {
  const { desde, hasta } = req.query;
  validarPeriodo(desde, hasta);
  const filas = obtenerDb().prepare(`SELECT r.*, u.nombre AS cliente_nombre, u.correo AS cliente_correo, u.telefono AS cliente_telefono,
      h.numero AS habitacion_numero, h.categoria AS habitacion_categoria, h.categoria_precio, h.caracteristicas,
      h.equipamiento, h.capacidad, h.ubicacion, h.precio_diario, t.codigo_qr AS ticket_codigo, t.correo_enviado AS ticket_correo_enviado
    FROM reserva r JOIN usuario u ON u.id = r.cliente_id JOIN habitacion h ON h.id = r.habitacion_id
    LEFT JOIN ticket t ON t.reserva_id = r.id
    WHERE r.fecha_inicio BETWEEN ? AND ? ORDER BY r.fecha_inicio, r.id`).all(desde, hasta);
  const reservas = filas.map(formatearReserva);
  res.json({ desde, hasta, reservas, totales: calcularTotales(reservas) });
});

// Panel del administrador del hotel
rutas.get('/resumen', (req, res) => {
  const db = obtenerDb();
  const mes = /^\d{4}-\d{2}$/.test(req.query.mes || '') ? req.query.mes : new Date().toISOString().slice(0, 7);
  const [anio, numeroMes] = mes.split('-').map(Number);
  const inicio = `${mes}-01`;
  const fin = new Date(Date.UTC(anio, numeroMes, 1)).toISOString().slice(0, 10);
  const diasMes = contarNoches(inicio, fin);

  const delMes = listarReservas(db, { desde: inicio, hasta: fin }).filter((r) => r.fecha_inicio < fin);
  const vigentes = delMes.filter((r) => r.estado !== 'cancelada');
  const nochesOcupadas = vigentes.reduce((suma, r) => {
    const desde = r.fecha_inicio > inicio ? r.fecha_inicio : inicio;
    const hasta = r.fecha_fin < fin ? r.fecha_fin : fin;
    return suma + contarNoches(desde, hasta);
  }, 0);
  const { total: habitaciones } = db.prepare('SELECT COUNT(*) AS total FROM habitacion').get();

  const alertas = listarReservas(db, { estado: 'pendiente' }).map((r) => ({
    tipo: 'pago_pendiente', reserva_id: r.id, texto: `Reserva ${r.codigo} de ${r.cliente.nombre} tiene el pago pendiente.`
  }));

  const actividad = db.prepare(`SELECT a.accion, a.detalle, a.fecha, u.nombre AS usuario FROM registro_actividad a
    LEFT JOIN usuario u ON u.id = a.usuario_id ORDER BY a.id DESC LIMIT 8`).all();

  res.json({
    mes,
    totales: calcularTotales(vigentes.filter((r) => r.fecha_inicio >= inicio)),
    ocupacion: habitaciones ? Math.round((nochesOcupadas / (habitaciones * diasMes)) * 1000) / 10 : 0,
    alertas,
    actividad
  });
});

export default rutas;
