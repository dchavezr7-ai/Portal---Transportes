import { Building2, Globe2 } from 'lucide-react'
import { TODAS_LAS_SEDES, useAuthStore } from '@/stores/authStore'

/**
 * Sede asignada al usuario: solo informativa (no se puede cambiar). El
 * nombre viene del backend (tabla empleado + agencia) al iniciar sesión;
 * el gerente supervisa todas las sedes.
 */
export function BranchInfo() {
  const user = useAuthStore((s) => s.user)

  if (!user) return null

  const global = user.agenciaId === TODAS_LAS_SEDES
  const titulo = global ? 'Todas las sedes' : (user.agenciaNombre ?? '—')
  const Icono = global ? Globe2 : Building2

  return (
    <div
      role="status"
      aria-label={`Sede asignada: ${titulo}`}
      title={global ? 'Supervisas todas las sedes' : 'Tu sede asignada'}
      className="flex h-10 cursor-default select-none items-center gap-2.5 rounded-[10px] border border-border bg-surface-sunken pl-1.5 pr-3.5"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-text">
        <Icono className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="hidden min-w-0 leading-tight sm:block">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-text-500">{global ? 'Alcance' : 'Sede asignada'}</span>
        <span className="block max-w-[200px] truncate text-[13px] font-semibold text-text-900">{titulo}</span>
      </span>
      <span className="sr-only sm:hidden">{titulo}</span>
      {global && <span className="hidden text-xs text-text-500 xl:block">· Gerencia general</span>}
    </div>
  )
}
