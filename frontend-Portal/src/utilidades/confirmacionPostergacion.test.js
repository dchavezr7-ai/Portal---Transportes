import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  CODIGO_RECHAZO_CONFIRMACION,
  CODIGO_SIN_CONFIRMAR,
  ErrorConfirmacion,
  adaptarRespuestaConfirmacion,
  armarSolicitudConfirmacion,
  errorDeConfirmacion,
} from './confirmacionPostergacion.js'
import { CODIGOS_RECHAZO } from './postergacion.js'

const pasaje = {
  idPasaje: 26, idVenta: 10, idViaje: 500, origen: 'Trujillo', destino: 'Lima', fechaSalida: '2026-11-22',
  horaSalida: '08:00', asiento: '12A', precioPagado: 43, montoAdicionalPagado: 0, deCompraReal: true,
}
const viaje = { id: 600, origen: 'Trujillo', destino: 'Lima', fechaSalida: '2026-11-25', horaSalida: '10:00', empresa: 'RutaLibre', tipoBus: 'Bus Cama' }
const asiento = { idAsiento: 22, numero: '20B', piso: 1 }
const sesion = { tokenSesion: 'token-sesion', expiraEn: Date.now() + 60_000 }
const conPago = { requierePago: true, montoAPagar: 17 }
const sinPago = { requierePago: false, montoAPagar: 0 }

// ---------- solicitud ----------

test('la solicitud lleva viaje, asiento, sesión, monto y referencia del pago simulado', () => {
  const solicitud = armarSolicitudConfirmacion({ viaje, asiento, sesion, comparacion: conPago, pago: { referencia: 'SIM-ABC123' } })
  assert.deepEqual(solicitud, {
    idViajeNuevo: 600, idAsiento: 22, tokenSesion: 'token-sesion', montoAdicional: 17, referenciaPago: 'SIM-ABC123',
  })
})

test('sin cobro el monto es 0 y no se envía referencia', () => {
  const solicitud = armarSolicitudConfirmacion({ viaje, asiento, sesion, comparacion: sinPago })
  assert.equal(solicitud.montoAdicional, 0)
  assert.equal('referenciaPago' in solicitud, false)
})

test('la solicitud nunca incluye el usuario (sale del token del servidor)', () => {
  const solicitud = armarSolicitudConfirmacion({ viaje, asiento, sesion, comparacion: conPago, pago: { referencia: 'SIM-1' } })
  assert.equal('idUsuario' in solicitud, false)
  assert.equal('idCliente' in solicitud, false)
})

test('el monto se redondea a dos decimales', () => {
  const solicitud = armarSolicitudConfirmacion({
    viaje, asiento, sesion, comparacion: { requierePago: true, montoAPagar: 16.999999 }, pago: { referencia: 'SIM-1' },
  })
  assert.equal(solicitud.montoAdicional, 17)
})

test('sin sesión de reserva no se puede confirmar: se pide elegir asiento de nuevo', () => {
  assert.throws(
    () => armarSolicitudConfirmacion({ viaje, asiento, sesion: null, comparacion: sinPago }),
    (error) => error instanceof ErrorConfirmacion && error.codigo === CODIGOS_RECHAZO.ASIENTO_NO_DISPONIBLE,
  )
})

// ---------- rechazos ----------

function rechazoDelServidor(codigo, mensaje, status = 409) {
  const error = new Error(mensaje)
  error.status = status
  error.detalles = codigo ? [codigo] : null
  return error
}

test('un asiento que dejó de estar disponible conserva el motivo del servidor y permite elegir otro', () => {
  const error = errorDeConfirmacion(rechazoDelServidor('ASIENTO_NO_DISPONIBLE', 'El asiento que elegiste dejó de estar disponible. Tu pasaje original no fue modificado.'))
  assert.equal(error.codigo, CODIGOS_RECHAZO.ASIENTO_NO_DISPONIBLE)
  assert.match(error.message, /dejó de estar disponible/)
})

test('una reserva vencida se trata como asiento perdido (se puede elegir otro)', () => {
  const error = errorDeConfirmacion(rechazoDelServidor('SESION_VENCIDA', 'La reserva de tu asiento venció.'))
  assert.equal(error.codigo, CODIGOS_RECHAZO.ASIENTO_NO_DISPONIBLE)
})

