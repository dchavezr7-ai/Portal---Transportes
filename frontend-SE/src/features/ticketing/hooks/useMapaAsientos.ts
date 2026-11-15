import { useCallback, useEffect, useRef, useState } from 'react'
import { consultaViajesService } from '@/services'
import { esApiError } from '@/services/api/httpClient'
import type { EventoAsiento, MapaAsientosConsulta } from '@/types/consultaViaje'
import { aplicarEstadoAsiento } from '../utils/viajes'

interface Resultado {
  clave: string
  mapa: MapaAsientosConsulta | null
  error: string | null
}

export function useMapaAsientos(idViaje: number | null, alEvento?: (evento: EventoAsiento) => void) {
  const [intento, setIntento] = useState(0)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [vivo, setVivo] = useState<string | null>(null)
  const clave = idViaje === null ? null : `${idViaje}#${intento}`

  const alEventoRef = useRef(alEvento)
  useEffect(() => {
    alEventoRef.current = alEvento
  })

  useEffect(() => {
    if (idViaje === null || clave === null) return
    let activo = true
    let pedida = 0
    let aplicada = 0

    async function cargar() {
      const mia = ++pedida
      try {
        const mapa = await consultaViajesService.obtenerMapaAsientos(idViaje as number)
        if (activo && mia > aplicada) {
          aplicada = mia
          setResultado({ clave: clave as string, mapa, error: null })
        }
      } catch (e) {
        if (!activo) return
        const error = esApiError(e) ? e.message : 'No se pudo cargar el mapa de asientos.'
        setResultado((previo) => (previo?.clave === clave && previo.mapa ? previo : { clave: clave as string, mapa: null, error }))
      }
    }

    void cargar()
    const cerrar = consultaViajesService.suscribirAsientos(idViaje, {
      alAbrir: () => {
        setVivo(clave)
        void cargar()
      },
      alError: () => setVivo((actual) => (actual === clave ? null : actual)),
      alAsiento: (evento) => {
        setResultado((previo) =>
          previo && previo.clave === clave && previo.mapa
            ? { ...previo, mapa: aplicarEstadoAsiento(previo.mapa, evento.idAsiento, evento.estado) }
            : previo,
        )
        alEventoRef.current?.(evento)
      },
    })
    return () => {
      activo = false
      cerrar()
    }
  }, [idViaje, clave])

  const recargar = useCallback(() => setIntento((n) => n + 1), [])

  const vigente = resultado !== null && resultado.clave === clave
  return {
    mapa: vigente ? resultado.mapa : null,
    cargando: clave !== null && !vigente,
    error: vigente ? resultado.error : null,
    enVivo: vivo !== null && vivo === clave,
    recargar,
  }
}
