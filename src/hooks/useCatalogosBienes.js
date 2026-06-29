import { useQuery } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { GET_CATALOGOS_BIENES_QUERY } from '../api/inventario.queries';

/**
 * Carga en paralelo todos los catálogos necesarios para los
 * selects del formulario de creación/edición de bienes.
 */
export function useCatalogosBienes() {
  return useQuery({
    queryKey: ['catalogos-bienes', 'v2'],
    queryFn: async () => {
      const data = await gqlClient.request(GET_CATALOGOS_BIENES_QUERY);
      return {
        categorias:     data.catCategoriasActivo ?? [],
        unidadesMedida: data.catUnidadesMedida ?? [],
        modelos:        data.catModelos ?? [],
        // Tipos de dispositivo (PC, Laptop, Monitor, etc.) para lógica condicional del formulario
        tipos:          data.tiposDispositivo ?? [],
        // Marcas de dispositivo
        marcas:         data.marcas ?? [],
        // Segmentos de red (antes "unidades") — id_segmento, nombre, clave
        segmentos:      data.segmentos ?? [],
        // Unidades físicas (clínicas/hospitales) — clave, descripcion, desc_corta
        unidades:      data.unidades ?? [],
        ubicaciones:   data.ubicaciones ?? [],
        // Usuarios activos para resguardo
        usuarios:       data.usuarios?.edges?.map((e) => e.node) ?? [],
        // Estatus operativos
        catEstatusBienes: Array.from(new Set([
          'ACTIVO', 'INACTIVO', 'DAÑADO', 'DEVOLUCIÓN', 'OTRO', 'BAJA', 'P_BAJA', 'PRESTAMO', 'SINIESTRADO', 'SUSTITUIDO', 'TRASPASO OOAD', 'TRASPASO_FORANEO',
          ...(data.catEstatusBienes ?? [])
        ])).sort((a, b) => a.localeCompare(b)),
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
