import { gql } from 'graphql-request';

export const GET_SOLICITUDES_PENDIENTES = gql`
  query {
    obtenerSolicitudesPendientes {
      id
      bien_id
      usuario_solicitante_id
      datos_nuevos
      estado
      fecha_solicitud
      comentarios
      bien {
        id_bien
        num_serie
        num_inv
        estatus_operativo
        clave_modelo
        id_segmento
        id_ubicacion
        id_usuario_resguardo
        clave_unidad_ref
        fecha_adquisicion
        modelo { descrip_disp }
        especificacionTI {
          cpu_info ram_gb almacenamiento_gb mac_address
          dir_ip puerto_red switch_red modelo_so
        }
        monitores {
          monitor {
            num_serie
            modelo {
              descrip_disp
              marca {
                marca
              }
            }
          }
        }
      }
      solicitante {
        id_usuario
        nombre_completo
        matricula
      }
    }
  }
`;

export const APROBAR_CAMBIO = gql`
  mutation AprobarCambio($solicitudId: Int!) {
    aprobarCambio(solicitudId: $solicitudId)
  }
`;

export const RECHAZAR_CAMBIO = gql`
  mutation RechazarCambio($solicitudId: Int!, $motivo: String) {
    rechazarCambio(solicitudId: $solicitudId, motivo: $motivo)
  }
`;
