import { useState } from 'react'
import { Download } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToastStore } from '@/stores/toastStore'
import type { ViajeHistorial } from '@/types/cliente'
import { descargarPdfBoleto, ETIQUETA_ESTADO, formatearPrecio, textoLlegada, textoSalida, tituloDocumento } from '../utils/boleto'

interface BoletoModalProps {
  viaje: ViajeHistorial | null
  onClose: () => void
}

function Dato({ etiqueta, children }: { etiqueta: string; children: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-500">{etiqueta}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-text-900">{children}</dd>
    </div>
  )
}

export function BoletoModal({ viaje, onClose }: BoletoModalProps) {
  const [descargando, setDescargando] = useState(false)
  const pushToast = useToastStore((s) => s.push)

  async function descargar() {
    if (!viaje) return
    setDescargando(true)
    try {
      await descargarPdfBoleto(viaje)
    } catch {
      pushToast({ tone: 'danger', title: 'No se pudo generar el PDF', description: 'Inténtalo de nuevo en unos segundos.' })
    } finally {
      setDescargando(false)
    }
  }

  const llegada = viaje ? textoLlegada(viaje) : null

  return (
    <Modal open={viaje !== null} onClose={onClose} title={viaje ? tituloDocumento(viaje) : 'Boleto'} size="md">
      {viaje && (
        <div className="flex flex-col gap-5">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface-card">
            <div className="flex items-center justify-between gap-3 bg-[image:var(--gradient-brand-deep)] px-5 py-4 text-white">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">RutaLibre</p>
                <p className="truncate font-display text-lg font-semibold">
                  {viaje.origen} → {viaje.destino}
                </p>
              </div>
              <Badge tone={viaje.estadoPasaje === 'CONFIRMADA' ? 'success' : viaje.estadoPasaje === 'REEMBOLSADA' ? 'warning' : 'neutral'}>
                {ETIQUETA_ESTADO[viaje.estadoPasaje]}
              </Badge>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 border-b border-dashed border-border px-5 py-4">
              <Dato etiqueta="Pasajero">{viaje.pasajero || '—'}</Dato>
              <Dato etiqueta="Documento">{viaje.documento || '—'}</Dato>
              <Dato etiqueta="Salida">{textoSalida(viaje)}</Dato>
              <Dato etiqueta="Llegada estimada">{llegada ?? '—'}</Dato>
              <Dato etiqueta="Asiento">{`${viaje.asiento ?? '—'}${viaje.piso ? ` · Piso ${viaje.piso}` : ''}`}</Dato>
              <Dato etiqueta="Bus">{viaje.bus ?? '—'}</Dato>
            </dl>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 px-5 py-4">
              <Dato etiqueta="Boleto">{viaje.numeroBoleto}</Dato>
              <Dato etiqueta="Compra">{viaje.codigoCompra}</Dato>
              <Dato etiqueta="Comprobante">{viaje.comprobante ?? '—'}</Dato>
              <Dato etiqueta="Precio">{formatearPrecio(viaje.precio, viaje.moneda)}</Dato>
            </dl>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            <Button
              variant="accent"
              loading={descargando}
              onClick={() => void descargar()}
              iconLeft={<Download className="h-4 w-4" aria-hidden="true" />}
            >
              Descargar PDF
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
