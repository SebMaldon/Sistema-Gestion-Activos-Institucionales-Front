import { gql } from 'graphql-request';
import { gqlClient } from './client';

export const GET_MONITOREO_IMPRESIONES = gql`
  query GetMonitoreoImpresiones($search: String, $version: [String!], $ubicacion: [String!], $unidades: [String!], $fechaInicio: DateTime, $fechaFin: DateTime, $retrasoMayorA3Dias: Boolean, $sortBy: String, $sortOrder: String, $pagination: PaginationInput) {
    monitoreoImpresiones(search: $search, version: $version, ubicacion: $ubicacion, unidades: $unidades, fechaInicio: $fechaInicio, fechaFin: $fechaFin, retrasoMayorA3Dias: $retrasoMayorA3Dias, sortBy: $sortBy, sortOrder: $sortOrder, pagination: $pagination) {
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
          limpieza_logica
          wifi
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

export const GET_MONITOREO_FILTROS = gql`
  query GetMonitoreoFiltros($unidades: [String!]) {
    monitoreoFiltros(unidades: $unidades) {
      versiones
      ubicaciones
      fechaMinGlobal
      fechaMaxGlobal
    }
  }
`;

export async function getMonitoreoImpresiones(filters = {}, pagination = {}) {
  const variables = {
    search: filters.search || undefined,
    version: (filters.version && filters.version.length > 0) ? filters.version : undefined,
    ubicacion: (filters.ubicacion && filters.ubicacion.length > 0) ? filters.ubicacion : undefined,
    unidades: (filters.unidades && filters.unidades.length > 0) ? filters.unidades : undefined,
    fechaInicio: filters.fechaInicio || undefined,
    fechaFin: filters.fechaFin || undefined,
    retrasoMayorA3Dias: filters.retrasoMayorA3Dias || undefined,
    sortBy: filters.sortBy || undefined,
    sortOrder: filters.sortOrder || undefined,
    pagination,
  };
  const { monitoreoImpresiones } = await gqlClient.request(GET_MONITOREO_IMPRESIONES, variables);
  return monitoreoImpresiones;
}

export const UPDATE_MONITOREO_LIMPIEZA = gql`
  mutation UpdateMonitoreoLimpieza($noserie: String!, $limpieza_logica: Int, $wifi: Int) {
    updateMonitoreoLimpieza(noserie: $noserie, limpieza_logica: $limpieza_logica, wifi: $wifi)
  }
`;
