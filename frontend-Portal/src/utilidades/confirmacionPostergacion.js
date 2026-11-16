// HU-02 · Confirmación (criterios 8 a 11) · Piezas puras entre la pantalla y el backend.
// - armarSolicitudConfirmacion: lo que se envía a POST /api/usuarios/postergaciones/{idPasaje}/confirmar.
// - errorDeConfirmacion: convierte la respuesta de rechazo del servidor (409 con el motivo) en un error con
//   el mismo código que ya entiende usePostergacion (CODIGOS_RECHAZO).
// - adaptarRespuestaConfirmacion: arma el pasaje actualizado con lo que el SERVIDOR dejó guardado
//   (nuevo viaje, fecha, horario y asiento), no con lo que se eligió en pantalla.

import { CODIGOS_RECHAZO, aplicarPostergacion } from './postergacion.js'

// Códigos que el backend manda en `detalles[0]` cuando rechaza la confirmación (409).
export const CODIGOS_RECHAZO_SERVIDOR = Object.freeze({
  PASAJE_NO_VIGENTE: CODIGOS_RECHAZO.PASAJE_NO_VIGENTE,
  VIAJE_INICIADO: CODIGOS_RECHAZO.VIAJE_INICIADO,
  ANTICIPACION_INSUFICIENTE: CODIGOS_RECHAZO.ANTICIPACION_INSUFICIENTE,
  MISMO_VIAJE: CODIGOS_RECHAZO.MISMO_VIAJE,
  ASIENTO_NO_DISPONIBLE: CODIGOS_RECHAZO.ASIENTO_NO_DISPONIBLE,
  // La reserva del asiento venció: igual que un asiento perdido, se puede elegir otro.
  SESION_VENCIDA: CODIGOS_RECHAZO.ASIENTO_NO_DISPONIBLE,
  VIAJE_NO_RESERVABLE: 'VIAJE_NO_RESERVABLE',
  PAGO_INSUFICIENTE: 'PAGO_INSUFICIENTE',
  CAMBIO_NO_APLICADO: 'CAMBIO_NO_APLICADO',
})

export const CODIGO_SIN_CONFIRMAR = 'SIN_CONFIRMAR'
export const CODIGO_RECHAZO_CONFIRMACION = 'CONFIRMACION_RECHAZADA'

export class ErrorConfirmacion extends Error {
  constructor(codigo, mensaje) {
    super(mensaje)
    this.name = 'ErrorConfirmacion'
    this.codigo = codigo
  }
}

const MENSAJE_SIN_SESION = 'La reserva de tu asiento venció. Tu pasaje original no fue modificado.'
const MENSAJE_SIN_CONEXION = 'No pudimos confirmar el cambio por un problema de conexión. Revisa tu pasaje en Mis pasajes antes de intentarlo de nuevo.'
const MENSAJE_GENERICO = 'No se pudo completar el cambio de viaje. Tu pasaje original no fue modificado.'

function redondear(monto) {
  const numero = Number(monto)
  return Number.isFinite(numero) ? Math.round(numero * 100) / 100 : 0
}

// Cuerpo de la solicitud. El usuario NO se envía: el servidor lo toma del token de sesión.
export function armarSolicitudConfirmacion({ viaje, asiento, sesion, comparacion, pago = null }) {
  if (!sesion?.tokenSesion) throw new ErrorConfirmacion(CODIGOS_RECHAZO.ASIENTO_NO_DISPONIBLE, MENSAJE_SIN_SESION)
  const monto = comparacion?.requierePago ? redondear(comparacion.montoAPagar) : 0
  const solicitud = {
    idViajeNuevo: viaje.id,
    idAsiento: asiento.idAsiento,
    tokenSesion: sesion.tokenSesion,
    montoAdicional: monto,
  }
  if (monto > 0 && pago?.referencia) solicitud.referenciaPago = pago.referencia
  return solicitud
}

// Rechazo del servidor (409 con motivo y código) o falla de conexión → ErrorConfirmacion con el código del front.
export function errorDeConfirmacion(error) {
  if (error instanceof ErrorConfirmacion) return error
  if (error?.sinRespuesta) return new ErrorConfirmacion(CODIGO_SIN_CONFIRMAR, MENSAJE_SIN_CONEXION)
  const codigoServidor = Array.isArray(error?.detalles) ? error.detalles[0] : null
  const codigo = CODIGOS_RECHAZO_SERVIDOR[codigoServidor]
    ?? (error?.status === 404 ? CODIGOS_RECHAZO.PASAJE_NO_VIGENTE : CODIGO_RECHAZO_CONFIRMACION)
  return new ErrorConfirmacion(codigo, error?.message || MENSAJE_GENERICO)
}

// El servidor manda la hora como "08:00:00"; la pantalla usa "08:00".
function horaCorta(hora) {
  return typeof hora === 'string' ? hora.slice(0, 5) : hora
}

// Pasaje actualizado a partir de lo que devolvió el servidor (criterio 11: nuevo viaje, fecha, horario y asiento).
export function adaptarRespuestaConfirmacion(respuesta, { pasaje, viaje, asiento, pago = null }) {
  const importe = redondear(respuesta.importeAdicional)
  const viajeConfirmado = {
    ...viaje,
    id: respuesta.idViajeNuevo,
    origen: respuesta.origen,
    destino: respuesta.destino,
    fechaSalida: respuesta.fechaSalida,
    horaSalida: horaCorta(respuesta.horaSalida),
  }
  const asientoConfirmado = { ...asiento, numero: respuesta.asientoNuevo }
  const actualizado = {
    ...aplicarPostergacion(pasaje, viajeConfirmado, asientoConfirmado, redondear((pasaje.montoAdicionalPagado ?? 0) + importe)),
    confirmadoEnServidor: true,
    idPostergacion: respuesta.idPostergacion,
  }
  const referencia = respuesta.referenciaPago ?? pago?.referencia ?? null
  return {
    pasaje: actualizado,
    pago: importe > 0 && referencia ? { ...(pago ?? {}), referencia, monto: importe } : null,
    montoAdicional: importe,
  }
}
