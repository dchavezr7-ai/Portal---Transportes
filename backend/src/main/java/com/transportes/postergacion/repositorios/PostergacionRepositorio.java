package com.transportes.postergacion.repositorios;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.transportes.postergacion.entidades.Postergacion;

/**
 * HU-02 · Confirmación. Además del historial, tiene los dos UPDATE condicionados que mueven el pasaje: cada uno
 * devuelve cuántas filas cambió, y el servicio rechaza (y revierte todo) si no cambió exactamente una.
 */
public interface PostergacionRepositorio extends JpaRepository<Postergacion, Integer> {

    List<Postergacion> findByIdPasajeOrderByIdPostergacion(Integer idPasaje);

    /** Cambia el asiento del pasaje solo si todavía tiene el asiento que se creía (nadie lo movió antes). */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE Pasaje p SET p.idViajeAsiento = :nuevo "
         + "WHERE p.idPasaje = :idPasaje AND p.idViajeAsiento = :anterior")
    int moverPasajeAlAsiento(@Param("idPasaje") Integer idPasaje, @Param("anterior") Integer anterior,
                             @Param("nuevo") Integer nuevo);

    /** Deja DISPONIBLE el asiento original, solo si estaba OCUPADO (es el que tenía el pasaje). */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE ViajeAsiento va SET va.estadoViajeAsiento = 'DISPONIBLE', "
         + "va.fechaExpiracionBloqueo = null, va.tokenBloqueo = null, va.idPasajero = null "
         + "WHERE va.idViajeAsiento = :idViajeAsiento AND va.estadoViajeAsiento = 'OCUPADO'")
    int liberarAsientoOcupado(@Param("idViajeAsiento") Integer idViajeAsiento);
}
