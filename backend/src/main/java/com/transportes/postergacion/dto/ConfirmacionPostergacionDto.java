package com.transportes.postergacion.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * Respuesta de una postergación ACEPTADA (criterio 11): el nuevo viaje, la fecha, el horario y el asiento, junto
 * con lo anterior y el importe. La rechazada no usa este objeto: responde 409 con el motivo en {@code mensaje}.
 *
 * @param aceptada siempre true (la rechazada es un error 409)
 */
public record ConfirmacionPostergacionDto(
        boolean aceptada, int idPostergacion, int idPasaje, int idVenta,
        long idViajeAnterior, String asientoAnterior,
        long idViajeNuevo, String origen, String destino, LocalDate fechaSalida, LocalTime horaSalida,
        String asientoNuevo, BigDecimal importeAdicional, String referenciaPago, LocalDateTime fecha) {
}
