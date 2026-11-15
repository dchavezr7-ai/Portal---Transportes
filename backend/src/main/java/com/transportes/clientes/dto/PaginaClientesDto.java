package com.transportes.clientes.dto;

import java.util.List;

public record PaginaClientesDto(List<ClienteResumenDto> contenido, long total, int pagina, int tamano) {
}
