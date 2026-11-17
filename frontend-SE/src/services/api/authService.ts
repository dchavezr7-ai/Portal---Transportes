import type { RespuestaLogin } from '@/types/auth'
import type { AuthService } from '../contracts'
import { solicitarApi } from './httpClient'

/**
 * Llamadas de autenticación al backend. El store de sesión (`authStore`)
 * las usa; los componentes nunca llaman al backend directamente.
 */
export const authService: AuthService = {
  /** Login del Sistema Empresarial: solo personal de agencia o gerente recibe token. */
  iniciarSesion(correo, contrasena) {
    return solicitarApi<RespuestaLogin>('/api/auth/login-empresarial', {
      method: 'POST',
      body: { correo: correo.trim(), contrasena },
      autenticar: false,
    })
  },

  /** Invalida el token en el backend (lo agrega a la lista de tokens cerrados). */
  async cerrarSesion() {
    await solicitarApi<void>('/api/auth/logout', { method: 'POST' })
  },
}
