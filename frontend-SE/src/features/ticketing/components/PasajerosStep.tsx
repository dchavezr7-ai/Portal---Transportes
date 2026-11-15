import { useState } from 'react'
import { ArrowLeft, ArrowLeftRight, IdCard, Info, Phone, UserRound } from 'lucide-react'
import type { FocusEvent, ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useTicketWizard } from '../hooks/useTicketWizard'
import type { PasajeroForm } from '../types'
import {
  longitudMaximaDocumento,
  tiposDocumento,
  validarPasajero,
  type ErroresPasajero,
} from '../utils/validaciones'
import { PassengerTicketCard } from './PassengerTicketCard'

const idCampo = (campo: keyof PasajeroForm) => `pasajero-${campo}`

function SeccionForm({ icono, titulo, descripcion, children }: { icono: ReactNode; titulo: string; descripcion: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-border-subtle bg-surface-sunken/50 p-4">
      <legend className="sr-only">{titulo}</legend>
      <div className="mb-3 flex items-center gap-2.5" aria-hidden="true">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-card text-text-500 shadow-sm">{icono}</span>
        <div className="leading-tight">
          <p className="text-[13px] font-semibold text-text-900">{titulo}</p>
          <p className="text-[11px] text-text-500">{descripcion}</p>
        </div>
      </div>
      {children}
    </fieldset>
  )
}

export function PasajerosStep() {
  const {
    viaje,
    asientos,
    asientoActivo,
    pasajerosPorAsiento,
    cantidadPasajes,
    cantidadCompletados,
    esAsientoCompleto,
    setAsientoActivo,
    setDatosPasajero,
    irA,
  } = useTicketWizard()
  const [errores, setErrores] = useState<ErroresPasajero>({})

  if (!viaje || asientos.length === 0) return null

  const activo = asientoActivo ?? asientos[0].idAsiento
  const asientoElegido = asientos.find((a) => a.idAsiento === activo) ?? asientos[0]
  const form = pasajerosPorAsiento[asientoElegido.idAsiento]

  function cambiarActivo(idAsiento: number) {
    setAsientoActivo(idAsiento)
    setErrores({})
  }

  function actualizar<K extends keyof PasajeroForm>(campo: K, valor: PasajeroForm[K]) {
    setDatosPasajero(asientoElegido.idAsiento, { [campo]: valor })
    setErrores((prev) => ({ ...prev, [campo]: undefined }))
  }

  function validarCampo(e: FocusEvent<HTMLFormElement>) {
    const campo = e.target.id.replace('pasajero-', '') as keyof PasajeroForm
    if (!form || campo === 'tipoDocumento' || !(campo in form) || form[campo] === '') return
    setErrores((prev) => ({ ...prev, [campo]: validarPasajero(form)[campo] }))
  }

  if (!form) return null

  return (
    <div className="min-w-0">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text-700">
            Pasajeros ·{' '}
            <span className={cantidadCompletados === cantidadPasajes ? 'text-accent-text' : 'text-text-500'}>
              {cantidadCompletados} de {cantidadPasajes} completados
            </span>
          </p>
          <p className="mt-0.5 text-xs text-text-500">Haz clic en un pasaje para completar sus datos.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => irA('asientos')}
          iconLeft={<ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          Cambiar asientos
        </Button>
      </div>

      <div className="-mx-1 mb-6 flex min-w-0 gap-3 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Pasajeros del registro">
        {asientos.map((a, i) => {
          const f = pasajerosPorAsiento[a.idAsiento]
          const nombre = f && (f.nombres || f.apellidos) ? `${f.nombres} ${f.apellidos}`.trim() : ''
          return (
            <PassengerTicketCard
              key={a.idAsiento}
              indice={i + 1}
              codigoAsiento={a.numero}
              nombreCompleto={nombre}
              completo={esAsientoCompleto(a.idAsiento)}
              activo={a.idAsiento === activo}
              onClick={() => cambiarActivo(a.idAsiento)}
            />
          )
        })}
      </div>

      <form noValidate onSubmit={(e) => e.preventDefault()} onBlur={validarCampo}>
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-6 items-center rounded-md bg-accent-line/12 px-2 text-xs font-semibold tabular-nums text-accent-text">
            Asiento {asientoElegido.numero}
          </span>
          <p className="text-sm font-semibold text-text-900">Datos del pasajero</p>
        </div>

        <div key={activo} className="animate-step-swap flex flex-col gap-3">
          <SeccionForm icono={<IdCard className="h-4 w-4" />} titulo="Identificación" descripcion="Documento con el que abordará">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                id={idCampo('tipoDocumento')}
                label="Tipo de documento"
                required
                icon={<IdCard className="h-4 w-4" />}
                value={form.tipoDocumento}
                onChange={(v) => {
                  actualizar('tipoDocumento', v as PasajeroForm['tipoDocumento'])
                  setErrores((prev) => ({ ...prev, numeroDocumento: undefined }))
                }}
                options={tiposDocumento}
              />
              <Input
                id={idCampo('numeroDocumento')}
                label="Número de documento"
                required
                autoComplete="off"
                inputMode={form.tipoDocumento === 'PASAPORTE' ? 'text' : 'numeric'}
                maxLength={longitudMaximaDocumento(form.tipoDocumento)}
                value={form.numeroDocumento}
                error={errores.numeroDocumento}
                onChange={(e) => actualizar('numeroDocumento', e.target.value.trim())}
              />
            </div>
          </SeccionForm>

          <SeccionForm icono={<UserRound className="h-4 w-4" />} titulo="Datos personales" descripcion="Tal como figura en el documento">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id={idCampo('nombres')}
                label="Nombres"
                required
                autoComplete="off"
                value={form.nombres}
                error={errores.nombres}
                onChange={(e) => actualizar('nombres', e.target.value)}
              />
              <Input
                id={idCampo('apellidos')}
                label="Apellidos"
                required
                autoComplete="off"
                value={form.apellidos}
                error={errores.apellidos}
                onChange={(e) => actualizar('apellidos', e.target.value)}
              />
            </div>
          </SeccionForm>

          <SeccionForm icono={<Phone className="h-4 w-4" />} titulo="Datos de contacto" descripcion="Para avisos del viaje">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id={idCampo('telefono')}
                label="Teléfono celular"
                required
                type="tel"
                inputMode="numeric"
                maxLength={9}
                hint="9 dígitos, empieza con 9."
                value={form.telefono}
                error={errores.telefono}
                onChange={(e) => actualizar('telefono', e.target.value.replace(/\D/g, ''))}
              />
              <Input
                id={idCampo('email')}
                label="Correo electrónico (opcional)"
                type="email"
                autoComplete="off"
                value={form.email}
                error={errores.email}
                onChange={(e) => actualizar('email', e.target.value)}
              />
            </div>
          </SeccionForm>
        </div>
      </form>

      <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-border bg-surface-sunken px-4 py-3 text-xs text-text-500" role="note">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-text-400" aria-hidden="true" />
        <p>
          Esta pantalla es solo una vista previa del formulario. Aún no se registra la venta, el pago ni la emisión de boletos, y los datos
          no se guardan.
        </p>
      </div>

      <div className="mt-6 flex border-t border-border-subtle pt-4">
        <Button variant="outline" onClick={() => irA('asientos')} iconLeft={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}>
          Atrás
        </Button>
      </div>
    </div>
  )
}
