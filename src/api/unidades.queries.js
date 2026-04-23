import { gql } from 'graphql-request';

// ─── QUERIES ─────────────────────────────────────────────────────────────────

export const GET_UNIDADES_QUERY = gql`
  query GetUnidades($search: String, $pagination: PaginationInput) {
    unidades(search: $search, pagination: $pagination) {
      edges {
        node {
          id_unidad
          no_ref
          nombre
          ip
          encargado
          telefono
          clave
          tipo_unidad
          bits
          ip_init
          estatus
          regimen
          vlan
          monitorear
          proveedor
          fecha_migracion
          velocidad
          tipo_enlace
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

export const GET_UNIDAD_BY_ID_QUERY = gql`
  query GetUnidadById($id_unidad: Int!) {
    unidadById(id_unidad: $id_unidad) {
      id_unidad
      no_ref
      nombre
      ip
      encargado
      telefono
      clave
      tipo_unidad
      bits
      ip_init
      estatus
      regimen
      vlan
      monitorear
      proveedor
      fecha_migracion
      velocidad
      tipo_enlace
    }
  }
`;

// ─── MUTATIONS ───────────────────────────────────────────────────────────────

export const CREATE_UNIDAD_MUTATION = gql`
  mutation CreateUnidad(
    $no_ref: String!
    $nombre: String
    $ip: String!
    $encargado: String
    $telefono: String
    $clave: String
    $tipo_unidad: Int
    $bits: Int
    $ip_init: Int
    $estatus: Int
    $regimen: Int
    $vlan: Int
    $monitorear: Int
    $proveedor: String
    $fecha_migracion: DateTime
    $velocidad: String
    $tipo_enlace: Int
  ) {
    createUnidad(
      no_ref: $no_ref
      nombre: $nombre
      ip: $ip
      encargado: $encargado
      telefono: $telefono
      clave: $clave
      tipo_unidad: $tipo_unidad
      bits: $bits
      ip_init: $ip_init
      estatus: $estatus
      regimen: $regimen
      vlan: $vlan
      monitorear: $monitorear
      proveedor: $proveedor
      fecha_migracion: $fecha_migracion
      velocidad: $velocidad
      tipo_enlace: $tipo_enlace
    ) {
      id_unidad
      no_ref
      nombre
      ip
    }
  }
`;

export const UPDATE_UNIDAD_MUTATION = gql`
  mutation UpdateUnidad(
    $id_unidad: Int!
    $no_ref: String
    $nombre: String
    $ip: String
    $encargado: String
    $telefono: String
    $clave: String
    $tipo_unidad: Int
    $bits: Int
    $ip_init: Int
    $estatus: Int
    $regimen: Int
    $vlan: Int
    $monitorear: Int
    $proveedor: String
    $fecha_migracion: DateTime
    $velocidad: String
    $tipo_enlace: Int
  ) {
    updateUnidad(
      id_unidad: $id_unidad
      no_ref: $no_ref
      nombre: $nombre
      ip: $ip
      encargado: $encargado
      telefono: $telefono
      clave: $clave
      tipo_unidad: $tipo_unidad
      bits: $bits
      ip_init: $ip_init
      estatus: $estatus
      regimen: $regimen
      vlan: $vlan
      monitorear: $monitorear
      proveedor: $proveedor
      fecha_migracion: $fecha_migracion
      velocidad: $velocidad
      tipo_enlace: $tipo_enlace
    ) {
      id_unidad
      no_ref
      nombre
      ip
    }
  }
`;

export const DELETE_UNIDAD_MUTATION = gql`
  mutation DeleteUnidad($id_unidad: Int!) {
    deleteUnidad(id_unidad: $id_unidad)
  }
`;

export const GET_CAT_TIPO_UNIDADES = gql`
  query GetCatTipoUnidades {
    catTipoUnidades {
      id_tipo
      tipo_unidad
    }
  }
`;
