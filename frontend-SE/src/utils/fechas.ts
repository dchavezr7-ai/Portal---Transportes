export function sumarDias(iso: string, dias: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const fecha = new Date(Date.UTC(y, m - 1, d + dias))
  return fecha.toISOString().slice(0, 10)
}

export function diferenciaDias(a: string, b: string): number {
  const [ya, ma, da] = a.split('-').map(Number)
  const [yb, mb, db] = b.split('-').map(Number)
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000)
}

export function diaSemana(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

export function listarDias(desde: string, hasta: string): string[] {
  const total = diferenciaDias(desde, hasta)
  return Array.from({ length: total + 1 }, (_, i) => sumarDias(desde, i))
}

const formateadorLima = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function fechaHoyLima(ahora: Date = new Date()): string {
  return formateadorLima.format(ahora)
}
