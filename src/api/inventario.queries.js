import { gql } from 'graphql-request';

export const GET_BIENES_QUERY = gql`
  query GetBienes {
    bienes {
      edges {
        node {
          id_bien
          num_serie
          qr_hash
          cantidad
          estatus_operativo
          categoria {
            nombre_categoria
            es_capitalizable
          }
          modelo {
            descrip_disp
          }
          unidad {
            nombre
          }
          inmueble {
            nombre_ubicacion
          }
          usuarioResguardo {
            nombre_completo
          }
        }
      }
    }
  }
`;
