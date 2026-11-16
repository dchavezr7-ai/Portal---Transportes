package com.transportes.empleados.entidades;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

/**
 * Empleado del Sistema Empresarial. Cada empleado es una cuenta de la
 * tabla {@code usuario} (correo y contrasena) con datos de trabajo:
 * su rol y la sede (agencia) donde trabaja.
 */
@Entity
@Table(name = "empleado", schema = "public")
@Getter
@Setter
public class Empleado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_empleado")
    private Integer idEmpleado;

    /** Cuenta con la que inicia sesion (una cuenta, un empleado). */
    @Column(name = "id_usuario", nullable = false, unique = true)
    private Integer idUsuario;

    @Enumerated(EnumType.STRING)
    @Column(name = "rol", nullable = false, length = 20)
    private RolEmpleado rol;

    /** Sede donde trabaja; es nula para el gerente (supervisa todas). */
    @Column(name = "id_agencia")
    private Long idAgencia;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;

    @Column(name = "fecha_creacion", nullable = false, insertable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    /** Un empleado dado de baja ya no puede entrar al Sistema Empresarial. */
    public boolean estaActivo() {
        return Boolean.TRUE.equals(activo);
    }
}
