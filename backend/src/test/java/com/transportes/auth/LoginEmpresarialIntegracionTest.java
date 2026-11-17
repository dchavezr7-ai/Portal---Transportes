package com.transportes.auth;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Login del Sistema Empresarial: solo personal de agencia o gerente recibe
 * token, y /api/clientes queda protegido por rol.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    // Base propia para no chocar con la tabla agencia de otras pruebas.
    "spring.datasource.url=jdbc:h2:mem:empleados;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
    "spring.sql.init.schema-locations=classpath:schema-test.sql,classpath:schema-reserva-test.sql,classpath:schema-empleado-test.sql"
})
@ActiveProfiles("test")
class LoginEmpresarialIntegracionTest {
    @LocalServerPort int port;
    @Autowired ObjectMapper json;
    @Autowired PasswordEncoder encoder;
    @Autowired JdbcTemplate jdbc;
    final HttpClient http = HttpClient.newHttpClient();
    static final String CLAVE = "ClaveEmpresa2026!";

    /** Crea una cuenta; si el rol es AGENCIA o GERENTE tambien la registra en empleado. */
    String crearCuenta(String rol) {
        String correo = rol.toLowerCase() + "-" + UUID.randomUUID() + "@example.com";
        jdbc.update("insert into usuario(nombres, apellidos, correo, contrasena_hash) values (?,?,?,?)",
                "Prueba", rol, correo, encoder.encode(CLAVE));
        if (!rol.equals("CLIENTE")) {
            Integer idUsuario = jdbc.queryForObject("select id_usuario from usuario where correo=?", Integer.class, correo);
            Long sede = rol.equals("AGENCIA") ? 1L : null;
            jdbc.update("insert into empleado(id_usuario, rol, id_agencia) values (?,?,?)", idUsuario, rol, sede);
        }
        return correo;
    }

    HttpResponse<String> login(String correo, String clave) throws Exception {
        String cuerpo = json.writeValueAsString(Map.of("correo", correo, "contrasena", clave));
        return http.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/auth/login-empresarial"))
                .timeout(Duration.ofSeconds(20)).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(cuerpo)).build(), HttpResponse.BodyHandlers.ofString());
    }

    HttpResponse<String> clientes(String token) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/clientes/indicadores"));
        if (token != null) builder.header("Authorization", "Bearer " + token);
        return http.send(builder.GET().build(), HttpResponse.BodyHandlers.ofString());
    }

    String token(HttpResponse<String> respuesta) {
        return json.readTree(respuesta.body()).get("token").asText();
    }

    @Test void personalDeAgenciaYGerenteEntranConSuRol() throws Exception {
        for (String rol : new String[] {"AGENCIA", "GERENTE"}) {
            var respuesta = login(crearCuenta(rol), CLAVE);
            assertEquals(200, respuesta.statusCode(), respuesta.body());
            var cuerpo = json.readTree(respuesta.body());
            assertFalse(cuerpo.get("token").asText().isBlank());
            assertEquals(rol, cuerpo.get("rol").asText());
        }
    }

    @Test void devuelveLaSedeDelEmpleado() throws Exception {
        var agencia = json.readTree(login(crearCuenta("AGENCIA"), CLAVE).body());
        assertEquals(1, agencia.get("idAgencia").asInt());
        assertEquals("Ruta Libre - Lima", agencia.get("nombreAgencia").asText());

        var gerente = json.readTree(login(crearCuenta("GERENTE"), CLAVE).body());
        assertTrue(gerente.get("idAgencia").isNull());
        assertEquals("Todas las sedes", gerente.get("nombreAgencia").asText());
    }

    @Test void empleadoDadoDeBajaNoEntra() throws Exception {
        String correo = crearCuenta("AGENCIA");
        jdbc.update("update empleado set activo=false where id_usuario=(select id_usuario from usuario where correo=?)", correo);
        assertEquals(403, login(correo, CLAVE).statusCode());
    }

    @Test void clienteDelPortalNoRecibeToken() throws Exception {
        var respuesta = login(crearCuenta("CLIENTE"), CLAVE);
        assertEquals(403, respuesta.statusCode(), respuesta.body());
        assertFalse(respuesta.body().contains("token"));
        assertEquals("Tu cuenta no tiene acceso al Sistema Empresarial.",
                json.readTree(respuesta.body()).get("mensaje").asText());
    }

    @Test void contrasenaIncorrectaEs401() throws Exception {
        assertEquals(401, login(crearCuenta("AGENCIA"), "Incorrecta2026!").statusCode());
        assertEquals(401, login("no-existe@example.com", CLAVE).statusCode());
    }

    @Test void clientesExigeRolDeEmpresa() throws Exception {
        String correoCliente = crearCuenta("CLIENTE");
        // Un cliente puede iniciar sesion en el Portal, pero no ver /api/clientes.
        String cuerpo = json.writeValueAsString(Map.of("correo", correoCliente, "contrasena", CLAVE));
        var loginPortal = http.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/auth/login"))
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(cuerpo)).build(),
                HttpResponse.BodyHandlers.ofString());
        assertEquals(200, loginPortal.statusCode(), loginPortal.body());

        assertEquals(401, clientes(null).statusCode());
        assertEquals(403, clientes(token(loginPortal)).statusCode());

        int estadoAgencia = clientes(token(login(crearCuenta("AGENCIA"), CLAVE))).statusCode();
        assertNotEquals(401, estadoAgencia);
        assertNotEquals(403, estadoAgencia);
    }
}
