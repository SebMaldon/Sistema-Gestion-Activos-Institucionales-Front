import { gql } from 'graphql-request';

export const LOGIN_MUTATION = gql`
  mutation Login($matricula: String!, $password: String!) {
    login(matricula: $matricula, password: $password) {
      token
      expiresIn
      usuario {
        id_usuario
        matricula
        nombre_completo
        tipo_usuario
        correo_electronico
        id_rol
        id_unidad
        estatus
        rol { id_rol nombre_rol }
        unidad: segmento { id_unidad: id_segmento nombre no_ref clave }
      }
    }
  }
`;

export const ME_QUERY = gql`
  query Me {
    me {
      id_usuario
      matricula
      nombre_completo
      tipo_usuario
      id_rol
      id_unidad
      estatus
      rol { id_rol nombre_rol }
      unidad: segmento { id_unidad: id_segmento nombre no_ref clave }
    }
  }
`;

export const CHANGE_PASSWORD_MUTATION = gql`
  mutation ChangePassword($id_usuario: ID!, $currentPassword: String!, $newPassword: String!) {
    changePassword(id_usuario: $id_usuario, currentPassword: $currentPassword, newPassword: $newPassword)
  }
`;
