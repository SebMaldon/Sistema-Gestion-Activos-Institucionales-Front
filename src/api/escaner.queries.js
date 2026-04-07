import { gql } from 'graphql-request';

export const GET_BIEN_BY_QR = gql`
  query GetBienByQR($qr_hash: String!) {
    bienByQR(qr_hash: $qr_hash) {
      id_bien
      num_serie
      qr_hash
      estatus_operativo
      categoria {
        nombre_categoria
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
      especificacionTI {
        cpu_info
        ram_gb
      }
    }
  }
`;
