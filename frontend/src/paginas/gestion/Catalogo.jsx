import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Aviso, Cargando, Encabezado } from '../../componentes/Comunes.jsx';
import { clp } from '../../formato.js';

// HU-13 / RF.13: edicion del catalogo
export default function CatalogoGestion() {
  const [habitaciones, setHabitaciones] = useState(null);
  const [borradores, setBorradores] = useState({});
  const [mensaje, setMensaje] = useState({ tipo: 'exito', texto: '' });

  useEffect(() => {
    api('/habitaciones').then((lista) => {
      setHabitaciones(lista);
      setBorradores(Object.fromEntries(lista.map((h) => [h.id, {
        descripcion: h.descripcion || '', caracteristicas: h.caracteristicas || '', equipamiento: h.equipamiento || ''
      }])));
    }).catch((e) => setMensaje({ tipo: 'error', texto: e.message }));
  }, []);

  const cambiar = (id, campo) => (evento) => setBorradores({ ...borradores, [id]: { ...borradores[id], [campo]: evento.target.value } });

  const guardar = async (habitacion) => {
    setMensaje({ tipo: 'exito', texto: '' });
    try {
      const actualizada = await api(`/habitaciones/${habitacion.id}`, { metodo: 'PUT', cuerpo: borradores[habitacion.id] });
      setHabitaciones(habitaciones.map((h) => (h.id === actualizada.id ? actualizada : h)));
      setMensaje({ tipo: 'exito', texto: `Habitación ${habitacion.numero} actualizada en el catálogo.` });
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message });
    }
  };

  return (
    <>
      <Encabezado kicker="Catálogo" titulo="Información de habitaciones" bajada="Los cambios se publican de inmediato en el catálogo del cliente." />
      <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>
      {!habitaciones ? <Cargando /> : (
        <div className="lista">
          {habitaciones.map((habitacion) => (
            <form key={habitacion.id} className="panel edicion-habitacion" onSubmit={(e) => { e.preventDefault(); guardar(habitacion); }}>
              <img src={habitacion.imagenes[0]} alt={`Habitación ${habitacion.numero}`} />
              <div className="formulario">
                <h2>Habitación {habitacion.numero} · {habitacion.categoria}</h2>
                <p className="texto-suave">{habitacion.ubicacion} · {habitacion.capacidad} huéspedes · {clp(habitacion.precio_diario)} por noche</p>
                <label className="campo"><span>Descripción</span>
                  <input value={borradores[habitacion.id]?.descripcion ?? ''} onChange={cambiar(habitacion.id, 'descripcion')} />
                </label>
                <label className="campo"><span>Características</span>
                  <input value={borradores[habitacion.id]?.caracteristicas ?? ''} onChange={cambiar(habitacion.id, 'caracteristicas')} required />
                </label>
                <label className="campo"><span>Equipamiento</span>
                  <input value={borradores[habitacion.id]?.equipamiento ?? ''} onChange={cambiar(habitacion.id, 'equipamiento')} required />
                </label>
                <div><button type="submit" className="boton boton--chico">Guardar</button></div>
              </div>
            </form>
          ))}
        </div>
      )}
    </>
  );
}
