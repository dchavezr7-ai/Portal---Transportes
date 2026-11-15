import { Bus, Check, Lock, X } from 'lucide-react'
import { useMemo } from 'react'
import type { AsientoConsulta, EstadoAsiento, PisoConsulta } from '@/types/consultaViaje'
import { cn } from '@/utils/cn'

interface MapaAsientosBusProps {
  pisos: PisoConsulta[]
}

type EstadoVisual = EstadoAsiento | 'seleccionado'

const DESCRIPCION: Record<EstadoVisual, string> = {
  disponible: 'disponible',
  bloqueado: 'bloqueado temporalmente por otro cliente',
  ocupado: 'ocupado',
  seleccionado: 'seleccionado',
}

/**
 * Estado que se dibuja. `esMio` lo calcula el backend según la sesión de
 * reserva; esta consulta no abre sesión, así que nunca llega en `true`, pero se
 * respeta igual que en el Portal por si el contrato lo envía.
 */
function estadoVisual(a: AsientoConsulta): EstadoVisual {
  return a.esMio && a.estado === 'bloqueado' ? 'seleccionado' : a.estado
}

const base =
  'relative flex h-11 w-11 flex-col items-center justify-center rounded-t-xl rounded-b-md border text-[11px] font-semibold leading-none tabular-nums'

const estilos: Record<EstadoVisual, string> = {
  disponible: 'border-border-strong bg-surface-card text-text-700',
  // Bloqueado: ámbar, borde punteado y candado -> se distingue de "ocupado" (rojo, X) sin depender solo del color.
  bloqueado: 'border-dashed border-status-low/70 bg-status-low/12 text-warning-text',
  ocupado: 'border-status-out/30 bg-status-out/10 text-danger-500',
  seleccionado: 'border-transparent bg-cta text-on-cta',
}

function Volante({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M3.5 10.5 9.6 11.2M20.5 10.5l-6.1.7M12 14.5V21" />
    </svg>
  )
}

function Asiento({ asiento }: { asiento: AsientoConsulta }) {
  const visual = estadoVisual(asiento)
  const precio = asiento.precio != null ? `, S/ ${asiento.precio.toFixed(2)}` : ''
  return (
    <span
      role="img"
      aria-label={`Asiento ${asiento.numero}, ${DESCRIPCION[visual]}${visual === 'disponible' ? precio : ''}`}
      title={`Asiento ${asiento.numero} · ${DESCRIPCION[visual]}`}
      data-estado={visual}
      className={cn(base, estilos[visual])}
    >
      {visual === 'ocupado' ? (
        <X className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
      ) : (
        <>
          <span>{asiento.numero}</span>
          {visual === 'bloqueado' && <Lock className="mt-0.5 h-2.5 w-2.5" strokeWidth={2.75} aria-hidden="true" />}
          {visual === 'seleccionado' && <Check className="mt-0.5 h-2.5 w-2.5" strokeWidth={3.5} aria-hidden="true" />}
        </>
      )}
    </span>
  )
}

interface FilaPiso {
  fila: number
  izquierda: AsientoConsulta[]
  derecha: AsientoConsulta[]
}

/** Agrupa por fila respetando la numeración real del backend (también las filas sin asientos). */
function construirFilas(piso: PisoConsulta): FilaPiso[] {
  if (piso.asientos.length === 0) return []
  const porFila = new Map<number, FilaPiso>()
  for (const a of piso.asientos) {
    const fila = porFila.get(a.fila) ?? { fila: a.fila, izquierda: [], derecha: [] }
    fila[a.lado].push(a)
    porFila.set(a.fila, fila)
  }
  const orden = (a: AsientoConsulta, b: AsientoConsulta) => a.letra.localeCompare(b.letra)
  const filaMin = Math.min(...piso.asientos.map((a) => a.fila))
  const filaMax = Math.max(...piso.asientos.map((a) => a.fila))
  return Array.from({ length: filaMax - filaMin + 1 }, (_, i) => {
    const n = filaMin + i
    const f = porFila.get(n) ?? { fila: n, izquierda: [], derecha: [] }
    return { ...f, izquierda: [...f.izquierda].sort(orden), derecha: [...f.derecha].sort(orden) }
  })
}

function PisoBus({ piso, total }: { piso: PisoConsulta; total: number }) {
  const filas = useMemo(() => construirFilas(piso), [piso])
  return (
    <section
      role="group"
      aria-label={`Mapa de asientos, ${total > 1 ? `piso ${piso.piso}` : 'bus'}`}
      className="w-fit rounded-[32px] border-2 border-border-strong bg-surface-sunken px-5 pb-6 pt-4"
    >
      <div className="mb-4 flex items-center justify-between gap-6 border-b border-border pb-3 text-xs text-text-500">
        <span className="flex items-center gap-1.5 font-medium text-text-700">
          <Bus className="h-4 w-4" aria-hidden="true" />
          {total > 1 ? piso.descripcion || `Piso ${piso.piso}` : 'Bus'}
        </span>
        {piso.piso === 1 ? (
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em]">
            <Volante className="h-4 w-4" />
            Conductor
          </span>
        ) : (
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em]">Frente</span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {filas.map((fila) => (
          <div key={fila.fila} className="flex items-center justify-center gap-2">
            <div className="flex min-w-[24px] justify-end gap-2">{fila.izquierda.map((a) => <Asiento key={a.idAsiento} asiento={a} />)}</div>
            <span className="w-6 text-center text-[10px] tabular-nums text-text-400" aria-hidden="true">
              {fila.fila}
            </span>
            <div className="flex min-w-[24px] gap-2">{fila.derecha.map((a) => <Asiento key={a.idAsiento} asiento={a} />)}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

/**
 * Mapa del bus según su configuración real (1 o 2 pisos, asientos por lado y
 * numeración que entrega el backend). Estados: disponible, ocupado y
 * BLOQUEADO (retención temporal mientras otro cliente compra), este último es
 * el estado adicional que contempla el Portal. Es de solo lectura.
 */
export function MapaAsientosBus({ pisos }: MapaAsientosBusProps) {
  const hayMio = pisos.some((p) => p.asientos.some((a) => a.esMio && a.estado === 'bloqueado'))

  return (
    <div>
      <ul className="mb-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-text-500" aria-label="Leyenda del mapa">
        <li className="flex items-center gap-2">
          <span className="h-4 w-4 rounded-t-md rounded-b-sm border border-border-strong bg-surface-card" aria-hidden="true" />
          Disponible
        </li>
        <li className="flex items-center gap-2">
          <span className="flex h-4 w-4 items-center justify-center rounded-t-md rounded-b-sm border border-dashed border-status-low/70 bg-status-low/12 text-warning-text" aria-hidden="true">
            <Lock className="h-2.5 w-2.5" strokeWidth={3} />
          </span>
          Bloqueado
        </li>
        <li className="flex items-center gap-2">
          <span className="flex h-4 w-4 items-center justify-center rounded-t-md rounded-b-sm border border-status-out/30 bg-status-out/10 text-danger-500" aria-hidden="true">
            <X className="h-3 w-3" strokeWidth={3} />
          </span>
          Ocupado
        </li>
        {hayMio && (
          <li className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-t-md rounded-b-sm bg-cta" aria-hidden="true" />
            Seleccionado
          </li>
        )}
      </ul>

      <div className="flex flex-wrap items-start justify-center gap-6">
        {pisos.map((p) => (
          <PisoBus key={p.piso} piso={p} total={pisos.length} />
        ))}
      </div>
    </div>
  )
}
