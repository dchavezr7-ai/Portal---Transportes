import { Flag, MapPin } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { DatePicker } from '@/components/ui/DatePicker'
import { Select } from '@/components/ui/Select'
import type { RutaCiudad } from '@/types/consultaViaje'
import { cn } from '@/utils/cn'
import type { FiltrosViajeForm } from '../types'

interface TravelFiltersProps {
  filtros: FiltrosViajeForm
  rutas: RutaCiudad[]
  hoy: string
  errorFecha?: string
  onFiltros: (parcial: Partial<FiltrosViajeForm>) => void
}

const etiquetaCelda = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-text-500'
const triggerCelda =
  'h-7 border-transparent bg-transparent px-0 text-sm font-medium hover:border-transparent hover:bg-transparent focus-visible:ring-0 data-[open=true]:ring-0 rounded-md'

function Celda({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'min-w-0 bg-surface-card px-4 py-2.5',
        'transition-colors duration-150 ease-[var(--ease-premium)]',
        'hover:bg-surface-hover focus-within:bg-surface-hover focus-within:shadow-[inset_0_-2px_0_var(--color-accent-line)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function TravelFilters({ filtros, rutas, hoy, errorFecha, onFiltros }: TravelFiltersProps) {
  const origenes = useMemo(() => [...new Set(rutas.map((r) => r.origen))].sort((a, b) => a.localeCompare(b, 'es')), [rutas])
  const destinos = useMemo(
    () => [...new Set(rutas.filter((r) => r.origen === filtros.origen).map((r) => r.destino))].sort((a, b) => a.localeCompare(b, 'es')),
    [rutas, filtros.origen],
  )

  const opciones = (lista: string[], actual: string) => (lista.length > 0 ? lista : actual ? [actual] : []).map((c) => ({ value: c, label: c }))

  function cambiarOrigen(origen: string) {
    const posibles = rutas.filter((r) => r.origen === origen).map((r) => r.destino)
    onFiltros({ origen, destino: posibles.includes(filtros.destino) ? filtros.destino : (posibles[0] ?? '') })
  }

  return (
    <div className="@container">
      <div className="grid grid-cols-1 gap-px bg-border @md:grid-cols-2 @xl:grid-cols-3">
        <Celda>
          <Select
            id="filtro-origen"
            label="Origen"
            labelClassName={etiquetaCelda}
            containerClassName="gap-0.5"
            className={triggerCelda}
            icon={<MapPin className="h-4 w-4" />}
            value={filtros.origen}
            onChange={cambiarOrigen}
            options={opciones(origenes, filtros.origen)}
          />
        </Celda>

        <Celda>
          <Select
            id="filtro-destino"
            label="Destino"
            labelClassName={etiquetaCelda}
            containerClassName="gap-0.5"
            className={triggerCelda}
            icon={<Flag className="h-4 w-4" />}
            value={filtros.destino}
            onChange={(destino) => onFiltros({ destino })}
            options={opciones(destinos, filtros.destino)}
          />
        </Celda>

        <Celda className={cn('@md:col-span-2 @xl:col-span-1', errorFecha && 'shadow-[inset_0_-2px_0_var(--color-danger-500)]')}>
          <DatePicker
            id="filtro-fecha"
            label="Fecha"
            value={filtros.fecha}
            min={hoy}
            onChange={(fecha) => onFiltros({ fecha })}
            labelClassName={etiquetaCelda}
            containerClassName="gap-0.5"
            className="h-7 border-transparent bg-transparent px-0 hover:border-transparent"
          />
        </Celda>
      </div>
      {errorFecha && (
        <p role="alert" className="border-t border-border bg-surface-card px-4 py-2 text-xs font-medium text-danger-500">
          {errorFecha}
        </p>
      )}
    </div>
  )
}
