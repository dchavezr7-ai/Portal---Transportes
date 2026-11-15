package com.transportes.viajes.reglas;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class FranjaHorarioTest {

    @Test
    void cadaHoraPerteneceAExactamenteUnaFranja() {
        for (int minuto = 0; minuto < 1440; minuto++) {
            LocalTime hora = LocalTime.of(minuto / 60, minuto % 60);
            long coincidencias = java.util.Arrays.stream(FranjaHorario.values()).filter(f -> f.contiene(hora)).count();
            assertEquals(1, coincidencias, "Hora " + hora);
        }
    }

    @Test
    void respetaLosLimitesDefinidos() {
        assertTrue(FranjaHorario.MADRUGADA.contiene(LocalTime.of(0, 0)));
        assertTrue(FranjaHorario.MADRUGADA.contiene(LocalTime.of(5, 59)));
        assertTrue(FranjaHorario.MANANA.contiene(LocalTime.of(6, 0)));
        assertTrue(FranjaHorario.MANANA.contiene(LocalTime.of(11, 59)));
        assertTrue(FranjaHorario.TARDE.contiene(LocalTime.of(12, 0)));
        assertTrue(FranjaHorario.TARDE.contiene(LocalTime.of(17, 59)));
        assertTrue(FranjaHorario.NOCHE.contiene(LocalTime.of(18, 0)));
        assertTrue(FranjaHorario.NOCHE.contiene(LocalTime.of(23, 59)));
        assertFalse(FranjaHorario.TARDE.contiene(LocalTime.of(18, 0)));
    }

    @Test
    void resuelveIdentificadoresConYSinEnie() {
        assertEquals(Optional.of(FranjaHorario.MANANA), FranjaHorario.desdeId("mañana"));
        assertEquals(Optional.of(FranjaHorario.MANANA), FranjaHorario.desdeId(" Manana "));
        assertEquals(Optional.of(FranjaHorario.NOCHE), FranjaHorario.desdeId("NOCHE"));
        assertEquals(Optional.empty(), FranjaHorario.desdeId("cualquiera"));
        assertEquals(Optional.empty(), FranjaHorario.desdeId(null));
    }
}
