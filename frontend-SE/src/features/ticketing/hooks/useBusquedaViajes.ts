import { useCallback, useEffect, useRef, useState } from 'react'
import { consultaViajesService } from '@/services'
import { esApiError } from '@/services/api/httpClient'
import type { FiltrosConsulta, FranjaId, ViajeConsulta } from '@/types/consultaViaje'

interface Resultado {
  clave: string
  viajes: ViajeConsulta[]
  error: string | null
}

const SIN_VIAJES: ViajeConsulta[] = []

async function consultar(filtros: FiltrosConsulta, clave: string): Promise<Resultado> {
  try {
    return { clave, viajes: await consultaViajesService.buscarViajes(filtros), error: null }
  } catch (e) {
    return { clave, viajes: [], error: esApiError(e) ? e.message : 'Ocurrió un problema al buscar viajes.' }
  }
}

export function useBusquedaViajes(filtros: FiltrosConsulta | null) {
  const [intento, setIntento] = useState(0)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  const origen = filtros?.origen
  const destino = filtros?.destino
  const fecha = filtros?.fecha
  const franjasClave = filtros ? filtros.franjas.join(',') : null
  const clave = filtros ? `${origen}|${destino}|${fecha}|${franjasClave}#${intento}` : null

  const claveRef = useRef(clave)
  const filtrosRef = useRef(filtros)
  useEffect(() => {
    claveRef.current = clave
    filtrosRef.current = filtros
  })

  useEffect(() => {
    if (origen === undefined || destino === undefined || fecha === undefined || franjasClave === null || clave === null) return
    const franjas = (franjasClave ? franjasClave.split(',') : []) as FranjaId[]
    let activo = true
    void consultar({ origen, destino, fecha, franjas }, clave).then((r) => {
      if (activo) setResultado(r)
    })
    return () => {
      activo = false
    }
  }, [origen, destino, fecha, franjasClave, clave])

  const reintentar = useCallback(() => setIntento((n) => n + 1), [])

  const actualizar = useCallback(() => {
    const f = filtrosRef.current
    const c = claveRef.current
    if (!f || c === null) return
    void consultar(f, c).then((r) => {
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
