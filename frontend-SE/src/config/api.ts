/**
 * Configuración de conectividad con el backend (Spring Boot en Render).
 *
 * La URL base sale de la variable de entorno `VITE_API_URL`, la misma
 * convención que usa el Portal (Vite solo expone al navegador las variables
 * con prefijo `VITE_`). Si no está definida se usa el backend local de
 * desarrollo. Se elimina la barra final para poder concatenar rutas como
 * `/api/health/ready` sin generar `//`.
 *
 * Esta configuración NO activa ninguna migración: los servicios activos
 * siguen siendo los mock (ver `services/index.ts`).
 */
const URL_LOCAL_DESARROLLO = 'http://localhost:8080'

export const URL_BASE_API: string = (
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() || URL_LOCAL_DESARROLLO
).replace(/\/+$/, '')

/** Tiempo máximo de espera por defecto (ms). Render puede tardar en despertar. */
export const TIMEOUT_API_MS = 30_000

/** Ruta pública de disponibilidad del backend (no requiere JWT). */
export const RUTA_SALUD_API = '/api/health/ready'
