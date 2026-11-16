package com.transportes.compras.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Compra (registro de {@code venta}) con sus boletos y el viaje asociado.
 *
 * <p>{@code estado}: CONFIRMADA | REEMBOLSADA | SIN_CONFIRMAR (ver ReglasCompra). {@code fase}: PROXIMO |
 * REALIZADO | NO_REALIZADO | SIN_INFORMACION. {@code total} es {@code venta.monto_total}; {@code totalPasajes} es
 * la suma de los pasajes y {@code totalConsistente} indica si ambos coinciden.
 *
 * <p>Los datos del viaje de la compra ({@code idViaje}, {@code origen}, {@code destino}, {@code fechaSalida},
 * {@code horaSalida}, {@code tipoBus}) son los del viaje en que se COMPRÓ, aunque algún boleto se haya cambiado
 * después a otro viaje (el viaje de cada boleto está en {@code BoletoDto.viajeVigente}). {@code estadoViaje} y
 * {@code fase} se calculan con el viaje más tardío entre los boletos: la compra sigue "próxima" mientras algún
 * boleto no haya viajado. {@code totalPagado} es {@code total} más lo pagado en todas las postergaciones de sus
 * boletos. {@code horaLlegada} es la llegada de ese viaje (null si la ruta no tiene duración estimada: no se
 * inventa) e {@code idPago} es el pago de la venta.</p>
 */
public record CompraDto(
        Integer idVenta, String codigoCompra,
        String estado, String estadoVenta, String estadoPago,
        String estadoViaje, String fase, boolean vigente, boolean documentoDisponible, boolean incompleta,
        String origen, String destino, LocalDate fechaSalida, String horaSalida,
        String empresa, String tipoBus,
        List<BoletoDto> boletos,
        BigDecimal total, BigDecimal totalPasajes, boolean totalConsistente, String moneda,
        LocalDateTime fechaCompra, String comprobante,
        Long idViaje, BigDecimal totalPagado, String horaLlegada, Integer idPago) {
}
