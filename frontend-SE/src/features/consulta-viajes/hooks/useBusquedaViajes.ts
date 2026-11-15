import { useCallback, useEffect, useRef, useState } from 'react'
import { consultaViajesService } from '@/services'
import { esApiError } from '@/services/api/httpClient'
import type { FiltrosConsulta, ViajeConsulta } from '@/types/consultaViaje'

interface Resultado {
  clave: string
  viajes: ViajeConsulta[]
  /** Mensaje legible del fallo; `null` si la consulta salió bien. */
  error: string | null
}

/** Referencia estable: un `[]` nuevo por render haría re-ejecutar los efectos que dependen de `viajes`. */
const SIN_VIAJES: ViajeConsulta[] = []

async function consultar(filtros: FiltrosConsulta, clave: string): Promise<Resultado> {
  try {
    return { clave, viajes: await consultaViajesService.buscarViajes(filtros), error: null }
  } catch (e) {
    return { clave, viajes: [], error: esApiError(e) ? e.message : 'Ocurrió un problema al buscar viajes.' }
  }
}

/**
 * Consulta de viajes contra el backend. `filtros = null` no consulta (formulario
 * incompleto o inválido). El resultado se asocia a la consulta que lo originó:
 * al cambiar cualquier criterio nunca se ven datos de la búsqueda anterior y una
 * respuesta tardía no pisa a la vigente. `actualizar()` repite la consulta sin
 * vaciar la lista (sin parpadeo); `reintentar()` sí muestra la carga.
 */
export function useBusquedaViajes(filtros: FiltrosConsulta | null) {
  const [intento, setIntento] = useState(0)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  const origen = filtros?.origen
  const destino = filtros?.destino
  const fecha = filtros?.fecha
  const horario = filtros?.horario
  const clave = filtros ? `${origen}|${destino}|${fecha}|${horario}#${intento}` : null

  const claveRef = useRef(clave)
  const filtrosRef = useRef(filtros)
  useEffect(() => {
    claveRef.current = clave
    filtrosRef.current = filtros
  })

  useEffect(() => {
    if (origen === undefined || destino === undefined || fecha === undefined || horario === undefined || clave === null) return
    let activo = true
    void consultar({ origen, destino, fecha, horario }, clave).then((r) => {
      if (activo) setResultado(r)
    })
    return () => {
      activo = false
    }
  }, [origen, destino, fecha, horario, clave])

  const reintentar = useCallback(() => setIntento((n) => n + 1), [])

  const actualizar = useCallback(() => {
    const f = filtrosRef.current
    const c = claveRef.current
    if (!f || c === null) return
    void consultar(f, c).then((r) => {
      // Una actualización fallida conserva lo ya mostrado; solo se aplica si la consulta sigue vigente.
      if (claveRef.current === c && !r.error) setResultado(r)
    })
  }, [])

  const vigente = resultado !== null && resultado.clave === clave
  return {
    viajes: vigente ? resultado.viajes : SIN_VIAJES,
    cargando: clave !== null && !vigente,
    error: vigente ? resultado.error : null,
    reintentar,
    actualizar,
  }
}
