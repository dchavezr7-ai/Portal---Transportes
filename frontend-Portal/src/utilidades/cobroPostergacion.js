import { validarDatosPago } from './validarPagoSimulado.js'

// HU-02 criterio 6: reglas de reintento del pago de la diferencia (las mismas de HU-01).
// - Un pago aprobado cierra el cobro: no se vuelve a cobrar.
// - Un pago pendiente bloquea un nuevo cobro hasta conocer su resultado (evita cobros duplicados).
// - Un rechazo o un error de procesamiento sí permiten reintentar.
export function puedeIniciarNuevoCobro(intentos = []) {
  if (intentos.some((intento) => intento.resultado === 'APROBADO')) {
    return { permitido: false, motivo: 'El pago de este cambio ya fue aprobado. No se realizará otro cobro.' }
  }
  if (intentos.some((intento) => intento.resultado === 'PENDIENTE')) {
    return { permitido: false, motivo: 'Tu pago anterior sigue en revisión. No se realizará otro cobro hasta conocer su resultado.' }
  }
  return { permitido: true, motivo: null }
}

/**
 * Decide si se puede iniciar un cobro: primero revisa los intentos previos
 * (aprobado o pendiente bloquean) y luego la validez de los datos del método elegido.
 */
export function evaluarCobro({ intentos = [], metodo, datos = {}, ahora = new Date() } = {}) {
  const cobro = puedeIniciarNuevoCobro(intentos)
  if (!cobro.permitido) return { permitido: false, motivo: cobro.motivo, errores: {} }

  const errores = validarDatosPago(metodo, datos, ahora)
  if (Object.keys(errores).length > 0) return { permitido: false, motivo: null, errores }

  return { permitido: true, motivo: null, errores: {} }
}
