/** Zona horaria en la que el backend guarda y compara fecha/hora de salida (`PoliticaReservaViaje.ZONA_NEGOCIO`). */
const ZONA_NEGOCIO = 'America/Lima'

const formateadorFecha = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_NEGOCIO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Hoy como `YYYY-MM-DD` en hora de Perú (no depende de la zona del navegador). */
export function fechaHoyLima(ahora: Date = new Date()): string {
  return formateadorFecha.format(ahora)
}

/** `true` si es una fecha ISO `YYYY-MM-DD` con día y mes reales. */
export function esFechaIso(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false
  const [y, m, d] = valor.split('-').map(Number)
  const fecha = new Date(Date.UTC(y, m - 1, d))
  return fecha.getUTCFullYear() === y && fecha.getUTCMonth() === m - 1 && fecha.getUTCDate() === d
}
