import type { TipoDocumento } from '@/types/pasajero'
import type { PasajeroForm } from '../types'

export type ErroresPasajero = Partial<Record<keyof PasajeroForm, string>>

export const tiposDocumento: { value: TipoDocumento; label: string }[] = [
  { value: 'DNI', label: 'DNI' },
  { value: 'CE', label: 'Carné de extranjería' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
]

const patronDocumento: Record<TipoDocumento, { regex: RegExp; mensaje: string; maxLength: number }> = {
  DNI: { regex: /^\d{8}$/, mensaje: 'El DNI debe tener 8 dígitos.', maxLength: 8 },
  CE: { regex: /^\d{9}$/, mensaje: 'El carné de extranjería debe tener 9 dígitos.', maxLength: 9 },
  PASAPORTE: {
    regex: /^[A-Za-z0-9]{6,12}$/,
    mensaje: 'El pasaporte debe tener entre 6 y 12 letras o números.',
    maxLength: 12,
  },
}

export function longitudMaximaDocumento(tipo: TipoDocumento): number {
  return patronDocumento[tipo].maxLength
}

const REGEX_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]{2,60}$/
const REGEX_TELEFONO = /^9\d{8}$/
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validarPasajero(f: PasajeroForm): ErroresPasajero {
  const errores: ErroresPasajero = {}
  const doc = f.numeroDocumento.trim()
  if (!doc) errores.numeroDocumento = 'Ingresa el número de documento.'
  else if (!patronDocumento[f.tipoDocumento].regex.test(doc)) {
    errores.numeroDocumento = patronDocumento[f.tipoDocumento].mensaje
  }
  if (!f.nombres.trim()) errores.nombres = 'Ingresa los nombres del pasajero.'
  else if (!REGEX_NOMBRE.test(f.nombres.trim())) errores.nombres = 'Usa solo letras (mínimo 2).'
  if (!f.apellidos.trim()) errores.apellidos = 'Ingresa los apellidos del pasajero.'
  else if (!REGEX_NOMBRE.test(f.apellidos.trim())) errores.apellidos = 'Usa solo letras (mínimo 2).'
  const tel = f.telefono.trim()
  if (!tel) errores.telefono = 'Ingresa un teléfono de contacto.'
  else if (!REGEX_TELEFONO.test(tel)) errores.telefono = 'El celular debe tener 9 dígitos y empezar con 9.'
  if (f.email.trim() && !REGEX_EMAIL.test(f.email.trim())) errores.email = 'Ingresa un correo válido.'
  return errores
}

export function enfocarPrimerError(ids: string[]) {
  window.requestAnimationFrame(() => {
    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) {
        el.focus()
        return
      }
    }
  })
}
