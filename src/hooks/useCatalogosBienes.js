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
        categorias:     data.catCategoriasActivo ?? [],
        unidadesMedida: data.catUnidadesMedida ?? [],
        modelos:        data.catModelos ?? [],
        // Segmentos de red (antes "unidades") — id_segmento, nombre, clave
        segmentos:      data.segmentos ?? [],
        // Unidades físicas (clínicas/hospitales) — clave, descripcion, desc_corta
        unidades:      data.unidades ?? [],
        // Usuarios activos para resguardo
        usuarios:       data.usuarios?.edges?.map((e) => e.node) ?? [],
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
