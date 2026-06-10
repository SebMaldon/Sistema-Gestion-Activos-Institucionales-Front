import { useQuery } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { GET_BIENES_QUERY } from '../api/inventario.queries';
import { useAuthStore } from '../store/auth.store';

/** Convierte un nodo GraphQL de Bien al shape usado en el frontend */
export function mapBienNode(node) {
  return {
    id: node.id_bien,
    id_bien: node.id_bien,
    numSerie: node.num_serie || 'N/D',
    numInv: node.num_inv || 'N/D',
    qrHash: node.qr_hash,
    clavePresupuestal: node.clave_presupuestal || '—',
    cantidad: node.cantidad,
    estatusOperativo: node.estatus_operativo || 'ACTIVO',
    claveInmuebleRef: node.clave_inmueble_ref,
    claveModelo: node.clave_modelo,
    idCategoria: node.id_categoria,
    idUnidadMedida: node.id_unidad_medida,
    idUnidad: node.id_unidad,
    idSegmento: node.id_segmento,
    id_ubicacion: node.id_ubicacion,
    idUsuarioResguardo: node.id_usuario_resguardo,
    claveUnidadRef: node.clave_unidad_ref,
    fechaAdquisicion: node.fecha_adquisicion,
    fechaActualizacion: node.fecha_actualizacion,
    equipo: node.modelo?.descrip_disp || node.categoria?.nombre_categoria || 'Sin modelo',
    resguardo: node.usuarioResguardo?.nombre_completo || 'Sin resguardo',
    ubicacion: node.ubicacion?.nombre_ubicacion || node.inmueble?.nombre_ubicacion || 'Sin ubicación',
    unidadFisica: node.unidad?.desc_corta || node.unidad?.descripcion || 'Sin Unidad',
    categoria: node.categoria,
    esCapitalizable: !!(node.categoria?.es_capitalizable && node.num_inv && !String(node.num_inv).toUpperCase().includes('COMODATO')),
    tipo: (node.categoria?.es_capitalizable && node.num_inv && !String(node.num_inv).toUpperCase().includes('COMODATO')) ? 'Capitalizable' : 'No Capitalizable',
    especificacionTI: node.especificacionTI || null,
    inconvenientes: node.inconvenientes || [],
    garantias: node.garantias || [],
    notas: node.notas || [],
    monitores: node.monitores || [],
    equipoAsignado: node.equipoAsignado || null,
    modelo: node.modelo,
    unidad: node.unidad,
    inmueble: node.inmueble,
    unidadMedida: node.unidadMedida,
    usuarioResguardo: node.usuarioResguardo,
    cuentasPC: node.cuentasPC || [],
    programasPC: node.programasPC || [],
    originalNode: node,
  };
}

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
        const items = edges.map(({ node }) => mapBienNode(node));
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
