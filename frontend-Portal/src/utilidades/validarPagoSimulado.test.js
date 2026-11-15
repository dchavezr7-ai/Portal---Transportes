import test from 'node:test'
import assert from 'node:assert/strict'
import { validarTarjetaSimulada, validarDatosPago } from './validarPagoSimulado.js'

const AHORA = new Date('2026-11-15T10:00:00')
const tarjetaOk = { numero: '4009 1753 3280 6176', titular: 'APRO', vencimiento: '11/30', cvv: '123' }
const yapeOk = { celular: '111111111', codigoAprobacion: '123456', correo: 'a@b.pe', dni: '' }

test('una tarjeta correcta no tiene errores', () => {
  assert.deepEqual(validarTarjetaSimulada(tarjetaOk, AHORA), {})
})

test('el número debe pasar Luhn y tener longitud válida', () => {
  assert.ok(validarTarjetaSimulada({ ...tarjetaOk, numero: '4009 1753 3280 6177' }, AHORA).numero)
  assert.ok(validarTarjetaSimulada({ ...tarjetaOk, numero: '1234' }, AHORA).numero)
  assert.ok(validarTarjetaSimulada({ ...tarjetaOk, numero: '' }, AHORA).numero)
})

test('el titular es obligatorio', () => {
  assert.ok(validarTarjetaSimulada({ ...tarjetaOk, titular: '  ' }, AHORA).titular)
})

test('el vencimiento debe ser MM/AA, con mes válido y no vencido', () => {
  assert.ok(validarTarjetaSimulada({ ...tarjetaOk, vencimiento: '1130' }, AHORA).vencimiento)
  assert.ok(validarTarjetaSimulada({ ...tarjetaOk, vencimiento: '13/30' }, AHORA).vencimiento)
  assert.ok(validarTarjetaSimulada({ ...tarjetaOk, vencimiento: '10/26' }, AHORA).vencimiento)
  assert.deepEqual(validarTarjetaSimulada({ ...tarjetaOk, vencimiento: '11/26' }, AHORA), {})
})

test('el CVV tiene 3 dígitos (4 en American Express)', () => {
  assert.ok(validarTarjetaSimulada({ ...tarjetaOk, cvv: '12' }, AHORA).cvv)
  assert.ok(validarTarjetaSimulada({ ...tarjetaOk, cvv: '12a' }, AHORA).cvv)
  const amex = { ...tarjetaOk, numero: '3711 803032 57522', cvv: '1234' }
  assert.deepEqual(validarTarjetaSimulada(amex, AHORA), {})
  assert.ok(validarTarjetaSimulada({ ...amex, cvv: '123' }, AHORA).cvv)
})

test('validarDatosPago valida según el método elegido', () => {
  assert.deepEqual(validarDatosPago('tarjeta', { tarjeta: tarjetaOk, yape: {} }, AHORA), {})
  assert.deepEqual(validarDatosPago('yape', { tarjeta: {}, yape: yapeOk }, AHORA), {})
  assert.ok(validarDatosPago('tarjeta', { tarjeta: { ...tarjetaOk, cvv: '' }, yape: yapeOk }, AHORA).cvv)
  assert.ok(validarDatosPago('yape', { tarjeta: tarjetaOk, yape: { ...yapeOk, celular: '123' } }, AHORA).celular)
})