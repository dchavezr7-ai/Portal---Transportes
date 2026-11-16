package com.transportes.compras;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.transportes.compras.dto.BoletoDto;
import com.transportes.compras.dto.CompraDto;
import com.transportes.compras.dto.FilaCompra;
import com.transportes.compras.dto.FilaResumen;
import com.transportes.compras.dto.ResumenPerfilDto;
import com.transportes.compras.dto.ViajeFila;
import com.transportes.compras.reglas.ConstructorCompras;

/** Agrupación de filas en compras, orden e indicadores del perfil, sin base de datos. */
class ConstructorComprasTest {

    static final LocalDateTime AHORA = LocalDateTime.of(2026, 10, 12, 10, 0);
    static final LocalDate FUTURO = LocalDate.of(2026, 10, 19);
    static final LocalDate PASADO = LocalDate.of(2026, 9, 1);
    static final LocalTime OCHO = LocalTime.of(8, 0);

    /** Una fila (un pasaje) de una venta confirmada de Lima a Cusco. */
    static FilaCompra fila(int venta, int pasaje, String asiento, String precio, String total,
                           LocalDate fecha, long viaje) {
        return new FilaCompra(venta, "PAGADA", new BigDecimal(total), AHORA.minusDays(1),
                "APROBADO", null, "PEN", null, null, null,
                pasaje, new BigDecimal(precio), "DNI", "1234567" + pasaje, "ANA", "LOPEZ " + pasaje,
                asiento, (short) 1, viaje, fecha, OCHO, "PROGRAMADO", "Lima", "Cusco", "Bus Cama", BigDecimal.ZERO);
    }

    static FilaCompra conEstados(FilaCompra base, String estadoVenta, String estadoPago, String estadoOperacion,
                                 String estadoViaje) {
        return new FilaCompra(base.idVenta(), estadoVenta, base.montoTotal(), base.fechaVenta(),
                estadoPago, estadoOperacion, base.moneda(), null, null, null,
                base.idPasaje(), base.precioPasaje(), base.tipoDocumento(), base.numeroDocumento(),
                base.nombres(), base.apellidos(), base.numeroAsiento(), base.piso(),
                base.idViaje(), base.fechaSalida(), base.horaSalida(), estadoViaje,
                base.origen(), base.destino(), base.tipoBus(), base.adicionalPagado());
    }

    @Test
    void unaCompraConDosPasajesMuestraDosBoletosYUnSoloTotal() {
        List<CompraDto> compras = ConstructorCompras.agrupar(List.of(
                fila(7, 20, "12A", "95.00", "190.00", FUTURO, 5),
                fila(7, 21, "12B", "95.00", "190.00", FUTURO, 5)), AHORA);

        assertEquals(1, compras.size());
        CompraDto compra = compras.get(0);
        assertEquals("RL-C-000007", compra.codigoCompra());
        assertEquals("CONFIRMADA", compra.estado());
        assertEquals("PROXIMO", compra.fase());
        assertTrue(compra.vigente());
        assertTrue(compra.documentoDisponible());
        assertFalse(compra.incompleta());
        assertEquals("Lima", compra.origen());
        assertEquals("Cusco", compra.destino());
        assertEquals("08:00", compra.horaSalida());
        assertEquals("Bus Cama", compra.tipoBus());
        assertEquals(2, compra.boletos().size());
        assertEquals("12A", compra.boletos().get(0).asiento());
        assertEquals("12B", compra.boletos().get(1).asiento());
        assertEquals("RL-B-000020", compra.boletos().get(0).numeroBoleto());
        assertEquals("DNI ****720", compra.boletos().get(0).documento());
        assertEquals(0, new BigDecimal("190.00").compareTo(compra.total()));
        assertEquals(0, new BigDecimal("190.00").compareTo(compra.totalPasajes()));
        assertTrue(compra.totalConsistente());
        assertEquals("PEN", compra.moneda());
    }

    @Test
    void unPasajeRepetidoPorUnJoinNoDuplicaBoletosNiImportes() {
        FilaCompra a = fila(7, 20, "12A", "95.00", "190.00", FUTURO, 5);
        FilaCompra b = fila(7, 21, "12B", "95.00", "190.00", FUTURO, 5);
        CompraDto compra = ConstructorCompras.agrupar(List.of(a, b, a, b), AHORA).get(0);

        assertEquals(2, compra.boletos().size());
        assertEquals(0, new BigDecimal("190.00").compareTo(compra.totalPasajes()));
        assertTrue(compra.totalConsistente());
    }

