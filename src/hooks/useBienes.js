import { useQuery } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { GET_BIENES_QUERY } from '../api/inventario.queries';
import { useAuthStore } from '../store/auth.store';

/**
 * Hook para obtener la lista de bienes con soporte de filtros y paginación.
 * @param {Object} filter - filtros: { estatus_operativo, search, id_categoria, ... }
 * @param {Object} pagination - { first, after }
 */
export function useBienes(filter = {}, pagination = { first: 100 }) {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useQuery({
    queryKey: ['bienes', filter, pagination],
    queryFn: async () => {
      try {
        const data = await gqlClient.request(GET_BIENES_QUERY, { filter, pagination });
        const edges = data.bienes.edges ?? [];
        const pageInfo = data.bienes.pageInfo ?? {};

        const items = edges.map(({ node }) => ({
          // — IDs y códigos (solo lectura)
          id: node.id_bien,
          id_bien: node.id_bien,
          numSerie: node.num_serie || 'N/D',
          numInv: node.num_inv || 'N/D',
          qrHash: node.qr_hash,
          clavePresupuestal: node.clave_presupuestal || '—',

          // — Campos editables
          cantidad: node.cantidad,
          estatusOperativo: node.estatus_operativo || 'ACTIVO',
          claveInmueble: node.clave_inmueble,
          claveInmuebleRef: node.clave_inmueble_ref,
          claveModelo: node.clave_modelo,
          idCategoria: node.id_categoria,
          idUnidadMedida: node.id_unidad_medida,
          idUnidad: node.id_unidad,
          id_ubicacion: node.id_ubicacion,
          idUsuarioResguardo: node.id_usuario_resguardo,
          fechaAdquisicion: node.fecha_adquisicion,
          fechaActualizacion: node.fecha_actualizacion,

          // — Relaciones resueltas
          equipo: node.modelo?.descrip_disp || node.categoria?.nombre_categoria || 'Sin modelo',
          resguardo: node.usuarioResguardo?.nombre_completo || 'Sin resguardo',
          ubicacion: node.ubicacion?.nombre_ubicacion || node.unidad?.nombre || node.inmueble?.nombre_ubicacion || 'Sin ubicación',

          // — Categoría
          categoria: node.categoria,
          esCapitalizable: node.categoria?.es_capitalizable ?? true,
          tipo: node.categoria?.es_capitalizable ? 'Capitalizable' : 'No Capitalizable',

          // — Especificaciones TI (solo si aplica)
          especificacionTI: node.especificacionTI || null,

          // — Garantías
          garantias: node.garantias || [],

          // — Relaciones completas para el formulario
          modelo: node.modelo,
          unidad: node.unidad,
          inmueble: node.inmueble,
          unidadMedida: node.unidadMedida,
          usuarioResguardo: node.usuarioResguardo,

          // — Nodo original
          originalNode: node,
        }));

        return { items, pageInfo };
      } catch (error) {
        const code = error?.response?.errors?.[0]?.extensions?.code;
        if (code === 'UNAUTHENTICATED') {
          clearAuth();
        }
        throw error;
      }
    },
    staleTime: 30 * 1000, // 30 segundos
  });
}
