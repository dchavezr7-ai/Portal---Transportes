import { Clock, Moon, Sun, Sunrise, Sunset } from 'lucide-react'
import type { ReactNode } from 'react'
import type { HorarioConsulta } from '@/types/consultaViaje'
import { cn } from '@/utils/cn'
import { FRANJAS_CONSULTA } from '../utils/viajes'

interface HorarioFiltroProps {
  horario: HorarioConsulta
  onChange: (horario: HorarioConsulta) => void
  disabled?: boolean
}

const iconos: Record<Exclude<HorarioConsulta, 'cualquiera'>, ReactNode> = {
  madrugada: <Moon className="h-3.5 w-3.5" aria-hidden="true" />,
  mañana: <Sunrise className="h-3.5 w-3.5" aria-hidden="true" />,
  tarde: <Sun className="h-3.5 w-3.5" aria-hidden="true" />,
  noche: <Sunset className="h-3.5 w-3.5" aria-hidden="true" />,
}

/**
 * Franja de salida. Igual que en el Portal es de selección ÚNICA y la filtra el
 * backend (`horario`): pulsar la franja activa vuelve a "cualquiera". Sin
 * franja activa se muestran todos los horarios.
 */
export function HorarioFiltro({ horario, onChange, disabled }: HorarioFiltroProps) {
  return (
    <div role="group" aria-label="Horario de salida" className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-500">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        Horario
      </span>
      <div className="flex flex-wrap gap-1.5">
        {FRANJAS_CONSULTA.map((f) => {
          const activo = horario === f.id
          return (
            <button
              key={f.id}
              type="button"
              disabled={disabled}
              aria-pressed={activo}
              title={f.rango}
              onClick={() => onChange(activo ? 'cualquiera' : f.id)}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium',
                'transition-[background-color,border-color,color,transform] duration-150 ease-[var(--ease-premium)] active:scale-[0.97]',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-line',
                activo
                  ? 'border-accent-line bg-accent-line/12 text-text-900'
                  : 'border-border bg-transparent text-text-700 hover:border-border-strong hover:bg-surface-hover',
                disabled && 'pointer-events-none opacity-50',
              )}
            >
              <span className={cn('transition-colors duration-150', activo ? 'text-accent-text' : 'text-text-400')}>{iconos[f.id]}</span>
              {f.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
