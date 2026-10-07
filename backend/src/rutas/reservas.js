import { Router } from 'express';
import { obtenerDb } from '../db/conexion.js';
import { permitirRoles, requiereSesion } from '../autenticacion.js';
import { listarReservas, obtenerReserva, verificarDisponibilidad } from '../servicios/reservas.js';
import { procesarCobro, validarDatosPago } from '../servicios/pasarela.js';
import { generarImagenQr } from '../servicios/externos.js';
import { enviarTicket } from '../servicios/correo.js';
import { ErrorNegocio, manejar, registrarActividad } from '../utilidades.js';

const rutas = Router();
const ADMINISTRADORES = ['administrador_reservas', 'administrador_hotel'];
const PERSONAL = [...ADMINISTRADORES, 'personal_hotel'];

rutas.use(requiereSesion);

function verificarAcceso(req, reserva) {
  if (PERSONAL.includes(req.usuario.rol)) return;
  if (reserva.cliente.id !== req.usuario.id) throw new ErrorNegocio(403, 'No tienes acceso a esta reserva.');
}

// HU-10 / RF.10: ticket con codigo QR y envio por correo
async function emitirTicket(db, reservaId) {
  const reserva = obtenerReserva(db, reservaId);
  const codigo = `QR-RES-${String(reserva.id).padStart(4, '0')}`;
  const qrImagen = await generarImagenQr(`HOTEL PACIFIC REEF | ${codigo} | Reserva ${reserva.codigo} | `
    + `Hab ${reserva.habitacion.numero} | ${reserva.fecha_inicio} a ${reserva.fecha_fin}`);

  db.prepare(`INSERT INTO ticket (reserva_id, codigo_qr, fecha_emision, qr_imagen) VALUES (?, ?, datetime('now'), ?)
    ON CONFLICT(reserva_id) DO UPDATE SET qr_imagen = excluded.qr_imagen`).run(reserva.id, codigo, qrImagen);

  const envio = await enviarTicket({ correo: reserva.cliente.correo, nombre: reserva.cliente.nombre, codigo,
    reserva: obtenerReserva(db, reserva.id), qrImagen });
  db.prepare('UPDATE ticket SET correo_enviado = ? WHERE reserva_id = ?').run(envio.enviado ? 1 : 0, reserva.id);
  return { codigo, qr_imagen: qrImagen, correo: reserva.cliente.correo, ...envio };
}

// HU-07 / RF.7: registro de reserva
rutas.post('/', permitirRoles('cliente'), (req, res) => {
  const db = obtenerDb();
  const { habitacion_id: habitacionId, fecha_inicio: inicio, fecha_fin: fin } = req.body;
  const resultado = verificarDisponibilidad(db, Number(habitacionId), inicio, fin);
  if (!resultado.disponible) {
    return res.status(409).json({ mensaje: 'La habitación no está disponible en esas fechas.', ...resultado });
  }

  const { lastInsertRowid } = db.prepare(`INSERT INTO reserva (cliente_id, habitacion_id, fecha_inicio, fecha_fin, valor_total, estado)
    VALUES (?, ?, ?, ?, ?, 'pendiente')`).run(req.usuario.id, resultado.habitacion_id, inicio, fin, resultado.valor_total);
  registrarActividad(db, req.usuario.id, 'crear_reserva', `Reserva ${lastInsertRowid}`);
  res.status(201).json(obtenerReserva(db, lastInsertRowid));
});

rutas.get('/mias', permitirRoles('cliente'), (req, res) => {
  res.json(listarReservas(obtenerDb(), { clienteId: req.usuario.id }));
});

// HU-12 y HU-18: listado de reservas
rutas.get('/', permitirRoles(...PERSONAL), (req, res) => {
  const { desde, hasta, estado } = req.query;
  res.json(listarReservas(obtenerDb(), { desde, hasta, estado }));
});

rutas.get('/:id', (req, res) => {
  const reserva = obtenerReserva(obtenerDb(), req.params.id);
  verificarAcceso(req, reserva);
  res.json(reserva);
});

// HU-12 / RF.12: modificar fechas o habitacion de una reserva
rutas.put('/:id', permitirRoles(...ADMINISTRADORES), (req, res) => {
  const db = obtenerDb();
  const actual = obtenerReserva(db, req.params.id);
  if (actual.estado === 'cancelada') throw new ErrorNegocio(409, 'No se puede modificar una reserva cancelada.');

  const habitacionId = Number(req.body.habitacion_id ?? actual.habitacion.id);
  const inicio = req.body.fecha_inicio ?? actual.fecha_inicio;
  const fin = req.body.fecha_fin ?? actual.fecha_fin;
  const resultado = verificarDisponibilidad(db, habitacionId, inicio, fin, actual.id);
  if (!resultado.disponible) {
    return res.status(409).json({ mensaje: 'La habitación no está disponible en esas fechas.', ...resultado });
  }

  db.prepare('UPDATE reserva SET habitacion_id = ?, fecha_inicio = ?, fecha_fin = ?, valor_total = ? WHERE id = ?')
    .run(habitacionId, inicio, fin, resultado.valor_total, actual.id);
  registrarActividad(db, req.usuario.id, 'modificar_reserva', `Reserva ${actual.id}: ${inicio} a ${fin}, habitación ${habitacionId}`);
  res.json(obtenerReserva(db, actual.id));
});

