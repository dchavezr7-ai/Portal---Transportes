import { Timer } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useSegundosRestantes } from '../hooks/useReservaTemporal'
import { useTicketWizardStore } from '../hooks/useTicketWizard'

export function formatearCuenta(segundos: number): string {
  const m = Math.floor(segundos / 60)
  const s = segundos % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function ReservaTemporal({ className }: { className?: string }) {
  const sesion = useTicketWizardStore((s) => s.sesion)
  const segundos = useSegundosRestantes(sesion?.expiraEn ?? null)
  if (segundos === null) return null
  const urgente = segundos <= 30

  return (
    <div
      role="timer"
      aria-label={`Reserva temporal, quedan ${formatearCuenta(segundos)}`}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tabular-nums transition-colors duration-300',
        urgente ? 'border-status-out/40 bg-status-out/10 text-danger-500' : 'border-accent-line/40 bg-accent-line/10 text-accent-text',
        className,
      )}
    >
      <Timer className="h-3.5 w-3.5" aria-hidden="true" />
      <span>Reserva temporal</span>
      <span className="text-sm">{formatearCuenta(segundos)}</span>
    </div>
  )
}
