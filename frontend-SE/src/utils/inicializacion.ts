export const ESTADOS_INICIO = {
  INITIALIZING: 'INITIALIZING',
  WAITING: 'WAITING',
  READY: 'READY',
  ERROR: 'ERROR',
} as const

export type EstadoInicio = (typeof ESTADOS_INICIO)[keyof typeof ESTADOS_INICIO]

export const RESULTADOS = {
  CONECTANDO: 'CONECTANDO',
  INICIANDO: 'INICIANDO',
  DEPENDENCIAS: 'DEPENDENCIAS',
  LISTO: 'LISTO',
} as const

export type TipoResultado = (typeof RESULTADOS)[keyof typeof RESULTADOS]

export type ResultadoSalud =
  | { tipo: TipoResultado; status?: number; timeout?: boolean }
  | { tipo: 'CANCELADO' }

export interface EstadoCiclo {
  estado: EstadoInicio
  tipo: TipoResultado | null
  lento: boolean
  intentos: number
}

export const TIEMPOS_INICIO = {
  intervaloInicial: 2500,
  intentosSinBackoff: 4,
  factorBackoff: 1.5,
  intervaloMaximo: 10000,
  variacion: 0.2,
  timeoutSolicitud: 15000,
  umbralLento: 2500,
  limiteEspera: 240000,
  retrasoVisible: 400,
  despedida: 900,
  despedidaReducida: 250,
} as const

export type TiemposInicio = typeof TIEMPOS_INICIO

export function clasificarRespuesta(status: number, cuerpo: unknown): ResultadoSalud {
  const datos = cuerpo !== null && typeof cuerpo === 'object' ? (cuerpo as { status?: unknown; fase?: unknown }) : null
  const estado = datos?.status

  if (status === 200 && estado === 'READY') return { tipo: RESULTADOS.LISTO, status }
  if (status === 200 && estado === 'DEGRADED') return { tipo: RESULTADOS.DEPENDENCIAS, status }
  if (status === 503 && estado === 'NOT_READY') {
    return { tipo: datos?.fase === 'DEPENDENCIAS' ? RESULTADOS.DEPENDENCIAS : RESULTADOS.INICIANDO, status }
  }
  return { tipo: RESULTADOS.CONECTANDO, status }
}

export function calcularEspera(intento: number, aleatorio: number = Math.random(), tiempos: TiemposInicio = TIEMPOS_INICIO): number {
  const pasosBackoff = Math.max(0, intento - tiempos.intentosSinBackoff)
  const base = Math.min(tiempos.intervaloMaximo, tiempos.intervaloInicial * Math.pow(tiempos.factorBackoff, pasosBackoff))
  const variacion = (aleatorio * 2 - 1) * tiempos.variacion
  return Math.round(base * (1 + variacion))
}

export function esperaAgotada(transcurrido: number, tiempos: TiemposInicio = TIEMPOS_INICIO): boolean {
  return transcurrido >= tiempos.limiteEspera
}

export interface EtapasConfirmadas {
  completadas: number
  activa: number
}

export function etapaDe(tipo: TipoResultado | null): EtapasConfirmadas {
  switch (tipo) {
    case RESULTADOS.INICIANDO:
      return { completadas: 1, activa: 1 }
    case RESULTADOS.DEPENDENCIAS:
      return { completadas: 2, activa: 2 }
    case RESULTADOS.LISTO:
      return { completadas: 3, activa: -1 }
    default:
      return { completadas: 0, activa: 0 }
  }
}

export interface MensajeInicio {
  clave: 'inicializando' | 'conectando' | 'esperando' | 'dependencias' | 'listo' | 'error' | 'sinInternet'
  titulo: string
  detalle: string
}

const MENSAJES: Record<MensajeInicio['clave'], Omit<MensajeInicio, 'clave'>> = {
  inicializando: {
    titulo: 'Preparando tu espacio de trabajo',
    detalle: 'Un momento, estamos dejando todo listo.',
  },
  conectando: {
    titulo: 'Conectando con RutaLibre',
    detalle: 'Estamos estableciendo una conexión segura.',
  },
  esperando: {
    titulo: 'Activando los servicios',
    detalle: 'Casi listo. Continuaremos de forma automática.',
  },
  dependencias: {
    titulo: 'Verificando la información',
    detalle: 'Estamos confirmando que tus datos estén disponibles.',
  },
  listo: {
    titulo: 'Todo listo',
    detalle: 'Bienvenido al Sistema Empresarial.',
  },
  error: {
    titulo: 'No pudimos conectar por ahora',
    detalle: 'El sistema está tardando más de lo habitual. Puedes volver a intentarlo sin perder tu sesión.',
  },
  sinInternet: {
    titulo: 'Sin conexión a internet',
    detalle: 'Continuaremos automáticamente cuando vuelvas a estar en línea.',
  },
}

const DETALLE_CONECTANDO_LENTO =
  'El sistema se está activando. La primera carga puede tardar un poco más de lo habitual.'

interface DatosMensaje {
  estado: EstadoInicio
  tipo: TipoResultado | null
  lento?: boolean
  sinInternet?: boolean
}

export function describirEstado({ estado, tipo, lento = false, sinInternet = false }: DatosMensaje): MensajeInicio {
  const armar = (clave: MensajeInicio['clave']): MensajeInicio => ({ clave, ...MENSAJES[clave] })

  if (estado === ESTADOS_INICIO.READY) return armar('listo')
  if (estado === ESTADOS_INICIO.ERROR) return armar('error')
  if (sinInternet) return armar('sinInternet')

  switch (tipo) {
    case RESULTADOS.INICIANDO:
      return armar('esperando')
    case RESULTADOS.DEPENDENCIAS:
      return armar('dependencias')
    case RESULTADOS.CONECTANDO:
      return lento ? { ...armar('conectando'), detalle: DETALLE_CONECTANDO_LENTO } : armar('conectando')
    default:
      return lento ? { ...armar('conectando'), detalle: DETALLE_CONECTANDO_LENTO } : armar('inicializando')
  }
}
