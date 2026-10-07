import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './componentes/Layout.jsx';
import { Cargando, RequiereRol } from './componentes/Comunes.jsx';
import { rutaInicioSegunRol, useSesion } from './contexto/Sesion.jsx';
import Catalogo from './paginas/Catalogo.jsx';
import Habitacion from './paginas/Habitacion.jsx';
import Pago from './paginas/Pago.jsx';
import MisReservas from './paginas/MisReservas.jsx';
import { Ingreso, Registro } from './paginas/Acceso.jsx';
import Panel from './paginas/gestion/Panel.jsx';
import Reservas from './paginas/gestion/Reservas.jsx';
import CatalogoGestion from './paginas/gestion/Catalogo.jsx';
import Precios from './paginas/gestion/Precios.jsx';
import Reportes from './paginas/gestion/Reportes.jsx';
import Cuentas from './paginas/gestion/Cuentas.jsx';

const TRABAJADORES = ['administrador_hotel', 'administrador_reservas', 'personal_hotel'];
const ADMINISTRADORES = ['administrador_hotel', 'administrador_reservas'];

function InicioGestion() {
  const { usuario, cargando } = useSesion();
  if (cargando) return <Cargando />;
  return <Navigate to={rutaInicioSegunRol(usuario?.rol)} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Catalogo />} />
        <Route path="habitaciones/:id" element={<Habitacion />} />
        <Route path="reservas/:id/pago" element={<RequiereRol roles={['cliente']}><Pago /></RequiereRol>} />
        <Route path="mis-reservas" element={<RequiereRol roles={['cliente']}><MisReservas /></RequiereRol>} />
        <Route path="ingresar" element={<Ingreso />} />
        <Route path="registro" element={<Registro />} />
        <Route path="gestion">
          <Route index element={<RequiereRol roles={TRABAJADORES}><InicioGestion /></RequiereRol>} />
          <Route path="panel" element={<RequiereRol roles={['administrador_hotel']}><Panel /></RequiereRol>} />
          <Route path="reservas" element={<RequiereRol roles={TRABAJADORES}><Reservas /></RequiereRol>} />
          <Route path="catalogo" element={<RequiereRol roles={ADMINISTRADORES}><CatalogoGestion /></RequiereRol>} />
          <Route path="precios" element={<RequiereRol roles={['administrador_hotel']}><Precios /></RequiereRol>} />
          <Route path="reportes" element={<RequiereRol roles={['administrador_hotel']}><Reportes /></RequiereRol>} />
          <Route path="cuentas" element={<RequiereRol roles={ADMINISTRADORES}><Cuentas /></RequiereRol>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
