package com.transportes.postergacion.servicios;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Objects;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.transportes.compras.dto.FilaCompra;
import com.transportes.compras.repositorios.CompraRepositorio;
import com.transportes.pagos.entidades.Pasaje;
import com.transportes.pagos.repositorios.PasajeRepositorio;
import com.transportes.postergacion.dto.ConfirmacionPostergacionDto;
import com.transportes.postergacion.dto.ConfirmarPostergacionRequest;
import com.transportes.postergacion.entidades.Postergacion;
import com.transportes.postergacion.excepciones.PostergacionRechazadaException;
import com.transportes.postergacion.repositorios.PostergacionRepositorio;
import com.transportes.viajes.entidades.ViajeAsiento;
import com.transportes.viajes.eventos.AsientoCambiadoEvento;
import com.transportes.viajes.excepciones.ReservaNoPermitidaException;
import com.transportes.viajes.excepciones.SesionExpiradaException;
import com.transportes.viajes.excepciones.SesionInvalidaException;
import com.transportes.viajes.excepciones.ViajeNoEncontradoException;
import com.transportes.viajes.repositorios.ViajeAsientoRepositorio;
import com.transportes.viajes.servicios.TokenSesionServicio;
import com.transportes.viajes.servicios.TokenSesionServicio.SesionReserva;
import com.transportes.viajes.servicios.ValidadorReservaViaje;

import static com.transportes.postergacion.excepciones.PostergacionRechazadaException.ASIENTO_NO_DISPONIBLE;
import static com.transportes.postergacion.excepciones.PostergacionRechazadaException.CAMBIO_NO_APLICADO;
import static com.transportes.postergacion.excepciones.PostergacionRechazadaException.MISMO_VIAJE;
import static com.transportes.postergacion.excepciones.PostergacionRechazadaException.PAGO_INSUFICIENTE;
import static com.transportes.postergacion.excepciones.PostergacionRechazadaException.SESION_VENCIDA;
import static com.transportes.postergacion.excepciones.PostergacionRechazadaException.VIAJE_NO_RESERVABLE;

/**
 * HU-02 · Confirmación de la postergación (criterios 8 a 11).
 *
 * <p>Patrón: Fachada transaccional. {@link #confirmar} es UNA sola transacción que hace, en este orden:</p>
 * <ol>
 *   <li>Revalida el pasaje (del usuario, vigente, 6 h) y el viaje nuevo.</li>
 *   <li>Pasa el asiento nuevo a OCUPADO (solo si sigue bloqueado por la sesión de reserva del usuario).</li>
 *   <li>Cambia el asiento del pasaje al nuevo (mismo pasaje, misma venta).</li>
 *   <li>Deja DISPONIBLE el asiento original.</li>
 *   <li>Guarda la fila de historial con viaje anterior, viaje nuevo, asientos e importe (criterio 10).</li>
 * </ol>
 * <p>Criterio 8: todo ocurre junto o no ocurre. Criterio 9: cualquier rechazo o fallo a mitad de camino lanza una
 * excepción y la transacción se revierte completa, así que el pasaje conserva su viaje, asiento y estado.
 * Los eventos del mapa de asientos se emiten recién al confirmar la transacción (nunca si se revierte).</p>
 */
@Service
public class ConfirmacionPostergacionServicio {

    private static final String MOTIVO_ASIENTO =
            "El asiento que elegiste dejó de estar disponible. Tu pasaje original no fue modificado.";

    private final PostergacionServicio postergaciones;
    private final PasajeRepositorio pasajes;
    private final ViajeAsientoRepositorio asientos;
    private final PostergacionRepositorio historial;
    private final CompraRepositorio compras;
    private final TokenSesionServicio tokens;
    private final ValidadorReservaViaje validadorReserva;
    private final ApplicationEventPublisher publicador;
    private final Clock reloj;

    public ConfirmacionPostergacionServicio(PostergacionServicio postergaciones, PasajeRepositorio pasajes,
                                            ViajeAsientoRepositorio asientos, PostergacionRepositorio historial,
                                            CompraRepositorio compras, TokenSesionServicio tokens,
                                            ValidadorReservaViaje validadorReserva,
                                            ApplicationEventPublisher publicador, Clock relojNegocio) {
        this.postergaciones = postergaciones;
        this.pasajes = pasajes;
        this.asientos = asientos;
        this.historial = historial;
        this.compras = compras;
        this.tokens = tokens;
        this.validadorReserva = validadorReserva;
        this.publicador = publicador;
        this.reloj = relojNegocio;
    }

