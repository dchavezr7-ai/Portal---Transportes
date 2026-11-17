package com.transportes.empleados.entidades;

/**
 * Rol de un empleado del Sistema Empresarial. Se guarda como texto en la
 * columna {@code empleado.rol}.
 *
 * <ul>
 * <li>AGENCIA: personal de agencia (vende pasajes en una sede).</li>
 * <li>GERENTE: supervisa todas las sedes (dashboard).</li>
 * </ul>
 *
 * Una cuenta que no tiene fila en {@code empleado} es un cliente del Portal.
 */
public enum RolEmpleado {
    AGENCIA,
    GERENTE
}
