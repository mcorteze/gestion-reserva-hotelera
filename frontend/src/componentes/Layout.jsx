import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSesion } from '../contexto/Sesion.jsx';
import { useIdioma } from '../contexto/Idioma.jsx';
import { NOMBRES_ROL } from '../formato.js';

export const MENU_GESTION = [
  { ruta: '/gestion/panel', texto: 'Panel', roles: ['administrador_hotel'] },
  { ruta: '/gestion/reservas', texto: 'Reservas', roles: ['administrador_hotel', 'administrador_reservas', 'personal_hotel'] },
  { ruta: '/gestion/catalogo', texto: 'Catálogo', roles: ['administrador_hotel', 'administrador_reservas'] },
  { ruta: '/gestion/precios', texto: 'Precios', roles: ['administrador_hotel'] },
  { ruta: '/gestion/reportes', texto: 'Reportes', roles: ['administrador_hotel'] },
  { ruta: '/gestion/cuentas', texto: 'Cuentas', roles: ['administrador_hotel', 'administrador_reservas'] }
];

export default function Layout() {
  const { usuario, salir } = useSesion();
  const { idioma, cambiar, t } = useIdioma();
  const { pathname } = useLocation();
  const navegar = useNavigate();
  const esGestion = pathname.startsWith('/gestion');
  const esTrabajador = usuario && usuario.rol !== 'cliente';

  const cerrarSesion = () => {
    salir();
    navegar('/');
  };

  const enlaces = esGestion
    ? MENU_GESTION.filter((item) => item.roles.includes(usuario?.rol))
    : [
      { ruta: '/', texto: t('menu_habitaciones') },
      ...(usuario?.rol === 'cliente' ? [{ ruta: '/mis-reservas', texto: t('menu_mis_reservas') }] : []),
      ...(esTrabajador ? [{ ruta: '/gestion', texto: 'Gestión' }] : [])
    ];

  return (
    <div className="pagina">
      <header className="encabezado">
        <div className="encabezado__interior">
          <Link to={esGestion ? '/gestion' : '/'} className="marca">
            <span className="marca__nombre">Hotel Pacific Reef</span>
            <span className="marca__seccion">{esGestion ? 'Gestión' : t('marca_reservas')}</span>
          </Link>

          <nav className="menu" aria-label="Menú principal">
            {enlaces.map((enlace) => (
              <NavLink key={enlace.ruta} to={enlace.ruta} end={enlace.ruta === '/'} className="menu__enlace">
                {enlace.texto}
              </NavLink>
            ))}
            {esGestion && <Link to="/" className="menu__enlace">Ver sitio</Link>}
          </nav>

          <div className="encabezado__acciones">
            {!esGestion && (
              <button type="button" className="idioma" onClick={() => cambiar(idioma === 'es' ? 'en' : 'es')}
                aria-label={t('cambiar_idioma')}>
                <strong>{idioma.toUpperCase()}</strong> · {idioma === 'es' ? 'Español' : 'English'}
              </button>
            )}
            {usuario ? (
              <>
                <span className="usuario">
                  {usuario.nombre}
                  {esTrabajador && <span className="usuario__rol"> · {NOMBRES_ROL[usuario.rol]}</span>}
                </span>
                <button type="button" className="boton boton--texto" onClick={cerrarSesion}>{t('salir')}</button>
              </>
            ) : (
              <Link to="/ingresar" className="boton boton--secundario boton--chico">{t('ingresar')}</Link>
            )}
          </div>
        </div>
      </header>

      <main className="contenedor">
        <Outlet />
      </main>

      <footer className="pie">Hotel Pacific Reef · {t('pie')}</footer>
    </div>
  );
}
