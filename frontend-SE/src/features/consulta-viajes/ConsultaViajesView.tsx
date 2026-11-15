import { RotateCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageContainer } from '@/components/navigation/PageContainer'
import { Button } from '@/components/ui/Button'
import { TripResultsBar } from '@/features/ticketing/components/TripResultsBar'
import type { FiltrosConsulta, HorarioConsulta, ViajeConsulta } from '@/types/consultaViaje'
import { esCampoDeTexto, hayModalAbierto } from '@/utils/teclado'
import { AsientosModal } from './components/AsientosModal'
import { ConsultaFiltros } from './components/ConsultaFiltros'
import { HorarioFiltro } from './components/HorarioFiltro'
import { ResultadosLista } from './components/ResultadosLista'
import { useBusquedaViajes } from './hooks/useBusquedaViajes'
import { useRutasCiudad } from './hooks/useRutasCiudad'
import { calcularDesfaseServidor } from './utils/estadoReserva'
import { esFechaIso, fechaHoyLima } from './utils/fechas'
import { ORDEN_INICIAL, ordenarViajes, type OrdenConsulta } from './utils/viajes'

/**
 * "Operaciones › Viajes": consulta de viajes y de disponibilidad de asientos
 * con datos REALES del backend (los mismos endpoints que usa el Portal).
 *
 *   Origen/destino/fecha (+ horario) → resultados → mapa de asientos
 *
 * Es de solo lectura: no abre sesiones de reserva, no bloquea asientos y no
 * registra pasajes. Cualquier cambio de criterio vuelve a consultar al instante.
 */
export function ConsultaViajesView() {
  const hoy = fechaHoyLima()
  const [filtros, setFiltros] = useState<FiltrosConsulta>({ origen: '', destino: '', fecha: hoy, horario: 'cualquiera' })
  const [orden, setOrden] = useState<OrdenConsulta>(ORDEN_INICIAL)
  const [viajeAbierto, setViajeAbierto] = useState<ViajeConsulta | null>(null)

  const { rutas, cargando: cargandoRutas, error: errorRutas, reintentar: reintentarRutas } = useRutasCiudad()

  const errorFecha = !filtros.fecha
    ? 'Selecciona una fecha.'
    : !esFechaIso(filtros.fecha)
      ? 'La fecha no es válida.'
      : filtros.fecha < hoy
        ? 'Los viajes anteriores a hoy ya salieron.'
        : undefined

  // Solo se consulta con una ruta que existe y una fecha válida (misma validación que el buscador del Portal).
  const rutaValida = rutas.some((r) => r.origen === filtros.origen && r.destino === filtros.destino)
  const consulta: FiltrosConsulta | null = rutaValida && !errorFecha ? filtros : null
  const { viajes, cargando, error, reintentar, actualizar } = useBusquedaViajes(consulta)

  // Reloj del servidor: se re-evalúa cada 30 s para que una tarjeta pase a "reserva cerrada" / "salida realizada".
  const desfase = useRef(0)
  const [ahoraServidorMs, setAhoraServidorMs] = useState(() => Date.now())
  useEffect(() => {
    desfase.current = calcularDesfaseServidor(viajes)
    setAhoraServidorMs(Date.now() + desfase.current)
  }, [viajes])
  useEffect(() => {
    const id = setInterval(() => setAhoraServidorMs(Date.now() + desfase.current), 30_000)
    return () => clearInterval(id)
  }, [])

  // Atajo: "/" enfoca el origen (igual que en el resto del SE).
  useEffect(() => {
    function alTeclear(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || hayModalAbierto()) return
      if (e.key === '/' && !esCampoDeTexto(e.target)) {
        e.preventDefault()
        document.getElementById('consulta-origen')?.focus()
      }
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [])

  const visibles = useMemo(() => ordenarViajes(viajes, orden), [viajes, orden])

  const cambiarFiltros = useCallback((parcial: Partial<FiltrosConsulta>) => setFiltros((f) => ({ ...f, ...parcial })), [])
  const cambiarHorario = useCallback((horario: HorarioConsulta) => cambiarFiltros({ horario }), [cambiarFiltros])

  function cerrarAsientos() {
    setViajeAbierto(null)
    // El mapa pudo cambiar mientras estaba abierto: se refresca la cifra de disponibles sin vaciar la lista.
    if (consulta) actualizar()
  }

  const hayFiltros = filtros.horario !== 'cualquiera' || orden !== ORDEN_INICIAL

  return (
    <PageContainer
      title="Consulta de viajes"
      description="Consulta los viajes programados, su disponibilidad y el estado de los asientos."
      actions={
        consulta && (
          <Button variant="outline" size="sm" onClick={actualizar} iconLeft={<RotateCw className="h-3.5 w-3.5" aria-hidden="true" />}>
            Actualizar
          </Button>
        )
      }
    >
      {errorRutas ? (
        <ErrorState
          title="No pudimos cargar las rutas"
          description="Sin las rutas no se puede armar la búsqueda. Revisa tu conexión e inténtalo de nuevo."
          onRetry={reintentarRutas}
        />
      ) : (
        <>
          <section
            aria-label="Búsqueda de viajes"
            className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface-card shadow-panel"
          >
            <ConsultaFiltros filtros={filtros} rutas={rutas} cargandoRutas={cargandoRutas} hoy={hoy} errorFecha={errorFecha} onFiltros={cambiarFiltros} />
            <div className="border-t border-border px-4 py-2.5">
              <HorarioFiltro horario={filtros.horario} onChange={cambiarHorario} disabled={!consulta || cargando} />
            </div>
          </section>

          {consulta && !cargando && !error && (
            <TripResultsBar
              total={visibles.length}
              orden={orden}
              hayFiltros={hayFiltros}
              onOrden={setOrden}
              onReset={() => {
                setOrden(ORDEN_INICIAL)
                cambiarHorario('cualquiera')
              }}
            />
          )}

          <div aria-live="polite">
            <ResultadosLista
              hayConsulta={consulta !== null}
              viajes={visibles}
              cargando={cargando}
              error={error}
              hayFiltroHorario={filtros.horario !== 'cualquiera'}
              ahoraServidorMs={ahoraServidorMs}
              onVerAsientos={setViajeAbierto}
              onReintentar={reintentar}
              onQuitarHorario={() => cambiarHorario('cualquiera')}
            />
          </div>
        </>
      )}

      <AsientosModal viaje={viajeAbierto} onClose={cerrarAsientos} />
    </PageContainer>
  )
}
