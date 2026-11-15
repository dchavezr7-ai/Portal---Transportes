import { ArrowLeftRight, CalendarDays, ChevronLeft, ChevronRight, Flag, MapPin } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { Select } from '@/components/ui/Select'
import type { FiltrosConsulta, RutaCiudad } from '@/types/consultaViaje'
import { cn } from '@/utils/cn'
import { sumarDias } from '@/utils/fechas'
import { formatearFechaLarga } from '@/utils/formato'

interface ConsultaFiltrosProps {
  filtros: FiltrosConsulta
  rutas: RutaCiudad[]
  cargandoRutas: boolean
  /** Fecha mínima seleccionable (hoy, en hora de Perú). */
  hoy: string
  errorFecha?: string
  onFiltros: (parcial: Partial<FiltrosConsulta>) => void
}

const etiquetaCelda = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-text-500'
/** Sobrescribe el aspecto de "campo con borde" del Select para que se lea como celda de la barra. */
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

/**
 * Origen · Destino · Fecha. Las opciones salen de las rutas reales del backend:
 * el destino solo ofrece las ciudades con ruta desde el origen elegido (igual
 * que el buscador del Portal) y se puede invertir la ruta si existe la inversa.
 */
export function ConsultaFiltros({ filtros, rutas, cargandoRutas, hoy, errorFecha, onFiltros }: ConsultaFiltrosProps) {
  const origenes = useMemo(
    () => [...new Set(rutas.map((r) => r.origen))].sort((a, b) => a.localeCompare(b, 'es')),
    [rutas],
  )
  const destinos = useMemo(
    () =>
      rutas
        .filter((r) => r.origen === filtros.origen)
        .map((r) => r.destino)
        .sort((a, b) => a.localeCompare(b, 'es')),
    [rutas, filtros.origen],
  )
  const puedeInvertir =
    !!filtros.origen && !!filtros.destino && rutas.some((r) => r.origen === filtros.destino && r.destino === filtros.origen)
  const puedeRetroceder = !!filtros.fecha && filtros.fecha > hoy

  function cambiarOrigen(origen: string) {
    const sigueValido = rutas.some((r) => r.origen === origen && r.destino === filtros.destino)
    onFiltros({ origen, destino: sigueValido ? filtros.destino : '' })
  }

  return (
    <div className="@container">
      <div className="grid grid-cols-1 gap-px bg-border @md:grid-cols-2 @xl:grid-cols-[1fr_1fr_1fr]">
        <Celda>
          <Select
            id="consulta-origen"
            label="Origen"
            labelClassName={etiquetaCelda}
            containerClassName="gap-0.5"
            className={triggerCelda}
            icon={<MapPin className="h-4 w-4" />}
            placeholder={cargandoRutas ? 'Cargando rutas…' : 'Elegir origen'}
            value={filtros.origen}
            onChange={cambiarOrigen}
            options={origenes.map((c) => ({ value: c, label: c }))}
            disabled={cargandoRutas || origenes.length === 0}
          />
        </Celda>

        <Celda className="relative">
          <Select
            id="consulta-destino"
            label="Destino"
            labelClassName={etiquetaCelda}
            containerClassName="gap-0.5"
            className={triggerCelda}
            icon={<Flag className="h-4 w-4" />}
            placeholder={filtros.origen ? 'Elegir destino' : 'Primero elige el origen'}
            value={filtros.destino}
            onChange={(destino) => onFiltros({ destino })}
            options={destinos.map((c) => ({ value: c, label: c }))}
            disabled={!filtros.origen || destinos.length === 0}
          />
          <button
            type="button"
            onClick={() => onFiltros({ origen: filtros.destino, destino: filtros.origen })}
            disabled={!puedeInvertir}
            aria-label="Intercambiar origen y destino"
            title="Intercambiar origen y destino"
            className="absolute right-3 top-1/2 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-text-500 transition-colors duration-150 hover:bg-border/60 hover:text-text-900 disabled:pointer-events-none disabled:opacity-30 @md:flex"
          >
            <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </Celda>

        <Celda className={cn('@md:col-span-2 @xl:col-span-1', errorFecha && 'shadow-[inset_0_-2px_0_var(--color-danger-500)]')}>
          <span id="consulta-fecha-label" className={etiquetaCelda}>
            Fecha
          </span>
          <div className="mt-0.5 flex h-7 items-center gap-1">
            <div className="relative flex min-w-0 flex-1 items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0 text-text-400" aria-hidden="true" />
              <span className="truncate text-sm font-medium capitalize text-text-900">
                {filtros.fecha ? formatearFechaLarga(filtros.fecha) : 'Elegir fecha'}
              </span>
              {/* Input nativo transparente encima: conserva teclado, lector de pantalla y selector de fecha. */}
              <input
                id="consulta-fecha"
                type="date"
                aria-labelledby="consulta-fecha-label"
                aria-invalid={!!errorFecha}
                min={hoy}
                value={filtros.fecha}
                onChange={(e) => onFiltros({ fecha: e.target.value })}
                onClick={(e) => e.currentTarget.showPicker?.()}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </div>
            <button
              type="button"
              onClick={() => onFiltros({ fecha: sumarDias(filtros.fecha, -1) })}
              disabled={!puedeRetroceder}
              aria-label="Día anterior"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-500 transition-colors duration-150 hover:bg-border/60 hover:text-text-900 disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onFiltros({ fecha: sumarDias(filtros.fecha || hoy, 1) })}
              aria-label="Día siguiente"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-500 transition-colors duration-150 hover:bg-border/60 hover:text-text-900"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
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
