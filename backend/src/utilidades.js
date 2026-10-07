export class ErrorNegocio extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.estado = estado;
  }
}

// Errores en rutas async
export const manejar = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function registrarActividad(db, usuarioId, accion, detalle = '') {
  db.prepare('INSERT INTO registro_actividad (usuario_id, accion, detalle) VALUES (?, ?, ?)')
    .run(usuarioId ?? null, accion, detalle);
}

export function textoObligatorio(valor, campo) {
  if (typeof valor !== 'string' || valor.trim() === '') {
    throw new ErrorNegocio(400, `El campo ${campo} es obligatorio.`);
  }
  return valor.trim();
}

export function validarCorreo(correo) {
  const limpio = textoObligatorio(correo, 'correo').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) throw new ErrorNegocio(400, 'El correo no tiene un formato válido.');
  return limpio;
}

// Validacion de contrasena (RNF.3)
export function validarContrasena(contrasena) {
  if (typeof contrasena !== 'string' || contrasena.length < 8 || !/[A-Za-z]/.test(contrasena) || !/\d/.test(contrasena)) {
    throw new ErrorNegocio(400, 'La contraseña debe tener al menos 8 caracteres, con letras y números.');
  }
  return contrasena;
}
