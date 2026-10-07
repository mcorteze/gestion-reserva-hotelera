import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useSesion } from '../contexto/Sesion.jsx';
import { useIdioma } from '../contexto/Idioma.jsx';
import Calendario from '../componentes/Calendario.jsx';
import { Aviso, Cargando } from '../componentes/Comunes.jsx';
import { clp, fechaLarga, hoyIso, sumarDias } from '../formato.js';

// HU-05, HU-06 y HU-08: detalle de habitacion
export default function Habitacion() {
  const { id } = useParams();
  const [parametros] = useSearchParams();
  const { usuario } = useSesion();
  const { idioma, t } = useIdioma();
  const navegar = useNavigate();

  const [habitacion, setHabitacion] = useState(null);
  const [llegada, setLlegada] = useState(parametros.get('llegada') || sumarDias(hoyIso(), 7));
  const [salida, setSalida] = useState(parametros.get('salida') || sumarDias(hoyIso(), 10));
  const [verificacion, setVerificacion] = useState(null);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    setHabitacion(null);
    api(`/habitaciones/${id}`).then(setHabitacion).catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    let vigente = true;
    setVerificacion(null);
    if (!llegada || !salida || salida <= llegada) return undefined;
    api(`/habitaciones/${id}/disponibilidad?desde=${llegada}&hasta=${salida}`)
      .then((datos) => { if (vigente) { setVerificacion(datos); setError(''); } })
      .catch((e) => { if (vigente) setError(e.message); });
    return () => { vigente = false; };
  }, [id, llegada, salida]);

  const cambiarFechas = ({ llegada: nuevaLlegada, salida: nuevaSalida }) => {
    setLlegada(nuevaLlegada);
    setSalida(nuevaSalida);
  };

  const confirmar = async () => {
    if (!usuario) {
      navegar(`/ingresar?volver=${encodeURIComponent(`/habitaciones/${id}?llegada=${llegada}&salida=${salida}`)}`);
      return;
    }
    setEnviando(true);
    setError('');
    try {
      const reserva = await api('/reservas', { metodo: 'POST', cuerpo: { habitacion_id: Number(id), fecha_inicio: llegada, fecha_fin: salida } });
      navegar(`/reservas/${reserva.id}/pago`);
    } catch (e) {
      setError(e.message);
      if (e.datos?.sugerencias) setVerificacion(e.datos);
    } finally {
      setEnviando(false);
    }
  };

  if (!habitacion) return error ? <Aviso>{error}</Aviso> : <Cargando />;
  const sugerencias = verificacion?.sugerencias;

  return (
    <>
      <div className="titular">
        <div>
          <p className="kicker">{t('paso', { actual: 2, total: 3 })}</p>
          <h1>{habitacion.categoria} · {t('habitacion')} {habitacion.numero}</h1>
          <p className="bajada">{habitacion.descripcion}</p>
        </div>
      </div>

      <div className="detalle">
        <div className="galeria">
          <img className="galeria__principal" src={habitacion.imagenes[0]} alt={t('foto_habitacion', { numero: habitacion.numero })} />
          <div className="galeria__miniaturas">
            {habitacion.imagenes.slice(1).map((imagen, indice) => (
              <img key={imagen} src={imagen} alt={t('foto_detalle', { numero: habitacion.numero, indice: indice + 2 })} loading="lazy" />
            ))}
          </div>
          <Calendario habitacionId={habitacion.id} llegada={llegada} salida={salida} alCambiar={cambiarFechas} />
        </div>

        <aside className="panel">
          <p>{habitacion.caracteristicas} · {t('huespedes', { cantidad: habitacion.capacidad })}</p>
          <p className="texto-suave">{habitacion.ubicacion} · {habitacion.equipamiento}</p>
          <div className="fila-valor">
            <span className="texto-suave">{t('precio_diario')}</span>
            <span className="precio">{clp(habitacion.precio_diario)} CLP</span>
          </div>

          <div className="fila-campos">
            <label className="campo">
              <span>{t('llegada')}</span>
              <input type="date" value={llegada} min={hoyIso()}
                onChange={(e) => cambiarFechas({ llegada: e.target.value, salida: e.target.value >= salida ? sumarDias(e.target.value, 1) : salida })} />
            </label>
            <label className="campo">
              <span>{t('salida')}</span>
              <input type="date" value={salida} min={sumarDias(llegada, 1)} onChange={(e) => setSalida(e.target.value)} />
            </label>
          </div>

          {verificacion?.disponible && (
            <Aviso tipo="exito">✓ {t('disponible_noches', { noches: verificacion.noches })}</Aviso>
          )}
          {verificacion && !verificacion.disponible && (
            <div className="aviso aviso--error" role="alert">
              <p><strong>✕ {t('no_disponible')}</strong></p>
              {sugerencias?.reducir_noches && (
                <p>
                  {t('sugerencia_reducir', { noches: sugerencias.reducir_noches.noches, fecha: fechaLarga(sugerencias.reducir_noches.fecha_fin, idioma) })}{' '}
                  <button type="button" className="boton boton--texto"
                    onClick={() => setSalida(sugerencias.reducir_noches.fecha_fin)}>{t('aplicar')}</button>
                </p>
              )}
              {sugerencias?.otras_habitaciones?.length > 0 && (
                <>
                  <p>{t('sugerencia_otras')}</p>
                  <ul className="lista-sugerencias">
                    {sugerencias.otras_habitaciones.map((otra) => (
                      <li key={otra.id}>
                        <Link to={`/habitaciones/${otra.id}?llegada=${llegada}&salida=${salida}`}>
                          {t('habitacion')} {otra.numero} · {otra.categoria}
                        </Link>{' '}· {clp(otra.valor_total)}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

          <Aviso>{error}</Aviso>

          {verificacion && (
            <div className="totales">
              <div className="fila-valor"><span>{t('valor_total')}</span><strong>{clp(verificacion.valor_total)}</strong></div>
              <div className="fila-valor">
                <span className="texto-suave">{t('abono_ahora')}</span>
                <strong className="precio-destacado">{clp(verificacion.monto_abono)} CLP</strong>
              </div>
            </div>
          )}

          <button type="button" className="boton" onClick={confirmar}
            disabled={!verificacion?.disponible || enviando || (usuario && usuario.rol !== 'cliente')}>
            {enviando ? t('procesando') : t('confirmar_reserva')}
          </button>
          {usuario && usuario.rol !== 'cliente' && <p className="texto-mini">{t('solo_clientes')}</p>}
          {!usuario && <p className="texto-mini">{t('requiere_ingreso')}</p>}
        </aside>
      </div>
    </>
  );
}
