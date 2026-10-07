import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { obtenerDb } from '../db/conexion.js';
import { emitirToken, requiereSesion, usuarioPublico } from '../autenticacion.js';
import { ErrorNegocio, manejar, registrarActividad, textoObligatorio, validarContrasena, validarCorreo } from '../utilidades.js';

const rutas = Router();

// HU-01 / RF.1: registro de turista como cliente
rutas.post('/registro', manejar(async (req, res) => {
  const db = obtenerDb();
  const nombre = textoObligatorio(req.body.nombre, 'nombre');
  const correo = validarCorreo(req.body.correo);
  const contrasena = validarContrasena(req.body.contrasena);
  const idioma = req.body.idioma === 'en' ? 'en' : 'es';
  const telefono = typeof req.body.telefono === 'string' ? req.body.telefono.trim() : null;

  if (db.prepare('SELECT id FROM usuario WHERE correo = ?').get(correo)) {
    throw new ErrorNegocio(409, 'Ya existe una cuenta registrada con ese correo.');
  }

  const { lastInsertRowid } = db.prepare(`INSERT INTO usuario (nombre, correo, contrasena_hash, rol, idioma, telefono)
    VALUES (?, ?, ?, 'cliente', ?, ?)`).run(nombre, correo, await bcrypt.hash(contrasena, 10), idioma, telefono);

  const usuario = db.prepare('SELECT * FROM usuario WHERE id = ?').get(lastInsertRowid);
  registrarActividad(db, usuario.id, 'registro', `Nuevo cliente ${correo}`);
  res.status(201).json({ token: emitirToken(usuario), usuario: usuarioPublico(usuario) });
}));

// HU-02 / RF.2: inicio de sesion para todos los roles
rutas.post('/ingreso', manejar(async (req, res) => {
  const db = obtenerDb();
  const correo = validarCorreo(req.body.correo);
  const contrasena = textoObligatorio(req.body.contrasena, 'contraseña');

  const usuario = db.prepare('SELECT * FROM usuario WHERE correo = ?').get(correo);
  if (!usuario || !(await bcrypt.compare(contrasena, usuario.contrasena_hash))) {
    registrarActividad(db, usuario?.id, 'ingreso_fallido', correo);
    throw new ErrorNegocio(401, 'Correo o contraseña incorrectos.');
  }

  registrarActividad(db, usuario.id, 'ingreso', usuario.rol);
  res.json({ token: emitirToken(usuario), usuario: usuarioPublico(usuario) });
}));

rutas.get('/yo', requiereSesion, (req, res) => {
  const usuario = obtenerDb().prepare('SELECT * FROM usuario WHERE id = ?').get(req.usuario.id);
  if (!usuario) throw new ErrorNegocio(401, 'La sesión ya no es válida.');
  res.json(usuarioPublico(usuario));
});

// HU-11 / RF.11: idioma preferido del usuario
rutas.put('/yo/idioma', requiereSesion, (req, res) => {
  const idioma = req.body.idioma;
  if (!['es', 'en'].includes(idioma)) throw new ErrorNegocio(400, 'El idioma debe ser es o en.');
  obtenerDb().prepare('UPDATE usuario SET idioma = ? WHERE id = ?').run(idioma, req.usuario.id);
  res.json({ idioma });
});

export default rutas;
