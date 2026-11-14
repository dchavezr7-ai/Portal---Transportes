import { TIMEOUT_API_MS, URL_BASE_API } from '@/config/api'

/**
 * Cliente HTTP reutilizable (fetch) para hablar con el backend real.
 *
 * Replica el patrón del Portal (`httpCliente.js`): URL base centralizada,
 * `Authorization: Bearer` opcional y errores normalizados. Queda PREPARADO y
 * DISPONIBLE, pero ningún servicio ni componente lo usa todavía: los
 * contratos de `services/contracts.ts` siguen resueltos por los mock.
 *
 * Los únicos encabezados que el backend acepta en CORS son `Authorization`,
 * `Content-Type` y `X-Token-Consulta`; no enviar otros desde el navegador.
 */

/** Error de comunicación con la API (red, timeout o respuesta HTTP no exitosa). */
export class ApiError extends Error {
  /** Código HTTP; `0` si no hubo respuesta (red, CORS o timeout). */
  readonly status: number
  /** `true` cuando no hubo respuesta: el resultado en el servidor es desconocido. */
  readonly sinRespuesta: boolean
  readonly detalles: unknown

  constructor(message: string, status: number, sinRespuesta = false, detalles: unknown = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.sinRespuesta = sinRespuesta
    this.detalles = detalles
  }
}

export function esApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

type ProveedorToken = () => string | null

// Por defecto no se envía token: el SE todavía usa autenticación mock.
let proveedorToken: ProveedorToken = () => null

/** Registra de dónde leer el JWT cuando el SE se autentique contra el backend. */
export function configurarProveedorToken(proveedor: ProveedorToken): void {
  proveedorToken = proveedor
}

export interface OpcionesApi extends Omit<RequestInit, 'body'> {
  /** Objeto serializable a JSON; se envía con `Content-Type: application/json`. */
  body?: unknown
  /** Adjunta el JWT si existe (por defecto `true`). */
  autenticar?: boolean
  timeoutMs?: number
}

export async function solicitarApi<T = unknown>(ruta: string, opciones: OpcionesApi = {}): Promise<T> {
  const { autenticar = true, timeoutMs = TIMEOUT_API_MS, body, headers, ...resto } = opciones

  const encabezados = new Headers(headers)
  if (body !== undefined && !encabezados.has('Content-Type')) {
    encabezados.set('Content-Type', 'application/json')
  }
  const token = autenticar ? proveedorToken() : null
  if (token) encabezados.set('Authorization', `Bearer ${token}`)

  const controlador = new AbortController()
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs)

  let respuesta: Response
  try {
    respuesta = await fetch(`${URL_BASE_API}${ruta}`, {
      ...resto,
      headers: encabezados,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controlador.signal,
    })
  } catch {
    throw new ApiError(
      controlador.signal.aborted
        ? 'El servidor está tardando en responder.'
        : 'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.',
      0,
      true,
    )
  } finally {
    clearTimeout(temporizador)
  }

  const cuerpo = respuesta.status === 204 ? null : await respuesta.json().catch(() => null)

  if (!respuesta.ok) {
    throw new ApiError(
      (cuerpo as { mensaje?: string } | null)?.mensaje ?? 'Ocurrió un error al comunicarse con el servidor.',
      respuesta.status,
      false,
      (cuerpo as { detalles?: unknown } | null)?.detalles ?? null,
    )
  }

  return cuerpo as T
}
