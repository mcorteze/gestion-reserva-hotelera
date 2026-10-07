import bcrypt from 'bcryptjs';

// Datos de prueba v3
export const credencialesPrueba = {
  cliente: { correo: 'ana.torres@correo.com', contrasena: 'Cliente2026' },
  administrador_reservas: { correo: 'paula.rios@pacificreef.cl', contrasena: 'Reservas2026' },
  administrador_hotel: { correo: 'jorge.fuentes@pacificreef.cl', contrasena: 'Hotel2026' },
  personal_hotel: { correo: 'luis.soto@pacificreef.cl', contrasena: 'Personal2026' }
};

const usuarios = [
  [1, 'Ana Torres', 'ana.torres@correo.com', 'Cliente2026', 'cliente', '+56 9 8123 4567'],
  [2, 'Marco Díaz', 'marco.diaz@correo.com', 'Cliente2026', 'cliente', '+56 9 7234 5678'],
  [3, 'Paula Ríos', 'paula.rios@pacificreef.cl', 'Reservas2026', 'administrador_reservas', '+56 2 2345 6701'],
  [4, 'Jorge Fuentes', 'jorge.fuentes@pacificreef.cl', 'Hotel2026', 'administrador_hotel', '+56 2 2345 6702'],
  [5, 'Luis Soto', 'luis.soto@pacificreef.cl', 'Personal2026', 'personal_hotel', '+56 2 2345 6703'],
  [6, 'Camila González','camila.gonzalez@correo.cl', 'Cliente2026', 'cliente', '+56 9 6345 6789']
];

const habitaciones = [
  [1, '101', 'Vista mar', 'Habitación luminosa con balcón frente al océano.', 'Piso 1, vista al mar', 2,
    'Cama king, balcón', 'Aire acondicionado, TV, minibar', 45000, 'turista', 'h1.jpg,h5.jpg,h6.jpg'],
  [2, '102', 'Vista mar', 'Habitación con balcón y luz natural durante toda la tarde.', 'Piso 1, vista al mar', 2,
    'Cama king, balcón', 'Aire acondicionado, TV, minibar', 45000, 'turista', 'h4.jpg,h7.jpg,h5.jpg'],
  [3, '201', 'Suite premium', 'Suite amplia con living independiente y jacuzzi.', 'Piso 2, vista al mar', 3,
    'Living independiente, jacuzzi', 'Aire acondicionado, TV, minibar, caja fuerte', 90000, 'premium', 'h3.jpg,h5.jpg,h7.jpg'],
  [4, '103', 'Doble estándar', 'Habitación práctica y tranquila, ideal para estadías cortas.', 'Piso 1, vista al jardín', 2,
    'Dos camas individuales, escritorio', 'TV, wifi, ducha', 38000, 'turista', 'h2.jpg,h6.jpg,h5.jpg'],
  [5, '202', 'Suite familiar', 'Suite pensada para familias, con sala de estar.', 'Piso 2, vista al mar', 4,
    'Cama king y dos individuales, sala de estar', 'Aire acondicionado, TV, minibar, frigobar', 110000, 'premium', 'h7.jpg,h1.jpg,h5.jpg'],
  [6, '301', 'Suite vista mar', 'Suite en el último piso con terraza privada y bañera.', 'Piso 3, terraza', 2,
    'Cama king, terraza privada, bañera', 'Aire acondicionado, TV, minibar, caja fuerte, cafetera', 130000, 'premium', 'h6.jpg,h3.jpg,h5.jpg']
];

const reservas = [
  [1, 1, 1, '2026-10-01', '2026-10-04', 135000, 40500, 'confirmada'],
  [2, 2, 3, '2026-10-05', '2026-10-07', 180000, 0, 'pendiente'],
  [3, 6, 6, '2026-10-12', '2026-10-15', 390000, 117000, 'confirmada'],
  [4, 1, 5, '2026-10-20', '2026-10-23', 330000, 99000, 'confirmada'],
  [5, 2, 4, '2026-09-25', '2026-09-27', 76000, 22800, 'confirmada'],
  [6, 6, 2, '2026-11-06', '2026-11-08', 90000, 0, 'cancelada']
];

const pagos = [
  [1, 1, 40500, '2026-09-20 10:15:00', 'tarjeta_credito', 'aprobado', '4242'],
  [2, 2, 54000, '2026-09-21 09:00:00', 'tarjeta_debito', 'pendiente', '1881'],
  [3, 3, 117000, '2026-09-28 18:40:00', 'tarjeta_credito', 'aprobado', '4242'],
  [4, 4, 99000, '2026-09-30 12:05:00', 'tarjeta_debito', 'aprobado', '5100'],
  [5, 5, 22800, '2026-09-15 08:30:00', 'tarjeta_credito', 'aprobado', '4242']
];

const tickets = [
  [1, 1, 'QR-RES-0001', '2026-09-20 10:16:00'],
  [2, 3, 'QR-RES-0003', '2026-09-28 18:41:00'],
  [3, 4, 'QR-RES-0004', '2026-09-30 12:06:00'],
  [4, 5, 'QR-RES-0005', '2026-09-15 08:31:00']
];

export function cargarDatosPrueba(db) {
  const cargar = db.transaction(() => {
    const insUsuario = db.prepare(`INSERT INTO usuario (id, nombre, correo, contrasena_hash, rol, idioma, telefono)
      VALUES (?, ?, ?, ?, ?, 'es', ?)`);
    for (const [id, nombre, correo, clave, rol, telefono] of usuarios) {
      insUsuario.run(id, nombre, correo, bcrypt.hashSync(clave, 8), rol, telefono);
    }

    const insHabitacion = db.prepare(`INSERT INTO habitacion (id, numero, categoria, descripcion, ubicacion, capacidad,
      caracteristicas, equipamiento, precio_diario, categoria_precio, imagenes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const fila of habitaciones) insHabitacion.run(...fila);

    const insReserva = db.prepare(`INSERT INTO reserva (id, cliente_id, habitacion_id, fecha_inicio, fecha_fin,
      valor_total, monto_pagado, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const fila of reservas) insReserva.run(...fila);

    const insPago = db.prepare(`INSERT INTO pago (id, reserva_id, monto, fecha, metodo, estado, ultimos_digitos)
      VALUES (?, ?, ?, ?, ?, ?, ?)`);
    for (const fila of pagos) insPago.run(...fila);

    const insTicket = db.prepare(`INSERT INTO ticket (id, reserva_id, codigo_qr, fecha_emision, correo_enviado)
      VALUES (?, ?, ?, ?, 0)`);
    for (const fila of tickets) insTicket.run(...fila);
  });
  cargar();
}
