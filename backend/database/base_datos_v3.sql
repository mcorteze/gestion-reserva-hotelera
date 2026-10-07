-- Tercera version de la Base de Datos (motor SQLite)
-- Sistema de Gestion de Reserva Hotelera - Hotel Pacific Reef
-- Integra base_datos_v1 (semana 4) y base_datos_v2 (semana 6) con las mejoras de construccion:
-- habitacion: descripcion, ubicacion, capacidad e imagenes (RF.4)
-- usuario: telefono y fecha de creacion
-- pago: ultimos digitos de la tarjeta
-- ticket: imagen del codigo QR y estado del envio por correo (RF.10, RNF.9)
-- registro_actividad: trazabilidad de acciones (RNF.3)

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS usuario (
    id INTEGER PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    contrasena_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(30) NOT NULL CHECK (rol IN ('cliente', 'administrador_reservas', 'administrador_hotel', 'personal_hotel')),
    idioma VARCHAR(10) DEFAULT 'es' CHECK (idioma IN ('es', 'en')),
    telefono VARCHAR(20),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS habitacion (
    id INTEGER PRIMARY KEY,
    numero VARCHAR(10) NOT NULL UNIQUE,
    categoria VARCHAR(30) NOT NULL,
    descripcion TEXT,
    ubicacion VARCHAR(100),
    capacidad INTEGER NOT NULL DEFAULT 2,
    caracteristicas TEXT,
    equipamiento TEXT,
    precio_diario DECIMAL(10,2) NOT NULL CHECK (precio_diario > 0),
    categoria_precio VARCHAR(20) NOT NULL DEFAULT 'turista' CHECK (categoria_precio IN ('turista', 'premium')),
    imagenes TEXT
);

CREATE TABLE IF NOT EXISTS reserva (
    id INTEGER PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES usuario(id),
    habitacion_id INTEGER NOT NULL REFERENCES habitacion(id),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    valor_total DECIMAL(10,2) NOT NULL,
    monto_pagado DECIMAL(10,2) DEFAULT 0,
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmada', 'cancelada')),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (fecha_fin > fecha_inicio)
);

CREATE TABLE IF NOT EXISTS pago (
    id INTEGER PRIMARY KEY,
    reserva_id INTEGER NOT NULL REFERENCES reserva(id),
    monto DECIMAL(10,2) NOT NULL,
    fecha TIMESTAMP NOT NULL,
    metodo VARCHAR(30) NOT NULL,
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
    ultimos_digitos VARCHAR(4)
);

CREATE TABLE IF NOT EXISTS ticket (
    id INTEGER PRIMARY KEY,
    reserva_id INTEGER NOT NULL UNIQUE REFERENCES reserva(id),
    codigo_qr VARCHAR(100) NOT NULL,
    fecha_emision TIMESTAMP NOT NULL,
    qr_imagen TEXT,
    correo_enviado INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS registro_actividad (
    id INTEGER PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuario(id) ON DELETE SET NULL,
    accion VARCHAR(50) NOT NULL,
    detalle TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reserva_habitacion_fechas ON reserva (habitacion_id, fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_reserva_cliente ON reserva (cliente_id);
CREATE INDEX IF NOT EXISTS idx_pago_reserva ON pago (reserva_id);
