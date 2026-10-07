import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Aviso, Cargando, Encabezado } from '../../componentes/Comunes.jsx';
import { clp } from '../../formato.js';

const CATEGORIAS = [
  { clave: 'turista', nombre: 'Categoría Turista' },
  { clave: 'premium', nombre: 'Categoría Premium' }
];

// HU-16 / RF.16: precios
export default function Precios() {
  const [habitaciones, setHabitaciones] = useState(null);
  const [precios, setPrecios] = useState({});
  const [mensaje, setMensaje] = useState({ tipo: 'exito', texto: '' });
  const [guardando, setGuardando] = useState(false);

  const cargar = (lista) => {
    setHabitaciones(lista);
    setPrecios(Object.fromEntries(lista.map((h) => [h.id, String(h.precio_diario)])));
  };

  useEffect(() => {
    api('/habitaciones').then(cargar).catch((e) => setMensaje({ tipo: 'error', texto: e.message }));
  }, []);

  const invalido = (valor) => !/^\d+$/.test(valor) || Number(valor) <= 0;
  const cambios = habitaciones ? habitaciones.filter((h) => precios[h.id] !== String(h.precio_diario)) : [];
  const hayErrores = cambios.some((h) => invalido(precios[h.id]));

  const guardar = async (evento) => {
    evento.preventDefault();
    setGuardando(true);
    setMensaje({ tipo: 'exito', texto: '' });
    try {
      const lista = await api('/habitaciones/precios', {
        metodo: 'PUT',
        cuerpo: { cambios: cambios.map((h) => ({ id: h.id, precio_diario: Number(precios[h.id]) })) }
      });
      cargar(lista);
      setMensaje({ tipo: 'exito', texto: `Se actualizaron ${cambios.length} precios. Las nuevas reservas usarán estos valores.` });
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <Encabezado kicker="Tarifas" titulo="Actualización de precios" bajada="Edita el precio diario de cada habitación. Las reservas ya registradas mantienen su valor." />
      <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>
      {!habitaciones ? <Cargando /> : (
        <form onSubmit={guardar}>
          {CATEGORIAS.map((categoria) => (
            <section key={categoria.clave} className="panel">
              <h2>{categoria.nombre}</h2>
              <div className="tabla-desplazable">
                <table className="tabla">
                  <thead><tr><th>Habitación</th><th>Tipo</th><th>Precio actual</th><th>Nuevo precio diario (CLP)</th></tr></thead>
                  <tbody>
                    {habitaciones.filter((h) => h.categoria_precio === categoria.clave).map((h) => (
                      <tr key={h.id}>
                        <td><strong>{h.numero}</strong></td>
                        <td>{h.categoria}</td>
                        <td>{clp(h.precio_diario)}</td>
                        <td>
                          <input className={invalido(precios[h.id]) ? 'es-invalido' : ''} inputMode="numeric" value={precios[h.id]}
                            aria-label={`Precio diario habitación ${h.numero}`}
                            onChange={(e) => setPrecios({ ...precios, [h.id]: e.target.value.replace(/\D/g, '') })} />
                          {invalido(precios[h.id]) && <span className="texto-error"> Debe ser un número positivo</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
          <div className="barra-acciones">
            <span className="texto-suave">{cambios.length} cambios sin guardar</span>
            <button type="submit" className="boton" disabled={cambios.length === 0 || hayErrores || guardando}>
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
