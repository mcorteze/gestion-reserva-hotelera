import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, guardarToken, leerToken } from '../api.js';

const ContextoSesion = createContext(null);

export function ProveedorSesion({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(Boolean(leerToken()));

  useEffect(() => {
    if (!leerToken()) return;
    api('/auth/yo')
      .then(setUsuario)
      .catch(() => guardarToken(null))
      .finally(() => setCargando(false));
  }, []);

  const ingresar = useCallback(async (correo, contrasena) => {
    const datos = await api('/auth/ingreso', { metodo: 'POST', cuerpo: { correo, contrasena } });
    guardarToken(datos.token);
    setUsuario(datos.usuario);
    return datos.usuario;
  }, []);

  const registrar = useCallback(async (campos) => {
    const datos = await api('/auth/registro', { metodo: 'POST', cuerpo: campos });
    guardarToken(datos.token);
    setUsuario(datos.usuario);
    return datos.usuario;
  }, []);

  const salir = useCallback(() => {
    guardarToken(null);
    setUsuario(null);
  }, []);

  const valor = useMemo(() => ({ usuario, cargando, ingresar, registrar, salir, setUsuario }),
    [usuario, cargando, ingresar, registrar, salir]);

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export const useSesion = () => useContext(ContextoSesion);

export function rutaInicioSegunRol(rol) {
  if (rol === 'administrador_hotel') return '/gestion/panel';
  if (rol === 'administrador_reservas' || rol === 'personal_hotel') return '/gestion/reservas';
  return '/';
}
