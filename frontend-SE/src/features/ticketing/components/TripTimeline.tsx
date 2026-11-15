import type { ViajeConsulta } from '@/types/consultaViaje'
import { cn } from '@/utils/cn'
import { formatearDuracion, textoLlegada } from '../utils/viajes'

type DatosRecorrido = Pick<
  ViajeConsulta,
  | 'origen'
  | 'destino'
  | 'horaSalida'
  | 'horaLlegada'
  | 'fechaSalida'
  | 'fechaLlegada'
  | 'duracion'
  | 'duracionMin'
  | 'terminalOrigen'
  | 'terminalDestino'
>

function duracionTexto(v: DatosRecorrido): string | null {
  if (v.duracionMin !== null) return formatearDuracion(v.duracionMin)
  return v.duracion || null
}

export function RouteLine({ viaje, className }: { viaje: DatosRecorrido; className?: string }) {
  const llegada = textoLlegada(viaje)
  const duracion = duracionTexto(viaje)
  return (
    <div className={cn('grid grid-cols-[minmax(0,auto)_minmax(40px,1fr)_minmax(0,auto)] items-start gap-x-3', className)}>
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold text-text-900">{viaje.origen}</p>
        {viaje.terminalOrigen && <p className="truncate text-xs text-text-500">{viaje.terminalOrigen}</p>}
      </div>

      <div className="flex min-w-0 flex-col items-center pt-0.5" aria-hidden="true">
        <span className="max-w-full truncate text-[11px] font-medium tabular-nums text-text-500">{duracion ?? '—'}</span>
        <span className="relative mt-1 flex w-full items-center">
          <span className="h-2 w-2 shrink-0 rounded-full bg-accent-line" />
          <span className="animate-route-draw mx-0.5 h-px flex-1 bg-gradient-to-r from-accent-line/70 to-border-strong" />
          <span className="h-2 w-2 shrink-0 rounded-full border-2 border-text-400 bg-surface-card" />
        </span>
      </div>

      <div className="min-w-0 text-right">
        <p className="truncate text-[15px] font-semibold text-text-900">{viaje.destino}</p>
        <p className="truncate text-xs text-text-500">
          {viaje.terminalDestino ?? 'Destino'}
          {llegada && <span className="tabular-nums"> · llega {llegada}</span>}
        </p>
      </div>
    </div>
  )
}

export function TripTimeline({ viaje }: { viaje: DatosRecorrido }) {
  const llegada = textoLlegada(viaje)
  const duracion = duracionTexto(viaje)
  const [horaLlegada, ...resto] = llegada ? llegada.split(' ') : []
  const sufijo = resto.join(' ')
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-4">
      <p className="font-display text-[32px] font-semibold leading-none tracking-tight tabular-nums text-text-900">{viaje.horaSalida}</p>
      <div className="min-w-0 pt-0.5">
        <p className="flex items-center gap-2 truncate text-[15px] font-semibold text-text-900">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent-line shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-accent-line)_22%,transparent)]"
            aria-hidden="true"
          />
          <span className="truncate">{viaje.origen}</span>
        </p>
        {viaje.terminalOrigen && <p className="mt-0.5 truncate pl-[18px] text-xs text-text-500">{viaje.terminalOrigen}</p>}
      </div>

      <div className="flex justify-center" aria-hidden="true">
        <span className="w-px self-stretch bg-gradient-to-b from-accent-line/70 to-border-strong" style={{ minHeight: 34 }} />
      </div>
      <p className="flex items-center gap-1.5 pl-[18px] text-xs tabular-nums text-text-500" style={{ minHeight: 34 }}>
        {duracion ? `Duración ${duracion}` : 'Recorrido directo'}
      </p>

      <p className="text-lg font-medium leading-none tabular-nums text-text-700">{horaLlegada ?? '—'}</p>
      <div className="min-w-0">
        <p className="flex items-center gap-2 truncate text-[15px] font-semibold text-text-900">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-text-400 bg-surface-card" aria-hidden="true" />
          <span className="truncate">{viaje.destino}</span>
        </p>
        <p className="mt-0.5 truncate pl-[18px] text-xs text-text-500">
          {viaje.terminalDestino ?? 'Destino'}
          {llegada && <span> · llegada estimada{sufijo && ` ${sufijo.slice(1, -1)}`}</span>}
        </p>
      </div>
    </div>
  )
}
