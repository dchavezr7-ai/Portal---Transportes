export type FranjaId = 'madrugada' | 'manana' | 'tarde' | 'noche'

export type EstadoReserva =
  | 'DISPONIBLE'
  | 'RESERVA_CERRADA'
  | 'SALIDA_REALIZADA'
  | 'LLENO'
  | 'SIN_INFORMACION'
  | 'NO_DISPONIBLE'

export type NivelOcupacionViaje = 'disponible' | 'pocos-asientos' | 'agotado'

export interface RutaCiudad {
  origen: string
  destino: string
}

export interface FiltrosConsulta {
  origen: string
  destino: string
  fecha: string
  franjas: FranjaId[]
}

export interface ViajeConsulta {
  id: number
  empresa: string
  origen: string
  destino: string
  fechaSalida: string
  horaSalida: string
  horaLlegada: string | null
  fechaLlegada: string | null
  duracion: string
  duracionMin: number | null
  tipoBus: string
  servicios: string[]
  capacidad: number
  terminalOrigen: string | null
  terminalDestino: string | null
  asientosDisponibles: number
  precio: number | null
  estado: NivelOcupacionViaje
  estadoReserva: EstadoReserva
  reservable: boolean
  salidaMs: number
  limiteReservaMs: number
  ahoraServidorMs: number
  minutosAnticipacion: number
}

export type EstadoAsiento = 'disponible' | 'bloqueado' | 'ocupado'

export interface AsientoConsulta {
  idAsiento: number
  numero: string
  fila: number
  letra: string
  lado: 'izquierda' | 'derecha'
  piso: number
  estado: EstadoAsiento
  precio: number | null
  esMio: boolean
}

export interface PisoConsulta {
  piso: number
  filas: number
  asientosPorLado: [number, number]
  descripcion: string
  asientos: AsientoConsulta[]
}

export interface MapaAsientosConsulta {
  pisos: number
  porPiso: PisoConsulta[]
}

export interface EventoAsiento {
  idAsiento: number
  estado: EstadoAsiento
}

export interface SesionReserva {
  tokenSesion: string
  expiraEn: number
}
