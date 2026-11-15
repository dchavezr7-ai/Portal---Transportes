import { URL_BASE_API } from '@/config/api'
import type {
  AsientoConsulta,
  EstadoAsiento,
  EventoAsiento,
  MapaAsientosConsulta,
  PisoConsulta,
  RutaCiudad,
  SesionReserva,
  ViajeConsulta,
} from '@/types/consultaViaje'
import type { ConsultaViajesService } from '../contracts'
import { ApiError, solicitarApi } from './httpClient'

const ESTADOS_ASIENTO: readonly EstadoAsiento[] = ['disponible', 'bloqueado', 'ocupado']

function aEstadoAsiento(valor: unknown): EstadoAsiento {
  return ESTADOS_ASIENTO.includes(valor as EstadoAsiento) ? (valor as EstadoAsiento) : 'ocupado'
}

interface AsientoRespuesta {
  idAsiento: number
  numero: string
  fila: number
  letra: string
  lado: string
  piso?: number
  estado: string
  precio: number | null
  esMio?: boolean
}

interface PisoRespuesta {
  piso: number
  filas: number
  asientosPorLado?: number[]
  descripcion?: string
  asientos?: AsientoRespuesta[]
}

interface MapaRespuesta {
  pisos?: number
  mapaPorPiso?: Record<string, PisoRespuesta>
}

interface SesionRespuesta {
  tokenSesion: string
  segundosRestantes: number
}

export function adaptarMapaAsientos(respuesta: MapaRespuesta | null): MapaAsientosConsulta {
  if (!respuesta || typeof respuesta !== 'object') {
    throw new ApiError('El servidor devolvió un mapa de asientos no válido.', 0)
  }
  const porPiso: PisoConsulta[] = Object.values(respuesta.mapaPorPiso ?? {})
    .map((p): PisoConsulta => {
      const asientos = (p.asientos ?? []).map(
        (a): AsientoConsulta => ({
          idAsiento: a.idAsiento,
          numero: a.numero,
          fila: a.fila,
          letra: a.letra,
          lado: a.lado === 'derecha' ? 'derecha' : 'izquierda',
          piso: p.piso,
          estado: aEstadoAsiento(a.estado),
          precio: a.precio ?? null,
          esMio: Boolean(a.esMio),
        }),
      )
      return {
        piso: p.piso,
        filas: p.filas,
        asientosPorLado: [p.asientosPorLado?.[0] ?? 0, p.asientosPorLado?.[1] ?? 0],
        descripcion: p.descripcion ?? `Piso ${p.piso}`,
        asientos,
      }
    })
    .sort((a, b) => a.piso - b.piso)
  return { pisos: respuesta.pisos ?? porPiso.length, porPiso }
}

export const consultaViajesService: ConsultaViajesService = {
  async listarRutasCiudad() {
    const rutas = await solicitarApi<RutaCiudad[]>('/api/rutas-ciudad', { autenticar: false })
    if (!Array.isArray(rutas)) throw new ApiError('El servidor devolvió una lista de rutas no válida.', 0)
    return rutas
  },

  async buscarViajes({ origen, destino, fecha, franjas }) {
    if (!origen.trim() || !destino.trim() || !fecha) {
      throw new ApiError('Origen, destino y fecha son obligatorios.', 400)
    }
    const parametros = new URLSearchParams({ origen: origen.trim(), destino: destino.trim(), fecha })
    if (franjas.length > 0) parametros.set('franjas', franjas.join(','))
    const viajes = await solicitarApi<ViajeConsulta[]>(`/api/viajes/buscar?${parametros}`, { autenticar: false })
    if (!Array.isArray(viajes)) throw new ApiError('El servidor devolvió una respuesta de viajes no válida.', 0)
    return viajes
  },

  async obtenerMapaAsientos(idViaje, tokenSesion) {
    const consulta = tokenSesion ? `?tokenSesion=${encodeURIComponent(tokenSesion)}` : ''
    const respuesta = await solicitarApi<MapaRespuesta>(`/api/viajes/${idViaje}/asientos${consulta}`, { autenticar: false })
    return adaptarMapaAsientos(respuesta)
  },

  async crearSesion(idViaje, minutos): Promise<SesionReserva> {
    const respuesta = await solicitarApi<SesionRespuesta>(`/api/viajes/${idViaje}/sesiones?minutos=${minutos}`, {
      method: 'POST',
      autenticar: false,
    })
    return { tokenSesion: respuesta.tokenSesion, expiraEn: Date.now() + respuesta.segundosRestantes * 1000 }
  },

  async bloquearAsiento(idViaje, idAsiento, tokenSesion) {
    await solicitarApi(`/api/viajes/${idViaje}/asientos/${idAsiento}/bloquear`, {
      method: 'POST',
      autenticar: false,
      body: { tokenSesion },
    })
  },

  async liberarAsiento(idViaje, idAsiento, tokenSesion) {
    await solicitarApi(`/api/viajes/${idViaje}/asientos/${idAsiento}/liberar`, {
      method: 'POST',
      autenticar: false,
      body: { tokenSesion },
    })
  },

  async liberarSesion(idViaje, tokenSesion) {
    await solicitarApi(`/api/viajes/${idViaje}/sesiones/liberar`, {
      method: 'POST',
      autenticar: false,
      body: { tokenSesion },
    })
  },

  suscribirAsientos(idViaje, { alAbrir, alError, alAsiento }) {
    const fuente = new EventSource(`${URL_BASE_API}/api/viajes/${idViaje}/asientos/eventos`)
    fuente.onopen = () => alAbrir?.()
    fuente.onerror = () => alError?.()
    fuente.addEventListener('asiento', (evento) => {
      try {
        const datos = JSON.parse((evento as MessageEvent<string>).data) as { idAsiento: number; estado: string }
        const parseado: EventoAsiento = { idAsiento: datos.idAsiento, estado: aEstadoAsiento(datos.estado) }
        alAsiento?.(parseado)
      } catch {
        return
      }
    })
    return () => fuente.close()
  },
}
