import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { obtenerDb } from '../db/conexion.js';
import { permitirRoles, requiereSesion, ROLES, usuarioPublico } from '../autenticacion.js';
import { ErrorNegocio, manejar, registrarActividad, textoObligatorio, validarContrasena, validarCorreo } from '../utilidades.js';

const rutas = Router();

rutas.use(requiereSesion, permitirRoles('administrador_hotel', 'administrador_reservas'));

// Roles que gestiona cada administrador
function rolesGestionables(rolActual) {
  return rolActual === 'administrador_hotel' ? ROLES : ['personal_hotel'];
}

function obtenerUsuarioGestionable(db, req) {
  const usuario = db.prepare('SELECT * FROM usuario WHERE id = ?').get(req.params.id);
  if (!usuario) throw new ErrorNegocio(404, 'La cuenta no existe.');
  if (!rolesGestionables(req.usuario.rol).includes(usuario.rol)) {
    throw new ErrorNegocio(403, 'Tu perfil no puede administrar este tipo de cuenta.');
  }
  return usuario;
}

// HU-14 y HU-15: ver cuentas
rutas.get('/', (req, res) => {
  const permitidos = rolesGestionables(req.usuario.rol);
  const rol = permitidos.includes(req.query.rol) ? [req.query.rol] : permitidos;
  const filas = obtenerDb().prepare(`SELECT u.*, (SELECT COUNT(*) FROM reserva r WHERE r.cliente_id = u.id) AS total_reservas
    FROM usuario u WHERE u.rol IN (${rol.map(() => '?').join(',')}) ORDER BY u.rol, u.nombre`).all(...rol);
  res.json(filas.map(usuarioPublico));
});

// HU-14 y HU-15: crear cuentas
rutas.post('/', manejar(async (req, res) => {
  const db = obtenerDb();
  const nombre = textoObligatorio(req.body.nombre, 'nombre');
  const correo = validarCorreo(req.body.correo);
  const contrasena = validarContrasena(req.body.contrasena);
  const rol = req.body.rol;
  if (!rolesGestionables(req.usuario.rol).includes(rol)) throw new ErrorNegocio(403, 'Tu perfil no puede crear ese tipo de cuenta.');
  if (db.prepare('SELECT id FROM usuario WHERE correo = ?').get(correo)) {
    throw new ErrorNegocio(409, 'Ya existe una cuenta con ese correo.');
  }

  const { lastInsertRowid } = db.prepare(`INSERT INTO usuario (nombre, correo, contrasena_hash, rol, telefono)
    VALUES (?, ?, ?, ?, ?)`).run(nombre, correo, await bcrypt.hash(contrasena, 10), rol, req.body.telefono?.trim() || null);
  registrarActividad(db, req.usuario.id, 'crear_cuenta', `${rol} ${correo}`);
  res.status(201).json(usuarioPublico(db.prepare('SELECT * FROM usuario WHERE id = ?').get(lastInsertRowid)));
}));

// HU-15: modificar cuentas
rutas.put('/:id', manejar(async (req, res) => {
  const db = obtenerDb();
  const usuario = obtenerUsuarioGestionable(db, req);
  const nombre = req.body.nombre !== undefined ? textoObligatorio(req.body.nombre, 'nombre') : usuario.nombre;
  const correo = req.body.correo !== undefined ? validarCorreo(req.body.correo) : usuario.correo;
  const telefono = req.body.telefono !== undefined ? String(req.body.telefono).trim() : usuario.telefono;
  const rol = req.body.rol ?? usuario.rol;
  if (!rolesGestionables(req.usuario.rol).includes(rol)) throw new ErrorNegocio(403, 'Tu perfil no puede asignar ese rol.');

  const repetido = db.prepare('SELECT id FROM usuario WHERE correo = ? AND id != ?').get(correo, usuario.id);
  if (repetido) throw new ErrorNegocio(409, 'Ya existe otra cuenta con ese correo.');

  const hash = req.body.contrasena ? await bcrypt.hash(validarContrasena(req.body.contrasena), 10) : usuario.contrasena_hash;
  db.prepare('UPDATE usuario SET nombre = ?, correo = ?, telefono = ?, rol = ?, contrasena_hash = ? WHERE id = ?')
    .run(nombre, correo, telefono, rol, hash, usuario.id);
  registrarActividad(db, req.usuario.id, 'modificar_cuenta', correo);
  res.json(usuarioPublico(db.prepare('SELECT * FROM usuario WHERE id = ?').get(usuario.id)));
}));

// HU-15: eliminar cuentas sin reservas asociadas
rutas.delete('/:id', (req, res) => {
  const db = obtenerDb();
  const usuario = obtenerUsuarioGestionable(db, req);
  if (usuario.id === req.usuario.id) throw new ErrorNegocio(409, 'No puedes eliminar tu propia cuenta.');
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM reserva WHERE cliente_id = ?').get(usuario.id);
  if (total > 0) throw new ErrorNegocio(409, 'La cuenta tiene reservas asociadas y no se puede eliminar.');

  db.prepare('DELETE FROM usuario WHERE id = ?').run(usuario.id);
  registrarActividad(db, req.usuario.id, 'eliminar_cuenta', usuario.correo);
  res.status(204).end();
});

export default rutas;
