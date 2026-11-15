import { SearchX, TicketsPlane } from 'lucide-react'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Skeleton } from '@/components/feedback/Skeleton'
import { Button } from '@/components/ui/Button'
import type { ViajeConsulta } from '@/types/consultaViaje'
import { estadoReservaActual, ESTADOS_RESERVA } from '../utils/estadoReserva'
import { ResultadoCard } from './ResultadoCard'

interface ResultadosListaProps {
  /** `false` mientras falte origen, destino o fecha válidos: no hay consulta que mostrar. */
  hayConsulta: boolean
  viajes: ViajeConsulta[]
  cargando: boolean
  error: string | null
  hayFiltroHorario: boolean
  ahoraServidorMs: number
  onVerAsientos: (viaje: ViajeConsulta) => void
  onReintentar: () => void
  onQuitarHorario: () => void
}

/** Lista de resultados con sus estados: sin consulta, cargando, error, vacío y resultados. */
export function ResultadosLista({
  hayConsulta,
  viajes,
  cargando,
  error,
  hayFiltroHorario,
  ahoraServidorMs,
  onVerAsientos,
  onReintentar,
  onQuitarHorario,
}: ResultadosListaProps) {
  if (!hayConsulta) {
    return (
      <EmptyState
        icon={TicketsPlane}
        title="Consulta la disponibilidad de viajes"
        description="Elige origen, destino y fecha para ver los viajes programados y el estado de sus asientos."
      />
    )
  }

  if (cargando) {
    return (
      <div role="status" aria-label="Consultando viajes" className="flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[176px] w-full rounded-2xl" />
        ))}
      </div>
    )
  }

  if (error) {
    return <ErrorState title="No pudimos consultar los viajes" description={error} onRetry={onReintentar} />
  }

  if (viajes.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title={hayFiltroHorario ? 'Sin viajes en ese horario' : 'Sin viajes para esta búsqueda'}
        description={
          hayFiltroHorario
            ? 'No hay viajes en esa franja. Prueba con otro horario o quita el filtro.'
            : 'No encontramos viajes programados para esa fecha. Prueba con otro día.'
        }
        action={
          hayFiltroHorario ? (
            <Button variant="outline" size="sm" onClick={onQuitarHorario}>
              Quitar filtro de horario
            </Button>
          ) : undefined
        }
      />
    )
  }

  const disponibles = viajes.filter(
    (v) => estadoReservaActual(v, ahoraServidorMs) === ESTADOS_RESERVA.DISPONIBLE && v.precio != null,
  )
  const idMasEconomico = disponibles.length ? disponibles.reduce((menor, v) => ((v.precio ?? 0) < (menor.precio ?? 0) ? v : menor)).id : null

  return (
    <ul className="flex flex-col gap-3">
      {viajes.map((v, i) => (
        <li key={v.id} className="animate-fade-slide-up-sm" style={{ animationDelay: `${Math.min(i, 6) * 30}ms` }}>
          <ResultadoCard
            viaje={v}
            estadoReserva={estadoReservaActual(v, ahoraServidorMs)}
            esMasEconomico={v.id === idMasEconomico}
            onVerAsientos={() => onVerAsientos(v)}
          />
        </li>
      ))}
    </ul>
  )
}
