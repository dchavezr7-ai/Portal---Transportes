import test from 'node:test'
import assert from 'node:assert/strict'
import { limitarCampoPago } from './limitarCampoPago.js'

test('el número de tarjeta admite solo dígitos y hasta 16', () => {
  assert.equal(limitarCampoPago('tarjeta', 'numero', '4009 1753 3280 6176 99'), '4009175332806176')
  assert.equal(limitarCampoPago('tarjeta', 'numero', '40ab09'), '4009')
})

test('American Express admite hasta 15 dígitos', () => {
  assert.equal(limitarCampoPago('tarjeta', 'numero', '3711 803032 57522 9'), '371180303257522')
})

test('el titular admite hasta 26 caracteres', () => {
  assert.equal(limitarCampoPago('tarjeta', 'titular', 'A'.repeat(40)).length, 26)
  assert.equal(limitarCampoPago('tarjeta', 'titular', 'APRO'), 'APRO')
})

test('el vencimiento se formatea como MM/AA y admite 4 dígitos', () => {
  assert.equal(limitarCampoPago('tarjeta', 'vencimiento', '1130'), '11/30')
  assert.equal(limitarCampoPago('tarjeta', 'vencimiento', '113099'), '11/30')
  assert.equal(limitarCampoPago('tarjeta', 'vencimiento', '11'), '11')
  assert.equal(limitarCampoPago('tarjeta', 'vencimiento', '11/3'), '11/3')
})

test('el CVV admite 3 dígitos, o 4 si la tarjeta es American Express', () => {
  assert.equal(limitarCampoPago('tarjeta', 'cvv', '12345', { numero: '4009 1753 3280 6176' }), '123')
  assert.equal(limitarCampoPago('tarjeta', 'cvv', '12345', { numero: '3711 803032 57522' }), '1234')
  assert.equal(limitarCampoPago('tarjeta', 'cvv', '12a'), '12')
})

test('el celular de Yape admite solo 9 dígitos y el código solo 6', () => {
  assert.equal(limitarCampoPago('yape', 'celular', '1111111119999'), '111111111')
  assert.equal(limitarCampoPago('yape', 'celular', 'a1b'), '1')
  assert.equal(limitarCampoPago('yape', 'codigoAprobacion', '1234567'), '123456')
})

test('el correo y los campos desconocidos no se modifican', () => {
  const largo = `${'a'.repeat(60)}@correo.pe`
  assert.equal(limitarCampoPago('yape', 'correo', largo), largo)
  assert.equal(limitarCampoPago('yape', 'otro', 'abc123'), 'abc123')
})