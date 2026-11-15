import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluarCobro } from './cobroPostergacion.js'

const AHORA = new Date('2026-11-15T10:00:00')
const tarjetaOk = { numero: '4009 1753 3280 6176', titular: 'APRO', vencimiento: '11/30', cvv: '123' }
const yapeOk = { celular: '111111111', codigoAprobacion: '123456', correo: 'a@b.pe', dni: '' }
const datosOk = { tarjeta: tarjetaOk, yape: yapeOk }

test('con datos válidos y sin intentos previos se permite cobrar', () => {
  const r = evaluarCobro({ intentos: [], metodo: 'tarjeta', datos: datosOk, ahora: AHORA })
  assert.deepEqual(r, { permitido: true, motivo: null, errores: {} })
})

test('con datos inválidos no se permite cobrar y se informan los errores por campo', () => {
  const datos = { ...datosOk, tarjeta: { ...tarjetaOk, cvv: '' } }
  const r = evaluarCobro({ intentos: [], metodo: 'tarjeta', datos, ahora: AHORA })
  assert.equal(r.permitido, false)
  assert.ok(r.errores.cvv)
})

test('solo se validan los datos del método elegido', () => {
  const datos = { tarjeta: {}, yape: yapeOk }
  const r = evaluarCobro({ intentos: [], metodo: 'yape', datos, ahora: AHORA })
  assert.equal(r.permitido, true)
})

test('un pago pendiente bloquea el cobro aunque los datos sean válidos', () => {
  const r = evaluarCobro({ intentos: [{ numero: 1, resultado: 'PENDIENTE' }], metodo: 'tarjeta', datos: datosOk, ahora: AHORA })
  assert.equal(r.permitido, false)
  assert.match(r.motivo, /en revisión/)
  assert.deepEqual(r.errores, {})
})

test('el bloqueo por intento previo tiene prioridad sobre los errores de datos', () => {
  const datos = { ...datosOk, tarjeta: {} }
  const r = evaluarCobro({ intentos: [{ numero: 1, resultado: 'APROBADO' }], metodo: 'tarjeta', datos, ahora: AHORA })
  assert.equal(r.permitido, false)
  assert.match(r.motivo, /ya fue aprobado/)
  assert.deepEqual(r.errores, {})
})