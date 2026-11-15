import { ArrowRight, Armchair, Clock, Flame, TriangleAlert } from 'lucide-react'
import type { EstadoReserva, ViajeConsulta } from '@/types/consultaViaje'
import { cn } from '@/utils/cn'
import { formatearFechaCorta } from '@/utils/formato'
import { ESTADOS_RESERVA, TEXTOS_ESTADO_RESERVA } from '../utils/estadoReserva'
import { formatearPrecio } from '../utils/viajes'

interface ResultadoCardProps {
  viaje: ViajeConsulta
  /** Estado de reserva ya refrescado con el reloj del servidor. */
  estadoReserva: EstadoReserva
  esMasEconomico: boolean
  onVerAsientos: () => void
}

/** Estilo de la insignia de estado de reserva (el color nunca va solo: lleva texto e icono). */
const estiloEstado: Record<Exclude<EstadoReserva, 'DISPONIBLE'>, string> = {
  SALIDA_REALIZADA: 'bg-text-400/12 text-text-500',
  RESERVA_CERRADA: 'bg-status-low/12 text-warning-text',
  LLENO: 'bg-status-out/12 text-danger-500',
  SIN_INFORMACION: 'bg-text-400/12 text-text-500',
  NO_DISPONIBLE: 'bg-text-400/12 text-text-500',
}

/**
 * Resultado de la consulta. Muestra los mismos datos que el Portal (hora,
 * ruta, duración, servicio, comodidades, asientos disponibles, precio desde y
 * estado de reserva). El backend no entrega terminales de salida/llegada, así
 * que no se muestran. Aunque el viaje ya no admita reservas, se puede abrir su
 * mapa de asientos: es solo consulta.
 */
export function ResultadoCard({ viaje, estadoReserva, esMasEconomico, onVerAsientos }: ResultadoCardProps) {
  const reservable = estadoReserva === ESTADOS_RESERVA.DISPONIBLE
  const textos = reservable ? null : TEXTOS_ESTADO_RESERVA[estadoReserva]
  const llegaOtroDia = viaje.fechaLlegada && viaje.fechaLlegada !== viaje.fechaSalida
  const pocos = viaje.asientosDisponibles > 0 && viaje.asientosDisponibles <= 4

  return (
    <article
      data-estado-reserva={estadoReserva}
      aria-label={`Viaje ${viaje.id}, ${viaje.origen} a ${viaje.destino}, salida ${viaje.horaSalida}, ${viaje.tipoBus}`}
      className={cn(
        'group/card @container relative overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface-card p-4 @2xl:p-5',
        'transition-[border-color,background-color,box-shadow] duration-200 ease-[var(--ease-premium)]',
        'hover:border-border-strong hover:bg-surface-hover hover:shadow-panel',
      )}
    >
      <div className="grid gap-x-6 gap-y-4 @2xl:grid-cols-[minmax(0,1fr)_200px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
            <div className="flex items-center gap-2.5">
              <p className="font-display text-[28px] font-semibold leading-none tracking-tight tabular-nums text-text-900">{viaje.horaSalida}</p>
              {esMasEconomico && reservable && (
                <span className="rounded-full bg-status-ok/10 px-2 py-0.5 text-[11px] font-medium text-accent-text">Más económico</span>
              )}
            </div>
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-xs text-text-500">{viaje.empresa}</span>
              <span className="max-w-[60%] shrink-0 truncate rounded-md border border-border bg-surface-sunken px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-700">
                {viaje.tipoBus}
              </span>
            </div>
          </div>

          {/* Ruta: salida → duración → llegada */}
          <div className="flex items-center gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-900">{viaje.origen}</p>
              <p className="text-xs tabular-nums text-text-500">{viaje.horaSalida}</p>
            </div>
            <div className="flex min-w-[88px] flex-1 flex-col items-center gap-1 text-text-500">
              <span className="inline-flex items-center gap-1 text-[11px] tabular-nums">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {viaje.duracion}
              </span>
              <span className="h-px w-full bg-border-strong" aria-hidden="true" />
              <span className="text-[10px] uppercase tracking-[0.08em]">Directo</span>
            </div>
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-semibold text-text-900">{viaje.destino}</p>
              <p className="text-xs tabular-nums text-text-500">
                {viaje.horaLlegada ?? 'Por confirmar'}
                {llegaOtroDia && viaje.fechaLlegada ? ` · ${formatearFechaCorta(viaje.fechaLlegada)}` : ''}
              </p>
            </div>
          </div>

          {/* Disponibilidad (solo asientos libres: los bloqueados temporalmente no cuentan) */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <p className="flex items-center gap-1.5 text-xs text-text-500">
              <Armchair className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-sm font-semibold tabular-nums text-text-900">{viaje.asientosDisponibles}</span>
              {viaje.asientosDisponibles === 1 ? 'asiento disponible' : 'asientos disponibles'}
            </p>
            {pocos && reservable && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-status-out/12 px-2 py-0.5 text-[11px] font-medium text-danger-500">
                <Flame className="h-3 w-3" aria-hidden="true" />
                Últimos asientos
              </span>
            )}
            {textos && (
              <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium', estiloEstado[estadoReserva as keyof typeof estiloEstado])}>
                <TriangleAlert className="h-3 w-3" aria-hidden="true" />
                {textos.insignia}
              </span>
            )}
          </div>

          {textos && <p className="-mt-2 text-xs text-text-500">{textos.detalle}</p>}

          {/* Comodidades e identificador */}
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-text-500">
            {viaje.servicios.map((s) => (
              <span key={s} className="rounded-full border border-border px-2 py-0.5 text-[11px] text-text-700">
                {s}
              </span>
            ))}
            <span className="ml-auto shrink-0 tabular-nums">Viaje #{viaje.id}</span>
          </div>
        </div>

        {/* Columna de decisión: precio + acción */}
        <div
          className={cn(
            'flex items-end justify-between gap-3 border-t border-border-subtle pt-4',
            '@2xl:flex-col @2xl:items-center @2xl:justify-center @2xl:gap-5 @2xl:border-l @2xl:border-t-0 @2xl:pl-6 @2xl:pt-0',
          )}
        >
          <div className="@2xl:text-center">
            <p className="text-xs text-text-500">Desde, por persona</p>
            <p className={cn('mt-1 font-display text-[24px] font-semibold leading-none tabular-nums', viaje.precio == null ? 'text-text-500' : 'text-text-900')}>
              {viaje.precio == null ? 'No disponible' : formatearPrecio(viaje.precio)}
            </p>
          </div>

          <button
            type="button"
            data-trip-cta
            onClick={onVerAsientos}
            aria-label={`Ver asientos del viaje ${viaje.id}, ${viaje.origen} a ${viaje.destino} a las ${viaje.horaSalida}`}
            className={cn(
              'group/cta inline-flex h-10 min-w-[158px] shrink-0 items-center justify-center rounded-lg border px-3.5 text-[13px] font-semibold',
              'transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-[var(--ease-premium)] active:scale-[0.97]',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-line',
              'border-accent-line/40 bg-transparent text-accent-text group-hover/card:border-transparent group-hover/card:bg-cta group-hover/card:text-on-cta',
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              Ver asientos
              <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover/cta:translate-x-0.5" aria-hidden="true" />
            </span>
          </button>
        </div>
      </div>
    </article>
  )
}
