import { gql } from 'graphql-request';

export const OBTENER_MIS_NOTIFICACIONES = gql`
  query ObtenerMisNotificaciones($mostrarOcultas: Boolean) {
    misNotificaciones(mostrarOcultas: $mostrarOcultas) {
      id_notificacion
      titulo
      mensaje
      tipo_audiencia
      id_audiencia
      fecha_creacion
      leida
      fecha_lectura
      oculta
    }
  }
`;

export const NOTIFICACIONES_NO_LEIDAS_QUERY = gql`
  query NotificacionesNoLeidas {
    notificacionesNoLeidas
  }
`;

export const MARCAR_LEIDA_MUTATION = gql`
  mutation MarcarLeida($idNotificacion: Int!) {
    marcarLeida(id_notificacion: $idNotificacion)
  }
`;

export const MARCAR_TODAS_LEIDAS_MUTATION = gql`
  mutation MarcarTodasLeidas {
    marcarTodasLeidas
  }
`;

export const OCULTAR_NOTIFICACION_MUTATION = gql`
  mutation OcultarNotificacion($idNotificacion: Int!) {
    ocultarNotificacion(id_notificacion: $idNotificacion)
  }
`;
