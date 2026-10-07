// Servicios web externos

const URL_QR = 'https://api.qrserver.com/v1/create-qr-code/';
const URL_DOLAR = 'https://mindicador.cl/api/dolar';
const UNA_HORA = 60 * 60 * 1000;

let dolarEnCache = null;

// Imagen QR del ticket (RF.10)
export async function generarImagenQr(texto) {
  try {
    const respuesta = await fetch(`${URL_QR}?size=240x240&margin=8&data=${encodeURIComponent(texto)}`, {
      signal: AbortSignal.timeout(6000)
    });
    if (!respuesta.ok) return null;
    const bytes = Buffer.from(await respuesta.arrayBuffer());
    return `data:image/png;base64,${bytes.toString('base64')}`;
  } catch {
    return null;
  }
}

// Dolar observado
export async function obtenerDolar() {
  if (dolarEnCache && Date.now() - dolarEnCache.consultado < UNA_HORA) return dolarEnCache.datos;

  const respuesta = await fetch(URL_DOLAR, { signal: AbortSignal.timeout(6000) });
  if (!respuesta.ok) throw new Error(`mindicador.cl respondió ${respuesta.status}`);
  const cuerpo = await respuesta.json();
  const ultimo = cuerpo?.serie?.[0];
  if (!ultimo || typeof ultimo.valor !== 'number') throw new Error('Respuesta de mindicador.cl sin valores');

  const datos = { valor: ultimo.valor, fecha: ultimo.fecha.slice(0, 10), fuente: 'mindicador.cl (Banco Central de Chile)' };
  dolarEnCache = { consultado: Date.now(), datos };
  return datos;
}

export function limpiarCacheDolar() {
  dolarEnCache = null;
}
