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
          dir_ip dir_mac puerto_red switch_red modelo_so
          last_scan windows_serial nombre_host
        }
        cuentasPC {
          cuenta_windows
          correo
          tipo_user
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
        clave_unidad
        unidadFisica {
          descripcion
        }
      }
    }
  }
`;

export const APROBAR_CAMBIO = gql`
  mutation AprobarCambio($solicitudId: Int!, $camposAprobados: [String!]) {
    aprobarCambio(solicitudId: $solicitudId, camposAprobados: $camposAprobados)
  }
`;

export const RECHAZAR_CAMBIO = gql`
  mutation RechazarCambio($solicitudId: Int!, $motivo: String) {
    rechazarCambio(solicitudId: $solicitudId, motivo: $motivo)
  }
`;

export const SOLICITAR_CAMBIO_UNIDAD = gql`
  mutation SolicitarCambioUnidad($clave_unidad_nueva: String!) {
    solicitarCambioUnidad(clave_unidad_nueva: $clave_unidad_nueva) {
      id
      estado
      datos_nuevos
    }
  }
`;

export const GET_MI_SOLICITUD_CAMBIO_UNIDAD = gql`
  query GetMiSolicitudCambioUnidad {
    miSolicitudCambioUnidad {
      id
      estado
      datos_nuevos
      fecha_solicitud
    }
  }
`;
