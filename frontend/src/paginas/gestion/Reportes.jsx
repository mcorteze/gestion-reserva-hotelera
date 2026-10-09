import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Aviso, Cargando, Encabezado, Estado } from '../../componentes/Comunes.jsx';
import { clp, fechaLarga, hoyIso } from '../../formato.js';

const plural = (cantidad, singular, varios) => `${cantidad} ${cantidad === 1 ? singular : varios}`;

// HU-17 / RF.17: reportes
export default function Reportes() {
  const mesActual = hoyIso().slice(0, 7);
  const [tipo, setTipo] = useState('rango');
  const [desde, setDesde] = useState(`${mesActual}-01`);
  const [hasta, setHasta] = useState(hoyIso());
  const [reporte, setReporte] = useState(null);
  const [error, setError] = useState('');

  const consultar = async (inicio, fin) => {
    setError('');
    setReporte(null);
    try {
      setReporte(await api(`/reportes/reservas?desde=${inicio}&hasta=${fin}`));
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => { consultar(desde, hasta); }, []);

  const aplicar = (evento) => {
    evento.preventDefault();
    consultar(desde, tipo === 'diario' ? desde : hasta);
  };

  return (
    <>
      <Encabezado kicker="Análisis de reservas" titulo="Reportes de reservas" bajada="Reservas según su fecha de llegada en el periodo seleccionado." />
      <form className="panel formulario-en-linea" onSubmit={aplicar}>
        <label className="campo">
          <span>Periodo</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="rango">Rango de fechas</option>
            <option value="diario">Diario</option>
          </select>
        </label>
        <label className="campo">
          <span>{tipo === 'diario' ? 'Día' : 'Desde'}</span>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} required />
        </label>
        {tipo === 'rango' && (
          <label className="campo">
            <span>Hasta</span>
            <input type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} required />
          </label>
        )}
        <button type="submit" className="boton">Aplicar periodo</button>
      </form>

      <Aviso>{error}</Aviso>
      {!reporte ? (!error && <Cargando />) : (
        <>
          <div className="indicadores">
            <div className="indicador"><p>Reservas</p><strong>{reporte.totales.cantidad}</strong>
              <span>{plural(reporte.totales.canceladas, 'cancelada', 'canceladas')} fuera del total</span></div>
            <div className="indicador"><p>Noches vendidas</p><strong>{reporte.totales.noches}</strong><span>{plural(reporte.totales.pendientes, 'reserva pendiente de pago', 'reservas pendientes de pago')}</span></div>
            <div className="indicador"><p>Monto del periodo</p><strong>{clp(reporte.totales.monto_total)}</strong><span>CLP · abonado {clp(reporte.totales.monto_pagado)}</span></div>
            <div className="indicador"><p>Ticket promedio</p><strong>{clp(reporte.totales.ticket_promedio)}</strong><span>Por reserva</span></div>
          </div>
          <section className="panel">
            <div className="tabla-desplazable">
              <table className="tabla">
                <thead><tr><th>Reserva</th><th>Cliente</th><th>Habitación</th><th>Fechas</th><th>Duración</th><th>Estado</th><th>Monto</th></tr></thead>
                <tbody>
                  {reporte.reservas.length === 0 && <tr><td colSpan={7} className="texto-suave">No hay reservas en el periodo.</td></tr>}
                  {reporte.reservas.map((r) => (
                    <tr key={r.id}>
                      <td><strong>{r.codigo}</strong></td>
                      <td>{r.cliente.nombre}</td>
                      <td>{r.habitacion.numero} · {r.habitacion.categoria}</td>
                      <td>{fechaLarga(r.fecha_inicio)} – {fechaLarga(r.fecha_fin)}</td>
                      <td>{r.noches} noches</td>
                      <td><Estado valor={r.estado} /></td>
                      <td><strong>{clp(r.valor_total)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="texto-mini">Mostrando {reporte.reservas.length} reservas · Total vigente: {clp(reporte.totales.monto_total)} CLP</p>
          </section>
        </>
      )}
    </>
  );
}
