const URL_LOCAL_DESARROLLO = 'http://localhost:8080'

export const URL_BASE_API: string = (
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() || URL_LOCAL_DESARROLLO
).replace(/\/+$/, '')

export const TIMEOUT_API_MS = 30_000

export const RUTA_SALUD_API = '/api/health/ready'
