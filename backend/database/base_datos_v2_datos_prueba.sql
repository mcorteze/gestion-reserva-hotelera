-- Mejoras a la base de datos y carga de datos de prueba
-- Sistema de Gestion de Reserva Hotelera - Hotel Pacific Reef
-- Se basa en base_datos_v1.sql de la semana 4, agregando la columna de categoria
-- necesaria para la vista de actualizacion de precios del administrador (RF.16)

ALTER TABLE habitacion ADD COLUMN categoria_precio VARCHAR(20) DEFAULT 'turista';
-- valores esperados: 'turista' o 'premium', segun RF.16

-- DATOS DE PRUEBA

INSERT INTO usuario (id, nombre, correo, contrasena_hash, rol, idioma) VALUES
(1, 'Ana Torres', 'ana.torres@correo.com', 'hash_demo_1', 'cliente', 'es'),
(2, 'Marco Diaz', 'marco.diaz@correo.com', 'hash_demo_2', 'cliente', 'es'),
(3, 'Paula Rios', 'paula.rios@pacificreef.cl', 'hash_demo_3', 'administrador_reservas', 'es'),
(4, 'Jorge Fuentes', 'jorge.fuentes@pacificreef.cl', 'hash_demo_4', 'administrador_hotel', 'es');

INSERT INTO habitacion (id, numero, categoria, caracteristicas, equipamiento, precio_diario, categoria_precio) VALUES
(1, '101', 'Vista mar', 'Cama king, balcon', 'Aire acondicionado, TV, minibar', 45000, 'turista'),
(2, '102', 'Vista mar', 'Cama king, balcon', 'Aire acondicionado, TV, minibar', 45000, 'turista'),
(3, '201', 'Suite premium', 'Living independiente, jacuzzi', 'Aire acondicionado, TV, minibar, caja fuerte', 90000, 'premium');

INSERT INTO reserva (id, cliente_id, habitacion_id, fecha_inicio, fecha_fin, valor_total, monto_pagado, estado) VALUES
(1, 1, 1, '2026-10-01', '2026-10-04', 135000, 40500, 'confirmada'),
(2, 2, 3, '2026-10-05', '2026-10-07', 180000, 54000, 'pendiente');

INSERT INTO pago (id, reserva_id, monto, fecha, metodo, estado) VALUES
(1, 1, 40500, '2026-09-20 10:15:00', 'tarjeta_credito', 'aprobado'),
(2, 2, 54000, '2026-09-21 09:00:00', 'tarjeta_debito', 'pendiente');

INSERT INTO ticket (id, reserva_id, codigo_qr, fecha_emision) VALUES
(1, 1, 'QR-RES-0001', '2026-09-20 10:16:00');

-- CASOS DE PRUEBA DEL CRUD (especificacion, sin ejecutar)

-- Prueba 1: Crear (Create)
-- Accion: registrar una nueva reserva para el cliente Ana Torres en la habitacion 102, del 2026-10-10 al 2026-10-12.
-- Resultado esperado: se inserta una fila en reserva con estado 'pendiente' y valor_total calculado (2 dias x 45000 = 90000).

-- Prueba 2: Leer (Read)
-- Accion: consultar las reservas del cliente_id 1.
-- Resultado esperado: retorna la reserva id 1 (habitacion 101) y la reserva creada en la Prueba 1.

-- Prueba 3: Actualizar (Update)
-- Accion: el administrador de reservas confirma el pago de la reserva id 2 (marco Diaz), actualizando pago.estado a 'aprobado' y reserva.estado a 'confirmada'.
-- Resultado esperado: la fila de pago id 2 queda con estado 'aprobado'; la fila de reserva id 2 queda con estado 'confirmada'.

-- Prueba 4: Eliminar (Delete)
-- Accion: cancelar la reserva creada en la Prueba 1 antes de que se pague (regla de negocio: solo se puede eliminar si no tiene pago aprobado asociado).
-- Resultado esperado: se elimina la fila de reserva correspondiente; no queda ningun pago huerfano porque nunca se creo un pago para esa reserva.

-- Prueba 5: Regla de negocio (calculo del 30 por ciento)
-- Accion: verificar que monto_pagado de la reserva id 1 corresponde al 30 por ciento de valor_total.
-- Resultado esperado: 135000 * 0.30 = 40500, coincide con el monto_pagado registrado.