    @Test
    void siElTotalDeLaVentaNoCoincideConLosPasajesSeIndicaSinOcultarlo() {
        CompraDto compra = ConstructorCompras.agrupar(List.of(
                fila(7, 20, "12A", "95.00", "200.00", FUTURO, 5),
                fila(7, 21, "12B", "95.00", "200.00", FUTURO, 5)), AHORA).get(0);

        assertEquals(0, new BigDecimal("200.00").compareTo(compra.total()));
        assertEquals(0, new BigDecimal("190.00").compareTo(compra.totalPasajes()));
        assertFalse(compra.totalConsistente());
    }

    @Test
    void elBoletoExponeLoPagadoEnPostergacionesSinTocarElPrecioNiElTotal() {
        FilaCompra base = fila(1, 11, "12A", "43.00", "43.00", PASADO, 500L);
        FilaCompra conAdicional = new FilaCompra(base.idVenta(), base.estadoVenta(), base.montoTotal(), base.fechaVenta(),
                base.estadoPago(), base.estadoOperacion(), base.moneda(), null, null, null,
                base.idPasaje(), base.precioPasaje(), base.tipoDocumento(), base.numeroDocumento(),
                base.nombres(), base.apellidos(), base.numeroAsiento(), base.piso(),
                base.idViaje(), base.fechaSalida(), base.horaSalida(), base.estadoViaje(),
                base.origen(), base.destino(), base.tipoBus(), new BigDecimal("27.00"));

        CompraDto compra = ConstructorCompras.agrupar(List.of(conAdicional), AHORA).get(0);

        assertEquals(0, new BigDecimal("43.00").compareTo(compra.boletos().get(0).precio()), "el precio original no cambia");
        assertEquals(0, new BigDecimal("27.00").compareTo(compra.boletos().get(0).adicionalPagado()));
        assertTrue(compra.totalConsistente(), "venta.monto_total sigue cuadrando con la suma de los precios originales");
    }

    @Test
    void unBoletoSinPostergacionesTieneAdicionalCero() {
        CompraDto compra = ConstructorCompras.agrupar(
                List.of(fila(1, 11, "12A", "43.00", "43.00", PASADO, 500L)), AHORA).get(0);

        assertEquals(0, BigDecimal.ZERO.compareTo(compra.boletos().get(0).adicionalPagado()));
    }

    // ---------- Pasajes cambiados de viaje (postergación) ----------

    /** Viaje de Lima a Cusco a las 08:00, con el asiento que el pasaje tenía en él. */
    static ViajeFila viajeAnterior(long id, LocalDate fecha, String asiento) {
        return new ViajeFila(id, fecha, OCHO, "PROGRAMADO", "Lima", "Cusco", "Bus Cama", asiento, 120);
    }

    /**
     * El mismo pasaje de {@code base}, ya movido a otro viaje (Trujillo a Chiclayo). Su fila trae el viaje NUEVO
     * y los datos del cambio: el viaje anterior, el viaje en que se compró y lo pagado de más.
     */
    static FilaCompra cambiado(FilaCompra base, long viajeNuevo, LocalDate fechaNueva, String asientoNuevo,
                               ViajeFila anterior, ViajeFila original, String adicional) {
        return new FilaCompra(base.idVenta(), base.estadoVenta(), base.montoTotal(), base.fechaVenta(),
                base.estadoPago(), base.estadoOperacion(), base.moneda(), null, null, null,
                base.idPasaje(), base.precioPasaje(), base.tipoDocumento(), base.numeroDocumento(),
                base.nombres(), base.apellidos(), asientoNuevo, base.piso(),
                viajeNuevo, fechaNueva, OCHO, "PROGRAMADO", "Trujillo", "Chiclayo", "Bus Semi Cama",
                new BigDecimal(adicional), anterior, original, AHORA.minusHours(2), 77, 90);
    }

