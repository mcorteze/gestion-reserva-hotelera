// Prueba de pantallas
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' });
for (const clave of Object.getOwnPropertyNames(dom.window)) {
  if (/^[A-Z]/.test(clave) && !(clave in globalThis)) globalThis[clave] = dom.window[clave];
}
Object.assign(globalThis, {
  window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  localStorage: dom.window.localStorage, history: dom.window.history, location: dom.window.location,
  IS_REACT_ACT_ENVIRONMENT: true
});
globalThis.HTMLElement = dom.window.HTMLElement;
dom.window.scrollTo = () => {};

// Backend de prueba
process.env.DB_RUTA = ':memory:';
const rutaApp = path.resolve(process.cwd(), '..', 'backend', 'src', 'app.js');
const { crearApp } = await import(pathToFileURL(rutaApp).href);
const servidor = crearApp().listen(0);
const base = `http://127.0.0.1:${servidor.address().port}`;

const fetchOriginal = globalThis.fetch;
globalThis.fetch = (url, opciones) => {
  const texto = String(url);
  if (texto.startsWith('/')) return fetchOriginal(base + texto, opciones);
  // Servicios externos sin red
  return Promise.resolve(new Response('{}', { status: 503 }));
};
dom.window.fetch = globalThis.fetch;

const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { BrowserRouter } = await import('react-router-dom');
const { default: App } = await import('../src/App.jsx');
const { ProveedorSesion } = await import('../src/contexto/Sesion.jsx');
const { ProveedorIdioma } = await import('../src/contexto/Idioma.jsx');
const { act } = React;

const erroresConsola = [];
const errorOriginal = console.error;
console.error = (...args) => { erroresConsola.push(args.map(String).join(' ')); };

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const fechaFutura = (dias) => new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);

async function iniciarSesion(correo, contrasena) {
  localStorage.clear();
  if (!correo) return null;
  const respuesta = await fetchOriginal(`${base}/api/auth/ingreso`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ correo, contrasena })
  });
  const datos = await respuesta.json();
  localStorage.setItem('pacificreef_token', datos.token);
  return datos.token;
}

let raiz;
async function montar(ruta) {
  if (raiz) await act(async () => raiz.unmount());
  document.body.innerHTML = '<div id="root"></div>';
  history.replaceState(null, '', ruta);
  raiz = createRoot(document.getElementById('root'));
  await act(async () => {
    raiz.render(
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ProveedorSesion><ProveedorIdioma><App /></ProveedorIdioma></ProveedorSesion></BrowserRouter>
    );
  });
}

async function esperarTexto(texto, limite = 4000) {
  const inicio = Date.now();
  while (Date.now() - inicio < limite) {
    if (document.body.textContent.includes(texto)) return true;
    await act(async () => { await espera(40); });
  }
  throw new Error(`No apareció el texto "${texto}". Pantalla: ${document.body.textContent.slice(0, 400)}`);
}

async function clickBoton(texto) {
  const boton = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === texto);
  if (!boton) throw new Error(`No existe el botón "${texto}"`);
  await act(async () => { boton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); });
}

const casos = [];
const caso = (nombre, fn) => casos.push({ nombre, fn });

caso('Catálogo público con 6 habitaciones (HU-04)', async () => {
  await iniciarSesion(null);
  await montar('/');
  await esperarTexto('Encuentra tu habitación');
  await esperarTexto('6 habitaciones en el catálogo');
  if (document.querySelectorAll('.tarjeta-habitacion').length !== 6) throw new Error('No hay 6 tarjetas');
});

caso('Cambio de idioma a inglés (HU-11)', async () => {
  await montar('/');
  await esperarTexto('Encuentra tu habitación');
  await clickBoton('ES · Español');
  await esperarTexto('Find your room');
  await clickBoton('EN · English');
  await esperarTexto('Encuentra tu habitación');
});

