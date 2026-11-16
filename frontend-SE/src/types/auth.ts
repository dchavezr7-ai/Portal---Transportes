/**
 * Modelos de autenticación y autorización del Sistema Empresarial.
 * El login real lo hace el backend (POST /api/auth/login-empresarial).
 */

export type UserRole = 'owner' | 'admin' | 'manager' | 'staff'

/** Capacidades del MVP (Sprints 3 y 4). */
export type Permission = 'pasajes:registrar' | 'dashboard:ver'

export interface AuthUser {
  id: string
  name: string
  email: string
  avatarUrl?: string
  role: UserRole
  permissions: string[]
  /** Agencia/sede a la que está asociado el usuario. */
  agenciaId: string
  /** Nombre de la sede que envía el backend (tabla agencia). */
  agenciaNombre?: string
}

export interface AuthSession {
  user: AuthUser | null
  status: 'authenticated' | 'unauthenticated' | 'loading'
}

/** Roles del backend que pueden entrar al Sistema Empresarial. */
export type RolEmpresa = 'AGENCIA' | 'GERENTE'

/** Respuesta de POST /api/auth/login-empresarial. */
export interface RespuestaLogin {
  token: string
  usuario: {
    idUsuario: number
    nombres: string
    apellidos: string
    correo: string
  }
  /** Datos de la tabla empleado. */
  rol: RolEmpresa
  idAgencia: number | null
  nombreAgencia: string
}
