import { Router } from 'express';
import { obtenerDb } from '../db/conexion.js';
import { permitirRoles, requiereSesion } from '../autenticacion.js';
import { obtenerHabitacion, reservasQueChocan, validarRango, verificarDisponibilidad } from '../servicios/reservas.js';
import { ErrorNegocio, registrarActividad, textoObligatorio } from '../utilidades.js';

const rutas = Router();

function formatearHabitacion(fila) {
  return { ...fila, imagenes: (fila.imagenes || '').split(',').filter(Boolean).map((nombre) => `/img/habitaciones/${nombre}`) };
}

// HU-04 / RF.4: catalogo de habitaciones
rutas.get('/', (_req, res) => {
  const filas = obtenerDb().prepare('SELECT * FROM habitacion ORDER BY numero').all();
  res.json(filas.map(formatearHabitacion));
});

// HU-03 / RF.3: habitaciones disponibles en un rango de fechas
rutas.get('/disponibles', (req, res) => {
  const { desde, hasta } = req.query;
  const noches = validarRango(desde, hasta);
  const db = obtenerDb();
  const disponibles = db.prepare('SELECT * FROM habitacion ORDER BY numero').all()
    .filter((habitacion) => reservasQueChocan(db, habitacion.id, desde, hasta).length === 0)
    .map(formatearHabitacion);
  res.json({ desde, hasta, noches, habitaciones: disponibles });
});

// HU-16 / RF.16: actualizacion de precios
rutas.put('/precios', requiereSesion, permitirRoles('administrador_hotel'), (req, res) => {
  const cambios = req.body.cambios;
  if (!Array.isArray(cambios) || cambios.length === 0) throw new ErrorNegocio(400, 'Debes enviar al menos un precio.');

  const db = obtenerDb();
  const actualizar = db.prepare('UPDATE habitacion SET precio_diario = ? WHERE id = ?');
  db.transaction(() => {
    for (const { id, precio_diario: precio } of cambios) {
      if (!Number.isInteger(precio) || precio <= 0) throw new ErrorNegocio(400, 'Cada precio debe ser un número entero positivo.');
      obtenerHabitacion(db, id);
      actualizar.run(precio, id);
    }
  })();

  registrarActividad(db, req.usuario.id, 'actualizar_precios', cambios.map((c) => `${c.id}:${c.precio_diario}`).join(', '));
  res.json(db.prepare('SELECT * FROM habitacion ORDER BY categoria_precio DESC, numero').all().map(formatearHabitacion));
});

rutas.get('/:id', (req, res) => {
  res.json(formatearHabitacion(obtenerHabitacion(obtenerDb(), req.params.id)));
});

// RF.3: ocupacion del mes
rutas.get('/:id/ocupacion', (req, res) => {
  const db = obtenerDb();
  const habitacion = obtenerHabitacion(db, req.params.id);
  const mes = /^\d{4}-\d{2}$/.test(req.query.mes || '') ? req.query.mes : new Date().toISOString().slice(0, 7);
  const [anio, numeroMes] = mes.split('-').map(Number);
  const inicio = `${mes}-01`;
  const fin = new Date(Date.UTC(anio, numeroMes, 1)).toISOString().slice(0, 10);
  const ocupados = db.prepare(`SELECT fecha_inicio, fecha_fin FROM reserva
    WHERE habitacion_id = ? AND estado != 'cancelada' AND fecha_inicio < ? AND ? < fecha_fin ORDER BY fecha_inicio`)
    .all(habitacion.id, fin, inicio);
  res.json({ habitacion_id: habitacion.id, mes, ocupados });
});

// HU-06 / RF.6: verificacion de disponibilidad con sugerencias
rutas.get('/:id/disponibilidad', (req, res) => {
  res.json(verificarDisponibilidad(obtenerDb(), Number(req.params.id), req.query.desde, req.query.hasta));
});

// HU-13 / RF.13: actualizar catalogo
rutas.put('/:id', requiereSesion, permitirRoles('administrador_reservas', 'administrador_hotel'), (req, res) => {
  const db = obtenerDb();
  const habitacion = obtenerHabitacion(db, req.params.id);
  const caracteristicas = textoObligatorio(req.body.caracteristicas, 'características');
  const equipamiento = textoObligatorio(req.body.equipamiento, 'equipamiento');
  const descripcion = typeof req.body.descripcion === 'string' ? req.body.descripcion.trim() : habitacion.descripcion;

  db.prepare('UPDATE habitacion SET caracteristicas = ?, equipamiento = ?, descripcion = ? WHERE id = ?')
    .run(caracteristicas, equipamiento, descripcion, habitacion.id);
  registrarActividad(db, req.usuario.id, 'actualizar_catalogo', `Habitación ${habitacion.numero}`);
  res.json(formatearHabitacion(obtenerHabitacion(db, habitacion.id)));
});

export default rutas;
