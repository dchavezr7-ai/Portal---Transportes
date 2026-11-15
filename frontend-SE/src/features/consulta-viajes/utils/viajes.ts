import type { OrdenViajes } from '@/features/ticketing/types'
import type { EstadoAsiento, HorarioConsulta, MapaAsientosConsulta, ViajeConsulta } from '@/types/consultaViaje'

/**
 * Franjas horarias. Los rangos son los que aplica el BACKEND al filtrar
 * (`ViajeService.buscar`: tarde 12–19 h, noche 19–24 h) y los que muestra el
 * Portal. Se mantienen aparte de `features/ticketing` (cuyas franjas del mock
 * cortan a las 18 h) para que lo que se ve coincida con lo que se consulta.
 */
export const FRANJAS_CONSULTA: { id: Exclude<HorarioConsulta, 'cualquiera'>; label: string; rango: string }[] = [
  { id: 'madrugada', label: 'Madrugada', rango: '00:00 – 05:59' },
  { id: 'mañana', label: 'Mañana', rango: '06:00 – 11:59' },
  { id: 'tarde', label: 'Tarde', rango: '12:00 – 18:59' },
  { id: 'noche', label: 'Noche', rango: '19:00 – 23:59' },
]

/** Mismo conjunto de órdenes que ya maneja el `SortControl` del SE (se reutiliza ese control). */
export type OrdenConsulta = OrdenViajes

export const ORDEN_INICIAL: OrdenConsulta = 'hora-asc'

/** Ordena una copia. Un precio nulo (sin asientos libres) va siempre al final. */
export function ordenarViajes(viajes: ViajeConsulta[], orden: OrdenConsulta): ViajeConsulta[] {
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

/** Conteo de asientos por estado, calculado sobre el mapa real recibido. */
export interface ConteoAsientos {
  total: number
  disponibles: number
  bloqueados: number
  ocupados: number
}

export function contarAsientos(mapa: MapaAsientosConsulta): ConteoAsientos {
  const conteo: ConteoAsientos = { total: 0, disponibles: 0, bloqueados: 0, ocupados: 0 }
  for (const piso of mapa.porPiso) {
    for (const a of piso.asientos) {
      conteo.total += 1
      if (a.estado === 'disponible') conteo.disponibles += 1
      else if (a.estado === 'bloqueado') conteo.bloqueados += 1
      else conteo.ocupados += 1
    }
  }
  return conteo
}

/** Aplica un cambio de estado de un asiento (evento SSE) sin mutar el mapa. */
export function aplicarEstadoAsiento(
  mapa: MapaAsientosConsulta,
  idAsiento: number,
  estado: EstadoAsiento,
): MapaAsientosConsulta {
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

export function formatearPrecio(valor: number): string {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', currencyDisplay: 'narrowSymbol' }).format(valor)
}
