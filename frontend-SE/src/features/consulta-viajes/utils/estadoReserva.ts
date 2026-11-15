import type { EstadoReserva, ViajeConsulta } from '@/types/consultaViaje'

/**
 * Estado de reserva de un viaje en la interfaz.
 *
 * La regla vive en el backend (`PoliticaReservaViaje`): el servidor entrega
 * `estadoReserva`, `salidaMs`, `limiteReservaMs` y `ahoraServidorMs`. Aquí solo
 * se REFRESCA ese estado con el paso del tiempo (una tarjeta "disponible" pasa
 * a "reserva cerrada" o "salida realizada" sin recargar), usando el reloj del
 * servidor corregido por el desfase del navegador. Es la misma lógica que usa
 * el Portal (`utilidades/estadoReserva.js`).
 */

export const ESTADOS_RESERVA = {
  DISPONIBLE: 'DISPONIBLE',
  RESERVA_CERRADA: 'RESERVA_CERRADA',
  SALIDA_REALIZADA: 'SALIDA_REALIZADA',
  LLENO: 'LLENO',
  SIN_INFORMACION: 'SIN_INFORMACION',
  NO_DISPONIBLE: 'NO_DISPONIBLE',
} as const satisfies Record<EstadoReserva, EstadoReserva>

/** Desfase (ms) a sumar a `Date.now()` para obtener la hora del servidor. */
export function calcularDesfaseServidor(viajes: ViajeConsulta[], ahoraNavegadorMs = Date.now()): number {
  const conReloj = viajes.find((v) => Number.isFinite(v.ahoraServidorMs))
  return conReloj ? conReloj.ahoraServidorMs - ahoraNavegadorMs : 0
}

/** Estado de reserva vigente en `ahoraMs` (hora del servidor, en ms epoch). */
export function estadoReservaActual(viaje: ViajeConsulta, ahoraMs: number): EstadoReserva {
  const base = viaje.estadoReserva
  if (!base) {
    return viaje.estado === 'agotado' || viaje.asientosDisponibles === 0
      ? ESTADOS_RESERVA.LLENO
      : ESTADOS_RESERVA.DISPONIBLE
  }
  if (base === ESTADOS_RESERVA.NO_DISPONIBLE) return base
  if (Number.isFinite(viaje.salidaMs) && ahoraMs >= viaje.salidaMs) return ESTADOS_RESERVA.SALIDA_REALIZADA
  if (base === ESTADOS_RESERVA.DISPONIBLE && Number.isFinite(viaje.limiteReservaMs) && ahoraMs > viaje.limiteReservaMs) {
    return ESTADOS_RESERVA.RESERVA_CERRADA
  }
  return base
}

/** Texto de insignia y de detalle para cada estado que no admite reserva. */
export const TEXTOS_ESTADO_RESERVA: Record<Exclude<EstadoReserva, 'DISPONIBLE'>, { insignia: string; detalle: string }> = {
  SALIDA_REALIZADA: { insignia: 'Salida realizada', detalle: 'Este bus ya salió.' },
  RESERVA_CERRADA: {
    insignia: 'Reserva cerrada',
    detalle: 'Se requiere reservar con al menos 20 minutos de anticipación.',
  },
  LLENO: { insignia: 'Bus lleno', detalle: 'Sin asientos disponibles.' },
  SIN_INFORMACION: { insignia: 'Sin información', detalle: 'No hay información de asientos para este viaje.' },
  NO_DISPONIBLE: { insignia: 'No disponible', detalle: 'Este viaje no está disponible para reservas.' },
}
