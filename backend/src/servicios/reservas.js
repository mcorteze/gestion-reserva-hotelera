import { ErrorNegocio } from '../utilidades.js';

export const PORCENTAJE_ABONO = 0.3;
const UN_DIA = 24 * 60 * 60 * 1000;

function aFecha(texto, campo) {
  if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    throw new ErrorNegocio(400, `La fecha de ${campo} debe tener formato AAAA-MM-DD.`);
  }
  const fecha = new Date(`${texto}T00:00:00Z`);
  if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== texto) {
    throw new ErrorNegocio(400, `La fecha de ${campo} no es válida.`);
  }
  return fecha;
}

export function hoyIso() {
  return new Date().toISOString().slice(0, 10);
}

export function sumarDias(texto, dias) {
  const fecha = new Date(`${texto}T00:00:00Z`);
  return new Date(fecha.getTime() + dias * UN_DIA).toISOString().slice(0, 10);
}

export function contarNoches(inicio, fin) {
  return Math.round((aFecha(fin, 'salida') - aFecha(inicio, 'llegada')) / UN_DIA);
}

// RF.5: validacion del rango
export function validarRango(inicio, fin, { permitirPasado = false } = {}) {
  aFecha(inicio, 'llegada');
  aFecha(fin, 'salida');
  const noches = contarNoches(inicio, fin);
  if (noches < 1) throw new ErrorNegocio(400, 'La fecha de salida debe ser posterior a la de llegada.');
  if (noches > 30) throw new ErrorNegocio(400, 'La estadía máxima por reserva es de 30 noches.');
  if (!permitirPasado && inicio < hoyIso()) throw new ErrorNegocio(400, 'La fecha de llegada no puede ser anterior a hoy.');
  return noches;
}

// RF.8: valor total y abono
export function cotizar(precioDiario, noches) {
  const valorTotal = Math.round(precioDiario * noches);
  return { noches, valor_total: valorTotal, monto_abono: Math.round(valorTotal * PORCENTAJE_ABONO) };
}

export function reservasQueChocan(db, habitacionId, inicio, fin, excluirId = 0) {
  return db.prepare(`SELECT id, fecha_inicio, fecha_fin FROM reserva
    WHERE habitacion_id = ? AND estado != 'cancelada' AND id != ?
      AND fecha_inicio < ? AND ? < fecha_fin
    ORDER BY fecha_inicio`).all(habitacionId, excluirId, fin, inicio);
}

export function obtenerHabitacion(db, id) {
  const habitacion = db.prepare('SELECT * FROM habitacion WHERE id = ?').get(id);
  if (!habitacion) throw new ErrorNegocio(404, 'La habitación no existe.');
  return habitacion;
}

// RF.6: disponibilidad y sugerencias
export function verificarDisponibilidad(db, habitacionId, inicio, fin, excluirId = 0) {
  const habitacion = obtenerHabitacion(db, habitacionId);
  const noches = validarRango(inicio, fin, { permitirPasado: excluirId > 0 });
  const choques = reservasQueChocan(db, habitacion.id, inicio, fin, excluirId);
  const cotizacion = cotizar(habitacion.precio_diario, noches);

  if (choques.length === 0) {
    return { disponible: true, habitacion_id: habitacion.id, fecha_inicio: inicio, fecha_fin: fin, ...cotizacion };
  }

  const primerChoque = choques[0].fecha_inicio;
  const nochesPosibles = primerChoque > inicio ? contarNoches(inicio, primerChoque) : 0;

  const alternativas = db.prepare(`SELECT * FROM habitacion WHERE id != ? ORDER BY categoria_precio = ? DESC, precio_diario`)
    .all(habitacion.id, habitacion.categoria_precio)
    .filter((otra) => otra.capacidad >= habitacion.capacidad || otra.categoria_precio === habitacion.categoria_precio)
    .filter((otra) => reservasQueChocan(db, otra.id, inicio, fin).length === 0)
    .slice(0, 3)
    .map((otra) => ({ id: otra.id, numero: otra.numero, categoria: otra.categoria, precio_diario: otra.precio_diario,
      ...cotizar(otra.precio_diario, noches) }));

  return {
    disponible: false,
    habitacion_id: habitacion.id,
    fecha_inicio: inicio,
    fecha_fin: fin,
    ...cotizacion,
    sugerencias: {
      reducir_noches: nochesPosibles > 0 ? { noches: nochesPosibles, fecha_fin: primerChoque } : null,
      otras_habitaciones: alternativas
    }
  };
}

