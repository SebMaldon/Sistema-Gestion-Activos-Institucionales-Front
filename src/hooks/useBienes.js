import { useQuery } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { GET_BIENES_QUERY } from '../api/inventario.queries';
import { useAuthStore } from '../store/auth.store';

export function useBienes() {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useQuery({
    queryKey: ['bienes'],
    queryFn: async () => {
      try {
        const data = await gqlClient.request(GET_BIENES_QUERY);
        return data.bienes.edges.map(({ node }) => ({
          id: node.id_bien,
          numSerie: node.num_serie || 'N/D',
          equipo: node.modelo?.descrip_disp || node.categoria?.nombre_categoria || 'Sin especificar',
          resguardo: node.usuarioResguardo?.nombre_completo || 'Sin resguardo',
          ubicacion: node.unidad?.nombre || node.inmueble?.nombre_ubicacion || 'Sin ubicación',
          estatus: node.estatus_operativo || 'Activo',
          tipo: node.categoria?.es_capitalizable ? 'Capitalizable' : 'No Capitalizable',
          originalNode: node // in case we need it later
        }));
      } catch (error) {
        const code = error?.response?.errors?.[0]?.extensions?.code;
        if (code === 'UNAUTHENTICATED') {
          clearAuth();
        }
        throw error;
      }
    },
  });
}
