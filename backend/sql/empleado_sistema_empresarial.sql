-- =====================================================================
-- Login del Sistema Empresarial: tabla empleado.
--
-- Ejecutar UNA vez en el editor SQL de Supabase ANTES de desplegar el
-- backend nuevo (el backend usa ddl-auto=validate y no arranca si falta
-- la tabla "empleado"). Se puede ejecutar dos veces sin romper nada.
--
-- Idea: la tabla usuario guarda la cuenta (correo y contrasena) de
-- todos. Solo quien tiene una fila en empleado puede entrar al Sistema
-- Empresarial. Una cuenta sin fila en empleado es un cliente del Portal.
-- =====================================================================

-- 1) Tabla empleado: una fila por cada cuenta que trabaja en RutaLibre.
CREATE TABLE IF NOT EXISTS public.empleado (
    id_empleado    integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario     integer NOT NULL REFERENCES public.usuario (id_usuario),
    rol            varchar(20) NOT NULL,
    id_agencia     bigint REFERENCES public.agencia (id_agencia),
    activo         boolean NOT NULL DEFAULT true,
    fecha_creacion timestamp NOT NULL DEFAULT now(),
    -- Una cuenta solo puede ser un empleado.
    CONSTRAINT uq_empleado_usuario UNIQUE (id_usuario),
    -- Solo dos roles.
    CONSTRAINT ck_empleado_rol CHECK (rol IN ('AGENCIA', 'GERENTE')),
    -- El personal de agencia siempre tiene sede; el gerente supervisa todas.
    CONSTRAINT ck_empleado_sede CHECK (rol = 'GERENTE' OR id_agencia IS NOT NULL)
);

-- Igual que las demas tablas del proyecto (evita el aviso de Supabase).
ALTER TABLE public.empleado ENABLE ROW LEVEL SECURITY;

-- 2) Dos cuentas de prueba. La contrasena va cifrada con BCrypt (la misma
--    que usa el backend). La contrasena en texto plano la tiene el equipo.
INSERT INTO public.usuario (nombres, apellidos, correo, contrasena_hash, activo)
VALUES
    ('Camila', 'Rojas', 'camila.rojas@rutalibre.com',
     '$2a$10$cESa4v1mrptNNVButdDYOOb524tL8CSInBC4ApidNP3zztWmPBpE2', true),
    ('Ricardo', 'Salazar', 'ricardo.salazar@rutalibre.com',
     '$2a$10$kqVNBjbxHvCJF6g8gFxQ1uBXXyZVmgkc/U.YuYkZekc8nVawtg2Te', true)
ON CONFLICT (correo) DO NOTHING;

-- 3) Se registran como empleados: Camila en la sede de Lima (agencia 1),
--    Ricardo como gerente (sin sede).
INSERT INTO public.empleado (id_usuario, rol, id_agencia)
SELECT id_usuario, 'AGENCIA', 1 FROM public.usuario WHERE correo = 'camila.rojas@rutalibre.com'
UNION ALL
SELECT id_usuario, 'GERENTE', NULL FROM public.usuario WHERE correo = 'ricardo.salazar@rutalibre.com'
ON CONFLICT (id_usuario) DO UPDATE SET rol = EXCLUDED.rol, id_agencia = EXCLUDED.id_agencia;

-- 4) Comprobacion: empleados con su sede.
SELECT e.id_empleado, u.correo, e.rol, a.nombre_agencia, e.activo
FROM public.empleado e
JOIN public.usuario u ON u.id_usuario = e.id_usuario
LEFT JOIN public.agencia a ON a.id_agencia = e.id_agencia
ORDER BY e.id_empleado;
