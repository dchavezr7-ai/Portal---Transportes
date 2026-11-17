import {
  ESTADOS_INICIO,
  RESULTADOS,
  TIEMPOS_INICIO,
  calcularEspera,
  esperaAgotada,
  type EstadoCiclo,
  type ResultadoSalud,
  type TiemposInicio,
} from './inicializacion.ts'

interface OpcionesCiclo {
  consultar: (opciones: { signal: AbortSignal }) => Promise<ResultadoSalud>
  alCambiar: (estado: EstadoCiclo) => void
  tiempos?: TiemposInicio
  ahora?: () => number
  programar?: (accion: () => void, ms: number) => ReturnType<typeof setTimeout>
  cancelar?: (id: ReturnType<typeof setTimeout>) => void
  aleatorio?: () => number
}

export interface CicloInicializacion {
  iniciar: () => void
  reintentar: () => void
  despertar: () => void
  detener: () => void
  obtenerEstado: () => EstadoCiclo
}

export function crearCicloInicializacion({
  consultar,
  alCambiar,
  tiempos = TIEMPOS_INICIO,
  ahora = () => Date.now(),
  programar = (accion, ms) => setTimeout(accion, ms),
  cancelar = (id) => clearTimeout(id),
  aleatorio = Math.random,
}: OpcionesCiclo): CicloInicializacion {
  let estado: EstadoCiclo = { estado: ESTADOS_INICIO.INITIALIZING, tipo: null, lento: false, intentos: 0 }
  let generacion = 0
  let enMarcha = false
  let controlador: AbortController | null = null
  let temporizadorLento: ReturnType<typeof setTimeout> | null = null
  let esperaActual: { id: ReturnType<typeof setTimeout>; resolver: () => void } | null = null

  function emitir(cambios: Partial<EstadoCiclo>) {
    estado = { ...estado, ...cambios }
    alCambiar(estado)
  }

  function limpiarTemporizadores() {
    if (temporizadorLento !== null) cancelar(temporizadorLento)
    temporizadorLento = null
    if (esperaActual) {
      cancelar(esperaActual.id)
      esperaActual.resolver()
      esperaActual = null
    }
  }

  function dormir(ms: number): Promise<void> {
    return new Promise((resolver) => {
      const id = programar(() => {
        esperaActual = null
        resolver()
      }, ms)
      esperaActual = { id, resolver }
    })
  }

  async function ejecutar(miGeneracion: number) {
    const inicio = ahora()
    const vigente = () => miGeneracion === generacion

    while (vigente()) {
      controlador = new AbortController()
      if (!estado.lento) {
        temporizadorLento = programar(() => {
          temporizadorLento = null
          if (vigente() && estado.estado !== ESTADOS_INICIO.READY) emitir({ lento: true })
        }, tiempos.umbralLento)
      }

      const resultado = await consultar({ signal: controlador.signal })
      if (temporizadorLento !== null) cancelar(temporizadorLento)
      temporizadorLento = null
      controlador = null

      if (!vigente() || resultado.tipo === 'CANCELADO') return

      if (resultado.tipo === RESULTADOS.LISTO) {
        enMarcha = false
        emitir({ estado: ESTADOS_INICIO.READY, tipo: RESULTADOS.LISTO })
        return
      }

      const intentos = estado.intentos + 1
      if (esperaAgotada(ahora() - inicio, tiempos)) {
        enMarcha = false
        emitir({ estado: ESTADOS_INICIO.ERROR, tipo: resultado.tipo, intentos })
        return
      }

      emitir({ estado: ESTADOS_INICIO.WAITING, tipo: resultado.tipo, intentos })
      await dormir(calcularEspera(intentos, aleatorio(), tiempos))
    }
  }

  function iniciar() {
    if (enMarcha || estado.estado === ESTADOS_INICIO.READY) return
    enMarcha = true
    generacion += 1
    emitir({ estado: ESTADOS_INICIO.INITIALIZING, tipo: null, lento: false, intentos: 0 })
    void ejecutar(generacion)
  }

  return {
    iniciar,
    reintentar() {
      if (estado.estado !== ESTADOS_INICIO.ERROR) return
      iniciar()
    },
    despertar() {
      if (!esperaActual) return
      const { id, resolver } = esperaActual
      esperaActual = null
      cancelar(id)
      resolver()
    },
    detener() {
      generacion += 1
      enMarcha = false
      controlador?.abort()
      controlador = null
      limpiarTemporizadores()
    },
    obtenerEstado: () => estado,
  }
}
