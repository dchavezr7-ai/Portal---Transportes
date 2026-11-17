import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { StartupScreen } from '@/components/startup/StartupScreen'
import { consultarDisponibilidad } from '@/services/api/saludService'
import { crearCicloInicializacion, type CicloInicializacion } from '@/utils/cicloInicializacion'
import { ESTADOS_INICIO, TIEMPOS_INICIO, type EstadoCiclo } from '@/utils/inicializacion'

type Fase = 'oculta' | 'visible' | 'despedida' | 'terminada'

interface StartupGateProps {
  children: ReactNode
}

function prefiereMenosMovimiento(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

function estaEnLinea(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}

/**
 * Puerta global de arranque del SE. Comprueba `GET /api/health/ready` y solo
 * monta `children` (providers, autenticación, login, layout y vistas) cuando
 * el backend responde 200 con `status: "READY"`. Hasta entonces no se monta
 * nada que dependa del backend, por lo que no se emite ninguna solicitud de
 * negocio. No toca tokens ni sessionStorage.
 */
export function StartupGate({ children }: StartupGateProps) {
  const [ciclo, setCiclo] = useState<EstadoCiclo>({
    estado: ESTADOS_INICIO.INITIALIZING,
    tipo: null,
    lento: false,
    intentos: 0,
  })
  const [fase, setFase] = useState<Fase>('oculta')
  const [sinInternet, setSinInternet] = useState(() => !estaEnLinea())
  const cicloRef = useRef<CicloInicializacion | null>(null)
  const faseRef = useRef<Fase>(fase)
  faseRef.current = fase

  useEffect(() => {
    const controlador = crearCicloInicializacion({
      consultar: consultarDisponibilidad,
      alCambiar: setCiclo,
    })
    cicloRef.current = controlador
    controlador.iniciar()

    const alVolverEnLinea = () => {
      setSinInternet(false)
      controlador.despertar()
    }
    const alPerderConexion = () => setSinInternet(true)
    window.addEventListener('online', alVolverEnLinea)
    window.addEventListener('offline', alPerderConexion)

    return () => {
      window.removeEventListener('online', alVolverEnLinea)
      window.removeEventListener('offline', alPerderConexion)
      controlador.detener()
      cicloRef.current = null
    }
  }, [])

  const listo = ciclo.estado === ESTADOS_INICIO.READY

  useEffect(() => {
    if (listo || fase !== 'oculta') return undefined
    if (ciclo.estado === ESTADOS_INICIO.WAITING || ciclo.estado === ESTADOS_INICIO.ERROR) {
      setFase('visible')
      return undefined
    }
    const id = setTimeout(() => setFase('visible'), TIEMPOS_INICIO.retrasoVisible)
    return () => clearTimeout(id)
  }, [listo, fase, ciclo.estado])

  useEffect(() => {
    if (!listo) return undefined
    if (faseRef.current === 'oculta') {
      setFase('terminada')
      return undefined
    }
    if (faseRef.current !== 'visible') return undefined

    const espera = prefiereMenosMovimiento() ? TIEMPOS_INICIO.despedidaReducida : TIEMPOS_INICIO.despedida
    const id = setTimeout(() => setFase('despedida'), espera)
    return () => clearTimeout(id)
  }, [listo])

  const alTerminarSalida = useCallback(() => setFase('terminada'), [])
  const reintentar = useCallback(() => cicloRef.current?.reintentar(), [])

  const montarApp = listo && (fase === 'despedida' || fase === 'terminada')
  const mostrarPantalla = fase === 'visible' || fase === 'despedida'

  return (
    <>
      {montarApp && children}
      {mostrarPantalla && (
        <StartupScreen
          estado={ciclo.estado}
          tipo={ciclo.tipo}
          lento={ciclo.lento}
          sinInternet={sinInternet}
          saliendo={fase === 'despedida'}
          onSalidaCompleta={alTerminarSalida}
          onReintentar={reintentar}
        />
      )}
    </>
  )
}
