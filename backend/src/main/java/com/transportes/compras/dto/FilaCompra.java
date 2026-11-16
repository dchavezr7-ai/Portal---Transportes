package com.transportes.compras.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Una fila de la consulta de compras: una por pasaje (o una sola con los campos del pasaje en null si la venta
 * no tuviera pasajes). Es un registro interno de lectura; no se expone en la API.
 *
 * <p>Los campos de viaje ({@code idViaje}, {@code fechaSalida}, {@code origen}...) son SIEMPRE el viaje actual del
 * pasaje: si fue cambiado, es el viaje nuevo.</p>
 *
 * <p>{@code adicionalPagado} es la suma de {@code postergacion.importe_adicional} de ese pasaje (0 si nunca se
 * postergó). Lo pagado en total por el pasaje es {@code precioPasaje + adicionalPagado}.</p>
 *
 * <p>Solo si el pasaje fue cambiado (postergado), vienen los tres últimos campos (si no, son null):
 * {@code viajeAnterior} es el viaje (y el asiento) que tenía justo antes del ÚLTIMO cambio,
 * {@code viajeOriginal} es el viaje en que se compró (antes del PRIMER cambio) y {@code fechaCambio} es la fecha
 * del último cambio.</p>
 *
 * <p>{@code idPago} es el pago de la venta y {@code duracionMin} la duración estimada de la ruta del viaje actual
 * (null si no se conoce).</p>
 */
public record FilaCompra(
        int idVenta, String estadoVenta, BigDecimal montoTotal, LocalDateTime fechaVenta,
        String estadoPago, String estadoOperacion, String moneda,
        String comprobanteSerie, String comprobanteNumero, String tipoComprobante,
        Integer idPasaje, BigDecimal precioPasaje,
        String tipoDocumento, String numeroDocumento, String nombres, String apellidos,
        String numeroAsiento, Short piso,
        Long idViaje, LocalDate fechaSalida, LocalTime horaSalida, String estadoViaje,
        String origen, String destino, String tipoBus,
        BigDecimal adicionalPagado,
        ViajeFila viajeAnterior, ViajeFila viajeOriginal, LocalDateTime fechaCambio,
        Integer idPago, Integer duracionMin) {

    /** Fila de un pasaje que nunca fue cambiado: no tiene viaje anterior, ni original, ni fecha de cambio. */
    public FilaCompra(
            int idVenta, String estadoVenta, BigDecimal montoTotal, LocalDateTime fechaVenta,
            String estadoPago, String estadoOperacion, String moneda,
            String comprobanteSerie, String comprobanteNumero, String tipoComprobante,
            Integer idPasaje, BigDecimal precioPasaje,
            String tipoDocumento, String numeroDocumento, String nombres, String apellidos,
            String numeroAsiento, Short piso,
            Long idViaje, LocalDate fechaSalida, LocalTime horaSalida, String estadoViaje,
            String origen, String destino, String tipoBus,
            BigDecimal adicionalPagado) {
        this(idVenta, estadoVenta, montoTotal, fechaVenta, estadoPago, estadoOperacion, moneda,
                comprobanteSerie, comprobanteNumero, tipoComprobante, idPasaje, precioPasaje,
                tipoDocumento, numeroDocumento, nombres, apellidos, numeroAsiento, piso,
                idViaje, fechaSalida, horaSalida, estadoViaje, origen, destino, tipoBus,
                adicionalPagado, null, null, null, null, null);
    }

    /** true si este pasaje ya fue cambiado de viaje al menos una vez. */
    public boolean fueCambiado() {
        return viajeOriginal != null;
    }

    /**
     * La misma fila, pero con los campos de viaje del viaje en que se COMPRÓ el pasaje. Sirve para describir la
     * compra ("viaje de la compra original"): una compra se hizo para un solo viaje, aunque después algún
     * pasaje se haya movido a otro. Si el pasaje nunca fue cambiado, devuelve la misma fila.
     */
    public FilaCompra conViajeOriginal() {
        if (!fueCambiado()) {
            return this;
        }
        return new FilaCompra(idVenta, estadoVenta, montoTotal, fechaVenta, estadoPago, estadoOperacion, moneda,
                comprobanteSerie, comprobanteNumero, tipoComprobante, idPasaje, precioPasaje,
                tipoDocumento, numeroDocumento, nombres, apellidos, numeroAsiento, piso,
                viajeOriginal.idViaje(), viajeOriginal.fechaSalida(), viajeOriginal.horaSalida(),
                viajeOriginal.estadoViaje(), viajeOriginal.origen(), viajeOriginal.destino(), viajeOriginal.tipoBus(),
                adicionalPagado, viajeAnterior, viajeOriginal, fechaCambio, idPago, viajeOriginal.duracionMin());
    }
}
