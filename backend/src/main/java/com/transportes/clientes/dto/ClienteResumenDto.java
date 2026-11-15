package com.transportes.clientes.dto;

import java.time.LocalDateTime;

public record ClienteResumenDto(
        int idPasajero, String tipoDocumento, String numeroDocumento, String nombres, String apellidos,
        String telefono, int viajes, LocalDateTime ultimoViaje, LocalDateTime proximoViaje) {
}
