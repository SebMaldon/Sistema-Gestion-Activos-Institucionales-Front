import { gql } from 'graphql-request';

export const CREATE_NOTIFICACION_MUTATION = gql`
  mutation CreateNotificacion(
    $titulo: String!
    $mensaje: String!
    $tipo_audiencia: String!
    $id_audiencia: String
  ) {
    createNotificacion(
      titulo: $titulo
      mensaje: $mensaje
      tipo_audiencia: $tipo_audiencia
      id_audiencia: $id_audiencia
    ) {
      id_notificacion
      titulo
      mensaje
      tipo_audiencia
      id_audiencia
      fecha_creacion
    }
  }
`;

export const TODAS_NOTIFICACIONES_QUERY = gql`
  query TodasNotificaciones($limit: Int, $offset: Int) {
    todasNotificaciones(limit: $limit, offset: $offset) {
      id_notificacion
      titulo
      mensaje
      tipo_audiencia
      id_audiencia
      fecha_creacion
    }
  }
`;

export const DELETE_NOTIFICACION_MUTATION = gql`
  mutation DeleteNotificacion($id_notificacion: Int!) {
    deleteNotificacion(id_notificacion: $id_notificacion)
  }
`;
