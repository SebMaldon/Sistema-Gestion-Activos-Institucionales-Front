import { gql } from 'graphql-request';

export const GET_BITACORA = gql`
  query bitacora($first: Int, $after: String, $accion: String, $tabla_afectada: String, $id_usuario: Int) {
    bitacora(pagination: { first: $first, after: $after }, accion: $accion, tabla_afectada: $tabla_afectada, id_usuario: $id_usuario) {
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
