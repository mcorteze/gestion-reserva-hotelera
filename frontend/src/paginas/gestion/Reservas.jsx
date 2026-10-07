import { Fragment, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useSesion } from '../../contexto/Sesion.jsx';
import { Aviso, Cargando, Encabezado, Estado } from '../../componentes/Comunes.jsx';
import { clp, fechaLarga } from '../../formato.js';

function limitesMes(mes) {
  const [anio, numero] = mes.split('-').map(Number);
  const dias = new Date(Date.UTC(anio, numero, 0)).getUTCDate();
  return { desde: `${mes}-01`, hasta: `${mes}-${String(dias).padStart(2, '0')}`, dias };
}

// Calendario de reservas
function CalendarioReservas({ mes, habitaciones, reservas, alElegir }) {
  const { dias } = limitesMes(mes);
  const columnas = Array.from({ length: dias }, (_, i) => `${mes}-${String(i + 1).padStart(2, '0')}`);
  return (
    <div className="tabla-desplazable">
      <div className="ocupacion" style={{ gridTemplateColumns: `90px repeat(${dias}, minmax(26px, 1fr))` }}>
        <span className="ocupacion__cabecera">Hab.</span>
        {columnas.map((dia) => <span key={dia} className="ocupacion__cabecera">{Number(dia.slice(8))}</span>)}
        {habitaciones.map((habitacion) => (
          <Fragment key={habitacion.id}>
            <span className="ocupacion__habitacion">{habitacion.numero}</span>
            {columnas.map((dia) => {
              const reserva = reservas.find((r) => r.habitacion.id === habitacion.id && r.estado !== 'cancelada'
                && r.fecha_inicio <= dia && dia < r.fecha_fin);
              return reserva ? (
                <button key={dia} type="button" className={`ocupacion__celda ocupacion__celda--${reserva.estado}`}
                  title={`${reserva.codigo} · ${reserva.cliente.nombre}`} onClick={() => alElegir(reserva.id)}>
                  {reserva.fecha_inicio === dia ? '●' : ''}
                </button>
              ) : <span key={dia} className="ocupacion__celda" />;
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

// HU-12 / RF.12 y HU-18 / RF.18: reservas
export default function Reservas() {
  const { usuario } = useSesion();
  const [parametros] = useSearchParams();
  const puedeEditar = ['administrador_reservas', 'administrador_hotel'].includes(usuario.rol);
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [reservas, setReservas] = useState(null);
  const [habitaciones, setHabitaciones] = useState([]);
  const [seleccion, setSeleccion] = useState(Number(parametros.get('reserva')) || null);
  const [edicion, setEdicion] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: 'exito', texto: '' });

  const cargar = useCallback(() => {
    const { desde, hasta } = limitesMes(mes);
    return api(`/reservas?desde=${desde}&hasta=${hasta}`).then(setReservas)
      .catch((e) => setMensaje({ tipo: 'error', texto: e.message }));
  }, [mes]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { api('/habitaciones').then(setHabitaciones).catch(() => {}); }, []);

  // Mes de la reserva seleccionada
  useEffect(() => {
    const id = Number(parametros.get('reserva'));
    if (id) api(`/reservas/${id}`).then((r) => setMes(r.fecha_inicio.slice(0, 7))).catch(() => {});
  }, [parametros]);

  const ejecutar = async (accion, exito) => {
    setMensaje({ tipo: 'exito', texto: '' });
    try {
      await accion();
      setMensaje({ tipo: 'exito', texto: exito });
      setEdicion(null);
      await cargar();
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message });
    }
  };

  const guardarEdicion = (evento) => {
    evento.preventDefault();
    ejecutar(() => api(`/reservas/${edicion.id}`, { metodo: 'PUT', cuerpo: {
      habitacion_id: Number(edicion.habitacion_id), fecha_inicio: edicion.fecha_inicio, fecha_fin: edicion.fecha_fin
    } }), `Reserva ${edicion.codigo} modificada. El valor se recalculó según las nuevas fechas.`);
  };

  const nombreMes = new Date(`${mes}-15T12:00:00Z`).toLocaleDateString('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  return (
    <>
      <Encabezado kicker={puedeEditar ? 'Administración de reservas' : 'Consulta del personal'} titulo="Reservas y calendario"
        bajada={puedeEditar ? 'Modifica o cancela reservas y valida pagos pendientes.' : 'Revisa las reservas del mes y el servicio contratado para preparar cada estadía.'}>
        <label className="campo campo--en-linea">
          <span>Mes</span>
          <input type="month" value={mes} onChange={(e) => e.target.value && setMes(e.target.value)} />
        </label>
      </Encabezado>

      <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>

      {!reservas ? <Cargando /> : (
        <>
          <section className="panel">
            <h2>Calendario de {nombreMes}</h2>
            <CalendarioReservas mes={mes} habitaciones={habitaciones} reservas={reservas} alElegir={setSeleccion} />
            <p className="calendario__leyenda">
              <span className="muestra muestra--confirmada" /> Confirmada
              <span className="muestra muestra--pendiente" /> Pendiente de pago · ● día de llegada
            </p>
          </section>

          <section className="panel">
            <h2>{reservas.length} reservas en el mes</h2>
            <div className="tabla-desplazable">
              <table className="tabla">
                <thead>
                  <tr><th>Reserva</th><th>Cliente</th><th>Habitación</th><th>Fechas</th><th>Estado</th><th>Valor / pagado</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                  {reservas.map((reserva) => (
                    <Fragment key={reserva.id}>
                      <tr className={seleccion === reserva.id ? 'es-seleccionada' : ''}>
                        <td><strong>{reserva.codigo}</strong></td>
                        <td>{reserva.cliente.nombre}<br /><span className="texto-mini">{reserva.cliente.telefono}</span></td>
                        <td>{reserva.habitacion.numero} · {reserva.habitacion.categoria}</td>
                        <td>{fechaLarga(reserva.fecha_inicio)} – {fechaLarga(reserva.fecha_fin)}<br />
                          <span className="texto-mini">{reserva.noches} noches</span></td>
                        <td><Estado valor={reserva.estado} /></td>
                        <td>{clp(reserva.valor_total)}<br /><span className="texto-mini">pagado {clp(reserva.monto_pagado)}</span></td>
                        <td className="acciones">
                          <button type="button" className="boton boton--texto"
                            onClick={() => setSeleccion(seleccion === reserva.id ? null : reserva.id)}>
                            {seleccion === reserva.id ? 'Ocultar' : 'Detalle'}
                          </button>
                          {puedeEditar && reserva.estado !== 'cancelada' && (
                            <>
                              <button type="button" className="boton boton--texto" onClick={() => setEdicion({
                                id: reserva.id, codigo: reserva.codigo, habitacion_id: reserva.habitacion.id,
                                fecha_inicio: reserva.fecha_inicio, fecha_fin: reserva.fecha_fin
                              })}>Modificar</button>
                              <button type="button" className="boton boton--texto boton--peligro"
                                onClick={() => ejecutar(() => api(`/reservas/${reserva.id}/cancelar`, { metodo: 'POST' }), `Reserva ${reserva.codigo} cancelada.`)}>
                                Cancelar
                              </button>
                            </>
                          )}
                          {puedeEditar && reserva.estado === 'pendiente' && (
                            <button type="button" className="boton boton--texto"
                              onClick={() => ejecutar(() => api(`/reservas/${reserva.id}/confirmar-pago`, { metodo: 'POST' }), `Pago de ${reserva.codigo} validado y ticket emitido.`)}>
                              Validar pago
                            </button>
                          )}
                        </td>
                      </tr>
                      {seleccion === reserva.id && (
                        <tr className="fila-detalle">
                          <td colSpan={7}>
                            <strong>Servicio contratado:</strong> {reserva.servicio_contratado}
                            <br /><span className="texto-suave">Correo: {reserva.cliente.correo} · Ticket: {reserva.ticket?.codigo || 'sin emitir'} · Saldo al llegar: {clp(reserva.saldo)}</span>
                          </td>
                        </tr>
                      )}
                      {edicion?.id === reserva.id && (
                        <tr className="fila-detalle">
                          <td colSpan={7}>
                            <form className="formulario-en-linea" onSubmit={guardarEdicion}>
                              <label className="campo">
                                <span>Habitación</span>
                                <select value={edicion.habitacion_id} onChange={(e) => setEdicion({ ...edicion, habitacion_id: e.target.value })}>
                                  {habitaciones.map((h) => <option key={h.id} value={h.id}>{h.numero} · {h.categoria}</option>)}
                                </select>
                              </label>
                              <label className="campo">
                                <span>Llegada</span>
                                <input type="date" value={edicion.fecha_inicio} onChange={(e) => setEdicion({ ...edicion, fecha_inicio: e.target.value })} />
                              </label>
                              <label className="campo">
                                <span>Salida</span>
                                <input type="date" value={edicion.fecha_fin} onChange={(e) => setEdicion({ ...edicion, fecha_fin: e.target.value })} />
                              </label>
                              <button type="submit" className="boton boton--chico">Guardar cambios</button>
                              <button type="button" className="boton boton--secundario boton--chico" onClick={() => setEdicion(null)}>Descartar</button>
                            </form>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
