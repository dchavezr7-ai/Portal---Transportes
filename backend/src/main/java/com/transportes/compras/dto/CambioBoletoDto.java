package com.transportes.compras.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Último cambio de viaje de un boleto (postergación). Solo existe si el boleto fue cambiado.
 *
 * @param anterior        viaje y asiento que tenía el boleto justo antes de este último cambio
 * @param adicionalPagado suma de lo pagado en TODOS los cambios del boleto (no solo el último)
 * @param fecha           fecha y hora del último cambio (hora de Perú, sin zona)
 */
public record CambioBoletoDto(ViajeBoletoDto anterior, BigDecimal adicionalPagado, LocalDateTime fecha) {
}
