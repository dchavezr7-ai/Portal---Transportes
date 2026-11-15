import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'
import { sumarDias } from '@/utils/fechas'
import { formatearFechaLarga } from '@/utils/formato'

interface DatePickerProps {
  value: string
  onChange: (iso: string) => void
  min?: string
  max?: string
  label?: string
  id?: string
  error?: string
  className?: string
  labelClassName?: string
  containerClassName?: string
}

interface Posicion {
  left: number
  top?: number
  bottom?: number
}

const ANCHO_PANEL = 288
const ALTO_PANEL = 340
const SEPARACION = 6
const MARGEN = 8
const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

const dos = (n: number) => String(n).padStart(2, '0')
const aIso = (y: number, m: number, d: number) => `${y}-${dos(m + 1)}-${dos(d)}`
const partes = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m: m - 1, d }
}

function titulo(y: number, m: number) {
  const texto = new Date(Date.UTC(y, m, 1)).toLocaleDateString('es-PE', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function celdasDelMes(y: number, m: number): (string | null)[] {
  const desfase = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7
  const total = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const celdas: (string | null)[] = Array.from({ length: desfase }, () => null)
  for (let d = 1; d <= total; d++) celdas.push(aIso(y, m, d))
  while (celdas.length % 7 !== 0) celdas.push(null)
  return celdas
}

function calcularPosicion(disparador: HTMLElement): Posicion {
  const r = disparador.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  const left = Math.min(Math.max(r.left, MARGEN), vw - MARGEN - ANCHO_PANEL)
  const abajo = vh - r.bottom - SEPARACION - MARGEN
  const arriba = r.top - SEPARACION - MARGEN
  return abajo >= ALTO_PANEL || abajo >= arriba
    ? { left, top: r.bottom + SEPARACION }
    : { left, bottom: vh - r.top + SEPARACION }
}

export function DatePicker({
  value,
  onChange,
  min,
  max,
  label,
  id,
  error,
  className,
  labelClassName,
  containerClassName,
}: DatePickerProps) {
  const generado = useId()
  const triggerId = id ?? `${generado}-fecha`
  const labelId = `${generado}-etiqueta`
  const panelId = `${generado}-panel`

  const [abierto, setAbierto] = useState(false)
  const [posicion, setPosicion] = useState<Posicion | null>(null)
  const inicial = partes(value || min || aIso(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1))
  const [vista, setVista] = useState({ y: inicial.y, m: inicial.m })
  const [foco, setFoco] = useState(value)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const enfocarDia = useRef(false)

  const celdas = useMemo(() => celdasDelMes(vista.y, vista.m), [vista])
  const hoy = min

  const deshabilitada = useCallback((iso: string) => (!!min && iso < min) || (!!max && iso > max), [min, max])

  const cerrar = useCallback((devolverFoco: boolean) => {
    setAbierto(false)
    if (devolverFoco) triggerRef.current?.focus({ preventScroll: true })
  }, [])

  const abrir = useCallback(() => {
    const base = partes(value || min || aIso(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1))
    setVista({ y: base.y, m: base.m })
    setFoco(value || min || '')
    enfocarDia.current = true
    setAbierto(true)
  }, [value, min])

  useLayoutEffect(() => {
    if (!abierto || !triggerRef.current) return
    setPosicion(calcularPosicion(triggerRef.current))
  }, [abierto])

  useEffect(() => {
    if (!abierto) return
    function alPulsar(e: PointerEvent) {
      const objetivo = e.target as Node
      if (panelRef.current?.contains(objetivo) || triggerRef.current?.contains(objetivo)) return
      cerrar(false)
    }
    function alTeclear(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') cerrar(true)
    }
    function alMover() {
      cerrar(false)
    }
    document.addEventListener('pointerdown', alPulsar)
    document.addEventListener('keydown', alTeclear)
    window.addEventListener('resize', alMover)
    window.addEventListener('scroll', alMover, true)
    return () => {
      document.removeEventListener('pointerdown', alPulsar)
      document.removeEventListener('keydown', alTeclear)
      window.removeEventListener('resize', alMover)
      window.removeEventListener('scroll', alMover, true)
    }
  }, [abierto, cerrar])

  useEffect(() => {
    if (!abierto || !posicion || !enfocarDia.current) return
    enfocarDia.current = false
    panelRef.current?.querySelector<HTMLButtonElement>('button[data-dia][tabindex="0"]')?.focus({ preventScroll: true })
  }, [abierto, posicion, foco])

  function moverMes(delta: number) {
    setVista((v) => {
      const total = v.y * 12 + v.m + delta
      return { y: Math.floor(total / 12), m: ((total % 12) + 12) % 12 }
    })
  }

  function elegir(iso: string) {
    if (deshabilitada(iso)) return
    onChange(iso)
    cerrar(true)
  }

  function moverFoco(destino: string) {
    if (deshabilitada(destino)) return
    const p = partes(destino)
    setVista({ y: p.y, m: p.m })
    setFoco(destino)
    enfocarDia.current = true
  }

  function alTeclearDia(e: KeyboardEvent<HTMLDivElement>) {
    const base = foco || value || min
    if (!base) return
    const pasos: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    if (e.key in pasos) {
      e.preventDefault()
      moverFoco(sumarDias(base, pasos[e.key]))
    } else if (e.key === 'Home') {
      e.preventDefault()
      moverFoco(aIso(vista.y, vista.m, 1))
    } else if (e.key === 'End') {
      e.preventDefault()
      moverFoco(aIso(vista.y, vista.m, new Date(Date.UTC(vista.y, vista.m + 1, 0)).getUTCDate()))
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault()
      const p = partes(base)
      const total = p.y * 12 + p.m + (e.key === 'PageUp' ? -1 : 1)
      const y = Math.floor(total / 12)
      const m = ((total % 12) + 12) % 12
      const ultimo = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
      moverFoco(aIso(y, m, Math.min(p.d, ultimo)))
    }
  }

  const diaFocoVisible = celdas.includes(foco) ? foco : celdas.find((c) => c && !deshabilitada(c)) ?? null
  const puedeRetroceder = !min || aIso(vista.y, vista.m, 1) > min.slice(0, 8) + '01'
  const siguiente = vista.m === 11 ? { y: vista.y + 1, m: 0 } : { y: vista.y, m: vista.m + 1 }
  const puedeAvanzar = !max || aIso(siguiente.y, siguiente.m, 1) <= max

  return (
    <div className={cn('flex min-w-0 flex-col gap-1', containerClassName)}>
      {label && (
        <span id={labelId} className={cn('text-xs font-medium text-text-700', labelClassName)}>
          {label}
        </span>
      )}
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={abierto}
        aria-controls={abierto ? panelId : undefined}
        aria-labelledby={label ? `${labelId} ${triggerId}` : undefined}
        aria-invalid={!!error}
        onClick={() => (abierto ? cerrar(false) : abrir())}
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-lg border border-border bg-surface-card px-3 text-left text-sm font-medium text-text-900',
          'transition-colors duration-150 hover:border-border-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-line',
          error && 'border-danger-500',
          className,
        )}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-text-400" aria-hidden="true" />
        <span className="truncate capitalize">{value ? formatearFechaLarga(value) : 'Elegir fecha'}</span>
      </button>

      {abierto &&
        posicion &&
        createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label="Elegir fecha"
            style={{ position: 'fixed', left: posicion.left, top: posicion.top, bottom: posicion.bottom, width: ANCHO_PANEL }}
            className="animate-fade-slide-up-sm z-[80] rounded-xl border border-border bg-surface-card p-3 shadow-flyout"
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => moverMes(-1)}
                disabled={!puedeRetroceder}
                aria-label="Mes anterior"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-500 transition-colors hover:bg-surface-hover hover:text-text-900 disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <p className="text-sm font-semibold text-text-900" aria-live="polite">
                {titulo(vista.y, vista.m)}
              </p>
              <button
                type="button"
                onClick={() => moverMes(1)}
                disabled={!puedeAvanzar}
                aria-label="Mes siguiente"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-500 transition-colors hover:bg-surface-hover hover:text-text-900 disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-y-1 text-center" role="grid" aria-label={titulo(vista.y, vista.m)} onKeyDown={alTeclearDia}>
              {DIAS_SEMANA.map((d) => (
                <span key={d} role="columnheader" className="pb-1 text-[10px] font-semibold uppercase tracking-wide text-text-400">
                  {d}
                </span>
              ))}
              {celdas.map((iso, i) => {
                if (!iso) return <span key={`v${i}`} aria-hidden="true" />
                const seleccionado = iso === value
                const esHoy = iso === hoy
                const bloqueado = deshabilitada(iso)
                return (
                  <button
                    key={iso}
                    type="button"
                    data-dia
                    role="gridcell"
                    tabIndex={iso === diaFocoVisible ? 0 : -1}
                    disabled={bloqueado}
                    aria-selected={seleccionado}
                    aria-current={esHoy ? 'date' : undefined}
                    aria-label={formatearFechaLarga(iso)}
                    onClick={() => elegir(iso)}
                    className={cn(
                      'mx-auto flex h-9 w-9 items-center justify-center rounded-lg text-sm tabular-nums transition-colors duration-150',
                      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-line',
                      bloqueado && 'cursor-not-allowed text-text-400 opacity-40',
                      !bloqueado && !seleccionado && 'text-text-900 hover:bg-surface-hover',
                      !bloqueado && esHoy && !seleccionado && 'font-semibold text-accent-text shadow-[inset_0_0_0_1px_var(--color-accent-line)]',
                      seleccionado && 'bg-cta font-semibold text-on-cta',
                    )}
                  >
                    {Number(iso.slice(8))}
                  </button>
                )
              })}
            </div>

            {min && (
              <button
                type="button"
                onClick={() => elegir(min)}
                className="mt-2 w-full rounded-lg py-1.5 text-xs font-medium text-accent-text transition-colors hover:bg-surface-hover"
              >
                Ir a hoy
              </button>
            )}
          </div>,
          document.body,
        )}

      {error && (
        <p role="alert" className="text-xs font-medium text-danger-500">
          {error}
        </p>
      )}
    </div>
  )
}
