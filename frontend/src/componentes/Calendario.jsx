import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useIdioma } from '../contexto/Idioma.jsx';
import { hoyIso, sumarDias } from '../formato.js';

function diasDelMes(mes) {
  const [anio, numero] = mes.split('-').map(Number);
  const total = new Date(Date.UTC(anio, numero, 0)).getUTCDate();
  const primerDia = (new Date(Date.UTC(anio, numero - 1, 1)).getUTCDay() + 6) % 7;
  const celdas = Array.from({ length: primerDia }, () => null);
  for (let dia = 1; dia <= total; dia += 1) celdas.push(`${mes}-${String(dia).padStart(2, '0')}`);
  return celdas;
}

function moverMes(mes, delta) {
  const [anio, numero] = mes.split('-').map(Number);
  return new Date(Date.UTC(anio, numero - 1 + delta, 1)).toISOString().slice(0, 7);
}

// HU-03 / RF.3: calendario visual de disponibilidad de una habitacion
export default function Calendario({ habitacionId, llegada, salida, alCambiar }) {
  const { idioma, t } = useIdioma();
  const [mes, setMes] = useState((llegada || hoyIso()).slice(0, 7));
  const [ocupados, setOcupados] = useState([]);
  const [eligiendoSalida, setEligiendoSalida] = useState(false);
  const hoy = hoyIso();

  useEffect(() => {
    let vigente = true;
    api(`/habitaciones/${habitacionId}/ocupacion?mes=${mes}`)
      .then((datos) => { if (vigente) setOcupados(datos.ocupados); })
      .catch(() => { if (vigente) setOcupados([]); });
    return () => { vigente = false; };
  }, [habitacionId, mes]);

  const estaOcupado = (dia) => ocupados.some((o) => o.fecha_inicio <= dia && dia < o.fecha_fin);

  const elegir = (dia) => {
    if (eligiendoSalida && dia > llegada) {
      alCambiar({ llegada, salida: dia });
      setEligiendoSalida(false);
    } else {
      alCambiar({ llegada: dia, salida: sumarDias(dia, 1) });
      setEligiendoSalida(true);
    }
  };

  const textoMes = new Date(`${mes}-15T12:00:00Z`)
    .toLocaleDateString(idioma === 'en' ? 'en-US' : 'es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const nombreMes = textoMes.charAt(0).toUpperCase() + textoMes.slice(1);
  const semana = idioma === 'en' ? ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] : ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

  return (
    <div className="calendario">
      <div className="calendario__cabecera">
        <button type="button" className="boton boton--texto" onClick={() => setMes(moverMes(mes, -1))}
          disabled={mes <= hoy.slice(0, 7)} aria-label={t('mes_anterior')}>‹</button>
        <strong className="calendario__mes">{nombreMes}</strong>
        <button type="button" className="boton boton--texto" onClick={() => setMes(moverMes(mes, 1))}
          aria-label={t('mes_siguiente')}>›</button>
      </div>
      <div className="calendario__grilla" role="grid">
        {semana.map((nombre) => <span key={nombre} className="calendario__dia-semana">{nombre}</span>)}
        {diasDelMes(mes).map((dia, indice) => {
          if (!dia) return <span key={`vacio-${indice}`} />;
          const ocupado = estaOcupado(dia);
          const pasado = dia < hoy;
          const enRango = llegada && salida && dia >= llegada && dia < salida;
          const clases = ['calendario__celda'];
          if (ocupado) clases.push('calendario__celda--ocupada');
          if (enRango) clases.push('calendario__celda--elegida');
          if (dia === llegada) clases.push('calendario__celda--inicio');
          return (
            <button key={dia} type="button" className={clases.join(' ')} disabled={pasado || (ocupado && !eligiendoSalida)}
              onClick={() => elegir(dia)} aria-pressed={Boolean(enRango)}
              aria-label={`${dia}${ocupado ? `, ${t('ocupado')}` : ''}`}>
              {Number(dia.slice(8))}
            </button>
          );
        })}
      </div>
      <p className="calendario__leyenda">
        <span className="muestra muestra--elegida" /> {t('leyenda_elegida')}
        <span className="muestra muestra--ocupada" /> {t('leyenda_ocupada')}
        <span className="texto-suave"> · {eligiendoSalida ? t('elige_salida') : t('elige_llegada')}</span>
      </p>
    </div>
  );
}