    @Test
    void unBoletoCambiadoMuestraSuViajeVigenteYSuUltimoCambio() {
        ViajeFila antes = viajeAnterior(5, FUTURO, "12B");
        CompraDto compra = ConstructorCompras.agrupar(List.of(
                fila(7, 20, "12A", "95.00", "285.00", FUTURO, 5),
                cambiado(fila(7, 21, "12B", "95.00", "285.00", FUTURO, 5), 6, FUTURO.plusDays(3), "3B", antes, antes, "27.00"),
                fila(7, 22, "12C", "95.00", "285.00", FUTURO, 5)), AHORA).get(0);

        BoletoDto sinCambio = compra.boletos().get(0);
        assertNull(sinCambio.cambio(), "un boleto que nunca se cambió no trae cambio");
        assertEquals("Lima", sinCambio.viajeVigente().origen());

        BoletoDto cambiado = compra.boletos().get(1);
        assertEquals("Chiclayo", cambiado.viajeVigente().destino());
        assertEquals("3B", cambiado.viajeVigente().asiento());
        assertEquals("08:00", cambiado.viajeVigente().horaSalida());
        assertEquals("Lima", cambiado.cambio().anterior().origen());
        assertEquals("Cusco", cambiado.cambio().anterior().destino());
        assertEquals("12B", cambiado.cambio().anterior().asiento(), "el asiento que tenía antes del cambio");
        assertEquals(FUTURO, cambiado.cambio().anterior().fechaSalida());
        assertEquals(0, new BigDecimal("27.00").compareTo(cambiado.cambio().adicionalPagado()));
        assertEquals(AHORA.minusHours(2), cambiado.cambio().fecha());
    }

    @Test
    void laCompraSigueMostrandoElViajeEnQueSeCompro() {
        ViajeFila antes = viajeAnterior(5, FUTURO, "12A");
        CompraDto compra = ConstructorCompras.agrupar(List.of(
                cambiado(fila(7, 20, "12A", "95.00", "95.00", FUTURO, 5), 6, FUTURO.plusDays(3), "3B", antes, antes, "27.00")),
                AHORA).get(0);

        assertEquals("Lima", compra.origen(), "no se muestra el viaje nuevo como viaje de la compra");
        assertEquals("Cusco", compra.destino());
        assertEquals(FUTURO, compra.fechaSalida());
        assertEquals(5L, compra.idViaje());
        assertFalse(compra.incompleta());
    }

    @Test
    void boletosEnViajesDistintosPorUnCambioNoMarcanLaCompraComoIncompleta() {
        ViajeFila antes = viajeAnterior(5, FUTURO, "12B");
        CompraDto conCambio = ConstructorCompras.agrupar(List.of(
                fila(7, 20, "12A", "95.00", "190.00", FUTURO, 5),
                cambiado(fila(7, 21, "12B", "95.00", "190.00", FUTURO, 5), 6, FUTURO.plusDays(3), "3B", antes, antes, "27.00")),
                AHORA).get(0);
        CompraDto sinCambio = ConstructorCompras.agrupar(List.of(
                fila(8, 30, "1A", "95.00", "190.00", FUTURO, 5),
                fila(8, 31, "1B", "95.00", "190.00", FUTURO.plusDays(3), 6)), AHORA).get(0);

        assertFalse(conCambio.incompleta());
        assertTrue(sinCambio.incompleta(), "dos viajes distintos sin ningún cambio registrado siguen siendo un dato raro");
    }

    @Test
    void elTotalPagadoSumaLosAdicionalesDeTodosLosBoletos() {
        ViajeFila antes = viajeAnterior(5, FUTURO, "12B");
        CompraDto compra = ConstructorCompras.agrupar(List.of(
                fila(7, 20, "12A", "95.00", "285.00", FUTURO, 5),
                cambiado(fila(7, 21, "12B", "95.00", "285.00", FUTURO, 5), 6, FUTURO.plusDays(3), "3B", antes, antes, "27.00"),
                cambiado(fila(7, 22, "12C", "95.00", "285.00", FUTURO, 5), 6, FUTURO.plusDays(3), "3C", antes, antes, "10.50")),
                AHORA).get(0);

        assertEquals(0, new BigDecimal("285.00").compareTo(compra.total()), "la venta original no cambia");
        assertEquals(0, new BigDecimal("322.50").compareTo(compra.totalPagado()));
        assertTrue(compra.totalConsistente());
    }

    @Test
    void sinCambiosElTotalPagadoEsElTotalDeLaVenta() {
        CompraDto compra = ConstructorCompras.agrupar(
                List.of(fila(7, 20, "12A", "95.00", "95.00", FUTURO, 5)), AHORA).get(0);

        assertEquals(0, new BigDecimal("95.00").compareTo(compra.totalPagado()));
    }

    @Test
    void conVariosCambiosElViajeOriginalEsElPrimeroYElAnteriorEsElUltimo() {
        ViajeFila original = viajeAnterior(5, FUTURO, "12A");
        ViajeFila ultimoAnterior = new ViajeFila(6L, FUTURO.plusDays(3), OCHO, "PROGRAMADO",
                "Trujillo", "Chiclayo", "Bus Semi Cama", "3B", 90);
        CompraDto compra = ConstructorCompras.agrupar(List.of(
                cambiado(fila(7, 20, "12A", "95.00", "95.00", FUTURO, 5), 7, FUTURO.plusDays(6), "8A",
                        ultimoAnterior, original, "40.00")), AHORA).get(0);

        assertEquals(5L, compra.idViaje().longValue(), "la compra describe el viaje en que se compró");
        assertEquals("Lima", compra.origen());
        assertEquals(6L, compra.boletos().get(0).cambio().anterior().idViaje().longValue(),
                "el cambio describe el último viaje anterior");
        assertEquals("3B", compra.boletos().get(0).cambio().anterior().asiento());
    }

