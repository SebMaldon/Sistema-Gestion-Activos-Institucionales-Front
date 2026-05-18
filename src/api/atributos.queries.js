import { gql } from 'graphql-request';

// ─── Queries ─────────────────────────────────────────────────────────────────

export const GET_CAT_ATRIBUTOS = gql`
  query GetCatAtributos($soloActivos: Boolean) {
    catAtributos(soloActivos: $soloActivos) {
      id_atributo
      nombre_atributo
      tipo_valor
      unidad_medida
      descripcion
      activo
    }
  }
`;

export const GET_ATRIBUTOS_POR_TIPO_DISPOSITIVO = gql`
  query GetAtributosPorTipoDispositivo($tipo_disp: Int!) {
    atributosPorTipoDispositivo(tipo_disp: $tipo_disp) {
      tipo_disp
      id_atributo
      es_requerido
      atributo {
        id_atributo
        nombre_atributo
        tipo_valor
        unidad_medida
        descripcion
      }
    }
  }
`;

export const GET_BIEN_ATRIBUTOS = gql`
  query GetBienAtributos($id_bien: ID!) {
    bienAtributos(id_bien: $id_bien) {
      id_bien_atributo
      id_bien
      id_atributo
      valor
      atributo {
        id_atributo
        nombre_atributo
        tipo_valor
        unidad_medida
        descripcion
      }
    }
  }
`;

// ─── Mutations — Catálogo de Atributos ────────────────────────────────────────

export const CREATE_ATRIBUTO = gql`
  mutation CreateAtributo(
    $nombre_atributo: String!
    $tipo_valor: String
    $unidad_medida: String
    $descripcion: String
  ) {
    createAtributo(
      nombre_atributo: $nombre_atributo
      tipo_valor: $tipo_valor
      unidad_medida: $unidad_medida
      descripcion: $descripcion
    ) {
      id_atributo
      nombre_atributo
      tipo_valor
      unidad_medida
      descripcion
      activo
    }
  }
`;

export const UPDATE_ATRIBUTO = gql`
  mutation UpdateAtributo(
    $id_atributo: ID!
    $nombre_atributo: String
    $tipo_valor: String
    $unidad_medida: String
    $descripcion: String
    $activo: Boolean
  ) {
    updateAtributo(
      id_atributo: $id_atributo
      nombre_atributo: $nombre_atributo
      tipo_valor: $tipo_valor
      unidad_medida: $unidad_medida
      descripcion: $descripcion
      activo: $activo
    ) {
      id_atributo
      nombre_atributo
      tipo_valor
      unidad_medida
      descripcion
      activo
    }
  }
`;

export const DELETE_ATRIBUTO = gql`
  mutation DeleteAtributo($id_atributo: ID!) {
    deleteAtributo(id_atributo: $id_atributo)
  }
`;

// ─── Mutations — Atributos por Tipo Dispositivo ───────────────────────────────

export const SET_ATRIBUTO_TIPO_DISPOSITIVO = gql`
  mutation SetAtributoTipoDispositivo($tipo_disp: Int!, $id_atributo: Int!, $es_requerido: Boolean) {
    setAtributoTipoDispositivo(tipo_disp: $tipo_disp, id_atributo: $id_atributo, es_requerido: $es_requerido) {
      tipo_disp
      id_atributo
      es_requerido
    }
  }
`;

export const REMOVE_ATRIBUTO_TIPO_DISPOSITIVO = gql`
  mutation RemoveAtributoTipoDispositivo($tipo_disp: Int!, $id_atributo: Int!) {
    removeAtributoTipoDispositivo(tipo_disp: $tipo_disp, id_atributo: $id_atributo)
  }
`;

// ─── Mutations — Valores por Bien ─────────────────────────────────────────────

export const SET_BIEN_ATRIBUTO = gql`
  mutation SetBienAtributo($id_bien: ID!, $id_atributo: Int!, $valor: String!) {
    setBienAtributo(id_bien: $id_bien, id_atributo: $id_atributo, valor: $valor) {
      id_bien_atributo
      id_bien
      id_atributo
      valor
      atributo {
        nombre_atributo
        tipo_valor
        unidad_medida
      }
    }
  }
`;

export const DELETE_BIEN_ATRIBUTO = gql`
  mutation DeleteBienAtributo($id_bien_atributo: ID!) {
    deleteBienAtributo(id_bien_atributo: $id_bien_atributo)
  }
`;

export const UPSERT_BIEN_ATRIBUTOS = gql`
  mutation UpsertBienAtributos($id_bien: ID!, $atributos: [AtributoInput!]!) {
    upsertBienAtributos(id_bien: $id_bien, atributos: $atributos) {
      id_bien_atributo
      id_atributo
      valor
      atributo {
        nombre_atributo
        tipo_valor
        unidad_medida
      }
    }
  }
`;
