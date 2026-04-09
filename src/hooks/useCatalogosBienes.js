import { useQuery } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { GET_CATALOGOS_BIENES_QUERY } from '../api/inventario.queries';

/**
 * Carga en paralelo todos los catálogos necesarios para los
 * selects del formulario de creación/edición de bienes.
 */
export function useCatalogosBienes() {
  return useQuery({
    queryKey: ['catalogos-bienes'],
    queryFn: async () => {
      const data = await gqlClient.request(GET_CATALOGOS_BIENES_QUERY);
      return {
        categorias: data.catCategoriasActivo ?? [],
        unidadesMedida: data.catUnidadesMedida ?? [],
        modelos: data.catModelos ?? [],
        unidades: data.unidades ?? [],
        // inmuebles (tabla legacy con descripcion completa)
        inmuebles: data.inmuebles ?? [],
        // Usuarios activos para resguardo
        usuarios: data.usuarios?.edges?.map((e) => e.node) ?? [],
      };
    },
    staleTime: 5 * 60 * 1000, // 5 min — los catálogos cambian poco
  });
}
