import { TIMEOUT_API_MS, URL_BASE_API } from '@/config/api'

export class ApiError extends Error {
    readonly status: number
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
let proveedorToken: ProveedorToken = () => null

export function configurarProveedorToken(proveedor: ProveedorToken): void {
  proveedorToken = proveedor
}

export interface OpcionesApi extends Omit<RequestInit, 'body'> {
    body?: unknown
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
