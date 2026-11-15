/**
 * Tipos de la consulta de viajes y disponibilidad de asientos contra el
 * backend real (Spring Boot). Reflejan tal cual el contrato que ya consume el
 * Portal: `GET /api/viajes/buscar`, `GET /api/rutas-ciudad` y
 * `GET /api/viajes/{id}/asientos`. No dependen del modelo mock del SE
 * (`types/viaje.ts`), porque el backend identifica los viajes con un id
 * numérico y los asientos por su id físico.
 */

/** Franja que entiende el backend (`ViajeService.buscar`). */
export type HorarioConsulta = 'cualquiera' | 'madrugada' | 'mañana' | 'tarde' | 'noche'

/** Resultado de `PoliticaReservaViaje` calculado en el servidor con la hora de Perú. */
export type EstadoReserva =
  | 'DISPONIBLE'
  | 'RESERVA_CERRADA'
  | 'SALIDA_REALIZADA'
  | 'LLENO'
  | 'SIN_INFORMACION'
  | 'NO_DISPONIBLE'

/** Nivel de ocupación que calcula el backend a partir de los asientos DISPONIBLES. */
export type NivelOcupacionViaje = 'disponible' | 'pocos-asientos' | 'agotado'

export interface RutaCiudad {
  origen: string
  destino: string
}

export interface FiltrosConsulta {
  origen: string
  destino: string
  /** YYYY-MM-DD */
  fecha: string
  horario: HorarioConsulta
}

/** `ViajeResumenDto` del backend. */
export interface ViajeConsulta {
  id: number
  empresa: string
  origen: string
  destino: string
  /** YYYY-MM-DD */
  fechaSalida: string
  /** HH:mm */
  horaSalida: string
  /** HH:mm; `null` si la ruta no tiene duración estimada. */
  horaLlegada: string | null
  fechaLlegada: string | null
  duracion: string
  tipoBus: string
  servicios: string[]
  /** Solo asientos en estado DISPONIBLE: los bloqueados temporalmente no cuentan. */
  asientosDisponibles: number
  /** Precio mínimo entre los asientos disponibles; `null` si no hay ninguno. */
  precio: number | null
  estado: NivelOcupacionViaje
  estadoReserva: EstadoReserva
  reservable: boolean
  /** Instantes en ms desde epoch (UTC), calculados por el servidor. */
  salidaMs: number
  limiteReservaMs: number
  ahoraServidorMs: number
  minutosAnticipacion: number
}

/**
 * Estado de un asiento en un viaje.
 *  - `disponible`: libre.
 *  - `bloqueado`: retenido temporalmente por un cliente que está comprando
 *    (BLOQUEADO_TEMPORAL). Se libera solo al vencer la reserva. Es el estado
 *    que el Portal contempla y el SE no mostraba.
 *  - `ocupado`: vendido.
 */
export type EstadoAsiento = 'disponible' | 'bloqueado' | 'ocupado'

export interface AsientoConsulta {
  idAsiento: number
  /** Código visible, p. ej. "3B". */
  numero: string
  fila: number
  letra: string
  lado: 'izquierda' | 'derecha'
  piso: number
  estado: EstadoAsiento
  precio: number | null
  /** `true` solo si el bloqueo pertenece a la sesión indicada; esta consulta no abre sesión, así que es `false`. */
  esMio: boolean
}

export interface PisoConsulta {
  piso: number
  filas: number
  /** [asientos a la izquierda, asientos a la derecha] de la fila de referencia. */
  asientosPorLado: [number, number]
  descripcion: string
  asientos: AsientoConsulta[]
}

export interface MapaAsientosConsulta {
  pisos: number
  /** Ordenados por número de piso. */
  porPiso: PisoConsulta[]
}

/** Evento SSE `asiento` del backend. */
export interface EventoAsiento {
  idAsiento: number
  estado: EstadoAsiento
}
