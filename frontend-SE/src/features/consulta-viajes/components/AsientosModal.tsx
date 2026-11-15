import { Lock, RotateCw, Radio, WifiOff } from 'lucide-react'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Skeleton } from '@/components/feedback/Skeleton'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/feedback/EmptyState'
import type { ViajeConsulta } from '@/types/consultaViaje'
import { cn } from '@/utils/cn'
import { formatearFechaCorta } from '@/utils/formato'
import { useMapaAsientos } from '../hooks/useMapaAsientos'
import { contarAsientos } from '../utils/viajes'
import { MapaAsientosBus } from './MapaAsientosBus'

interface AsientosModalProps {
  viaje: ViajeConsulta | null
  onClose: () => void
}

function Dato({ etiqueta, valor, tono }: { etiqueta: string; valor: number; tono?: 'ok' | 'aviso' | 'peligro' }) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface-sunken px-3 py-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-500">{etiqueta}</span>
      <span
        className={cn(
          'text-lg font-semibold tabular-nums',
          tono === 'ok' && 'text-accent-text',
          tono === 'aviso' && 'text-warning-text',
          tono === 'peligro' && 'text-danger-500',
          !tono && 'text-text-900',
        )}
      >
        {valor}
      </span>
    </div>
  )
}

/**
 * Estado actual de los asientos de un viaje (solo lectura). Los datos vienen
 * de `GET /api/viajes/{id}/asientos` y se mantienen al día por SSE: si otro
 * cliente bloquea, libera o compra un asiento, el mapa cambia sin recargar.
 */
export function AsientosModal({ viaje, onClose }: AsientosModalProps) {
  const { mapa, cargando, error, enVivo, recargar } = useMapaAsientos(viaje?.id ?? null)
  const conteo = mapa ? contarAsientos(mapa) : null

  return (
    <Modal
      open={viaje !== null}
      onClose={onClose}
      size="xl"
      title={viaje ? `${viaje.origen} → ${viaje.destino}` : 'Asientos'}
      description={
        viaje
          ? `${formatearFechaCorta(viaje.fechaSalida)} · ${viaje.horaSalida} h · ${viaje.tipoBus} · Viaje #${viaje.id}`
          : undefined
      }
    >
      {cargando || (!mapa && !error) ? (
        <div role="status" aria-label="Cargando mapa de asientos" className="flex justify-center">
          <Skeleton className="h-[420px] w-full max-w-[260px] rounded-[28px]" />
        </div>
      ) : error || !mapa || !conteo ? (
        <ErrorState title="No pudimos cargar el mapa de asientos" description={error ?? 'Inténtalo de nuevo para ver la disponibilidad actualizada.'} onRetry={recargar} />
      ) : mapa.porPiso.length === 0 || conteo.total === 0 ? (
        <EmptyState title="Sin información de asientos" description="Este viaje no tiene asientos registrados, por eso no hay un mapa que mostrar." />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-live="polite">
              <Dato etiqueta="Disponibles" valor={conteo.disponibles} tono="ok" />
              <Dato etiqueta="Bloqueados" valor={conteo.bloqueados} tono="aviso" />
              <Dato etiqueta="Ocupados" valor={conteo.ocupados} tono="peligro" />
              <Dato etiqueta="Total" valor={conteo.total} />
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
                  enVivo ? 'bg-status-ok/10 text-accent-text' : 'bg-text-400/12 text-text-500',
                )}
                role="status"
              >
                {enVivo ? <Radio className="h-3 w-3" aria-hidden="true" /> : <WifiOff className="h-3 w-3" aria-hidden="true" />}
                {enVivo ? 'En vivo' : 'Sin conexión en vivo'}
              </span>
              <Button variant="outline" size="sm" onClick={recargar} iconLeft={<RotateCw className="h-3.5 w-3.5" aria-hidden="true" />}>
                Actualizar
              </Button>
            </div>
          </div>

          <MapaAsientosBus pisos={mapa.porPiso} />

          <p className="mt-5 flex items-start gap-2 rounded-xl border border-border bg-surface-sunken px-3 py-2.5 text-xs text-text-500">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning-text" aria-hidden="true" />
            <span>
              Un asiento <strong className="font-semibold text-text-700">bloqueado</strong> está retenido temporalmente por un cliente que está
              completando su compra. No cuenta como disponible y se libera solo si la reserva vence o se cancela.
            </span>
          </p>
        </>
      )}
    </Modal>
  )
}
