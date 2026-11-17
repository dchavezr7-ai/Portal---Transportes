import { RUTA_SALUD_API, URL_BASE_API } from '@/config/api'
import { RESULTADOS, TIEMPOS_INICIO, clasificarRespuesta, type ResultadoSalud } from '@/utils/inicializacion'

interface OpcionesConsulta {
  signal?: AbortSignal
  timeoutMs?: number
  fetchImpl?: typeof fetch
  urlBase?: string
}

async function leerJson(respuesta: Response): Promise<unknown> {
  const tipo = respuesta.headers?.get?.('content-type') ?? ''
  if (!tipo.includes('json')) return null
  try {
    return await respuesta.json()
  } catch {
    return null
  }
}

export async function consultarDisponibilidad({
  signal,
  timeoutMs = TIEMPOS_INICIO.timeoutSolicitud,
  fetchImpl = globalThis.fetch,
  urlBase = URL_BASE_API,
}: OpcionesConsulta = {}): Promise<ResultadoSalud> {
  if (signal?.aborted) return { tipo: 'CANCELADO' }

  const controlador = new AbortController()
  const abortar = () => controlador.abort()
  signal?.addEventListener('abort', abortar, { once: true })
  const temporizador = setTimeout(abortar, timeoutMs)

  try {
    const respuesta = await fetchImpl(`${urlBase}${RUTA_SALUD_API}`, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
      headers: { Accept: 'application/json' },
      signal: controlador.signal,
    })
    return clasificarRespuesta(respuesta.status, await leerJson(respuesta))
  } catch {
    if (signal?.aborted) return { tipo: 'CANCELADO' }
    return { tipo: RESULTADOS.CONECTANDO, status: 0, timeout: controlador.signal.aborted }
  } finally {
    clearTimeout(temporizador)
    signal?.removeEventListener('abort', abortar)
  }
}