// HU-12: cancelar reserva
rutas.post('/:id/cancelar', (req, res) => {
  const db = obtenerDb();
  const reserva = obtenerReserva(db, req.params.id);
  verificarAcceso(req, reserva);
  if (req.usuario.rol === 'personal_hotel') throw new ErrorNegocio(403, 'Tu perfil no tiene permiso para esta acción.');
  if (reserva.estado === 'cancelada') throw new ErrorNegocio(409, 'La reserva ya está cancelada.');
  if (req.usuario.rol === 'cliente' && reserva.estado !== 'pendiente') {
    throw new ErrorNegocio(409, 'Las reservas pagadas solo puede cancelarlas el administrador de reservas.');
  }

  db.prepare("UPDATE reserva SET estado = 'cancelada' WHERE id = ?").run(reserva.id);
  registrarActividad(db, req.usuario.id, 'cancelar_reserva', `Reserva ${reserva.id}`);
  res.json(obtenerReserva(db, reserva.id));
});

// HU-09 / RF.9: pago en linea del 30 por ciento
rutas.post('/:id/pagos', permitirRoles('cliente'), manejar(async (req, res) => {
  const db = obtenerDb();
  const reserva = obtenerReserva(db, req.params.id);
  verificarAcceso(req, reserva);
  if (reserva.estado !== 'pendiente') throw new ErrorNegocio(409, 'Esta reserva no tiene pagos pendientes.');

  const { digitos, ultimos } = validarDatosPago(req.body);
  const cobro = procesarCobro(digitos);
  const estadoPago = cobro.aprobado ? 'aprobado' : 'rechazado';

  db.prepare(`INSERT INTO pago (reserva_id, monto, fecha, metodo, estado, ultimos_digitos)
    VALUES (?, ?, datetime('now'), ?, ?, ?)`).run(reserva.id, reserva.monto_abono, req.body.metodo, estadoPago, ultimos);
  registrarActividad(db, req.usuario.id, `pago_${estadoPago}`, `Reserva ${reserva.id}`);

  if (!cobro.aprobado) {
    return res.status(402).json({ estado: 'rechazado', mensaje: cobro.motivo, reserva });
  }

  db.prepare("UPDATE reserva SET estado = 'confirmada', monto_pagado = ? WHERE id = ?").run(reserva.monto_abono, reserva.id);
  const ticket = await emitirTicket(db, reserva.id);
  res.status(201).json({ estado: 'aprobado', reserva: obtenerReserva(db, reserva.id), ticket });
}));

// Validacion de pago pendiente
rutas.post('/:id/confirmar-pago', permitirRoles(...ADMINISTRADORES), manejar(async (req, res) => {
  const db = obtenerDb();
  const reserva = obtenerReserva(db, req.params.id);
  const pago = db.prepare("SELECT * FROM pago WHERE reserva_id = ? AND estado = 'pendiente' ORDER BY id DESC").get(reserva.id);
  if (reserva.estado !== 'pendiente' || !pago) throw new ErrorNegocio(409, 'La reserva no tiene un pago pendiente de validar.');

  db.transaction(() => {
    db.prepare("UPDATE pago SET estado = 'aprobado' WHERE id = ?").run(pago.id);
    db.prepare("UPDATE reserva SET estado = 'confirmada', monto_pagado = ? WHERE id = ?").run(pago.monto, reserva.id);
  })();
  registrarActividad(db, req.usuario.id, 'confirmar_pago', `Reserva ${reserva.id}`);
  const ticket = await emitirTicket(db, reserva.id);
  res.json({ reserva: obtenerReserva(db, reserva.id), ticket });
}));

rutas.get('/:id/ticket', manejar(async (req, res) => {
  const db = obtenerDb();
  const reserva = obtenerReserva(db, req.params.id);
  verificarAcceso(req, reserva);
  const ticket = db.prepare('SELECT * FROM ticket WHERE reserva_id = ?').get(reserva.id);
  if (!ticket) throw new ErrorNegocio(404, 'La reserva aún no tiene ticket. Se emite al aprobar el pago.');

  let qrImagen = ticket.qr_imagen;
  if (!qrImagen) {
    qrImagen = await generarImagenQr(`HOTEL PACIFIC REEF | ${ticket.codigo_qr} | Reserva ${reserva.codigo} | `
      + `Hab ${reserva.habitacion.numero} | ${reserva.fecha_inicio} a ${reserva.fecha_fin}`);
    if (qrImagen) db.prepare('UPDATE ticket SET qr_imagen = ? WHERE id = ?').run(qrImagen, ticket.id);
  }

  res.json({ codigo: ticket.codigo_qr, fecha_emision: ticket.fecha_emision, qr_imagen: qrImagen,
    correo: reserva.cliente.correo, correo_enviado: Boolean(ticket.correo_enviado), reserva });
}));

export default rutas;
