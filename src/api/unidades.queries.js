import { gql } from 'graphql-request';

// ─── QUERIES — Segmentos (antes "Unidades" de red) ───────────────────────────

export const GET_SEGMENTOS_QUERY = gql`
  query GetSegmentos($search: String, $pagination: PaginationInput) {
    segmentos(search: $search, pagination: $pagination) {
      edges {
        node {
          id_segmento
          no_ref
          nombre
          ip
          clave
          bits
          ip_init
          estatus
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

export const GET_SEGMENTO_BY_ID_QUERY = gql`
  query GetSegmentoById($id_segmento: ID!) {
    segmento(id_segmento: $id_segmento) {
      id_segmento
      no_ref
      nombre
      ip
      clave
      bits
      ip_init
      estatus
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

export const CREATE_SEGMENTO_MUTATION = gql`
  mutation CreateSegmento(
    $no_ref: String!
    $nombre: String
    $ip: String!
    $clave: String
    $bits: Int
    $ip_init: Int
    $estatus: Int
    $vlan: Int
    $monitorear: Int
    $proveedor: String
    $fecha_migracion: DateTime
    $velocidad: String
    $tipo_enlace: Int
  ) {
    createSegmento(
      no_ref: $no_ref
      nombre: $nombre
      ip: $ip
      clave: $clave
      bits: $bits
      ip_init: $ip_init
      estatus: $estatus
      vlan: $vlan
      monitorear: $monitorear
      proveedor: $proveedor
      fecha_migracion: $fecha_migracion
      velocidad: $velocidad
      tipo_enlace: $tipo_enlace
    ) {
      id_segmento
      no_ref
      nombre
      ip
    }
  }
`;

export const UPDATE_SEGMENTO_MUTATION = gql`
  mutation UpdateSegmento(
    $id_segmento: Int!
    $no_ref: String
    $nombre: String
    $ip: String
    $clave: String
    $bits: Int
    $ip_init: Int
    $estatus: Int
    $vlan: Int
    $monitorear: Int
    $proveedor: String
    $fecha_migracion: DateTime
    $velocidad: String
    $tipo_enlace: Int
  ) {
    updateSegmento(
      id_segmento: $id_segmento
      no_ref: $no_ref
      nombre: $nombre
      ip: $ip
      clave: $clave
      bits: $bits
      ip_init: $ip_init
      estatus: $estatus
      vlan: $vlan
      monitorear: $monitorear
      proveedor: $proveedor
      fecha_migracion: $fecha_migracion
      velocidad: $velocidad
      tipo_enlace: $tipo_enlace
    ) {
      id_segmento
      no_ref
      nombre
      ip
    }
  }
`;

export const DELETE_SEGMENTO_MUTATION = gql`
  mutation DeleteSegmento($id_segmento: Int!) {
    deleteSegmento(id_segmento: $id_segmento)
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

// ─── Aliases para compatibilidad con código existente ────────────────────────
/** @deprecated Usar GET_SEGMENTOS_QUERY */
export const GET_UNIDADES_QUERY = GET_SEGMENTOS_QUERY;
/** @deprecated Usar CREATE_SEGMENTO_MUTATION */
export const CREATE_UNIDAD_MUTATION = CREATE_SEGMENTO_MUTATION;
/** @deprecated Usar UPDATE_SEGMENTO_MUTATION */
export const UPDATE_UNIDAD_MUTATION = UPDATE_SEGMENTO_MUTATION;
/** @deprecated Usar DELETE_SEGMENTO_MUTATION */
export const DELETE_UNIDAD_MUTATION = DELETE_SEGMENTO_MUTATION;
/** @deprecated Usar GET_SEGMENTO_BY_ID_QUERY */
export const GET_UNIDAD_BY_ID_QUERY = GET_SEGMENTO_BY_ID_QUERY;
