package com.transportes.compras.dto;

import java.math.BigDecimal;

/**
 * Un boleto = un registro de {@code pasaje}. {@code numeroBoleto} se deriva del id del pasaje (clave primaria:
 * persistente y único). Es una referencia de lectura, no un código de validación ni un QR.
 *
 * <p>{@code precio} es lo que costó el pasaje al comprarse y NO cambia al postergar (así el total de la venta sigue
 * cuadrando). {@code adicionalPagado} es la suma de lo pagado en todas las postergaciones del pasaje (0 si no hubo
 * ninguna). Lo pagado en total por el boleto es {@code precio + adicionalPagado}: contra eso se calcula la diferencia
 * de la siguiente postergación.</p>
 *
 * <p>{@code viajeVigente} es el viaje en el que viaja hoy el boleto (el nuevo, si fue cambiado). {@code cambio}
 * describe su último cambio de viaje y es null si el boleto nunca se cambió.</p>
 */
public record BoletoDto(
        Integer idPasaje, String numeroBoleto, String pasajero, String documento,
        String asiento, Short piso, BigDecimal precio, BigDecimal adicionalPagado,
        ViajeBoletoDto viajeVigente, CambioBoletoDto cambio) {
}
