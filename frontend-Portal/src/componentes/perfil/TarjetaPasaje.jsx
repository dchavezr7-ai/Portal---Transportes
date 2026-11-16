import { Link } from 'react-router-dom'
import { EstadoDisponibilidad } from '../comunes/EstadoDisponibilidad'
import { formatearFechaCorta, formatearPrecio } from '../../utilidades/formato'
import { datosFaltantes, estadoVisible, textoAsientos, textoServicios, viajesActuales } from '../../utilidades/pasajesVista'
import './tarjetaPasaje.css'

/** Ruta y salida de UN viaje de la compra. Con varios viajes, cada uno indica sus asientos. */
function TrayectoDelViaje({ viaje, conAsientos }) {
  const hayTrayecto = viaje.origen && viaje.destino
  const salida = viaje.fechaSalida && viaje.horaSalida
    ? `${formatearFechaCorta(viaje.fechaSalida)} · ${viaje.horaSalida}`
    : 'Fecha de salida por confirmar'
  const asientos = conAsientos && viaje.asientos.length > 0 ? ` · Asientos ${viaje.asientos.join(', ')}` : ''

  return (
    <div className="tarjeta-pasaje__trayecto">
      {hayTrayecto ? (
        <h3 className="tarjeta-pasaje__ruta">
          <span>{viaje.origen}</span><span aria-hidden="true">→</span><span>{viaje.destino}</span>
        </h3>
      ) : (
        <h3 className="tarjeta-pasaje__ruta tarjeta-pasaje__ruta--pendiente">Trayecto no disponible</h3>
      )}
      <p className="tarjeta-pasaje__fecha">{salida}{asientos}</p>
    </div>
  )
}

/**
 * Resumen de una compra real. Los datos que falten se indican como tales; nunca se rellenan.
 * Muestra los viajes en los que viajan HOY los boletos (si alguno se cambió de viaje, ya no es el de la compra)
 * y el total pagado, que incluye lo pagado en los cambios.
 */
export function TarjetaPasaje({ compra }) {
  const estado = estadoVisible(compra)
  const faltantes = compra.incompleta ? datosFaltantes(compra) : []
  const viajes = viajesActuales(compra)

  return (
    <article className={`tarjeta-pasaje${compra.vigente ? ' tarjeta-pasaje--vigente' : ''}`}>
      <div className="tarjeta-pasaje__cabecera">
        <span className="tarjeta-pasaje__codigo">COMPRA {compra.codigoCompra}</span>
        <EstadoDisponibilidad estado={estado.clave} etiqueta={estado.etiqueta} />
      </div>
      {viajes.map((viaje) => (
        <TrayectoDelViaje
          key={`${viaje.fechaSalida}-${viaje.horaSalida}-${viaje.origen}-${viaje.destino}`}
          viaje={viaje}
          conAsientos={viajes.length > 1}
        />
      ))}
      <dl className="tarjeta-pasaje__resumen">
        <div><dt>Servicio</dt><dd>{textoServicios(viajes) ?? '—'}</dd></div>
        <div><dt>Asientos</dt><dd>{textoAsientos(compra) ?? '—'}</dd></div>
        <div><dt>Total</dt><dd>{formatearPrecio(compra.totalPagado ?? compra.total, compra.moneda)}</dd></div>
      </dl>
      {faltantes.length > 0 && (
        <p className="tarjeta-pasaje__aviso" role="note">
          Esta compra tiene información incompleta: falta {faltantes.join(', ')}.
        </p>
      )}
      <Link className="tarjeta-pasaje__ver-boleto" to={`/perfil/pasajes/${compra.idVenta}`}>
        Ver detalle y boletos <span aria-hidden="true">→</span>
      </Link>
    </article>
  )
}
