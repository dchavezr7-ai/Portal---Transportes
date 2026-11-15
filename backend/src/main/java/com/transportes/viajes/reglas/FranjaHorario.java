package com.transportes.viajes.reglas;

import java.time.LocalTime;
import java.util.Locale;
import java.util.Optional;

public enum FranjaHorario {
    MADRUGADA("madrugada", 0, 360),
    MANANA("manana", 360, 720),
    TARDE("tarde", 720, 1080),
    NOCHE("noche", 1080, 1440);

    private final String id;
    private final int desdeMinuto;
    private final int hastaMinuto;

    FranjaHorario(String id, int desdeMinuto, int hastaMinuto) {
        this.id = id;
        this.desdeMinuto = desdeMinuto;
        this.hastaMinuto = hastaMinuto;
    }

    public String id() {
        return id;
    }

    public int desdeMinuto() {
        return desdeMinuto;
    }

    public int hastaMinuto() {
        return hastaMinuto;
    }

    public boolean contiene(LocalTime hora) {
        int minuto = hora.getHour() * 60 + hora.getMinute();
        return minuto >= desdeMinuto && minuto < hastaMinuto;
    }

    public static Optional<FranjaHorario> desdeId(String valor) {
        if (valor == null) {
            return Optional.empty();
        }
        String limpio = valor.trim().toLowerCase(Locale.ROOT).replace("ñ", "n");
        for (FranjaHorario franja : values()) {
            if (franja.id.equals(limpio)) {
                return Optional.of(franja);
            }
        }
        return Optional.empty();
    }
}
