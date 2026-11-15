import type { Agencia } from '@/types/agency'
import type {
  EventoAsiento,
  FiltrosConsulta,
  MapaAsientosConsulta,
  RutaCiudad,
  ViajeConsulta,
} from '@/types/consultaViaje'
import type { ConsultaDashboard, DatosDashboard } from '@/types/dashboard'
import type { MetodoPago } from '@/types/pago'
import type { ComprobanteOperacion, EstadoAsientosViaje, RegistrarOperacionInput } from '@/types/pasaje'
import type { Servicio } from '@/types/servicio'
import type { FiltrosViajes, Ruta, Viaje, ViajeListado } from '@/types/viaje'

/**
 * Contratos de servicios del SE. La UI y los hooks dependen SOLO de estas
 * interfaces (vía `services/index.ts`): pasar de mock a API real significa
 * crear `services/api/*` que las implemente y cambiar el export activo.
 * Los errores de dominio se señalan con `ServiceError`.
 */

export interface CatalogService {
  listarAgencias(): Promise<Agencia[]>
  listarServicios(): Promise<Servicio[]>
  listarMetodosPago(): Promise<MetodoPago[]>
  /** Ciudades que aparecen como origen o destino de alguna ruta. */
  listarCiudades(): Promise<string[]>
  /** Rutas con su duración; la UI las usa para mostrar duración y hora estimada de llegada. */
  listarRutas(): Promise<Ruta[]>
}

export interface TicketingService {
  /** Viajes de una fecha (desde la fecha de referencia en adelante) con su vendibilidad. */
  buscarViajes(filtros: FiltrosViajes): Promise<ViajeListado[]>
  obtenerViaje(id: string): Promise<Viaje>
  obtenerAsientos(viajeId: string): Promise<EstadoAsientosViaje>
  /**
   * Registra una operación de 1 a 6 asientos del mismo viaje, cada uno con
   * su pasajero, con un único pago para todo el grupo. Es atómica: si algún
   * asiento ya fue tomado, no se registra ninguno y se lanza
   * `ServiceError('ASIENTO_OCUPADO')` señalando cuál.
   */
  registrarOperacion(input: RegistrarOperacionInput): Promise<ComprobanteOperacion>
}

/**
 * Consulta de viajes y disponibilidad de asientos contra el backend REAL.
 * Es de solo lectura: no abre sesiones de reserva ni bloquea asientos. Se
 * mantiene separado de `TicketingService` (mock, incluye la venta) para no
 * mezclar datos reales con la simulación del asistente "Registrar pasaje".
 */
export interface ConsultaViajesService {
  /** Pares origen→destino activos (`GET /api/rutas-ciudad`). */
  listarRutasCiudad(): Promise<RutaCiudad[]>
  /** `GET /api/viajes/buscar`. Lanza `ApiError` ante 400 u otros fallos. */
  buscarViajes(filtros: FiltrosConsulta): Promise<ViajeConsulta[]>
  /** `GET /api/viajes/{id}/asientos` sin token de sesión. */
  obtenerMapaAsientos(idViaje: number): Promise<MapaAsientosConsulta>
  /**
   * Canal SSE `GET /api/viajes/{id}/asientos/eventos`. `alAbrir` se invoca al
   * conectar y en CADA reconexión (conviene recargar el mapa completo);
   * `alError` cuando se pierde la conexión (el navegador reintenta solo).
   * Devuelve la función que cierra el canal.
   */
  suscribirAsientos(
    idViaje: number,
    manejadores: { alAbrir?: () => void; alError?: () => void; alAsiento?: (evento: EventoAsiento) => void },
  ): () => void
}

export interface DashboardService {
  /** Hechos de venta del período consultado y del período anterior comparable. */
  obtenerDashboard(consulta: ConsultaDashboard): Promise<DatosDashboard>
}