caso('Detalle con calendario, verificación y cálculo del 30% (HU-03, HU-05, HU-06, HU-08)', async () => {
  await montar(`/habitaciones/1?llegada=${fechaFutura(90)}&salida=${fechaFutura(92)}`);
  await esperarTexto('Disponible para 2 noches');
  await esperarTexto('$ 27.000 CLP');
  if (!document.querySelector('.calendario__grilla')) throw new Error('No se dibujó el calendario');
});

caso('Inicio de sesión y registro (HU-01, HU-02)', async () => {
  await montar('/ingresar');
  await esperarTexto('Inicia sesión');
  await montar('/registro');
  await esperarTexto('Crea tu cuenta');
});

caso('Cliente confirma reserva y llega al pago (HU-07, HU-09)', async () => {
  await iniciarSesion('ana.torres@correo.com', 'Cliente2026');
  await montar(`/habitaciones/2?llegada=${fechaFutura(95)}&salida=${fechaFutura(97)}`);
  await esperarTexto('Disponible para 2 noches');
  await clickBoton('Confirmar reserva');
  await esperarTexto('Completa el pago');
  await esperarTexto('Pagar $ 27.000 CLP');
});

caso('Mis reservas muestra las reservas del cliente (HU-07, HU-10)', async () => {
  await montar('/mis-reservas');
  await esperarTexto('PR-0001');
  await esperarTexto('Ver ticket');
});

caso('Panel, precios, reportes y cuentas del administrador del hotel (HU-15, HU-16, HU-17)', async () => {
  await iniciarSesion('jorge.fuentes@pacificreef.cl', 'Hotel2026');
  await montar('/gestion/panel');
  await esperarTexto('Hola, Jorge');
  await esperarTexto('Accesos directos');
  await montar('/gestion/precios');
  await esperarTexto('Categoría Premium');
  await montar('/gestion/reportes');
  await esperarTexto('Noches vendidas');
  await montar('/gestion/cuentas');
  await esperarTexto('Ana Torres');
});

caso('Reservas, calendario y catálogo del administrador de reservas (HU-12, HU-13, HU-14)', async () => {
  await iniciarSesion('paula.rios@pacificreef.cl', 'Reservas2026');
  await montar('/gestion/reservas?reserva=2');
  await esperarTexto('Reservas y calendario');
  await esperarTexto('Validar pago');
  await montar('/gestion/catalogo');
  await esperarTexto('Información de habitaciones');
  await montar('/gestion/cuentas');
  await esperarTexto('Luis Soto');
});

caso('Personal del hotel ve servicio contratado y no accede a precios (HU-18)', async () => {
  await iniciarSesion('luis.soto@pacificreef.cl', 'Personal2026');
  await montar('/gestion/reservas?reserva=1');
  await esperarTexto('Consulta del personal');
  await esperarTexto('Servicio contratado');
  await montar('/gestion/precios');
  await esperarTexto('Tu perfil no tiene acceso a esta sección.');
});

caso('Ruta protegida sin sesión redirige al ingreso', async () => {
  await iniciarSesion(null);
  await montar('/mis-reservas');
  await esperarTexto('Inicia sesión');
});

let fallas = 0;
for (const { nombre, fn } of casos) {
  erroresConsola.length = 0;
  try {
    await fn();
    const relevantes = erroresConsola.filter((e) => !e.includes('not wrapped in act'));
    if (relevantes.length) throw new Error(`Errores en consola: ${relevantes.join(' | ').slice(0, 300)}`);
    console.log(`ok - ${nombre}`);
  } catch (error) {
    fallas += 1;
    console.log(`FALLA - ${nombre}: ${error.message}`);
  }
}

console.error = errorOriginal;
if (raiz) await act(async () => raiz.unmount());
servidor.close();
console.log(`\n${casos.length - fallas} de ${casos.length} pantallas correctas`);
process.exit(fallas ? 1 : 0);