test('la regla de 6 horas llega con su código y su motivo', () => {
  const error = errorDeConfirmacion(rechazoDelServidor('ANTICIPACION_INSUFICIENTE', 'Solo puedes cambiar tu pasaje hasta 6 horas antes de la salida.'))
  assert.equal(error.codigo, CODIGOS_RECHAZO.ANTICIPACION_INSUFICIENTE)
  assert.equal(error.message, 'Solo puedes cambiar tu pasaje hasta 6 horas antes de la salida.')
})

test('un 409 sin código conocido igual se informa como rechazo con su motivo', () => {
  const error = errorDeConfirmacion(rechazoDelServidor(null, 'No pudimos actualizar tu pasaje. No se hizo ningún cambio.'))
  assert.equal(error.codigo, CODIGO_RECHAZO_CONFIRMACION)
  assert.match(error.message, /No se hizo ningún cambio/)
})

test('un pasaje que el servidor no encuentra (404) se informa como no vigente', () => {
  const error = errorDeConfirmacion(rechazoDelServidor(null, 'No encontramos este pasaje entre tus compras.', 404))
  assert.equal(error.codigo, CODIGOS_RECHAZO.PASAJE_NO_VIGENTE)
})

test('sin respuesta del servidor no se asegura que el pasaje no cambió: se pide revisar Mis pasajes', () => {
  const sinConexion = new Error('No se pudo conectar con el servidor.')
  sinConexion.sinRespuesta = true
  const error = errorDeConfirmacion(sinConexion)
  assert.equal(error.codigo, CODIGO_SIN_CONFIRMAR)
  assert.match(error.message, /Mis pasajes/)
})

// ---------- respuesta aceptada (criterio 11) ----------

const aceptada = {
  aceptada: true, idPostergacion: 77, idPasaje: 26, idVenta: 10, idViajeAnterior: 500, asientoAnterior: '12A',
  idViajeNuevo: 600, origen: 'Trujillo', destino: 'Lima', fechaSalida: '2026-11-25', horaSalida: '10:00:00',
  asientoNuevo: '20B', importeAdicional: 17, referenciaPago: 'SIM-ABC123', fecha: '2026-11-20T09:00:00',
}

test('el pasaje actualizado sale de lo que guardó el servidor: viaje, fecha, horario y asiento', () => {
  const resultado = adaptarRespuestaConfirmacion(aceptada, { pasaje, viaje, asiento, pago: { referencia: 'SIM-ABC123', estado: 'APROBADO' } })
  const nuevo = resultado.pasaje
  assert.equal(nuevo.idViaje, 600)
  assert.equal(nuevo.fechaSalida, '2026-11-25')
  assert.equal(nuevo.horaSalida, '10:00')
  assert.equal(nuevo.asiento, '20B')
  assert.equal(nuevo.confirmadoEnServidor, true)
  assert.equal(nuevo.postergado, true)
})

test('se mantiene el mismo pasaje y la misma venta', () => {
  const nuevo = adaptarRespuestaConfirmacion(aceptada, { pasaje, viaje, asiento }).pasaje
  assert.equal(nuevo.idPasaje, 26)
  assert.equal(nuevo.idVenta, 10)
  assert.equal(nuevo.numeroBoleto, pasaje.numeroBoleto)
})

test('la diferencia pagada se suma como pago adicional y se informa su referencia', () => {
  const resultado = adaptarRespuestaConfirmacion(aceptada, { pasaje, viaje, asiento, pago: { referencia: 'SIM-ABC123', estado: 'APROBADO' } })
  assert.equal(resultado.montoAdicional, 17)
  assert.equal(resultado.pasaje.montoAdicionalPagado, 17)
  assert.equal(resultado.pago.referencia, 'SIM-ABC123')
})

test('sin cobro no hay pago adicional que informar', () => {
  const resultado = adaptarRespuestaConfirmacion(
    { ...aceptada, importeAdicional: 0, referenciaPago: null },
    { pasaje, viaje, asiento },
  )
  assert.equal(resultado.montoAdicional, 0)
  assert.equal(resultado.pago, null)
})

test('no modifica el pasaje original recibido', () => {
  const copia = structuredClone(pasaje)
  adaptarRespuestaConfirmacion(aceptada, { pasaje, viaje, asiento })
  assert.deepEqual(pasaje, copia)
})
