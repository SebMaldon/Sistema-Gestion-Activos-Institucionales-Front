import { gql } from 'graphql-request';

// ─── QUERIES ─────────────────────────────────────────────────────────────────

export const GET_USUARIOS = gql`
  query GetUsuarios(
    $estatus: Boolean
    $id_unidad: Int
    $search: String
    $pagination: PaginationInput
  ) {
    usuarios(estatus: $estatus, id_unidad: $id_unidad, search: $search, pagination: $pagination) {
      edges {
        node {
          id_usuario
          matricula
          nombre_completo
          tipo_usuario
          correo_electronico
          id_rol
          id_unidad
          estatus
          rol { id_rol nombre_rol }
          unidad { id_unidad nombre no_ref }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
        totalCount
      }
    }
  }
`;

export const GET_ROLES = gql`
  query GetRoles {
    roles { id_rol nombre_rol }
  }
`;

export const GET_UNIDADES = gql`
  query GetUnidades {
    unidades { id_unidad nombre no_ref clave }
  }
`;

// ─── MUTATIONS ───────────────────────────────────────────────────────────────

export const CREATE_USUARIO = gql`
  mutation CreateUsuario(
    $matricula: String!
    $nombre_completo: String!
    $tipo_usuario: String
    $correo_electronico: String
    $password: String
    $id_rol: Int
    $id_unidad: Int
  ) {
    createUsuario(
      matricula: $matricula
      nombre_completo: $nombre_completo
      tipo_usuario: $tipo_usuario
      correo_electronico: $correo_electronico
      password: $password
      id_rol: $id_rol
      id_unidad: $id_unidad
    ) {
      id_usuario matricula nombre_completo tipo_usuario correo_electronico
      id_rol id_unidad estatus
      rol { id_rol nombre_rol }
      unidad { id_unidad nombre no_ref }
    }
  }
`;

export const UPDATE_USUARIO = gql`
  mutation UpdateUsuario(
    $id_usuario: ID!
    $nombre_completo: String
    $tipo_usuario: String
    $correo_electronico: String
    $id_rol: Int
    $id_unidad: Int
    $estatus: Boolean
  ) {
    updateUsuario(
      id_usuario: $id_usuario
      nombre_completo: $nombre_completo
      tipo_usuario: $tipo_usuario
      correo_electronico: $correo_electronico
      id_rol: $id_rol
      id_unidad: $id_unidad
      estatus: $estatus
    ) {
      id_usuario matricula nombre_completo tipo_usuario correo_electronico
      id_rol id_unidad estatus
      rol { id_rol nombre_rol }
      unidad { id_unidad nombre no_ref }
    }
  }
`;

export const DELETE_USUARIO = gql`
  mutation DeleteUsuario($id_usuario: ID!) {
    deleteUsuario(id_usuario: $id_usuario)
  }
`;

export const RESET_PASSWORD_ADMIN = gql`
  mutation ResetPasswordAdmin($id_usuario_target: ID!, $adminPassword: String!) {
    resetPasswordAdmin(id_usuario_target: $id_usuario_target, adminPassword: $adminPassword)
  }
`;
