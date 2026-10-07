import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useSesion } from '../../contexto/Sesion.jsx';
import { Aviso, Cargando, Encabezado } from '../../componentes/Comunes.jsx';
import { NOMBRES_ROL } from '../../formato.js';

const VACIO = { nombre: '', correo: '', telefono: '', contrasena: '', rol: 'personal_hotel' };

// HU-14 / RF.14 y HU-15 / RF.15: cuentas
export default function Cuentas() {
  const { usuario } = useSesion();
  const esAdminHotel = usuario.rol === 'administrador_hotel';
  const rolesPermitidos = esAdminHotel ? Object.keys(NOMBRES_ROL) : ['personal_hotel'];
  const [filtro, setFiltro] = useState(esAdminHotel ? 'cliente' : 'personal_hotel');
  const [cuentas, setCuentas] = useState(null);
  const [formulario, setFormulario] = useState(null);
  const [porEliminar, setPorEliminar] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: 'exito', texto: '' });

  const cargar = useCallback(() => {
    setCuentas(null);
    return api(`/usuarios?rol=${filtro}`).then(setCuentas).catch((e) => setMensaje({ tipo: 'error', texto: e.message }));
  }, [filtro]);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async (evento) => {
    evento.preventDefault();
    setMensaje({ tipo: 'exito', texto: '' });
    const { id, ...datos } = formulario;
    if (id && !datos.contrasena) delete datos.contrasena;
    try {
      await api(id ? `/usuarios/${id}` : '/usuarios', { metodo: id ? 'PUT' : 'POST', cuerpo: datos });
      setMensaje({ tipo: 'exito', texto: id ? `Cuenta de ${datos.nombre} actualizada.` : `Cuenta de ${datos.nombre} creada.` });
      setFormulario(null);
      if (datos.rol !== filtro) setFiltro(datos.rol);
      else cargar();
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message });
    }
  };

  const eliminar = async (cuenta) => {
    setMensaje({ tipo: 'exito', texto: '' });
    try {
      await api(`/usuarios/${cuenta.id}`, { metodo: 'DELETE' });
      setMensaje({ tipo: 'exito', texto: `Cuenta de ${cuenta.nombre} eliminada.` });
      setPorEliminar(null);
      cargar();
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message });
      setPorEliminar(null);
    }
  };

  const cambiar = (campo) => (evento) => setFormulario({ ...formulario, [campo]: evento.target.value });

  return (
    <>
      <Encabezado kicker="Usuarios" titulo="Administración de cuentas"
        bajada={esAdminHotel ? 'Crea, modifica, consulta y elimina cuentas de clientes y trabajadores.' : 'Crea y administra las cuentas del personal del hotel.'}>
        <button type="button" className="boton" onClick={() => setFormulario({ ...VACIO, rol: filtro })}>Nueva cuenta</button>
      </Encabezado>

      {esAdminHotel && (
        <div className="pestanas" role="tablist">
          {rolesPermitidos.map((rol) => (
            <button key={rol} type="button" role="tab" aria-selected={filtro === rol}
              className={`pestanas__boton${filtro === rol ? ' es-activa' : ''}`} onClick={() => setFiltro(rol)}>
              {NOMBRES_ROL[rol]}
            </button>
          ))}
        </div>
      )}

      <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>

      {formulario && (
        <form className="panel formulario" onSubmit={guardar}>
          <h2>{formulario.id ? 'Modificar cuenta' : 'Nueva cuenta'}</h2>
          <div className="fila-campos">
            <label className="campo"><span>Nombre</span><input value={formulario.nombre} onChange={cambiar('nombre')} required /></label>
            <label className="campo"><span>Correo</span><input type="email" value={formulario.correo} onChange={cambiar('correo')} required /></label>
          </div>
          <div className="fila-campos">
            <label className="campo"><span>Teléfono</span><input value={formulario.telefono || ''} onChange={cambiar('telefono')} /></label>
            <label className="campo"><span>Perfil</span>
              <select value={formulario.rol} onChange={cambiar('rol')}>
                {rolesPermitidos.map((rol) => <option key={rol} value={rol}>{NOMBRES_ROL[rol]}</option>)}
              </select>
            </label>
          </div>
          <label className="campo">
            <span>{formulario.id ? 'Nueva contraseña (opcional)' : 'Contraseña inicial'}</span>
            <input type="password" value={formulario.contrasena} onChange={cambiar('contrasena')} required={!formulario.id} minLength={8} autoComplete="new-password" />
          </label>
          <p className="texto-mini">Mínimo 8 caracteres, con letras y números.</p>
          <div className="barra-acciones">
            <button type="button" className="boton boton--secundario" onClick={() => setFormulario(null)}>Descartar</button>
            <button type="submit" className="boton">Guardar</button>
          </div>
        </form>
      )}

      {!cuentas ? <Cargando /> : (
        <section className="panel">
          <div className="tabla-desplazable">
            <table className="tabla">
              <thead><tr><th>Nombre</th><th>Correo</th><th>Teléfono</th><th>Perfil</th><th>Reservas</th><th>Acciones</th></tr></thead>
              <tbody>
                {cuentas.length === 0 && <tr><td colSpan={6} className="texto-suave">No hay cuentas de este tipo.</td></tr>}
                {cuentas.map((cuenta) => (
                  <tr key={cuenta.id}>
                    <td><strong>{cuenta.nombre}</strong></td>
                    <td>{cuenta.correo}</td>
                    <td>{cuenta.telefono || '—'}</td>
                    <td>{NOMBRES_ROL[cuenta.rol]}</td>
                    <td>{cuenta.total_reservas}</td>
                    <td className="acciones">
                      <button type="button" className="boton boton--texto"
                        onClick={() => setFormulario({ id: cuenta.id, nombre: cuenta.nombre, correo: cuenta.correo, telefono: cuenta.telefono, rol: cuenta.rol, contrasena: '' })}>
                        Modificar
                      </button>
                      {cuenta.id !== usuario.id && (porEliminar === cuenta.id ? (
                        <>
                          <span className="texto-error">¿Eliminar?</span>
                          <button type="button" className="boton boton--texto boton--peligro" onClick={() => eliminar(cuenta)}>Sí, eliminar</button>
                          <button type="button" className="boton boton--texto" onClick={() => setPorEliminar(null)}>No</button>
                        </>
                      ) : (
                        <button type="button" className="boton boton--texto boton--peligro" onClick={() => setPorEliminar(cuenta.id)}>Eliminar</button>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
