import { X } from 'lucide-react'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Skeleton } from '@/components/feedback/Skeleton'
import { cn } from '@/utils/cn'
import { formatearFechaCorta } from '@/utils/formato'
import { useMapaAsientos } from '../hooks/useMapaAsientos'
import { useTicketWizard, useTicketWizardStore } from '../hooks/useTicketWizard'
import { MAX_ASIENTOS, MINUTOS_BLOQUEO } from '../types'
import { contarAsientos } from '../utils/viajes'
import { ReservaTemporal } from './ReservaTemporal'
import { SeatMap } from './SeatMap'
import { StepActions } from './StepActions'

export function AsientoStep() {
  const { viaje, asientos, procesando, alternarAsiento, volverABuscar, irA } = useTicketWizard()
  const liberadoPorServidor = useTicketWizardStore((s) => s.liberadoPorServidor)
  const { mapa, cargando, error, enVivo, recargar } = useMapaAsientos(viaje?.id ?? null, (evento) => {
    if (evento.estado === 'disponible') liberadoPorServidor(evento.idAsiento)
  })

  if (!viaje) return null

  const conteo = mapa ? contarAsientos(mapa) : null
  const elegidos = asientos.length
  const elegidosIds = new Set(asientos.map((a) => a.idAsiento))
  const mapaLibres = mapa
    ? mapa.porPiso.flatMap((p) => p.asientos).filter((a) => a.estado === 'disponible' && !elegidosIds.has(a.idAsiento)).length
    : 0

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-text-700">
        <span className="font-semibold text-text-900">
          {viaje.origen} → {viaje.destino}
        </span>
        <span className="tabular-nums">
          {formatearFechaCorta(viaje.fechaSalida)} · {viaje.horaSalida} h
        </span>
        <span className="rounded-md border border-border-strong bg-surface-sunken px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-700">
          {viaje.tipoBus}
        </span>
        <span
          className={cn(
            'ml-auto inline-flex items-center gap-1.5 text-xs',
            enVivo ? 'text-accent-text' : 'text-text-400',
          )}
          aria-live="polite"
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', enVivo ? 'bg-status-ok' : 'bg-text-400')} aria-hidden="true" />
          {enVivo ? 'En vivo' : 'Reconectando…'}
        </span>
      </div>

      {cargando ? (
        <div role="status" aria-label="Cargando mapa de asientos" className="flex justify-center">
          <Skeleton className="h-[420px] w-full max-w-[260px] rounded-[28px]" />
        </div>
      ) : error || !mapa ? (
        <ErrorState title="No pudimos cargar el mapa de asientos" description={error ?? 'Inténtalo de nuevo.'} onRetry={recargar} />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-sunken px-4 py-3">
            <p className="text-sm font-medium text-text-700" aria-live="polite">
              <span className={cn('font-semibold', elegidos === MAX_ASIENTOS ? 'text-accent-text' : 'text-text-900')}>
                {elegidos} de {MAX_ASIENTOS}
              </span>{' '}
              asientos seleccionados
            </p>
            {elegidos > 0 && (
              <ul className="flex flex-wrap items-center gap-1.5" aria-label="Asientos elegidos">
                {asientos.map((a) => (
                  <li key={a.idAsiento}>
                    <button
                      type="button"
                      disabled={procesando !== null}
                      onClick={() => {
                        const origen = mapa.porPiso.flatMap((p) => p.asientos).find((x) => x.idAsiento === a.idAsiento)
                        if (origen) void alternarAsiento(origen)
                      }}
                      className="animate-check-pop group flex items-center gap-1 rounded-full border border-accent-line/40 bg-accent-line/10 py-1 pl-2.5 pr-1.5 text-xs font-semibold text-accent-text transition-colors hover:border-danger-500/50 hover:bg-danger-500/10 hover:text-danger-600 disabled:opacity-60"
                      aria-label={`Quitar asiento ${a.numero}`}
                    >
                      {a.numero}
                      <X className="h-3 w-3 opacity-60 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {elegidos > 0 && (
            <div className="mb-4 flex justify-center">
              <ReservaTemporal />
            </div>
          )}

          <SeatMap
            pisos={mapa.porPiso}
            elegidos={asientos}
            procesando={procesando}
            puedeSeleccionarMas={elegidos < MAX_ASIENTOS}
            onToggle={(asiento) => void alternarAsiento(asiento)}
          />

          <p className="mt-4 text-center text-sm text-text-500" aria-live="polite">
            {elegidos === 0
              ? `${mapaLibres} de ${conteo?.total ?? 0} asientos disponibles. Al elegir el primero se reserva por ${MINUTOS_BLOQUEO} minutos.`
              : elegidos < MAX_ASIENTOS
                ? 'Puedes elegir más asientos o continuar con los ya seleccionados.'
                : `Alcanzaste el máximo de ${MAX_ASIENTOS} asientos.`}
          </p>
        </>
      )}

      <StepActions
        onBack={volverABuscar}
        onContinue={() => irA('pasajeros')}
        continueDisabled={elegidos === 0 || procesando !== null}
        continueLabel={elegidos > 1 ? `Continuar con ${elegidos} asientos` : 'Continuar'}
      />
    </div>
  )
}
