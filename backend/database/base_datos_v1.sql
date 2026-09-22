-- Primera version de la Base de Datos
-- Sistema de Gestion de Reserva Hotelera - Hotel Pacific Reef
-- Soporta el CRUD basico del negocio: usuarios, habitaciones, reservas, pagos y tickets

CREATE TABLE usuario (
    id INTEGER PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    contrasena_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(30) NOT NULL,
    idioma VARCHAR(10) DEFAULT 'es'
);

CREATE TABLE habitacion (
    id INTEGER PRIMARY KEY,
    numero VARCHAR(10) NOT NULL,
    categoria VARCHAR(30) NOT NULL,
    caracteristicas TEXT,
    equipamiento TEXT,
    precio_diario DECIMAL(10,2) NOT NULL
);

CREATE TABLE reserva (
    id INTEGER PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES usuario(id),
    habitacion_id INTEGER NOT NULL REFERENCES habitacion(id),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    valor_total DECIMAL(10,2) NOT NULL,
    monto_pagado DECIMAL(10,2) DEFAULT 0,
    estado VARCHAR(20) DEFAULT 'pendiente'
);

CREATE TABLE pago (
    id INTEGER PRIMARY KEY,
    reserva_id INTEGER NOT NULL REFERENCES reserva(id),
    monto DECIMAL(10,2) NOT NULL,
    fecha TIMESTAMP NOT NULL,
    metodo VARCHAR(30) NOT NULL,
    estado VARCHAR(20) NOT NULL
);

CREATE TABLE ticket (
    id INTEGER PRIMARY KEY,
    reserva_id INTEGER NOT NULL REFERENCES reserva(id),
    codigo_qr VARCHAR(100) NOT NULL,
    fecha_emision TIMESTAMP NOT NULL
);

-- rol en usuario: 'cliente', 'administrador_reservas', 'administrador_hotel', 'personal_hotel'
-- estado en reserva: 'pendiente', 'confirmada', 'cancelada'
-- estado en pago: 'pendiente', 'aprobado', 'rechazado'
