import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { confirmarPostergacionEnServidor } from './postergacionServicio.js'
import { CODIGOS_RECHAZO } from '../utilidades/postergacion.js'

const fetchOriginal = globalThis.fetch
const almacenOriginal = globalThis.localStorage
afterEach(() => {
  globalThis.fetch = fetchOriginal
  if (almacenOriginal === undefined) delete globalThis.localStorage
  else globalThis.localStorage = almacenOriginal
})

function conSesion() {
  globalThis.localStorage = { getItem: () => 'jwt-prueba', setItem() {}, removeItem() {} }
}

const pasaje = {
  idPasaje: 26, idVenta: 10, idViaje: 500, origen: 'Trujillo', destino: 'Lima', fechaSalida: '2026-11-22',
  horaSalida: '08:00', asiento: '12A', precioPagado: 43, montoAdicionalPagado: 0, deCompraReal: true,
}
const viaje = { id: 600, origen: 'Trujillo', destino: 'Lima', fechaSalida: '2026-11-25', horaSalida: '10:00' }
const asiento = { idAsiento: 22, numero: '20B', piso: 1 }
const sesion = { tokenSesion: 'token-sesion', expiraEn: Date.now() + 60_000 }
const comparacion = { requierePago: true, montoAPagar: 17 }
const pago = { estado: 'APROBADO', referencia: 'SIM-ABC123' }

function respuesta(status, cuerpo) {
  return { ok: status >= 200 && status < 300, status, json: async () => cuerpo }
}

test('confirma en el endpoint del pasaje con POST, el token del cliente y sin enviar el usuario', async () => {
  conSesion()
  let llamada
  globalThis.fetch = async (url, opciones) => {
    llamada = { url, opciones }
    return respuesta(200, {
      aceptada: true, idPostergacion: 77, idPasaje: 26, idVenta: 10, idViajeNuevo: 600, origen: 'Trujillo',
      destino: 'Lima', fechaSalida: '2026-11-25', horaSalida: '10:00:00', asientoNuevo: '20B',
      importeAdicional: 17, referenciaPago: 'SIM-ABC123',
    })
  }
  const resultado = await confirmarPostergacionEnServidor({ pasaje, viaje, asiento, comparacion, sesion, pago })

  assert.match(llamada.url, /\/api\/usuarios\/postergaciones\/26\/confirmar$/)
  assert.equal(llamada.opciones.method, 'POST')
  assert.equal(llamada.opciones.headers.Authorization, 'Bearer jwt-prueba')
  const cuerpo = JSON.parse(llamada.opciones.body)
  assert.deepEqual(cuerpo, {
    idViajeNuevo: 600, idAsiento: 22, tokenSesion: 'token-sesion', montoAdicional: 17, referenciaPago: 'SIM-ABC123',
  })
  assert.equal(resultado.pasaje.asiento, '20B')
  assert.equal(resultado.pasaje.horaSalida, '10:00')
  assert.equal(resultado.pasaje.confirmadoEnServidor, true)
  assert.equal(resultado.montoAdicional, 17)
})

test('un rechazo 409 sube con el motivo del servidor y el código para elegir otro asiento', async () => {
  conSesion()
  globalThis.fetch = async () => respuesta(409, {
    mensaje: 'El asiento que elegiste dejó de estar disponible. Tu pasaje original no fue modificado.',
    detalles: ['ASIENTO_NO_DISPONIBLE'],
  })
  await assert.rejects(
    () => confirmarPostergacionEnServidor({ pasaje, viaje, asiento, comparacion, sesion, pago }),
    (error) => error.codigo === CODIGOS_RECHAZO.ASIENTO_NO_DISPONIBLE && /dejó de estar disponible/.test(error.message),
  )
})

test('una respuesta que no es "aceptada" no se toma como cambio hecho', async () => {
  conSesion()
  globalThis.fetch = async () => respuesta(200, { algo: 'raro' })
  await assert.rejects(
    () => confirmarPostergacionEnServidor({ pasaje, viaje, asiento, comparacion, sesion, pago }),
    (error) => error.name === 'ErrorConfirmacion',
  )
})

test('sin sesión de reserva ni siquiera se llama al servidor', async () => {
  conSesion()
  let llamado = false
  globalThis.fetch = async () => { llamado = true; return respuesta(200, {}) }
  await assert.rejects(
    () => confirmarPostergacionEnServidor({ pasaje, viaje, asiento, comparacion, sesion: null, pago }),
    (error) => error.codigo === CODIGOS_RECHAZO.ASIENTO_NO_DISPONIBLE,
  )
  assert.equal(llamado, false)
})

test('si no hay conexión se avisa que se revise Mis pasajes en vez de asegurar que nada cambió', async () => {
  conSesion()
  globalThis.fetch = async () => { throw new TypeError('fetch failed') }
  await assert.rejects(
    () => confirmarPostergacionEnServidor({ pasaje, viaje, asiento, comparacion, sesion, pago }),
    (error) => error.codigo === 'SIN_CONFIRMAR' && /Mis pasajes/.test(error.message),
  )
})
