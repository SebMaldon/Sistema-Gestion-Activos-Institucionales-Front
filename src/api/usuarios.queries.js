import { gql } from 'graphql-request';

// ─── QUERIES ─────────────────────────────────────────────────────────────────

export const GET_USUARIOS = gql`
  query GetUsuarios(
    $estatus: Boolean
    $id_unidad: Int
    $search: String
    $roles: [Int]
    $claves_unidades: [String]
    $pagination: PaginationInput
  ) {
    usuarios(estatus: $estatus, id_unidad: $id_unidad, search: $search, roles: $roles, claves_unidades: $claves_unidades, pagination: $pagination) {
      edges {
        node {
          id_usuario
          matricula
          nombre_completo
          tipo_usuario
          correo_electronico
          id_rol
          id_unidad
          clave_unidad
          estatus
          rol { id_rol nombre_rol }
          # segmento de red (FK: id_unidad → segmentos.id_segmento)
          segmento { id_segmento nombre no_ref clave }
          # unidad física (FK: clave_unidad → unidades.clave)
          unidadFisica { clave descripcion desc_corta }
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

// Catálogo de segmentos de red (para asignar id_unidad)
export const GET_CAT_SEGMENTOS = gql`
  query GetCatSegmentos {
    catSegmentos { id_segmento nombre no_ref clave }
  }
`;

// Catálogo de unidades físicas (para asignar clave_unidad)
export const GET_CAT_UNIDADES_FISICAS = gql`
  query GetCatUnidadesFisicas {
    catUnidades { clave descripcion desc_corta }
  }
`;

export const TOGGLE_ESTATUS_USUARIO = gql`
  mutation ToggleEstatusUsuario($id_usuario: ID!, $estatus: Boolean!) {
    updateUsuario(id_usuario: $id_usuario, estatus: $estatus) {
      id_usuario estatus
    }
  }
`;

export const HARD_DELETE_USUARIO = gql`
  mutation HardDeleteUsuario($id_usuario: ID!) {
    deleteUsuario(id_usuario: $id_usuario)
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
    $clave_unidad: String
  ) {
    createUsuario(
      matricula: $matricula
      nombre_completo: $nombre_completo
      tipo_usuario: $tipo_usuario
      correo_electronico: $correo_electronico
      password: $password
      id_rol: $id_rol
      id_unidad: $id_unidad
      clave_unidad: $clave_unidad
    ) {
      id_usuario matricula nombre_completo tipo_usuario correo_electronico
      id_rol id_unidad clave_unidad estatus
      rol { id_rol nombre_rol }
      segmento { id_segmento nombre no_ref clave }
      unidadFisica { clave descripcion desc_corta }
    }
  }
`;

export const UPDATE_USUARIO = gql`
  mutation UpdateUsuario(
    $id_usuario: ID!
    $matricula: String
    $nombre_completo: String
    $tipo_usuario: String
    $correo_electronico: String
    $id_rol: Int
    $id_unidad: Int
    $clave_unidad: String
    $estatus: Boolean
  ) {
    updateUsuario(
      id_usuario: $id_usuario
      matricula: $matricula
      nombre_completo: $nombre_completo
      tipo_usuario: $tipo_usuario
      correo_electronico: $correo_electronico
      id_rol: $id_rol
      id_unidad: $id_unidad
      clave_unidad: $clave_unidad
      estatus: $estatus
    ) {
      id_usuario matricula nombre_completo tipo_usuario correo_electronico
      id_rol id_unidad clave_unidad estatus
      rol { id_rol nombre_rol }
      segmento { id_segmento nombre no_ref clave }
      unidadFisica { clave descripcion desc_corta }
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
