const CLAVE_TOKEN = 'pacificreef_token';
let tokenEnMemoria = null;

export function leerToken() {
  try {
    return localStorage.getItem(CLAVE_TOKEN);
  } catch {
    return tokenEnMemoria;
  }
}

export function guardarToken(token) {
  tokenEnMemoria = token || null;
  try {
    if (token) localStorage.setItem(CLAVE_TOKEN, token);
    else localStorage.removeItem(CLAVE_TOKEN);
  } catch {
    // navegador sin almacenamiento disponible
  }
}

export class ErrorApi extends Error {
  constructor(estado, mensaje, datos) {
    super(mensaje);
    this.estado = estado;
    this.datos = datos;
  }
}

export async function api(ruta, { metodo = 'GET', cuerpo } = {}) {
  const cabeceras = { Accept: 'application/json' };
  const token = leerToken();
  if (token) cabeceras.Authorization = `Bearer ${token}`;
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';

  let respuesta;
  try {
    respuesta = await fetch(`/api${ruta}`, {
      method: metodo,
      headers: cabeceras,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined
    });
  } catch {
    throw new ErrorApi(0, 'No fue posible conectar con el servidor.');
  }

  if (respuesta.status === 204) return null;
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new ErrorApi(respuesta.status, datos.mensaje || 'Ocurrió un error inesperado.', datos);
  return datos;
}
