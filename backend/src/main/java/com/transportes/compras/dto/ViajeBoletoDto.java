package com.transportes.compras.dto;

import java.time.LocalDate;

/**
 * Viaje de un boleto tal como lo muestran la tarjeta y el PDF: el viaje vigente del boleto o el viaje anterior
 * a un cambio. {@code asiento} es el asiento del boleto en ESE viaje. {@code horaLlegada} es null si la ruta no
 * tiene duración estimada (no se inventa).
 */
public record ViajeBoletoDto(
        Long idViaje, String origen, String destino, LocalDate fechaSalida, String horaSalida, String horaLlegada,
        String empresa, String tipoBus, String asiento) {
}
