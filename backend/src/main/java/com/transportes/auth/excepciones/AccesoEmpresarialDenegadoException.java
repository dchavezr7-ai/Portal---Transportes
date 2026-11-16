package com.transportes.auth.excepciones;

/**
 * Se lanza cuando una cuenta con correo y contrasena correctos intenta
 * entrar al Sistema Empresarial sin ser personal de agencia ni gerente
 * (por ejemplo, un cliente del Portal). Se responde 403.
 */
public class AccesoEmpresarialDenegadoException extends RuntimeException {

    public AccesoEmpresarialDenegadoException(String mensaje) {
        super(mensaje);
    }
}
