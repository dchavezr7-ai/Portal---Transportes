package com.transportes.postergacion.entidades;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * HU-02 · Criterio 10. Una fila por cada postergación aceptada: es el historial (viaje y asiento anterior, viaje y
 * asiento nuevo) y, a la vez, el lugar donde queda el pago adicional. El pasaje y la venta NO cambian: solo cambia
 * el asiento del pasaje. Se guarda aparte porque {@code pago} permite un único pago por venta (uq_pago_venta).
 *
 * <p>Tabla creada por el script {@code backend/sql/004_postergacion.sql}.</p>
 */
@Entity
@Table(name = "postergacion")
@Getter
@Setter
@NoArgsConstructor
public class Postergacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_postergacion")
    private Integer idPostergacion;

    @Column(name = "id_pasaje", nullable = false)
    private Integer idPasaje;

    @Column(name = "id_venta", nullable = false)
    private Integer idVenta;

    @Column(name = "id_viaje_anterior", nullable = false)
    private Long idViajeAnterior;

    @Column(name = "id_viaje_nuevo", nullable = false)
    private Long idViajeNuevo;

    @Column(name = "id_viaje_asiento_anterior", nullable = false)
    private Integer idViajeAsientoAnterior;

    @Column(name = "id_viaje_asiento_nuevo", nullable = false)
    private Integer idViajeAsientoNuevo;

    /** Diferencia pagada por la postergación (0 si el nuevo viaje cuesta lo mismo o menos). */
    @Column(name = "importe_adicional", nullable = false, precision = 10, scale = 2)
    private BigDecimal importeAdicional;

    /** Referencia del pago adicional (hoy simulado); null cuando no hubo cobro. */
    @Column(name = "referencia_pago", length = 64)
    private String referenciaPago;

    @Column(name = "fecha_postergacion", nullable = false)
    private LocalDateTime fechaPostergacion;
}
