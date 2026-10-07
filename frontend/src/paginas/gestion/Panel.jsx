import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useSesion } from '../../contexto/Sesion.jsx';
import { Aviso, Cargando, Encabezado } from '../../componentes/Comunes.jsx';
import { clp, NOMBRES_ROL } from '../../formato.js';

const plural = (cantidad, singular, varios) => `${cantidad} ${cantidad === 1 ? singular : varios}`;

// Fecha en hora local
const horaLocal = (texto) => new Date(`${texto.replace(' ', 'T')}Z`)
  .toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const ACCIONES = {
  ingreso: 'Inicio de sesión', ingreso_fallido: 'Intento de ingreso fallido', registro: 'Registro de cliente',
  crear_reserva: 'Reserva creada', pago_aprobado: 'Pago aprobado', pago_rechazado: 'Pago rechazado',
  cancelar_reserva: 'Reserva cancelada', modificar_reserva: 'Reserva modificada', confirmar_pago: 'Pago validado',
  actualizar_precios: 'Precios actualizados', actualizar_catalogo: 'Catálogo actualizado',
  crear_cuenta: 'Cuenta creada', modificar_cuenta: 'Cuenta modificada', eliminar_cuenta: 'Cuenta eliminada'
};

// Panel del administrador del hotel
export default function Panel() {
  const { usuario } = useSesion();
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [resumen, setResumen] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setResumen(null);
    api(`/reportes/resumen?mes=${mes}`).then(setResumen).catch((e) => setError(e.message));
  }, [mes]);

  const nombreMes = new Date(`${mes}-15T12:00:00Z`).toLocaleDateString('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  return (
    <>
      <Encabezado kicker="Panel operativo" titulo={`Hola, ${usuario.nombre.split(' ')[0]}`} bajada={`Resumen de ${nombreMes}`}>
        <label className="campo campo--en-linea">
          <span>Mes</span>
          <input type="month" value={mes} onChange={(e) => e.target.value && setMes(e.target.value)} />
        </label>
      </Encabezado>
      <Aviso>{error}</Aviso>
      {!resumen ? <Cargando /> : (
        <>
          <div className="indicadores">
            <div className="indicador"><p>Reservas confirmadas</p><strong>{resumen.totales.confirmadas}</strong>
              <span>{plural(resumen.totales.pendientes, 'pendiente de pago', 'pendientes de pago')}</span></div>
            <div className="indicador"><p>Ocupación del mes</p><strong>{resumen.ocupacion.toLocaleString('es-CL')}%</strong>
              <span>Noches ocupadas sobre noches disponibles</span></div>
            <div className="indicador"><p>Ingresos estimados</p><strong>{clp(resumen.totales.monto_total)}</strong>
              <span>CLP · abonado {clp(resumen.totales.monto_pagado)}</span></div>
            <div className="indicador"><p>Ticket promedio</p><strong>{clp(resumen.totales.ticket_promedio)}</strong><span>Por reserva</span></div>
          </div>

          <h2 className="subtitulo">Accesos directos</h2>
          <div className="accesos">
            <Link to="/gestion/precios" className="acceso-directo"><strong>Actualizar precios</strong><span>Tarifas Turista y Premium</span></Link>
            <Link to="/gestion/reportes" className="acceso-directo"><strong>Ver reportes</strong><span>Reservas por día o rango</span></Link>
            <Link to="/gestion/cuentas" className="acceso-directo"><strong>Administrar cuentas</strong><span>Clientes y trabajadores</span></Link>
          </div>

          <h2 className="subtitulo">Alertas <span className="texto-suave">· {plural(resumen.alertas.length, 'pendiente', 'pendientes')}</span></h2>
          <div className="panel panel--lista">
            {resumen.alertas.length === 0 && <p className="texto-suave">No hay alertas pendientes.</p>}
            {resumen.alertas.map((alerta) => (
              <div key={alerta.reserva_id} className="fila-alerta">
                <span className="etiqueta etiqueta--alerta">Pago</span>
                <span>{alerta.texto}</span>
                <Link className="boton boton--secundario boton--chico" to={`/gestion/reservas?reserva=${alerta.reserva_id}`}>Revisar reserva</Link>
              </div>
            ))}
          </div>

          <h2 className="subtitulo">Actividad reciente</h2>
          <div className="panel panel--lista">
            {resumen.actividad.map((item, indice) => (
              <div key={indice} className="fila-alerta">
                <span className="texto-mini">{horaLocal(item.fecha)}</span>
                <span>{ACCIONES[item.accion] || item.accion}{item.usuario ? ` · ${item.usuario}` : ''}</span>
                <span className="texto-suave">{NOMBRES_ROL[item.detalle] || item.detalle}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
