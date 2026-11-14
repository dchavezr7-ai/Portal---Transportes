import { RUTA_SALUD_API, URL_BASE_API } from '@/config/api'

export interface ResultadoConexionApi {
  /** `true` si el backend respondió y el navegador permitió leer la respuesta (CORS correcto). */
  alcanzable: boolean
  /** Código HTTP; `0` si no hubo respuesta (red, CORS o timeout). */
  status: number
  urlBase: string
}

/**
 * Comprobación puntual de conectividad contra `GET /api/health/ready`
 * (endpoint público y de solo lectura). No se invoca desde la UI: sirve para
 * validar, con `npm run dev` y desde la consola del navegador, que la URL y
 * CORS están bien (en producción usar curl o la pestaña Network):
 *
 *   (await import('/src/services/api/verificarConexion.ts')).verificarConexionApi()
 *
 * Un `status` 503 significa que el backend responde pero aún está arrancando
 * (Render): la conexión y CORS funcionan. `status: 0` indica red, timeout o
 * CORS bloqueado.
 */
export async function verificarConexionApi(timeoutMs = 30_000): Promise<ResultadoConexionApi> {
  const controlador = new AbortController()
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs)
  try {
    const respuesta = await fetch(`${URL_BASE_API}${RUTA_SALUD_API}`, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
      headers: { Accept: 'application/json' },
      signal: controlador.signal,
    })
    return { alcanzable: true, status: respuesta.status, urlBase: URL_BASE_API }
  } catch {
    return { alcanzable: false, status: 0, urlBase: URL_BASE_API }
  } finally {
    clearTimeout(temporizador)
  }
}
