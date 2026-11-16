-- HU-02 · Confirmación de la postergación (criterio 10).
-- Historial de postergaciones y pago adicional. El pasaje y la venta NO cambian; solo cambia el asiento del pasaje.
-- Se usa una tabla aparte porque pago tiene UNIQUE (id_venta) (uq_pago_venta) y la venta ya tiene su pago.
-- Aplicar en Supabase ANTES de levantar el backend (spring.jpa.hibernate.ddl-auto=validate).
-- Es idempotente: se puede ejecutar más de una vez.

CREATE TABLE IF NOT EXISTS postergacion (
    id_postergacion           integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_pasaje                 integer       NOT NULL REFERENCES pasaje (id_pasaje),
    id_venta                  integer       NOT NULL REFERENCES venta (id_venta),
    id_viaje_anterior         bigint        NOT NULL REFERENCES viaje (id_viaje),
    id_viaje_nuevo            bigint        NOT NULL REFERENCES viaje (id_viaje),
    id_viaje_asiento_anterior integer       NOT NULL REFERENCES viaje_asiento (id_viaje_asiento),
    id_viaje_asiento_nuevo    integer       NOT NULL REFERENCES viaje_asiento (id_viaje_asiento),
    importe_adicional         numeric(10,2) NOT NULL DEFAULT 0 CHECK (importe_adicional >= 0),
    referencia_pago           varchar(64),
    fecha_postergacion        timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_postergacion_viajes_distintos CHECK (id_viaje_anterior <> id_viaje_nuevo)
);

CREATE INDEX IF NOT EXISTS ix_postergacion_pasaje ON postergacion (id_pasaje);
CREATE INDEX IF NOT EXISTS ix_postergacion_venta ON postergacion (id_venta);
