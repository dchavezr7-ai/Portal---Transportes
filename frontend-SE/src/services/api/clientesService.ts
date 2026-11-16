import type { ClienteDetalle, ConsultaClientes, IndicadoresClientes, PaginaClientes } from '@/types/cliente'
import type { ClientesService } from '../contracts'
import { ApiError, solicitarApi } from './httpClient'

export const clientesService: ClientesService = {
  async listar(consulta: ConsultaClientes) {
    const parametros = new URLSearchParams({
      orden: consulta.orden,
      direccion: consulta.direccion,
      actividad: consulta.actividad,
      pagina: String(consulta.pagina),
      tamano: String(consulta.tamano),
    })
    if (consulta.q.trim()) parametros.set('q', consulta.q.trim())
    if (consulta.tipoDocumento) parametros.set('tipoDocumento', consulta.tipoDocumento)
    const pagina = await solicitarApi<PaginaClientes>(`/api/clientes?${parametros}`)
    if (!pagina || !Array.isArray(pagina.contenido)) throw new ApiError('El servidor devolvió una lista de clientes no válida.', 0)
    return pagina
  },

  async indicadores() {
    return solicitarApi<IndicadoresClientes>('/api/clientes/indicadores')
  },

  async detalle(idPasajero) {
    return solicitarApi<ClienteDetalle>(`/api/clientes/${idPasajero}`)
  },
}
