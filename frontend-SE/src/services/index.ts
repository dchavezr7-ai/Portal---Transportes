import type { CatalogService, ConsultaViajesService, DashboardService, TicketingService } from './contracts'
import { consultaViajesService as consultaViajesServiceApi } from './api/consultaViajesService'
import { catalogServiceMock } from './mock/catalogService'
import { dashboardServiceMock } from './mock/dashboardService'
import { ticketingServiceMock } from './mock/ticketingService'

export * from './contracts'
export { ServiceError, esServiceError } from './errors'

/**
 * ÚNICO punto donde se elige la implementación de los servicios.
 *
 * Para conectar una API real: crear `services/api/*` que implementen los
 * contratos de `contracts.ts` y reemplazar aquí las tres importaciones
 * `mock` por las `api`. Ningún componente ni hook necesita cambios.
 */
export const catalogService: CatalogService = catalogServiceMock
export const ticketingService: TicketingService = ticketingServiceMock
export const dashboardService: DashboardService = dashboardServiceMock

/**
 * Consulta de viajes y asientos: ya conectada al backend REAL (sin mock).
 * Es la única excepción a la regla anterior y es de solo lectura; el resto de
 * los servicios sigue siendo mock hasta que se migren por separado.
 */
export const consultaViajesService: ConsultaViajesService = consultaViajesServiceApi