    /**
     * Aplica la postergación.
     *
     * @throws ResponseStatusException 404 si el pasaje no existe o es de otra cuenta
     * @throws PostergacionRechazadaException 409 con el motivo y un código si no se puede aplicar; en ese caso no
     *         se guarda nada
     */
    @Transactional
    public ConfirmacionPostergacionDto confirmar(int idUsuario, int idPasaje, ConfirmarPostergacionRequest solicitud) {
        // 0) Una confirmación a la vez por pasaje: un doble clic no puede mover el pasaje dos veces.
        asientos.bloquearSesion("postergacion:" + idPasaje);

        // 1) Revalida el pasaje con los datos de ahora (vigente y 6 h) y valida la sesión del asiento nuevo.
        FilaCompra antes = postergaciones.exigirPasajeCambiable(idUsuario, idPasaje);
        SesionReserva sesion = validarSesion(solicitud);
        Pasaje pasaje = pasajes.findById(idPasaje)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "No encontramos este pasaje entre tus compras."));
        ViajeAsiento original = asientos.findById(pasaje.getIdViajeAsiento())
                .orElseThrow(() -> rechazo(CAMBIO_NO_APLICADO,
                        "No pudimos leer el asiento actual de tu pasaje. No se hizo ningún cambio."));
        ViajeAsiento nuevo = asientos.findByIdViajeAndIdAsiento(
                        Math.toIntExact(solicitud.idViajeNuevo()), solicitud.idAsiento())
                .orElseThrow(() -> rechazo(ASIENTO_NO_DISPONIBLE, MOTIVO_ASIENTO));

        if (Objects.equals(nuevo.getIdViajeAsiento(), original.getIdViajeAsiento())
                || Objects.equals(nuevo.getIdViaje(), original.getIdViaje())) {
            throw rechazo(MISMO_VIAJE, "Elige un viaje distinto al original.");
        }
        exigirViajeReservable(solicitud.idViajeNuevo());
        BigDecimal importe = exigirPagoSuficiente(solicitud, pasaje, antes, nuevo);

        // 2) Criterio 8 y 9: el asiento nuevo pasa a OCUPADO solo si SIGUE bloqueado por esta sesión.
        if (asientos.ocuparAsientoDeSesion(nuevo.getIdViajeAsiento(), sesion.idSesion(), pasaje.getIdPasajero()) != 1) {
            throw rechazo(ASIENTO_NO_DISPONIBLE, MOTIVO_ASIENTO);
        }
        // 3) El pasaje (misma venta) pasa al asiento nuevo.
        if (historial.moverPasajeAlAsiento(idPasaje, original.getIdViajeAsiento(), nuevo.getIdViajeAsiento()) != 1) {
            throw rechazo(CAMBIO_NO_APLICADO, "No pudimos actualizar tu pasaje. No se hizo ningún cambio.");
        }
        // 4) El asiento original queda libre. Si no estaba ocupado algo anda mal: se revierte TODO.
        if (historial.liberarAsientoOcupado(original.getIdViajeAsiento()) != 1) {
            throw rechazo(CAMBIO_NO_APLICADO, "No pudimos liberar tu asiento anterior. No se hizo ningún cambio.");
        }

        // 5) Criterio 10: historial con viaje anterior y nuevo, asientos e importe (+ referencia del pago adicional).
        LocalDateTime ahora = LocalDateTime.now(reloj);
        Postergacion fila = new Postergacion();
        fila.setIdPasaje(idPasaje);
        fila.setIdVenta(pasaje.getIdVenta());
        fila.setIdViajeAnterior(original.getIdViaje().longValue());
        fila.setIdViajeNuevo(nuevo.getIdViaje().longValue());
        fila.setIdViajeAsientoAnterior(original.getIdViajeAsiento());
        fila.setIdViajeAsientoNuevo(nuevo.getIdViajeAsiento());
        fila.setImporteAdicional(importe);
        fila.setReferenciaPago(importe.signum() > 0 ? solicitud.referenciaPago() : null);
        fila.setFechaPostergacion(ahora);
        fila = historial.save(fila);

        // 6) Criterio 11: lo que ve el cliente sale de lo que quedó guardado, no de lo que mandó el navegador.
        FilaCompra despues = compras.filasDelUsuario(idUsuario).stream()
                .filter(f -> Objects.equals(f.idPasaje(), idPasaje))
                .findFirst()
                .orElseThrow(() -> rechazo(CAMBIO_NO_APLICADO,
                        "No pudimos leer tu pasaje actualizado. No se hizo ningún cambio."));

        // Los eventos se entregan al confirmar la transacción: si se revierte, el mapa no cambia.
        publicador.publishEvent(new AsientoCambiadoEvento(
                original.getIdViaje().longValue(), original.getIdAsiento(), "disponible"));
        publicador.publishEvent(new AsientoCambiadoEvento(
                nuevo.getIdViaje().longValue(), nuevo.getIdAsiento(), "ocupado"));

        return new ConfirmacionPostergacionDto(true, fila.getIdPostergacion(), idPasaje, pasaje.getIdVenta(),
                original.getIdViaje(), antes.numeroAsiento(),
                despues.idViaje(), despues.origen(), despues.destino(), despues.fechaSalida(), despues.horaSalida(),
                despues.numeroAsiento(), importe, fila.getReferenciaPago(), ahora);
    }

    /** La sesión de reserva venció (o no es de este viaje): el asiento ya no está reservado para el usuario. */
    private SesionReserva validarSesion(ConfirmarPostergacionRequest solicitud) {
        try {
            return tokens.validar(solicitud.tokenSesion(), solicitud.idViajeNuevo());
        } catch (SesionExpiradaException expirada) {
            throw rechazo(SESION_VENCIDA,
                    "La reserva de tu asiento venció. Tu pasaje original no fue modificado.");
        } catch (SesionInvalidaException invalida) {
            throw rechazo(SESION_VENCIDA,
                    "La reserva de tu asiento ya no es válida. Tu pasaje original no fue modificado.");
        }
    }

    /** El viaje nuevo todavía admite reservas (programado, no salió, faltan 20 min o más). */
    private void exigirViajeReservable(Long idViajeNuevo) {
        try {
            validadorReserva.exigirReservable(idViajeNuevo);
        } catch (ReservaNoPermitidaException noReservable) {
            throw rechazo(VIAJE_NO_RESERVABLE, noReservable.getMessage());
        } catch (ViajeNoEncontradoException inexistente) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, inexistente.getMessage());
        }
    }

    /**
     * El pago debe cubrir la diferencia real entre el precio del asiento nuevo y TODO lo que ya pagó el pasaje:
     * {@code pasaje.precio + SUM(postergacion.importe_adicional)}. Así una segunda (o tercera) postergación no cobra
     * otra vez lo que ya se pagó en la anterior. La suma sale de la misma consulta que alimenta "Mis pasajes"
     * ({@code antes.adicionalPagado()}), de modo que el front y el servidor calculan igual. Como el pago es
     * simulado, la referencia es obligatoria cuando hay importe. Devuelve el importe que se registra.
     */
    private BigDecimal exigirPagoSuficiente(ConfirmarPostergacionRequest solicitud, Pasaje pasaje, FilaCompra antes,
                                            ViajeAsiento nuevo) {
        BigDecimal adicionalPrevio = antes.adicionalPagado() == null ? BigDecimal.ZERO : antes.adicionalPagado();
        BigDecimal pagadoHastaAhora = pasaje.getPrecio().add(adicionalPrevio);
        BigDecimal diferencia = nuevo.getPrecio().subtract(pagadoHastaAhora).max(BigDecimal.ZERO);
        BigDecimal pagado = solicitud.montoAdicional();
        if (pagado.compareTo(diferencia) < 0) {
            throw rechazo(PAGO_INSUFICIENTE,
                    "El pago no cubre la diferencia de tarifa. Tu pasaje original no fue modificado.");
        }
        if (pagado.signum() > 0 && (solicitud.referenciaPago() == null || solicitud.referenciaPago().isBlank())) {
            throw rechazo(PAGO_INSUFICIENTE,
                    "Falta la referencia del pago adicional. Tu pasaje original no fue modificado.");
        }
        return pagado;
    }

    private static PostergacionRechazadaException rechazo(String codigo, String motivo) {
        return new PostergacionRechazadaException(codigo, motivo);
    }
}
