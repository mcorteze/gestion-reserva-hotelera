import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useIdioma } from '../contexto/Idioma.jsx';
import { Aviso, Cargando, Encabezado } from '../componentes/Comunes.jsx';
import { clp, hoyIso, sumarDias, usd } from '../formato.js';

// HU-04 / RF.4 y HU-03 / RF.3: catalogo
export default function Catalogo() {
  const { t } = useIdioma();
  const [llegada, setLlegada] = useState(sumarDias(hoyIso(), 7));
  const [salida, setSalida] = useState(sumarDias(hoyIso(), 10));
  const [habitaciones, setHabitaciones] = useState(null);
  const [busqueda, setBusqueda] = useState(null);
  const [dolar, setDolar] = useState(null);
  const [error, setError] = useState('');
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    api('/habitaciones').then(setHabitaciones).catch((e) => setError(e.message));
    api('/indicadores/dolar').then(setDolar).catch(() => setDolar(null));
  }, []);

  const buscar = async (evento) => {
    evento.preventDefault();
    setError('');
    setBuscando(true);
    try {
      const datos = await api(`/habitaciones/disponibles?desde=${llegada}&hasta=${salida}`);
      setBusqueda(datos);
    } catch (e) {
      setError(e.message);
    } finally {
      setBuscando(false);
    }
  };

  const lista = busqueda ? busqueda.habitaciones : habitaciones;
  const parametros = busqueda ? `?llegada=${busqueda.desde}&salida=${busqueda.hasta}` : '';

  return (
    <>
      <Encabezado kicker={t('catalogo_kicker')} titulo={t('catalogo_titulo')} bajada={t('catalogo_bajada')}>
        <form className="buscador" onSubmit={buscar}>
          <label className="campo">
            <span>{t('llegada')}</span>
            <input type="date" value={llegada} min={hoyIso()} required
              onChange={(e) => { setLlegada(e.target.value); if (e.target.value >= salida) setSalida(sumarDias(e.target.value, 1)); }} />
          </label>
          <label className="campo">
            <span>{t('salida')}</span>
            <input type="date" value={salida} min={sumarDias(llegada, 1)} required onChange={(e) => setSalida(e.target.value)} />
          </label>
          <button type="submit" className="boton" disabled={buscando}>{buscando ? t('buscando') : t('buscar')}</button>
        </form>
      </Encabezado>

      <Aviso>{error}</Aviso>

      {!lista ? <Cargando /> : (
        <>
          <p className="resultado">
            {busqueda
              ? t('resultado_busqueda', { cantidad: lista.length, noches: busqueda.noches })
              : t('resultado_catalogo', { cantidad: lista.length })}
            {busqueda && <button type="button" className="boton boton--texto" onClick={() => setBusqueda(null)}>{t('ver_todas')}</button>}
          </p>
          {lista.length === 0 && <Aviso tipo="info">{t('sin_disponibles')}</Aviso>}
          <div className="grilla-tarjetas">
            {lista.map((habitacion) => (
              <article key={habitacion.id} className="tarjeta-habitacion">
                <img src={habitacion.imagenes[0]} alt={t('foto_habitacion', { numero: habitacion.numero })} loading="lazy" />
                <div className="tarjeta-habitacion__cuerpo">
                  <p className="kicker">{habitacion.categoria} · {habitacion.categoria_precio === 'premium' ? 'Premium' : t('turista')}</p>
                  <h2>{t('habitacion')} {habitacion.numero}</h2>
                  <p>{habitacion.caracteristicas} · {t('huespedes', { cantidad: habitacion.capacidad })}</p>
                  <p className="texto-suave">{habitacion.ubicacion} · {habitacion.equipamiento}</p>
                  <div className="tarjeta-habitacion__pie">
                    <div>
                      <p className="precio">{clp(habitacion.precio_diario)}</p>
                      <p className="texto-mini">{t('clp_por_noche')}{dolar ? ` · ≈ ${usd(habitacion.precio_diario, dolar.valor)}` : ''}</p>
                    </div>
                    <Link className="boton" to={`/habitaciones/${habitacion.id}${parametros}`}>{t('ver_disponibilidad')}</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {dolar && <p className="texto-mini nota-fuente">{t('nota_dolar', { valor: dolar.valor.toLocaleString('es-CL'), fecha: dolar.fecha })}</p>}
        </>
      )}
    </>
  );
}
