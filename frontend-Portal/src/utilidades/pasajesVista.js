/**
 * Presentación de las compras que entrega el backend. Aquí NO se decide nada de negocio (vigencia, estado,
 * viaje realizado, totales): eso lo calcula el servidor con la hora de Perú y llega ya resuelto en cada
 * compra (`estado`, `fase`, `vigente`, `documentoDisponible`, `total`...). Estas funciones solo eligen
 * etiquetas, agrupan y filtran para la interfaz.
 */

/**
 * Etiqueta única que combina el estado del pago y el del viaje, sin confundirlos:
 * primero manda el estado de la compra; si está confirmada, describe el viaje.
 * `clave` es una de las de EstadoDisponibilidad.
 */
export function estadoVisible(compra) {
  switch (compra?.estado) {
    case 'REEMBOLSADA':
      return { clave: 'REEMBOLSADO', etiqueta: 'Reembolsado' }
    case 'SIN_CONFIRMAR':
      return { clave: 'PAGO_SIN_CONFIRMAR', etiqueta: 'Pago sin confirmar' }
    case 'CONFIRMADA':
      break
    default:
      return { clave: 'SIN_INFORMACION', etiqueta: 'Sin información' }
  }
  switch (compra.fase) {
    case 'PROXIMO':
      return { clave: 'confirmado', etiqueta: 'Confirmado' }
    case 'REALIZADO':
      return { clave: 'completado', etiqueta: 'Viaje realizado' }
    case 'NO_REALIZADO':
      return compra.estadoViaje === 'CANCELADO'
        ? { clave: 'cancelado', etiqueta: 'Viaje cancelado' }
        : { clave: 'cancelado', etiqueta: 'Viaje no realizado' }
    default:
      return { clave: 'SIN_INFORMACION', etiqueta: 'Sin información' }
  }
}

/** Separa las compras vigentes de las anteriores respetando el orden que ya trae el backend. */
export function agruparPasajes(compras) {
  const vigentes = []
  const anteriores = []
  for (const compra of compras ?? []) (compra.vigente ? vigentes : anteriores).push(compra)
  return { vigentes, anteriores }
}

export const FILTROS_HISTORIAL = [
  { id: 'todos', etiqueta: 'Todos' },
  { id: 'realizados', etiqueta: 'Realizados' },
  { id: 'cancelados', etiqueta: 'Cancelados' },
  { id: 'otros', etiqueta: 'Otros' },
]

function pertenece(compra, filtro) {
  const realizado = compra.estado === 'CONFIRMADA' && compra.fase === 'REALIZADO'
  const cancelado = compra.estado === 'CONFIRMADA' && compra.fase === 'NO_REALIZADO'
  switch (filtro) {
    case 'realizados':
      return realizado
    case 'cancelados':
      return cancelado
    case 'otros':
      return !realizado && !cancelado
    default:
      return true
  }
}

export function filtrarHistorial(compras, filtro = 'todos') {
  return (compras ?? []).filter((compra) => pertenece(compra, filtro))
}

export function contarPorFiltro(compras) {
  return Object.fromEntries(FILTROS_HISTORIAL.map(({ id }) => [id, filtrarHistorial(compras, id).length]))
}

/**
 * Viajes en los que viajan HOY los boletos de una compra, del que sale primero al que sale después.
 * Un boleto cambiado de viaje ya no viaja en el viaje de la compra: agrupa por el viaje vigente de cada boleto
 * ({ origen, destino, fechaSalida, horaSalida, tipoBus, asientos[] }). Sin cambios sale un solo viaje, igual al de
 * la compra. Si faltan los boletos (compra incompleta o de prueba), devuelve el viaje de la compra sin asientos.
 */
export function viajesActuales(compra) {
  const grupos = new Map()
  for (const boleto of compra?.boletos ?? []) {
    const viaje = boleto.viajeVigente ?? compra
    const clave = `${viaje.fechaSalida}|${viaje.horaSalida}|${viaje.origen}|${viaje.destino}`
    if (!grupos.has(clave)) {
      const { origen, destino, fechaSalida, horaSalida, tipoBus } = viaje
      grupos.set(clave, { origen, destino, fechaSalida, horaSalida, tipoBus, asientos: [] })
    }
    if (boleto.asiento) grupos.get(clave).asientos.push(boleto.asiento)
  }
  if (grupos.size === 0) {
    const { origen, destino, fechaSalida, horaSalida, tipoBus } = compra ?? {}
    return [{ origen, destino, fechaSalida, horaSalida, tipoBus, asientos: [] }]
  }
  return [...grupos.values()].sort((a, b) =>
    `${a.fechaSalida} ${a.horaSalida}`.localeCompare(`${b.fechaSalida} ${b.horaSalida}`))
}

/** Servicios (tipos de bus) de los viajes, sin repetir: "Estándar" o "Estándar, Semi Cama". */
export function textoServicios(viajes) {
  const servicios = [...new Set((viajes ?? []).map((viaje) => viaje.tipoBus).filter(Boolean))]
  return servicios.length > 0 ? servicios.join(', ') : null
}

export function textoAsientos(compra) {
  const asientos = (compra?.boletos ?? []).map((boleto) => boleto.asiento).filter(Boolean)
  return asientos.length > 0 ? asientos.join(', ') : null
}

/** Mensajes para una compra marcada `incompleta` por el backend: qué dato falta, sin inventarlo. */
export function datosFaltantes(compra) {
  const faltan = []
  if (!compra?.origen || !compra?.destino) faltan.push('el trayecto')
  if (!compra?.fechaSalida || !compra?.horaSalida) faltan.push('la fecha u hora de salida')
  if (!compra?.tipoBus) faltan.push('el tipo de servicio')
  if (!compra?.boletos || compra.boletos.length === 0) faltan.push('los boletos')
  else if (compra.boletos.some((b) => !b.asiento || !b.pasajero)) faltan.push('el asiento o el pasajero de algún boleto')
  return faltan
}

/** Texto cuando el total de la venta no coincide con la suma de sus boletos (se muestra, no se oculta). */
export function avisoTotal(compra) {
  return compra && compra.totalConsistente === false && compra.boletos?.length > 0
    ? 'El importe total de la compra no coincide con la suma de sus boletos. Contáctanos si necesitas aclararlo.'
    : null
}
