package com.transportes.auth.servicios;

import com.transportes.auth.dto.LoginEmpresarialResponse;
import com.transportes.auth.dto.LoginRequest;
import com.transportes.auth.dto.LoginResponse;
import com.transportes.auth.dto.UsuarioResumenResponse;
import com.transportes.auth.excepciones.AccesoEmpresarialDenegadoException;
import com.transportes.auth.excepciones.CredencialesInvalidasException;
import com.transportes.empleados.entidades.Empleado;
import com.transportes.empleados.servicios.EmpleadoService;
import com.transportes.security.servicios.JwtService;
import com.transportes.security.servicios.TokenInvalidadoService;
import com.transportes.usuarios.entidades.Usuario;
import com.transportes.usuarios.repositorios.UsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Logica de negocio del inicio y cierre de sesion.
 *
 * No implementa registro de cuentas: los usuarios ya deben existir en la
 * tabla {@code usuario} (insertados manualmente), tal como lo exige el
 * alcance de esta implementacion.
 */
@Service
public class AuthService {

    private static final String MENSAJE_CREDENCIALES_INVALIDAS = "Correo o contrasena incorrectos.";
    private static final String MENSAJE_SIN_ACCESO_EMPRESARIAL =
            "Tu cuenta no tiene acceso al Sistema Empresarial.";

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final TokenInvalidadoService tokenInvalidadoService;
    private final EmpleadoService empleadoService;

    public AuthService(UsuarioRepository usuarioRepository,
                        PasswordEncoder passwordEncoder,
                        JwtService jwtService,
                        TokenInvalidadoService tokenInvalidadoService,
                        EmpleadoService empleadoService) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.tokenInvalidadoService = tokenInvalidadoService;
        this.empleadoService = empleadoService;
    }

    /** Login del Portal: cualquier cuenta activa con correo y contrasena correctos. */
    @Transactional(readOnly = true)
    public LoginResponse iniciarSesion(LoginRequest datos) {
        Usuario usuario = validarCredenciales(datos);
        return crearRespuesta(usuario);
    }

    /**
     * Login del Sistema Empresarial: ademas de las credenciales, exige que
     * la cuenta tenga una fila activa en la tabla empleado. A un cliente no
     * se le entrega token.
     */
    @Transactional(readOnly = true)
    public LoginEmpresarialResponse iniciarSesionEmpresarial(LoginRequest datos) {
        Usuario usuario = validarCredenciales(datos);

        Empleado empleado = empleadoService.buscarEmpleadoActivo(usuario.getIdUsuario())
                .orElseThrow(() -> new AccesoEmpresarialDenegadoException(MENSAJE_SIN_ACCESO_EMPRESARIAL));

        String token = jwtService.generarToken(usuario.getIdUsuario(), usuario.getCorreo());
        return new LoginEmpresarialResponse(
                token,
                crearResumen(usuario),
                empleado.getRol().name(),
                empleado.getIdAgencia(),
                empleadoService.obtenerNombreSede(empleado));
    }

    /**
     * Comprueba correo, estado y contrasena. Devuelve el usuario si todo es
     * correcto; si no, lanza CredencialesInvalidasException (respuesta 401).
     * La comparten los dos logins para no repetir las reglas.
     */
    private Usuario validarCredenciales(LoginRequest datos) {
        Usuario usuario = usuarioRepository.findByCorreoIgnoreCase(datos.getCorreo())
                .orElseThrow(() -> new CredencialesInvalidasException(MENSAJE_CREDENCIALES_INVALIDAS));

        if (!usuario.estaActivo()) {
            throw new CredencialesInvalidasException("El usuario se encuentra inactivo.");
        }

        // Cuenta creada solo con Google: no tiene contrasena, no se puede
        // entrar por esta via (mismo mensaje generico que una clave erronea).
        if (usuario.getContrasenaHash() == null) {
            throw new CredencialesInvalidasException(MENSAJE_CREDENCIALES_INVALIDAS);
        }

        // Nunca se compara la contrasena en texto plano: passwordEncoder.matches
        // aplica el mismo algoritmo BCrypt utilizado para generar el hash
        // almacenado y compara de forma segura.
        if (!passwordEncoder.matches(datos.getContrasena(), usuario.getContrasenaHash())) {
            throw new CredencialesInvalidasException(MENSAJE_CREDENCIALES_INVALIDAS);
        }

        return usuario;
    }

    /** Genera el JWT del Portal y lo devuelve junto con el resumen del usuario. */
    private LoginResponse crearRespuesta(Usuario usuario) {
        String token = jwtService.generarToken(usuario.getIdUsuario(), usuario.getCorreo());
        return new LoginResponse(token, crearResumen(usuario));
    }

    private UsuarioResumenResponse crearResumen(Usuario usuario) {
        return new UsuarioResumenResponse(
                usuario.getIdUsuario(), usuario.getNombres(), usuario.getApellidos(), usuario.getCorreo());
    }

    /**
     * Invalida el token actual agregando su {@code jti} a la lista de
     * tokens invalidados (ver {@link TokenInvalidadoService}), de modo que
     * ya no pueda volver a usarse para autenticar peticiones, aunque su
     * firma siga siendo tecnicamente valida hasta su expiracion natural.
     */
    public void cerrarSesion(String jti, java.time.Instant expiracion) {
        tokenInvalidadoService.invalidar(jti, expiracion);
    }
}
