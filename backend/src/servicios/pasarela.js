import { ErrorNegocio, textoObligatorio } from '../utilidades.js';

// Pasarela de pago simulada (RF.9)
export const TARJETA_RECHAZADA = '4000000000000002';
const METODOS = ['tarjeta_credito', 'tarjeta_debito'];

function cumpleLuhn(numero) {
  let suma = 0;
  for (let i = 0; i < numero.length; i += 1) {
    let digito = Number(numero[numero.length - 1 - i]);
    if (i % 2 === 1) {
      digito *= 2;
      if (digito > 9) digito -= 9;
    }
    suma += digito;
  }
  return suma % 10 === 0;
}

export function validarDatosPago({ titular, numero, vencimiento, cvv, metodo }) {
  textoObligatorio(titular, 'titular');
  const digitos = String(numero ?? '').replace(/\s+/g, '');
  if (!/^\d{16}$/.test(digitos) || !cumpleLuhn(digitos)) throw new ErrorNegocio(400, 'El número de tarjeta no es válido.');

  const partes = /^(\d{2})\/(\d{2})$/.exec(String(vencimiento ?? '').trim());
  if (!partes || Number(partes[1]) < 1 || Number(partes[1]) > 12) {
    throw new ErrorNegocio(400, 'El vencimiento debe tener formato MM/AA.');
  }
  const finDeMes = new Date(Date.UTC(2000 + Number(partes[2]), Number(partes[1]), 1));
  if (finDeMes <= new Date()) throw new ErrorNegocio(400, 'La tarjeta está vencida.');

  if (!/^\d{3,4}$/.test(String(cvv ?? ''))) throw new ErrorNegocio(400, 'El código CVV no es válido.');
  if (!METODOS.includes(metodo)) throw new ErrorNegocio(400, 'El método de pago debe ser tarjeta de crédito o débito.');

  return { digitos, ultimos: digitos.slice(-4) };
}

export function procesarCobro(digitos) {
  if (digitos === TARJETA_RECHAZADA) {
    return { aprobado: false, motivo: 'El banco rechazó la operación. Intenta con otra tarjeta.' };
  }
  return { aprobado: true };
}
