package com.transportes.clientes.dto;

import java.util.List;

public record IndicadoresClientesDto(
        long totalPasajeros, long conViajesProximos, long conViajesRealizados, long pasajesConfirmados,
        List<String> tiposDocumento) {
}
