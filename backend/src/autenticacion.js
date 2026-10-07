import jwt from 'jsonwebtoken';
import { ErrorNegocio } from './utilidades.js';

const SECRETO = process.env.JWT_SECRETO || 'secreto-solo-para-desarrollo';
const DURACION = '8h';

export const ROLES = ['cliente', 'administrador_reservas', 'administrador_hotel', 'personal_hotel'];
export const ROLES_TRABAJADOR = ['administrador_reservas', 'administrador_hotel', 'personal_hotel'];

export function emitirToken(usuario) {
  return jwt.sign({ id: usuario.id, rol: usuario.rol, nombre: usuario.nombre }, SECRETO, { expiresIn: DURACION });
}

export function usuarioPublico(usuario) {
  const { contrasena_hash: _omitido, ...resto } = usuario;
  return resto;
}

function leerToken(req) {
  const cabecera = req.headers.authorization || '';
  if (!cabecera.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(cabecera.slice(7), SECRETO);
  } catch {
    return null;
  }
}

// RNF.3: sesion obligatoria
export function requiereSesion(req, _res, next) {
  const datos = leerToken(req);
  if (!datos) return next(new ErrorNegocio(401, 'Debes iniciar sesión para continuar.'));
  req.usuario = datos;
  next();
}

export function permitirRoles(...roles) {
  return (req, _res, next) => {
    if (!req.usuario) return next(new ErrorNegocio(401, 'Debes iniciar sesión para continuar.'));
    if (!roles.includes(req.usuario.rol)) return next(new ErrorNegocio(403, 'Tu perfil no tiene permiso para esta acción.'));
    next();
  };
}
