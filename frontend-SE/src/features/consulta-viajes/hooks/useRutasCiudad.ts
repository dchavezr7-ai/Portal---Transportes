import { useAsyncResource } from '@/hooks/useAsyncResource'
import { consultaViajesService } from '@/services'
import type { RutaCiudad } from '@/types/consultaViaje'

const SIN_RUTAS: RutaCiudad[] = []

/** Rutas activas origen→destino del backend (`GET /api/rutas-ciudad`), con carga/error/reintento. */
export function useRutasCiudad() {
  const { data, cargando, error, reintentar } = useAsyncResource('rutas-ciudad', () =>
    consultaViajesService.listarRutasCiudad(),
  )
  return { rutas: data ?? SIN_RUTAS, cargando, error, reintentar }
}
