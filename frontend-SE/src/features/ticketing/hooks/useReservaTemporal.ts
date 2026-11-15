import { useEffect, useState } from 'react'
import { useTicketWizardStore } from './useTicketWizard'

export function useSegundosRestantes(expiraEn: number | null): number | null {
  const [ahora, setAhora] = useState(() => Date.now())

  useEffect(() => {
    if (expiraEn === null) return
    setAhora(Date.now())
    const temporizador = window.setInterval(() => setAhora(Date.now()), 1000)
    return () => window.clearInterval(temporizador)
  }, [expiraEn])

  return expiraEn === null ? null : Math.max(0, Math.ceil((expiraEn - ahora) / 1000))
}

export function useVencimientoReserva() {
  const sesion = useTicketWizardStore((s) => s.sesion)
  const vencer = useTicketWizardStore((s) => s.vencerSesion)

  useEffect(() => {
    if (!sesion) return
    const restante = sesion.expiraEn - Date.now()
    if (restante <= 0) {
      vencer()
      return
    }
    const temporizador = window.setTimeout(vencer, restante)
    return () => window.clearTimeout(temporizador)
  }, [sesion, vencer])
}
