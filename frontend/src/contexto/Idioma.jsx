import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { textos } from '../textos.js';
import { useSesion } from './Sesion.jsx';

const ContextoIdioma = createContext(null);
const CLAVE = 'pacificreef_idioma';

function idiomaGuardado() {
  try {
    return localStorage.getItem(CLAVE) === 'en' ? 'en' : 'es';
  } catch {
    return 'es';
  }
}

// HU-11 / RF.11: idioma de la interfaz
export function ProveedorIdioma({ children }) {
  const { usuario } = useSesion();
  const [idioma, setIdioma] = useState(idiomaGuardado);

  useEffect(() => {
    if (usuario?.idioma) setIdioma(usuario.idioma);
  }, [usuario?.idioma]);

  useEffect(() => {
    document.documentElement.lang = idioma;
  }, [idioma]);

  const cambiar = useCallback((nuevo) => {
    setIdioma(nuevo);
    try {
      localStorage.setItem(CLAVE, nuevo);
    } catch {
      // navegador sin almacenamiento disponible
    }
    if (usuario) api('/auth/yo/idioma', { metodo: 'PUT', cuerpo: { idioma: nuevo } }).catch(() => {});
  }, [usuario]);

  const t = useCallback((clave, valores = {}) => {
    const plantilla = textos[idioma][clave] ?? textos.es[clave] ?? clave;
    return plantilla.replace(/\{(\w+)\}/g, (_, nombre) => valores[nombre] ?? '');
  }, [idioma]);

  const valor = useMemo(() => ({ idioma, cambiar, t }), [idioma, cambiar, t]);
  return <ContextoIdioma.Provider value={valor}>{children}</ContextoIdioma.Provider>;
}

export const useIdioma = () => useContext(ContextoIdioma);
