import { Navigate, useLocation } from 'react-router-dom';
import { useSesion } from '../contexto/Sesion.jsx';
import { useIdioma } from '../contexto/Idioma.jsx';

export function Cargando() {
  const { t } = useIdioma();
  return <p className="cargando" role="status">{t('cargando')}</p>;
}

export function Aviso({ tipo = 'error', children }) {
  if (!children) return null;
  return <div className={`aviso aviso--${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>{children}</div>;
}

const COLORES_ESTADO = { confirmada: 'exito', aprobado: 'exito', pendiente: 'alerta', cancelada: 'neutro', rechazado: 'error' };

export function Estado({ valor }) {
  const { t } = useIdioma();
  return <span className={`etiqueta etiqueta--${COLORES_ESTADO[valor] || 'neutro'}`}>{t(`estado_${valor}`)}</span>;
}

export function Encabezado({ kicker, titulo, bajada, children }) {
  return (
    <div className="titular">
      <div>
        {kicker && <p className="kicker">{kicker}</p>}
        <h1>{titulo}</h1>
        {bajada && <p className="bajada">{bajada}</p>}
      </div>
      {children && <div className="titular__acciones">{children}</div>}
    </div>
  );
}

export function RequiereRol({ roles, children }) {
  const { usuario, cargando } = useSesion();
  const { pathname, search } = useLocation();
  if (cargando) return <Cargando />;
  if (!usuario) return <Navigate to={`/ingresar?volver=${encodeURIComponent(pathname + search)}`} replace />;
  if (!roles.includes(usuario.rol)) {
    return <Aviso>Tu perfil no tiene acceso a esta sección.</Aviso>;
  }
  return children;
}

export function Ticket({ ticket }) {
  const { t } = useIdioma();
  if (!ticket) return null;
  return (
    <div className="ticket">
      {ticket.qr_imagen
        ? <img className="ticket__qr" src={ticket.qr_imagen} alt={t('ticket_qr_alt', { codigo: ticket.codigo })} width="160" height="160" />
        : <div className="ticket__qr ticket__qr--vacio">{t('ticket_qr_pendiente')}</div>}
      <div>
        <p className="kicker">{t('ticket_titulo')}</p>
        <p className="ticket__codigo">{ticket.codigo}</p>
        <p className="texto-suave">
          {ticket.correo_enviado || ticket.enviado
            ? t('ticket_enviado', { correo: ticket.correo })
            : t('ticket_simulado', { correo: ticket.correo })}
        </p>
        <p className="texto-suave">{t('ticket_instruccion')}</p>
      </div>
    </div>
  );
}
