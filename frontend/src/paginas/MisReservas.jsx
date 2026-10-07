import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useIdioma } from '../contexto/Idioma.jsx';
import { Aviso, Cargando, Encabezado, Estado, Ticket } from '../componentes/Comunes.jsx';
import { clp, fechaLarga } from '../formato.js';

// HU-07: mis reservas
export default function MisReservas() {
  const { idioma, t } = useIdioma();
  const [reservas, setReservas] = useState(null);
  const [tickets, setTickets] = useState({});
  const [error, setError] = useState('');

  const cargar = () => api('/reservas/mias').then(setReservas).catch((e) => setError(e.message));
  useEffect(() => { cargar(); }, []);

  const verTicket = async (id) => {
    if (tickets[id]) {
      setTickets({ ...tickets, [id]: null });
      return;
    }
    try {
      setTickets({ ...tickets, [id]: await api(`/reservas/${id}/ticket`) });
    } catch (e) {
      setError(e.message);
    }
  };

  const cancelar = async (id) => {
    setError('');
    try {
      await api(`/reservas/${id}/cancelar`, { metodo: 'POST' });
      cargar();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <>
      <Encabezado kicker={t('mis_reservas_kicker')} titulo={t('menu_mis_reservas')} bajada={t('mis_reservas_bajada')} />
      <Aviso>{error}</Aviso>
      {!reservas ? <Cargando /> : (
        <div className="lista">
          {reservas.length === 0 && (
            <Aviso tipo="info">{t('sin_reservas')} <Link to="/">{t('menu_habitaciones')}</Link></Aviso>
          )}
          {[...reservas].reverse().map((reserva) => (
            <article key={reserva.id} className="panel reserva">
              <div className="reserva__datos">
                <p className="kicker">{reserva.codigo}</p>
                <h2>{reserva.habitacion.categoria} · {t('habitacion')} {reserva.habitacion.numero}</h2>
                <p className="texto-suave">
                  {fechaLarga(reserva.fecha_inicio, idioma)} – {fechaLarga(reserva.fecha_fin, idioma)} · {t('noches', { cantidad: reserva.noches })}
                </p>
                <p>
                  {t('valor_total')}: <strong>{clp(reserva.valor_total)}</strong> · {t('pagado')}: {clp(reserva.monto_pagado)} · {t('saldo')}: {clp(reserva.saldo)}
                </p>
              </div>
              <div className="reserva__acciones">
                <Estado valor={reserva.estado} />
                {reserva.estado === 'pendiente' && (
                  <>
                    <Link className="boton boton--chico" to={`/reservas/${reserva.id}/pago`}>{t('pagar_abono')}</Link>
                    <button type="button" className="boton boton--secundario boton--chico" onClick={() => cancelar(reserva.id)}>{t('cancelar')}</button>
                  </>
                )}
                {reserva.estado === 'confirmada' && (
                  <button type="button" className="boton boton--secundario boton--chico" onClick={() => verTicket(reserva.id)}>
                    {tickets[reserva.id] ? t('ocultar_ticket') : t('ver_ticket')}
                  </button>
                )}
              </div>
              {tickets[reserva.id] && <Ticket ticket={tickets[reserva.id]} />}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
