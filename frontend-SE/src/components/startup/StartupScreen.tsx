import { useEffect, useId, useRef } from 'react'
import { Lock, RefreshCw } from 'lucide-react'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { ESTADOS_INICIO, describirEstado, etapaDe, type EstadoInicio, type TipoResultado } from '@/utils/inicializacion'
import './startup-screen.css'

const ANCHO = 1200
const ALTO = 300

const PARADAS = [
  { x: 260, y: 205, etiqueta: 'Conexión' },
  { x: 600, y: 125, etiqueta: 'Servicios' },
  { x: 940, y: 195, etiqueta: 'Datos' },
]

const TRAMOS = [
  'M -60 250 C 40 250 140 205 260 205',
  'M 260 205 C 400 205 460 125 600 125',
  'M 600 125 C 740 125 800 195 940 195',
  'M 940 195 C 1060 195 1120 140 1260 110',
]

interface StartupScreenProps {
  estado: EstadoInicio
  tipo: TipoResultado | null
  lento: boolean
  sinInternet: boolean
  saliendo: boolean
  onSalidaCompleta: () => void
  onReintentar: () => void
}

export function StartupScreen({
  estado,
  tipo,
  lento,
  sinInternet,
  saliendo,
  onSalidaCompleta,
  onReintentar,
}: StartupScreenProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const raizRef = useRef<HTMLDivElement>(null)
  const botonRef = useRef<HTMLButtonElement>(null)

  const listo = estado === ESTADOS_INICIO.READY
  const conError = estado === ESTADOS_INICIO.ERROR
  const { completadas, activa } = etapaDe(listo ? 'LISTO' : tipo)
  const mensaje = describirEstado({ estado, tipo, lento, sinInternet })
  const trabajando = !listo && !conError
  const viajando = (trabajando && !sinInternet) || listo
  const tramoViajero = listo ? 3 : Math.max(0, activa)

  useEffect(() => {
    if (conError) botonRef.current?.focus()
  }, [conError])

  useEffect(() => {
    if (!saliendo) return undefined
    const nodo = raizRef.current
    let hecho = false
    const terminar = () => {
      if (hecho) return
      hecho = true
      onSalidaCompleta()
    }
    const alTerminar = (evento: TransitionEvent) => {
      if (evento.target === nodo && evento.propertyName === 'opacity') terminar()
    }
    nodo?.addEventListener('transitionend', alTerminar)
    const respaldo = setTimeout(terminar, 900)
    return () => {
      nodo?.removeEventListener('transitionend', alTerminar)
      clearTimeout(respaldo)
    }
  }, [saliendo, onSalidaCompleta])

  const clases = [
    'startup',
    listo && 'startup--listo',
    conError && 'startup--error',
    sinInternet && !listo && 'startup--sin-red',
    saliendo && 'startup--saliendo',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div ref={raizRef} className={clases} aria-busy={trabajando}>
      <div className="startup__fondo" aria-hidden="true">
        <span className="startup__resplandor" />
        <span className="startup__grano" />
      </div>

      <header className="startup__marca">
        <BrandLogo subtitle="Sistema Empresarial" size={40} />
      </header>

      <main className="startup__centro">
        <div className="startup__ruta">
          <svg
            className="startup__mapa"
            viewBox={`0 0 ${ANCHO} ${ALTO}`}
            role="img"
            aria-label={`Etapas completadas: ${completadas} de ${PARADAS.length}`}
          >
            <defs>
              <linearGradient id={`luz-${uid}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={ANCHO} y2="0">
                <stop offset="0" stopColor="#2dd4a8" />
                <stop offset="1" stopColor="#2dd4d4" />
              </linearGradient>
              <filter id={`brillo-${uid}`} x="-10%" y="-60%" width="120%" height="220%">
                <feGaussianBlur stdDeviation="5" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {TRAMOS.map((d) => (
              <path key={`base-${d}`} d={d} className="startup__camino" />
            ))}

            <g filter={`url(#brillo-${uid})`}>
              {TRAMOS.map((d, i) => (
                <path
                  key={`luz-${d}`}
                  d={d}
                  pathLength={1}
                  className="startup__luz"
                  stroke={`url(#luz-${uid})`}
                  style={{ strokeDashoffset: i < completadas || (i === 3 && listo) ? 0 : 1.02 }}
                />
              ))}
            </g>

            {PARADAS.map((parada, i) => {
              const hecha = i < completadas
              const enCurso = i === activa && trabajando
              return (
                <g
                  key={parada.etiqueta}
                  transform={`translate(${parada.x} ${parada.y})`}
                  className={['startup__parada', hecha && 'es-hecha', enCurso && 'es-activa'].filter(Boolean).join(' ')}
                >
                  <circle className="startup__parada-halo" r="22" />
                  <circle className="startup__parada-anillo" r="11" />
                  <circle className="startup__parada-nucleo" r="5" />
                  <path className="startup__parada-check" d="M-4.2 0.4 L-1.4 3.2 L4.4 -2.8" />
                </g>
              )
            })}

            {viajando && (
              <g
                key={`viajero-${tramoViajero}`}
                className={listo ? 'startup__viajero startup__viajero--sale' : 'startup__viajero'}
                style={{ ['--ruta' as string]: `path("${TRAMOS[tramoViajero]}")` }}
              >
                <circle className="startup__viajero-estela" r="16" />
                <circle className="startup__viajero-punto" r="5" />
              </g>
            )}
          </svg>

          <ol className="startup__etapas">
            {PARADAS.map((parada, i) => {
              const hecha = i < completadas
              const enCurso = i === activa && trabajando
              return (
                <li
                  key={parada.etiqueta}
                  className={hecha ? 'es-hecha' : enCurso ? 'es-activa' : undefined}
                  style={{ left: `${(parada.x / ANCHO) * 100}%`, top: `${((parada.y + 30) / ALTO) * 100}%` }}
                >
                  {parada.etiqueta}
                  <span className="startup__solo-lector">
                    {hecha ? ' (completada)' : enCurso ? ' (en curso)' : ' (pendiente)'}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>

        <div className="startup__mensaje">
          <div role="status" aria-live="polite" aria-atomic="true">
            <h1 key={mensaje.clave} className="startup__titulo">
              {mensaje.titulo}
            </h1>
            <p className="startup__detalle">{mensaje.detalle}</p>
          </div>
          {conError && (
            <button ref={botonRef} type="button" className="startup__boton" onClick={onReintentar}>
              <RefreshCw strokeWidth={2.2} aria-hidden="true" />
              Reintentar
            </button>
          )}
        </div>
      </main>

      <footer className="startup__pie">
        <Lock strokeWidth={2} aria-hidden="true" />
        Acceso restringido al personal autorizado
      </footer>
    </div>
  )
}
