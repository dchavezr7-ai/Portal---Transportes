import type { FranjaId } from '@/types/consultaViaje'
import type { TipoDocumento } from '@/types/pasajero'

export type PasoId = 'viaje' | 'asientos' | 'pasajeros'

export const PASOS: { id: PasoId; label: string }[] = [
  { id: 'viaje', label: 'Viaje' },
  { id: 'asientos', label: 'Asientos' },
  { id: 'pasajeros', label: 'Pasajeros' },
]

export const MAX_ASIENTOS = 6
export const MINUTOS_BLOQUEO = 3

export interface PasajeroForm {
  tipoDocumento: TipoDocumento
  numeroDocumento: string
  nombres: string
  apellidos: string
  telefono: string
  email: string
}

export const pasajeroFormVacio: PasajeroForm = {
  tipoDocumento: 'DNI',
  numeroDocumento: '',
  nombres: '',
  apellidos: '',
  telefono: '',
  email: '',
}

export interface FiltrosViajeForm {
  origen: string
  destino: string
  fecha: string
}

export type OrdenViajes = 'hora-asc' | 'hora-desc' | 'disp-desc' | 'disp-asc' | 'precio-asc' | 'precio-desc'

export interface VistaViajes {
  franjas: FranjaId[]
  orden: OrdenViajes
}

export const vistaViajesInicial: VistaViajes = {
  franjas: [],
  orden: 'hora-asc',
}

export interface AsientoElegido {
  idAsiento: number
  numero: string
  piso: number
  precio: number
}
