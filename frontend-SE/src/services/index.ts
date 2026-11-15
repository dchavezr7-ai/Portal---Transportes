import type { CatalogService, ClientesService, ConsultaViajesService, DashboardService } from './contracts'
import { consultaViajesService as consultaViajesServiceApi } from './api/consultaViajesService'
import { clientesService as clientesServiceApi } from './api/clientesService'
import { catalogServiceMock } from './mock/catalogService'
import { dashboardServiceMock } from './mock/dashboardService'

export * from './contracts'
export { ServiceError, esServiceError } from './errors'

export const catalogService: CatalogService = catalogServiceMock
export const dashboardService: DashboardService = dashboardServiceMock
export const consultaViajesService: ConsultaViajesService = consultaViajesServiceApi
export const clientesService: ClientesService = clientesServiceApi
