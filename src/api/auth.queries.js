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
        unidad { id_unidad nombre no_ref clave }
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
      unidad { id_unidad nombre no_ref clave }
    }
  }
`;