const consultaDetalle = `SELECT r.*, u.nombre AS cliente_nombre, u.correo AS cliente_correo, u.telefono AS cliente_telefono,
  h.numero AS habitacion_numero, h.categoria AS habitacion_categoria, h.categoria_precio, h.caracteristicas,
  h.equipamiento, h.capacidad, h.ubicacion, h.precio_diario,
  t.codigo_qr AS ticket_codigo, t.correo_enviado AS ticket_correo_enviado
  FROM reserva r
  JOIN usuario u ON u.id = r.cliente_id
  JOIN habitacion h ON h.id = r.habitacion_id
  LEFT JOIN ticket t ON t.reserva_id = r.id`;

export function formatearReserva(fila) {
  if (!fila) return null;
  const noches = contarNoches(fila.fecha_inicio, fila.fecha_fin);
  return {
    id: fila.id,
    codigo: `PR-${String(fila.id).padStart(4, '0')}`,
    estado: fila.estado,
    fecha_inicio: fila.fecha_inicio,
    fecha_fin: fila.fecha_fin,
    noches,
    valor_total: fila.valor_total,
    monto_abono: Math.round(fila.valor_total * PORCENTAJE_ABONO),
    monto_pagado: fila.monto_pagado,
    saldo: fila.valor_total - fila.monto_pagado,
    fecha_creacion: fila.fecha_creacion,
    cliente: { id: fila.cliente_id, nombre: fila.cliente_nombre, correo: fila.cliente_correo, telefono: fila.cliente_telefono },
    habitacion: { id: fila.habitacion_id, numero: fila.habitacion_numero, categoria: fila.habitacion_categoria,
      categoria_precio: fila.categoria_precio, ubicacion: fila.ubicacion, capacidad: fila.capacidad, precio_diario: fila.precio_diario },
    // RF.18: servicio contratado
    servicio_contratado: `Alojamiento ${noches} ${noches === 1 ? 'noche' : 'noches'} en habitación ${fila.habitacion_numero} `
      + `(${fila.habitacion_categoria}, hasta ${fila.capacidad} huéspedes). Incluye: ${fila.caracteristicas}; ${fila.equipamiento}.`,
    ticket: fila.ticket_codigo ? { codigo: fila.ticket_codigo, correo_enviado: Boolean(fila.ticket_correo_enviado) } : null
  };
}

export function obtenerReserva(db, id) {
  const fila = db.prepare(`${consultaDetalle} WHERE r.id = ?`).get(id);
  if (!fila) throw new ErrorNegocio(404, 'La reserva no existe.');
  return formatearReserva(fila);
}

export function listarReservas(db, { clienteId, desde, hasta, estado } = {}) {
  const condiciones = [];
  const valores = [];
  if (clienteId) { condiciones.push('r.cliente_id = ?'); valores.push(clienteId); }
  if (desde) { condiciones.push('r.fecha_fin > ?'); valores.push(desde); }
  if (hasta) { condiciones.push('r.fecha_inicio <= ?'); valores.push(hasta); }
  if (estado) { condiciones.push('r.estado = ?'); valores.push(estado); }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  return db.prepare(`${consultaDetalle} ${where} ORDER BY r.fecha_inicio, r.id`).all(...valores).map(formatearReserva);
}
