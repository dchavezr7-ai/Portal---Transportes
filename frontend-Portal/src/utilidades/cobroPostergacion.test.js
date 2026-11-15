import test from 'node:test'
import assert from 'node:assert/strict'
import { puedeIniciarNuevoCobro } from './cobroPostergacion.js'

// HU-02 criterio 6: el pago de la diferencia sigue las reglas de intentos de HU-01.
const intento = (numero, resultado) => ({ numero, metodo: 'tarjeta', resultado })

test('sin intentos previos se puede cobrar', () => {
  assert.equal(puedeIniciarNuevoCobro([]).permitido, true)
})

test('tras un rechazo se puede reintentar', () => {
  assert.equal(puedeIniciarNuevoCobro([intento(1, 'RECHAZADO')]).permitido, true)
})

test('tras un error de procesamiento se puede reintentar', () => {
  assert.equal(puedeIniciarNuevoCobro([intento(1, 'ERROR_PROCESAMIENTO')]).permitido, true)
})

test('con un pago pendiente no se permite un nuevo cobro hasta conocer el resultado', () => {
  const r = puedeIniciarNuevoCobro([intento(1, 'RECHAZADO'), intento(2, 'PENDIENTE')])
  assert.equal(r.permitido, false)
  assert.match(r.motivo, /revisión/i)
})

test('con un pago aprobado no se permite otro cobro', () => {
  const r = puedeIniciarNuevoCobro([intento(1, 'APROBADO')])
  assert.equal(r.permitido, false)
  assert.match(r.motivo, /aprobado/i)
})