-- Solo para LoginEmpresarialIntegracionTest: sedes con nombre para el login empresarial.
CREATE TABLE IF NOT EXISTS agencia (
 id_agencia bigint PRIMARY KEY,
 nombre_agencia varchar(100) NOT NULL
);
MERGE INTO agencia (id_agencia, nombre_agencia) KEY (id_agencia) VALUES (1, 'Ruta Libre - Lima');
