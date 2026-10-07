// Base de datos en memoria
process.env.DB_RUTA = ':memory:';

const { crearApp } = await import('../src/app.js');
const { credencialesPrueba } = await import('../src/db/semilla.js');
const { hoyIso, sumarDias } = await import('../src/servicios/reservas.js');
const { default: request } = await import('supertest');

export const app = crearApp();
export const api = () => request(app);
export const fechaFutura = (dias) => sumarDias(hoyIso(), dias);

export async function ingresar(rol) {
  const respuesta = await api().post('/api/auth/ingreso').send(credencialesPrueba[rol]);
  return respuesta.body.token;
}

export const conToken = (token) => ({ Authorization: `Bearer ${token}` });

// Simulacion de servicios externos
export function simularFetch(manejador) {
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => manejador(String(url));
  return () => { globalThis.fetch = original; };
}

export const respuestaPng = () => new Response(Buffer.from([137, 80, 78, 71]), { status: 200 });
