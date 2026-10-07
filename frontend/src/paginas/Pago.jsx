import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useSesion } from '../contexto/Sesion.jsx';
import { useIdioma } from '../contexto/Idioma.jsx';
import { Aviso, Cargando, Ticket } from '../componentes/Comunes.jsx';
import { clp, fechaLarga } from '../formato.js';

// HU-09 / RF.9 y HU-10 / RF.10: pago y ticket
export default function Pago() {
  const { id } = useParams();
  const { usuario } = useSesion();
  const { idioma, t } = useIdioma();
  const [reserva, setReserva] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [estado, setEstado] = useState('espera');
  const [error, setError] = useState('');
  const [formulario, setFormulario] = useState({
    titular: usuario?.nombre || '', numero: '', vencimiento: '', cvv: '', metodo: 'tarjeta_credito'
  });

  useEffect(() => {
    api(`/reservas/${id}`)
      .then((datos) => {
        setReserva(datos);
        if (datos.estado === 'confirmada') {
          setEstado('aprobado');
          api(`/reservas/${id}/ticket`).then(setTicket).catch(() => {});
        }
      })
      .catch((e) => setError(e.message));
  }, [id]);

  const cambiar = (campo) => (evento) => setFormulario({ ...formulario, [campo]: evento.target.value });

  const pagar = async (evento) => {
    evento.preventDefault();
    setError('');
    setEstado('procesando');
    try {
      const resultado = await api(`/reservas/${id}/pagos`, { metodo: 'POST', cuerpo: formulario });
      setReserva(resultado.reserva);
      setTicket(resultado.ticket);
      setEstado('aprobado');
    } catch (e) {
      if (e.estado === 402) {
        setEstado('rechazado');
        setError(e.message);
      } else {
        setEstado('espera');
        setError(e.message);
      }
    }
  };

  if (!reserva) return error ? <Aviso>{error}</Aviso> : <Cargando />;

  const pasos = [
    { clave: 'procesando', icono: '◷', titulo: t('estado_procesando'), detalle: t('estado_procesando_detalle') },
    { clave: 'aprobado', icono: '✓', titulo: t('estado_aprobado'), detalle: t('estado_aprobado_detalle') },
    { clave: 'rechazado', icono: '!', titulo: t('estado_rechazado'), detalle: t('estado_rechazado_detalle') }
  ];

  return (
    <>
      <div className="titular">
        <div>
          <p className="kicker">{t('paso', { actual: 3, total: 3 })}</p>
          <h1>{estado === 'aprobado' ? t('pago_listo_titulo') : t('pago_titulo')}</h1>
          <p className="bajada">{t('pago_bajada')}</p>
        </div>
      </div>

      <div className="detalle detalle--pago">
        {estado === 'aprobado' ? (
          <section className="panel">
            <h2>{t('reserva_confirmada')}</h2>
            <Ticket ticket={ticket} />
            <Link className="boton" to="/mis-reservas">{t('ir_mis_reservas')}</Link>
          </section>
        ) : (
          <form className="panel formulario" onSubmit={pagar}>
            <h2>{t('metodo_pago')}</h2>
            <label className="campo">
              <span>{t('tipo_tarjeta')}</span>
              <select value={formulario.metodo} onChange={cambiar('metodo')}>
                <option value="tarjeta_credito">{t('tarjeta_credito')}</option>
                <option value="tarjeta_debito">{t('tarjeta_debito')}</option>
              </select>
            </label>
            <label className="campo">
              <span>{t('titular')}</span>
              <input value={formulario.titular} onChange={cambiar('titular')} required autoComplete="cc-name" />
            </label>
            <label className="campo">
              <span>{t('numero_tarjeta')}</span>
              <input value={formulario.numero} onChange={cambiar('numero')} required inputMode="numeric"
                placeholder="4242 4242 4242 4242" maxLength={19} autoComplete="cc-number" />
            </label>
            <div className="fila-campos">
              <label className="campo">
                <span>{t('vencimiento')}</span>
                <input value={formulario.vencimiento} onChange={cambiar('vencimiento')} required placeholder="MM/AA" maxLength={5} autoComplete="cc-exp" />
              </label>
              <label className="campo">
                <span>CVV</span>
                <input value={formulario.cvv} onChange={cambiar('cvv')} required inputMode="numeric" maxLength={4} autoComplete="cc-csc" />
              </label>
            </div>
            <p className="texto-mini">{t('correo_ticket', { correo: reserva.cliente.correo })}</p>
            <Aviso>{error}</Aviso>
            <button type="submit" className="boton" disabled={estado === 'procesando'}>
              {estado === 'procesando' ? t('procesando') : t('pagar', { monto: clp(reserva.monto_abono) })}
            </button>
            <p className="texto-mini">{t('ambiente_prueba_pago')}</p>
          </form>
        )}

        <div className="columna">
          <section className="panel">
            <h2>{t('resumen_reserva')}</h2>
            <p><strong>{reserva.habitacion.categoria} · {t('habitacion')} {reserva.habitacion.numero}</strong></p>
            <p className="texto-suave">
              {fechaLarga(reserva.fecha_inicio, idioma)} – {fechaLarga(reserva.fecha_fin, idioma)} · {t('noches', { cantidad: reserva.noches })}
            </p>
            <div className="fila-valor"><span>{t('valor_total')}</span><span>{clp(reserva.valor_total)}</span></div>
            <div className="fila-valor"><span>{t('saldo_llegada')}</span><span>{clp(reserva.valor_total - reserva.monto_abono)}</span></div>
            <p className="precio-destacado">{t('pago_hoy', { monto: clp(reserva.monto_abono) })}</p>
          </section>
          <section className="panel">
            <p className="kicker">{t('estado_operacion')}</p>
            <ul className="estados-pago">
              {pasos.map((paso) => (
                <li key={paso.clave} className={`estados-pago__item estados-pago__item--${paso.clave}${estado === paso.clave ? ' es-actual' : ''}`}>
                  <span className="estados-pago__icono" aria-hidden="true">{paso.icono}</span>
                  <div><strong>{paso.titulo}</strong><p className="texto-mini">{paso.detalle}</p></div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
