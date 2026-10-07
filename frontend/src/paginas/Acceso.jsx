import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { rutaInicioSegunRol, useSesion } from '../contexto/Sesion.jsx';
import { useIdioma } from '../contexto/Idioma.jsx';
import { Aviso, Encabezado } from '../componentes/Comunes.jsx';

function destino(volver, rol) {
  if (volver && volver.startsWith('/')) return volver;
  return rutaInicioSegunRol(rol);
}

// HU-02 / RF.2: inicio de sesion
export function Ingreso() {
  const { usuario, ingresar } = useSesion();
  const { t } = useIdioma();
  const [parametros] = useSearchParams();
  const navegar = useNavigate();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={destino(parametros.get('volver'), usuario.rol)} replace />;

  const enviar = async (evento) => {
    evento.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const datos = await ingresar(correo, contrasena);
      navegar(destino(parametros.get('volver'), datos.rol), { replace: true });
    } catch (e) {
      setError(e.message);
      setEnviando(false);
    }
  };

  return (
    <div className="acceso">
      <Encabezado kicker={t('acceso_kicker')} titulo={t('ingreso_titulo')} bajada={t('ingreso_bajada')} />
      <form className="panel formulario" onSubmit={enviar}>
        <label className="campo">
          <span>{t('correo')}</span>
          <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required autoComplete="username" />
        </label>
        <label className="campo">
          <span>{t('contrasena')}</span>
          <input type="password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} required autoComplete="current-password" />
        </label>
        <Aviso>{error}</Aviso>
        <button type="submit" className="boton" disabled={enviando}>{enviando ? t('procesando') : t('ingresar')}</button>
        <p className="texto-suave">
          {t('sin_cuenta')} <Link to={`/registro${parametros.get('volver') ? `?volver=${encodeURIComponent(parametros.get('volver'))}` : ''}`}>{t('crear_cuenta')}</Link>
        </p>
      </form>
    </div>
  );
}

// HU-01 / RF.1: registro del turista como cliente
export function Registro() {
  const { usuario, registrar } = useSesion();
  const { idioma, t } = useIdioma();
  const [parametros] = useSearchParams();
  const navegar = useNavigate();
  const [campos, setCampos] = useState({ nombre: '', correo: '', telefono: '', contrasena: '', repetir: '' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={destino(parametros.get('volver'), usuario.rol)} replace />;

  const cambiar = (campo) => (evento) => setCampos({ ...campos, [campo]: evento.target.value });

  const enviar = async (evento) => {
    evento.preventDefault();
    setError('');
    if (campos.contrasena !== campos.repetir) {
      setError(t('contrasenas_distintas'));
      return;
    }
    setEnviando(true);
    try {
      const { repetir: _repetir, ...datos } = campos;
      await registrar({ ...datos, idioma });
      navegar(destino(parametros.get('volver'), 'cliente'), { replace: true });
    } catch (e) {
      setError(e.message);
      setEnviando(false);
    }
  };

  return (
    <div className="acceso">
      <Encabezado kicker={t('acceso_kicker')} titulo={t('registro_titulo')} bajada={t('registro_bajada')} />
      <form className="panel formulario" onSubmit={enviar}>
        <label className="campo">
          <span>{t('nombre_completo')}</span>
          <input value={campos.nombre} onChange={cambiar('nombre')} required autoComplete="name" />
        </label>
        <label className="campo">
          <span>{t('correo')}</span>
          <input type="email" value={campos.correo} onChange={cambiar('correo')} required autoComplete="email" />
        </label>
        <label className="campo">
          <span>{t('telefono')}</span>
          <input type="tel" value={campos.telefono} onChange={cambiar('telefono')} autoComplete="tel" placeholder="+56 9 1234 5678" />
        </label>
        <div className="fila-campos">
          <label className="campo">
            <span>{t('contrasena')}</span>
            <input type="password" value={campos.contrasena} onChange={cambiar('contrasena')} required minLength={8} autoComplete="new-password" />
          </label>
          <label className="campo">
            <span>{t('repetir_contrasena')}</span>
            <input type="password" value={campos.repetir} onChange={cambiar('repetir')} required minLength={8} autoComplete="new-password" />
          </label>
        </div>
        <p className="texto-mini">{t('regla_contrasena')}</p>
        <Aviso>{error}</Aviso>
        <button type="submit" className="boton" disabled={enviando}>{enviando ? t('procesando') : t('crear_cuenta')}</button>
        <p className="texto-suave">{t('con_cuenta')} <Link to="/ingresar">{t('ingresar')}</Link></p>
      </form>
    </div>
  );
}
