import type { EstadoAsiento, EstadoReserva, FranjaId, MapaAsientosConsulta, ViajeConsulta } from '@/types/consultaViaje'
import type { OrdenViajes } from '../types'

export const FRANJAS: { id: FranjaId; label: string; rango: string }[] = [
  { id: 'madrugada', label: 'Madrugada', rango: '00:00 – 05:59' },
  { id: 'manana', label: 'Mañana', rango: '06:00 – 11:59' },
  { id: 'tarde', label: 'Tarde', rango: '12:00 – 17:59' },
  { id: 'noche', label: 'Noche', rango: '18:00 – 23:59' },
]

export type NivelDisponibilidad = 'alta' | 'pocos' | 'ultimos' | 'agotado'

const UMBRAL_ULTIMOS = 3
const UMBRAL_POCOS = 8

export function nivelDisponibilidad(libres: number): NivelDisponibilidad {
  if (libres <= 0) return 'agotado'
  if (libres <= UMBRAL_ULTIMOS) return 'ultimos'
  if (libres <= UMBRAL_POCOS) return 'pocos'
  return 'alta'
}

export function formatearDuracion(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')} min`
}

export function diasDeDiferencia(desde: string, hasta: string): number {
  const [ya, ma, da] = desde.split('-').map(Number)
  const [yb, mb, db] = hasta.split('-').map(Number)
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000)
}

export function textoLlegada(viaje: Pick<ViajeConsulta, 'horaLlegada' | 'fechaLlegada' | 'fechaSalida'>): string | null {
  if (!viaje.horaLlegada) return null
  const dias = viaje.fechaLlegada ? diasDeDiferencia(viaje.fechaSalida, viaje.fechaLlegada) : 0
  return dias > 0 ? `${viaje.horaLlegada} (+${dias} ${dias === 1 ? 'día' : 'días'})` : viaje.horaLlegada
}

export function ordenarViajes(viajes: ViajeConsulta[], orden: OrdenViajes): ViajeConsulta[] {
  const porHora = (a: ViajeConsulta, b: ViajeConsulta) => a.horaSalida.localeCompare(b.horaSalida) || a.id - b.id
  const precio = (v: ViajeConsulta, sentido: 1 | -1) => v.precio ?? (sentido === 1 ? Infinity : -Infinity)
  const copia = [...viajes]
  switch (orden) {
    case 'hora-asc':
      return copia.sort(porHora)
    case 'hora-desc':
      return copia.sort((a, b) => porHora(b, a))
    case 'disp-desc':
      return copia.sort((a, b) => b.asientosDisponibles - a.asientosDisponibles || porHora(a, b))
    case 'disp-asc':
      return copia.sort((a, b) => a.asientosDisponibles - b.asientosDisponibles || porHora(a, b))
    case 'precio-asc':
      return copia.sort((a, b) => precio(a, 1) - precio(b, 1) || porHora(a, b))
    case 'precio-desc':
      return copia.sort((a, b) => precio(b, -1) - precio(a, -1) || porHora(a, b))
  }
}

export type CriterioOrden = 'hora' | 'disponibilidad' | 'precio'
export type DireccionOrden = 'asc' | 'desc'

export const CRITERIOS_ORDEN: { id: CriterioOrden; label: string }[] = [
  { id: 'hora', label: 'Hora de salida' },
  { id: 'disponibilidad', label: 'Disponibilidad' },
  { id: 'precio', label: 'Precio' },
]

const PREFIJO_ORDEN: Record<CriterioOrden, string> = { hora: 'hora', disponibilidad: 'disp', precio: 'precio' }

export function descomponerOrden(orden: OrdenViajes): { criterio: CriterioOrden; direccion: DireccionOrden } {
  const [prefijo, direccion] = orden.split('-') as [string, DireccionOrden]
  const criterio = CRITERIOS_ORDEN.find((c) => PREFIJO_ORDEN[c.id] === prefijo)?.id ?? 'hora'
  return { criterio, direccion }
}

export function componerOrden(criterio: CriterioOrden, direccion: DireccionOrden): OrdenViajes {
  return `${PREFIJO_ORDEN[criterio]}-${direccion}` as OrdenViajes
}

export function calcularDesfaseServidor(viajes: ViajeConsulta[], ahoraNavegadorMs = Date.now()): number {
  const conReloj = viajes.find((v) => Number.isFinite(v.ahoraServidorMs))
  return conReloj ? conReloj.ahoraServidorMs - ahoraNavegadorMs : 0
}

export function estadoReservaActual(viaje: ViajeConsulta, ahoraMs: number): EstadoReserva {
  const base = viaje.estadoReserva
  if (base === 'NO_DISPONIBLE') return base
  if (Number.isFinite(viaje.salidaMs) && ahoraMs >= viaje.salidaMs) return 'SALIDA_REALIZADA'
  if (base === 'DISPONIBLE' && Number.isFinite(viaje.limiteReservaMs) && ahoraMs > viaje.limiteReservaMs) return 'RESERVA_CERRADA'
  return base
}

export const TEXTOS_ESTADO_RESERVA: Record<Exclude<EstadoReserva, 'DISPONIBLE'>, string> = {
  SALIDA_REALIZADA: 'Ya salió',
  RESERVA_CERRADA: 'Reserva cerrada',
  LLENO: 'Agotado',
  SIN_INFORMACION: 'Sin información',
  NO_DISPONIBLE: 'No disponible',
}

export function aplicarEstadoAsiento(mapa: MapaAsientosConsulta, idAsiento: number, estado: EstadoAsiento): MapaAsientosConsulta {
  let cambio = false
  const porPiso = mapa.porPiso.map((piso) => {
    if (!piso.asientos.some((a) => a.idAsiento === idAsiento && a.estado !== estado)) return piso
    cambio = true
    return {
      ...piso,
      asientos: piso.asientos.map((a) =>
        a.idAsiento === idAsiento ? { ...a, estado, esMio: estado === 'disponible' ? false : a.esMio } : a,
      ),
    }
  })
  return cambio ? { ...mapa, porPiso } : mapa
}

export function contarAsientos(mapa: MapaAsientosConsulta) {
  let total = 0
  let disponibles = 0
  for (const piso of mapa.porPiso) {
    for (const a of piso.asientos) {
      total += 1
      if (a.estado === 'disponible') disponibles += 1
    }
  }
  return { total, disponibles }
}
