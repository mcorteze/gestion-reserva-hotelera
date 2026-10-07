export const clp = (valor) => `$ ${Math.round(Number(valor) || 0).toLocaleString('es-CL')}`;

export const usd = (valorClp, dolar) => (dolar ? `US$ ${Math.round(valorClp / dolar).toLocaleString('en-US')}` : '');

export function fechaLarga(texto, idioma = 'es') {
  if (!texto) return '';
  const fecha = new Date(`${texto.slice(0, 10)}T12:00:00Z`);
  return fecha.toLocaleDateString(idioma === 'en' ? 'en-US' : 'es-CL', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function hoyIso() {
  const ahora = new Date();
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function sumarDias(texto, dias) {
  const fecha = new Date(`${texto}T12:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

export function nochesEntre(inicio, fin) {
  return Math.round((new Date(`${fin}T12:00:00Z`) - new Date(`${inicio}T12:00:00Z`)) / 86400000);
}

export const NOMBRES_ROL = {
  cliente: 'Cliente',
  administrador_reservas: 'Administrador de reservas',
  administrador_hotel: 'Administrador del hotel',
  personal_hotel: 'Personal del hotel'
};