    @Test
    void laCompraSigueProximaSiElViajeOriginalYaSalioPeroUnBoletoCambiadoViajaDespues() {
        ViajeFila original = viajeAnterior(5, PASADO, "12A");
        CompraDto compra = ConstructorCompras.agrupar(List.of(
                fila(7, 20, "12A", "95.00", "190.00", PASADO, 5),
                cambiado(fila(7, 21, "12B", "95.00", "190.00", PASADO, 5), 6, FUTURO, "3B", original, original, "27.00")),
                AHORA).get(0);

        assertEquals("PROXIMO", compra.fase());
        assertTrue(compra.vigente(), "mientras algún boleto no viaje, la compra sigue vigente");
        assertEquals(PASADO, compra.fechaSalida(), "pero sus datos siguen siendo los del viaje original");
    }

    @Test
    void laHoraDeLlegadaSeCalculaConLaDuracionDeLaRutaYSinDuracionQuedaVacia() {
        ViajeFila antes = viajeAnterior(5, FUTURO, "12A"); // ruta de 120 min; el viaje nuevo (de la fila) es de 90 min
        CompraDto conDuracion = ConstructorCompras.agrupar(List.of(
                cambiado(fila(7, 20, "12A", "95.00", "95.00", FUTURO, 5), 6, FUTURO.plusDays(3), "3B", antes, antes, "27.00")),
                AHORA).get(0);

        assertEquals("10:00", conDuracion.horaLlegada(), "la compra es del viaje original: 08:00 + 120 min");
        assertEquals("09:30", conDuracion.boletos().get(0).viajeVigente().horaLlegada(), "viaje nuevo: 08:00 + 90 min");
        assertEquals("10:00", conDuracion.boletos().get(0).cambio().anterior().horaLlegada());
        assertEquals(77, conDuracion.idPago().intValue(), "el pago de la venta");

        CompraDto sinDuracion = ConstructorCompras.agrupar(
                List.of(fila(8, 30, "1A", "95.00", "95.00", FUTURO, 5)), AHORA).get(0);
        assertNull(sinDuracion.horaLlegada(), "sin duración estimada no se inventa la llegada");
        assertNull(sinDuracion.boletos().get(0).viajeVigente().horaLlegada());
        assertNull(sinDuracion.idPago());
    }

    @Test
    void unaVentaSinPasajesSeDevuelveComoIncompleta() {
        FilaCompra sinPasaje = new FilaCompra(9, "PAGADA", new BigDecimal("50.00"), AHORA, "APROBADO", null, null,
                null, null, null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null);
        CompraDto compra = ConstructorCompras.agrupar(List.of(sinPasaje), AHORA).get(0);

        assertTrue(compra.incompleta());
        assertTrue(compra.boletos().isEmpty());
        assertEquals("SIN_INFORMACION", compra.fase());
        assertFalse(compra.vigente());
        assertFalse(compra.documentoDisponible());
        assertNull(compra.origen());
        assertEquals("PEN", compra.moneda());
    }

    @Test
    void elEstadoDeLaCompraNoSeDeduceDeLaFechaDelViaje() {
        FilaCompra pendiente = conEstados(fila(1, 1, "1A", "50.00", "50.00", FUTURO, 5), "PAGADA", "PENDIENTE", null, "PROGRAMADO");
        CompraDto compra = ConstructorCompras.agrupar(List.of(pendiente), AHORA).get(0);
        assertEquals("SIN_CONFIRMAR", compra.estado());
        assertFalse(compra.vigente());
        assertFalse(compra.documentoDisponible());
    }

    @Test
    void unViajeCanceladoNoEsVigenteNiRealizadoNiTieneDocumento() {
        FilaCompra cancelada = conEstados(fila(1, 1, "1A", "50.00", "50.00", FUTURO, 5), "PAGADA", "APROBADO", null, "CANCELADO");
        CompraDto compra = ConstructorCompras.agrupar(List.of(cancelada), AHORA).get(0);
        assertEquals("CONFIRMADA", compra.estado());
        assertEquals("CANCELADO", compra.estadoViaje());
        assertEquals("NO_REALIZADO", compra.fase());
        assertFalse(compra.vigente());
        assertFalse(compra.documentoDisponible());
    }

