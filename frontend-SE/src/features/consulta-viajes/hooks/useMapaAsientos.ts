import { useCallback, useEffect, useState } from 'react'
import { consultaViajesService } from '@/services'
import { esApiError } from '@/services/api/httpClient'
import type { MapaAsientosConsulta } from '@/types/consultaViaje'
import { aplicarEstadoAsiento } from '../utils/viajes'

interface Resultado {
  clave: string
  mapa: MapaAsientosConsulta | null
  error: string | null
}

/**
 * Mapa de asientos de un viaje con datos reales y actualización en tiempo real.
 *
 * Replica el patrón del Portal: se abre el canal SSE y, al conectar y en cada
 * reconexión, se recarga el mapa completo; cada evento `asiento` actualiza solo
 * ese asiento. La consulta es de SOLO LECTURA: no se crea sesión de reserva ni
 * se bloquea ningún asiento. Los resultados se asocian al viaje que los pidió,
 * así que al cambiar de viaje no se ve el mapa del anterior.
 */
export function useMapaAsientos(idViaje: number | null) {
  const [intento, setIntento] = useState(0)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [vivo, setVivo] = useState<string | null>(null)
  const clave = idViaje === null ? null : `${idViaje}#${intento}`

  useEffect(() => {
    if (idViaje === null || clave === null) return
    let activo = true
    let pedida = 0 // número de la última petición lanzada
    let aplicada = 0 // número de la petición más reciente ya aplicada: una respuesta más vieja no la pisa

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
        // Un fallo al refrescar no borra un mapa que ya se está mostrando.
        setResultado((previo) => (previo?.clave === clave && previo.mapa ? previo : { clave: clave as string, mapa: null, error }))
      }
    }

    void cargar()
    const cerrar = consultaViajesService.suscribirAsientos(idViaje, {
      alAbrir: () => {
        setVivo(clave)
        void cargar() // al abrir y en cada reconexión
      },
      alError: () => setVivo((actual) => (actual === clave ? null : actual)),
      alAsiento: ({ idAsiento, estado }) =>
        setResultado((previo) =>
          previo && previo.clave === clave && previo.mapa
            ? { ...previo, mapa: aplicarEstadoAsiento(previo.mapa, idAsiento, estado) }
            : previo,
        ),
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
