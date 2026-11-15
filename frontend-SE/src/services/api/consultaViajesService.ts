import { URL_BASE_API } from '@/config/api'
import type {
  AsientoConsulta,
  EstadoAsiento,
  EventoAsiento,
  MapaAsientosConsulta,
  PisoConsulta,
  RutaCiudad,
  ViajeConsulta,
} from '@/types/consultaViaje'
import type { ConsultaViajesService } from '../contracts'
import { ApiError, solicitarApi } from './httpClient'

/**
 * Implementación REAL de `ConsultaViajesService`. Usa los mismos endpoints
 * públicos que el Portal (no se creó ni modificó ningún endpoint):
 *
 *   GET /api/rutas-ciudad
 *   GET /api/viajes/buscar?origen&destino&fecha&horario
 *   GET /api/viajes/{id}/asientos
 *   GET /api/viajes/{id}/asientos/eventos   (SSE)
 *
 * Ninguno requiere JWT, por eso todas las llamadas van con `autenticar: false`.
 */

const ESTADOS_ASIENTO: readonly EstadoAsiento[] = ['disponible', 'bloqueado', 'ocupado']

function aEstadoAsiento(valor: unknown): EstadoAsiento {
  // Igual que el backend (`mapearEstado`): todo lo que no es libre ni bloqueado se trata como ocupado.
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

/** Convierte la respuesta del backend (mapa indexado por piso) en una lista ordenada y tipada. */
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

  async buscarViajes({ origen, destino, fecha, horario }) {
    if (!origen.trim() || !destino.trim() || !fecha) {
      throw new ApiError('Origen, destino y fecha son obligatorios.', 400)
    }
    const parametros = new URLSearchParams({ origen: origen.trim(), destino: destino.trim(), fecha, horario })
    const viajes = await solicitarApi<ViajeConsulta[]>(`/api/viajes/buscar?${parametros}`, { autenticar: false })
    if (!Array.isArray(viajes)) throw new ApiError('El servidor devolvió una respuesta de viajes no válida.', 0)
    return viajes
  },

  async obtenerMapaAsientos(idViaje) {
    const respuesta = await solicitarApi<MapaRespuesta>(`/api/viajes/${idViaje}/asientos`, { autenticar: false })
    return adaptarMapaAsientos(respuesta)
  },

  suscribirAsientos(idViaje, { alAbrir, alError, alAsiento }) {
    // EventSource no pasa por `solicitarApi`: necesita la URL absoluta.
    const fuente = new EventSource(`${URL_BASE_API}/api/viajes/${idViaje}/asientos/eventos`)
    fuente.onopen = () => alAbrir?.()
    fuente.onerror = () => alError?.()
    fuente.addEventListener('asiento', (evento) => {
      try {
        const datos = JSON.parse((evento as MessageEvent<string>).data) as { idAsiento: number; estado: string }
        const parseado: EventoAsiento = { idAsiento: datos.idAsiento, estado: aEstadoAsiento(datos.estado) }
        alAsiento?.(parseado)
      } catch {
        // evento mal formado: se ignora
      }
    })
    return () => fuente.close()
  },
}
