package com.transportes.compras.dto;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Datos de un viaje leídos por la consulta de compras. Se usa para el viaje anterior y el viaje original de un
 * pasaje que fue cambiado (postergado). Es un registro interno de lectura; no se expone en la API.
 *
 * <p>{@code numeroAsiento} es el asiento que el pasaje tenía en ese viaje (puede ser null si no se necesita).
 * {@code duracionMin} es la duración estimada de la ruta, para calcular la hora de llegada (null si no se conoce).</p>
 */
public record ViajeFila(
        Long idViaje, LocalDate fechaSalida, LocalTime horaSalida, String estadoViaje,
        String origen, String destino, String tipoBus, String numeroAsiento, Integer duracionMin) {
}