    @Test
    void lasVigentesVanPrimeroPorSalidaCercanaYLuegoElResto() {
        List<CompraDto> compras = ConstructorCompras.agrupar(List.of(
                fila(1, 1, "1A", "50.00", "50.00", PASADO, 1),                 // pasada
                fila(2, 2, "2A", "50.00", "50.00", FUTURO.plusDays(10), 2),    // vigente lejana
                fila(3, 3, "3A", "50.00", "50.00", FUTURO, 3),                 // vigente cercana
                fila(4, 4, "4A", "50.00", "50.00", PASADO.minusDays(30), 4)),  // pasada antigua
                AHORA);

        List<CompraDto> orden = ConstructorCompras.ordenarParaPasajes(compras);
        assertEquals(List.of(3, 2, 1, 4), orden.stream().map(CompraDto::idVenta).toList());
        assertEquals(2, ConstructorCompras.contarVigentes(compras));
    }

    @Test
    void elHistorialExcluyeLasVigentesYVaDeLoMasRecienteAAntiguo() {
        List<CompraDto> compras = ConstructorCompras.agrupar(List.of(
                fila(1, 1, "1A", "50.00", "50.00", PASADO.minusDays(30), 1),
                fila(2, 2, "2A", "50.00", "50.00", FUTURO, 2),
                fila(3, 3, "3A", "50.00", "50.00", PASADO, 3)), AHORA);

        List<CompraDto> historial = ConstructorCompras.paraHistorial(compras);
        assertEquals(List.of(3, 1), historial.stream().map(CompraDto::idVenta).toList());
        assertEquals("REALIZADO", historial.get(0).fase());
    }

    @Test
    void elResumenNoDuplicaPasajesNiViajesYSoloCuentaComprasConfirmadas() {
        List<FilaResumen> filas = new ArrayList<>();
        // Venta 1: confirmada, viaje 10 próximo, 2 pasajes.
        filas.add(resumen(1, "PAGADA", "APROBADO", null, 100, 10, FUTURO, "PROGRAMADO"));
        filas.add(resumen(1, "PAGADA", "APROBADO", null, 101, 10, FUTURO, "PROGRAMADO"));
        // Ventas 2 y 3: confirmadas, MISMO viaje pasado 11 (un viaje, dos compras).
        filas.add(resumen(2, "PAGADA", "APROBADO", null, 102, 11, PASADO, "PROGRAMADO"));
        filas.add(resumen(3, "PAGADA", "APROBADO", null, 103, 11, PASADO, "PROGRAMADO"));
        // Venta 4: confirmada pero el viaje fue cancelado: cuenta como pasaje, no como ticket ni viaje.
        filas.add(resumen(4, "PAGADA", "APROBADO", null, 104, 12, PASADO, "CANCELADO"));
        // Venta 5: reembolsada. Venta 6: pago sin aprobar. No cuentan.
        filas.add(resumen(5, "PAGADA", "APROBADO", "REEMBOLSADO", 105, 13, PASADO, "PROGRAMADO"));
        filas.add(resumen(6, "PAGADA", "PENDIENTE", null, 106, 14, FUTURO, "PROGRAMADO"));
        // Filas repetidas por un join no deben sumar de nuevo.
        filas.add(resumen(1, "PAGADA", "APROBADO", null, 100, 10, FUTURO, "PROGRAMADO"));

        ResumenPerfilDto r = ConstructorCompras.resumen(filas, AHORA);
        assertEquals(5, r.pasajes());            // 100,101,102,103,104
        assertEquals(1, r.viajesCompletados());  // solo el viaje 11 (una vez)
        assertEquals(4, r.tickets());            // 100,101,102,103 (la cancelada no)
        assertEquals(1, r.comprasVigentes());    // solo la venta 1
    }

    @Test
    void sinComprasElResumenEstaEnCero() {
        ResumenPerfilDto r = ConstructorCompras.resumen(List.of(), AHORA);
        assertEquals(0, r.pasajes());
        assertEquals(0, r.viajesCompletados());
        assertEquals(0, r.tickets());
        assertEquals(0, r.comprasVigentes());
    }

    static FilaResumen resumen(int venta, String estadoVenta, String estadoPago, String estadoOperacion,
                               int pasaje, long viaje, LocalDate fecha, String estadoViaje) {
        return new FilaResumen(venta, estadoVenta, estadoPago, estadoOperacion, pasaje, viaje, fecha, OCHO, estadoViaje);
    }
}
