import { gql } from 'graphql-request';
import { gqlClient } from './client';

export const GET_MONITOREO_IMPRESIONES = gql`
  query GetMonitoreoImpresiones($search: String, $version: String, $ubicacion: String, $unidades: [String!], $fechaInicio: DateTime, $fechaFin: DateTime, $sortBy: String, $sortOrder: String, $pagination: PaginationInput) {
    monitoreoImpresiones(search: $search, version: $version, ubicacion: $ubicacion, unidades: $unidades, fechaInicio: $fechaInicio, fechaFin: $fechaFin, sortBy: $sortBy, sortOrder: $sortOrder, pagination: $pagination) {
      edges {
        node {
          num_serie
          dir_ip
          descripcion
          total_impresiones
          version
          nombre_ubicacion
          fecha_min
          fecha_max
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
        totalCount
      }
      totalImpresiones
    }
  }
`;

export const GET_MONITOREO_RESUMEN_UNIDADES = gql`
  query GetMonitoreoResumenUnidades {
    monitoreoResumenUnidades {
      clave
      total_impresiones
    }
  }
`;

export async function getMonitoreoImpresiones(filters = {}, pagination = {}) {
  const variables = {
    search: filters.search || undefined,
    version: filters.version || undefined,
    ubicacion: filters.ubicacion || undefined,
    unidades: filters.unidades && filters.unidades.length > 0 ? filters.unidades : undefined,
    fechaInicio: filters.fechaInicio || undefined,
    fechaFin: filters.fechaFin || undefined,
    sortBy: filters.sortBy || undefined,
    sortOrder: filters.sortOrder || undefined,
    pagination,
  };
  const { monitoreoImpresiones } = await gqlClient.request(GET_MONITOREO_IMPRESIONES, variables);
  return monitoreoImpresiones;
}
