import { useMemo, useState } from 'react'
import { CalendarClock, FileText, Phone, Ticket, X } from 'lucide-react'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Skeleton } from '@/components/feedback/Skeleton'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { clientesService } from '@/services'
import { useToastStore } from '@/stores/toastStore'
import type { ViajeHistorial } from '@/types/cliente'
import { cn } from '@/utils/cn'
import { formatearFecha, formatearFechaHora } from '@/utils/formato'
import { ETIQUETA_ESTADO, formatearPrecio, textoLlegada, textoSalida } from '../utils/boleto'
import { BoletoModal } from './BoletoModal'

interface ClienteDetalleProps {
  idPasajero: number | null
  onClose: () => void
}

type Pestana = 'proximos' | 'realizados' | 'otros'

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border-subtle bg-surface-sunken/50 px-3 py-2.5">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-500">{etiqueta}</dt>
      <dd className="mt-1 truncate text-[13px] font-medium text-text-900">{valor}</dd>
    </div>
  )
}

function TarjetaViaje({ viaje, onBoleto }: { viaje: ViajeHistorial; onBoleto: () => void }) {
  const pushToast = useToastStore((s) => s.push)
  const llegada = textoLlegada(viaje)
  return (
    <li className="rounded-xl border border-border bg-surface-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-text-900">
            {viaje.origen} → {viaje.destino}
          </p>
          <p className="mt-0.5 text-xs tabular-nums text-text-500">
            {textoSalida(viaje)}
            {llegada && ` · llega ${llegada}`}
          </p>
        </div>
        <Badge tone={viaje.estadoPasaje === 'CONFIRMADA' ? 'success' : viaje.estadoPasaje === 'REEMBOLSADA' ? 'warning' : 'neutral'}>
          {ETIQUETA_ESTADO[viaje.estadoPasaje]}
        </Badge>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-text-500">Asiento</dt>
          <dd className="font-medium text-text-900">{`${viaje.asiento ?? '—'}${viaje.piso ? ` · P${viaje.piso}` : ''}`}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-text-500">Bus</dt>
          <dd className="truncate font-medium text-text-900">{viaje.bus ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-text-500">Precio</dt>
          <dd className="font-medium tabular-nums text-text-900">{formatearPrecio(viaje.precio, viaje.moneda)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-text-500">Boleto</dt>
          <dd className="truncate font-medium tabular-nums text-text-900">{viaje.numeroBoleto}</dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-border-subtle pt-3">
        {viaje.fase === 'PROXIMO' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => pushToast({ tone: 'info', title: 'Postergar pasaje', description: 'Esta opción estará disponible próximamente.' })}
            iconLeft={<CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Postergar este pasaje
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          disabled={!viaje.documentoDisponible}
          onClick={onBoleto}
          iconLeft={<FileText className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          Ver boleto
        </Button>
      </div>
    </li>
  )
}

export function ClienteDetalle({ idPasajero, onClose }: ClienteDetalleProps) {
  const { data, cargando, error, reintentar } = useAsyncResource(idPasajero === null ? null : `cliente-${idPasajero}`, () =>
    clientesService.detalle(idPasajero as number),
  )
  const [pestana, setPestana] = useState<Pestana>('proximos')
  const [idPrevio, setIdPrevio] = useState(idPasajero)
  if (idPrevio !== idPasajero) {
    setIdPrevio(idPasajero)
    setPestana('proximos')
  }
  const [boleto, setBoleto] = useState<ViajeHistorial | null>(null)

  const grupos = useMemo(() => {
    const historial = data?.historial ?? []
    return {
      proximos: historial.filter((v) => v.fase === 'PROXIMO'),
      realizados: historial.filter((v) => v.fase === 'REALIZADO'),
      otros: historial.filter((v) => v.fase !== 'PROXIMO' && v.fase !== 'REALIZADO'),
    }
  }, [data])

  const pestanas: { id: Pestana; label: string }[] = [
    { id: 'proximos', label: 'Próximos' },
    { id: 'realizados', label: 'Realizados' },
    ...(grupos.otros.length > 0 ? [{ id: 'otros' as Pestana, label: 'Otros' }] : []),
  ]
  const lista = grupos[pestana]
  const nombre = data ? `${data.nombres} ${data.apellidos}`.trim() : ''

  return (
    <>
      <Drawer
        open={idPasajero !== null}
        onClose={onClose}
        side="right"
        widthClassName="w-full max-w-[640px]"
        aria-label="Detalle del cliente"
        panelClassName="flex flex-col bg-surface-card"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
          {data ? (
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={nombre} />
              <div className="min-w-0">
                <h2 className="truncate font-display text-lg font-semibold text-text-900">{nombre}</h2>
                <p className="truncate text-xs tabular-nums text-text-500">
                  {data.tipoDocumento} {data.numeroDocumento}
                </p>
              </div>
            </div>
          ) : (
            <Skeleton className="h-10 w-48" />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-500 transition-colors hover:bg-surface-hover hover:text-text-900"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {cargando ? (
            <div role="status" aria-label="Cargando cliente" className="flex flex-col gap-3">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          ) : error || !data ? (
            <ErrorState title="No pudimos cargar el cliente" description="Inténtalo de nuevo." onRetry={reintentar} />
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                <Dato etiqueta="Viajes" valor={String(data.viajes)} />
                <Dato etiqueta="Teléfono" valor={data.telefono ?? '—'} />
                <Dato etiqueta="Nacimiento" valor={data.fechaNacimiento ? formatearFecha(data.fechaNacimiento) : '—'} />
                <Dato etiqueta="Primer viaje" valor={data.primerViaje ? formatearFechaHora(data.primerViaje) : '—'} />
                <Dato etiqueta="Último viaje" valor={data.ultimoViaje ? formatearFechaHora(data.ultimoViaje) : '—'} />
                <Dato etiqueta="Próximo viaje" valor={data.proximoViaje ? formatearFechaHora(data.proximoViaje) : '—'} />
              </dl>

              <section className="mt-6" aria-label="Historial de viajes">
                <div className="mb-3 flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-text-400" aria-hidden="true" />
                  <h3 className="text-sm font-semibold text-text-900">Historial de viajes</h3>
                </div>

                <div role="tablist" aria-label="Historial de viajes" className="mb-3 inline-flex rounded-lg border border-border bg-surface-sunken p-0.5">
                  {pestanas.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      role="tab"
                      aria-selected={pestana === p.id}
                      onClick={() => setPestana(p.id)}
                      className={cn(
                        'h-7 rounded-md px-3 text-[13px] font-medium transition-colors duration-150',
                        pestana === p.id ? 'bg-surface-card text-text-900 shadow-sm' : 'text-text-500 hover:text-text-900',
                      )}
                    >
                      {p.label} <span className="tabular-nums text-text-400">({grupos[p.id].length})</span>
                    </button>
                  ))}
                </div>

                {lista.length === 0 ? (
                  <EmptyState
                    icon={Phone}
                    title={pestana === 'proximos' ? 'Sin viajes próximos' : pestana === 'realizados' ? 'Sin viajes realizados' : 'Sin viajes'}
                    description="Cuando haya pasajes en esta categoría, aparecerán aquí."
                  />
                ) : (
                  <ul className="flex flex-col gap-3">
                    {lista.map((v) => (
                      <TarjetaViaje key={v.idPasaje} viaje={v} onBoleto={() => setBoleto(v)} />
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </Drawer>

      <BoletoModal viaje={boleto} onClose={() => setBoleto(null)} />
    </>
  )
}
