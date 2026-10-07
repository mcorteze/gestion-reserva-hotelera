import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { obtenerDb } from './db/conexion.js';
import rutasAutenticacion from './rutas/autenticacion.js';
import rutasHabitaciones from './rutas/habitaciones.js';
import rutasReservas from './rutas/reservas.js';
import rutasUsuarios from './rutas/usuarios.js';
import rutasReportes from './rutas/reportes.js';
import { obtenerDolar } from './servicios/externos.js';
import { manejar } from './utilidades.js';

const carpeta = path.dirname(fileURLToPath(import.meta.url));
const carpetaFrontend = path.join(carpeta, '..', '..', 'frontend', 'dist');

// Documentacion de la API
const documentacion = {
  nombre: 'API Gestión de Reserva Hotelera - Hotel Pacific Reef',
  version: '1.0.0',
  autenticacion: 'Bearer token obtenido en POST /api/auth/ingreso',
  recursos: [
    { metodo: 'GET', ruta: '/api/estado', acceso: 'público', descripcion: 'Estado del servicio y de la base de datos' },
    { metodo: 'POST', ruta: '/api/auth/registro', acceso: 'público', descripcion: 'Registro de cliente' },
    { metodo: 'POST', ruta: '/api/auth/ingreso', acceso: 'público', descripcion: 'Inicio de sesión' },
    { metodo: 'GET', ruta: '/api/auth/yo', acceso: 'sesión', descripcion: 'Datos del usuario conectado' },
    { metodo: 'PUT', ruta: '/api/auth/yo/idioma', acceso: 'sesión', descripcion: 'Idioma preferido (es o en)' },
    { metodo: 'GET', ruta: '/api/habitaciones', acceso: 'público', descripcion: 'Catálogo de habitaciones' },
    { metodo: 'GET', ruta: '/api/habitaciones/disponibles?desde&hasta', acceso: 'público', descripcion: 'Habitaciones libres en un rango' },
    { metodo: 'GET', ruta: '/api/habitaciones/:id', acceso: 'público', descripcion: 'Detalle de una habitación' },
    { metodo: 'GET', ruta: '/api/habitaciones/:id/ocupacion?mes', acceso: 'público', descripcion: 'Días ocupados del mes' },
    { metodo: 'GET', ruta: '/api/habitaciones/:id/disponibilidad?desde&hasta', acceso: 'público', descripcion: 'Verificación con valor, abono del 30% y sugerencias' },
    { metodo: 'PUT', ruta: '/api/habitaciones/:id', acceso: 'administradores', descripcion: 'Actualizar características y equipamiento' },
    { metodo: 'PUT', ruta: '/api/habitaciones/precios', acceso: 'administrador del hotel', descripcion: 'Actualizar precios diarios' },
    { metodo: 'POST', ruta: '/api/reservas', acceso: 'cliente', descripcion: 'Registrar una reserva' },
    { metodo: 'GET', ruta: '/api/reservas/mias', acceso: 'cliente', descripcion: 'Reservas del cliente' },
    { metodo: 'POST', ruta: '/api/reservas/:id/pagos', acceso: 'cliente', descripcion: 'Pagar el 30% (pasarela simulada)' },
    { metodo: 'GET', ruta: '/api/reservas/:id/ticket', acceso: 'cliente o personal', descripcion: 'Ticket con código QR' },
    { metodo: 'GET', ruta: '/api/reservas?desde&hasta&estado', acceso: 'administradores y personal', descripcion: 'Reservas y servicio contratado' },
    { metodo: 'PUT', ruta: '/api/reservas/:id', acceso: 'administradores', descripcion: 'Modificar fechas o habitación' },
    { metodo: 'POST', ruta: '/api/reservas/:id/cancelar', acceso: 'administradores o cliente dueño', descripcion: 'Cancelar reserva' },
    { metodo: 'POST', ruta: '/api/reservas/:id/confirmar-pago', acceso: 'administradores', descripcion: 'Validar un pago pendiente' },
    { metodo: 'GET', ruta: '/api/usuarios?rol', acceso: 'administradores', descripcion: 'Cuentas de clientes y trabajadores' },
    { metodo: 'POST', ruta: '/api/usuarios', acceso: 'administradores', descripcion: 'Crear cuenta' },
    { metodo: 'PUT', ruta: '/api/usuarios/:id', acceso: 'administradores', descripcion: 'Modificar cuenta' },
    { metodo: 'DELETE', ruta: '/api/usuarios/:id', acceso: 'administradores', descripcion: 'Eliminar cuenta sin reservas' },
    { metodo: 'GET', ruta: '/api/reportes/reservas?desde&hasta', acceso: 'administrador del hotel', descripcion: 'Reporte por periodo' },
    { metodo: 'GET', ruta: '/api/reportes/resumen?mes', acceso: 'administrador del hotel', descripcion: 'Indicadores, alertas y actividad' },
    { metodo: 'GET', ruta: '/api/indicadores/dolar', acceso: 'público', descripcion: 'Dólar observado (servicio externo mindicador.cl)' }
  ]
};

export function crearApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  app.get('/api', (_req, res) => res.json(documentacion));
  app.get('/api/estado', (_req, res) => {
    const { total } = obtenerDb().prepare('SELECT COUNT(*) AS total FROM habitacion').get();
    res.json({ estado: 'ok', base_datos: 'conectada', habitaciones: total });
  });

  app.use('/api/auth', rutasAutenticacion);
  app.use('/api/habitaciones', rutasHabitaciones);
  app.use('/api/reservas', rutasReservas);
  app.use('/api/usuarios', rutasUsuarios);
  app.use('/api/reportes', rutasReportes);

  app.get('/api/indicadores/dolar', manejar(async (_req, res) => {
    try {
      res.json(await obtenerDolar());
    } catch {
      res.status(503).json({ mensaje: 'El servicio de indicadores no está disponible en este momento.' });
    }
  }));

  app.use('/api', (_req, res) => res.status(404).json({ mensaje: 'Recurso no encontrado.' }));

  // Frontend compilado
  if (fs.existsSync(carpetaFrontend)) {
    app.use(express.static(carpetaFrontend));
    app.get('*', (_req, res) => res.sendFile(path.join(carpetaFrontend, 'index.html')));
  }

  app.use((error, _req, res, _next) => {
    const estado = error.estado || (error.type === 'entity.parse.failed' ? 400 : 500);
    if (estado === 500) console.error(error);
    res.status(estado).json({ mensaje: estado === 500 ? 'Ocurrió un error inesperado en el servidor.' : error.message });
  });

  return app;
}
