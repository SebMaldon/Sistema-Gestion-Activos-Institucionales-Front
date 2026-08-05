import { gql } from 'graphql-request';

export const GET_BITACORA = gql`
  query bitacora($first: Int, $after: String, $page: Int, $accion: [String], $tabla_afectada: [String], $id_usuario: [Int], $origen: String, $fechaDesde: DateTime, $fechaHasta: DateTime) {
    bitacora(pagination: { first: $first, after: $after, page: $page }, accion: $accion, tabla_afectada: $tabla_afectada, id_usuario: $id_usuario, origen: $origen, fechaDesde: $fechaDesde, fechaHasta: $fechaHasta) {
      pageInfo {
        hasNextPage
        endCursor
        totalCount
      }
      edges {
        node {
          id_bitacora
          id_usuario
          usuario {
            nombre_completo
            matricula
          }
          accion
          tabla_afectada
          registro_afectado
          detalles_movimiento
          fecha_movimiento
          origen
        }
      }
    }
  }
`;

export const PURGAR_BITACORA = gql`
  mutation PurgarBitacora($fechaDesde: DateTime!, $fechaHasta: DateTime!) {
    purgarBitacora(fechaDesde: $fechaDesde, fechaHasta: $fechaHasta) {
      registrosBorrados
      fechaDesde
      fechaHasta
    }
  }
`;

export const GET_BITACORA_RANGO_FECHAS = gql`
  query GetBitacoraRangoFechas {
    bitacoraRangoFechas {
      fechaMin
      fechaMax
    }
  }
`;

