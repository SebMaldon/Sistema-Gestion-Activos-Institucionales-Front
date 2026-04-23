import { gql } from 'graphql-request';

// ─── QUERIES ─────────────────────────────────────────────────────────────────

export const GET_INMUEBLES_QUERY = gql`
  query GetInmuebles($search: String, $pagination: PaginationInput) {
    inmuebles(search: $search, pagination: $pagination) {
      edges {
        node {
          clave
          descripcion
          desc_corta
          encargado
          direccion
          calle
          numero
          colonia
          ciudad
          municipio
          cp
          ppal
          clave_zona
          clave_a
          telefono
          zona_reporte
          nivel
          no_inmueble
          regimen
          tipo_unidad
          tipoUnidadInfo {
            tipo_unidad
          }
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

export const GET_INMUEBLE_BY_ID_QUERY = gql`
  query GetInmuebleByClave($clave: ID!) {
    inmueble(clave: $clave) {
      clave
      descripcion
      desc_corta
      encargado
      direccion
      calle
      numero
      colonia
      ciudad
      municipio
      cp
      ppal
      clave_zona
      clave_a
      telefono
      zona_reporte
      nivel
      no_inmueble
      regimen
      tipo_unidad
    }
  }
`;

// ─── MUTATIONS ───────────────────────────────────────────────────────────────

export const CREATE_INMUEBLE_MUTATION = gql`
  mutation CreateInmueble(
    $clave: ID!
    $descripcion: String
    $desc_corta: String
    $encargado: String
    $direccion: String
    $calle: String
    $numero: String
    $colonia: String
    $ciudad: String
    $municipio: String
    $cp: String
    $ppal: String
    $clave_zona: String!
    $clave_a: Int
    $telefono: String
    $zona_reporte: String
    $nivel: Int
    $no_inmueble: Int
    $regimen: Int
    $tipo_unidad: Int
  ) {
    createInmueble(
      clave: $clave
      descripcion: $descripcion
      desc_corta: $desc_corta
      encargado: $encargado
      direccion: $direccion
      calle: $calle
      numero: $numero
      colonia: $colonia
      ciudad: $ciudad
      municipio: $municipio
      cp: $cp
      ppal: $ppal
      clave_zona: $clave_zona
      clave_a: $clave_a
      telefono: $telefono
      zona_reporte: $zona_reporte
      nivel: $nivel
      no_inmueble: $no_inmueble
      regimen: $regimen
      tipo_unidad: $tipo_unidad
    ) {
      clave
      descripcion
    }
  }
`;

export const UPDATE_INMUEBLE_MUTATION = gql`
  mutation UpdateInmueble(
    $clave: ID!
    $descripcion: String
    $desc_corta: String
    $encargado: String
    $direccion: String
    $calle: String
    $numero: String
    $colonia: String
    $ciudad: String
    $municipio: String
    $cp: String
    $ppal: String
    $clave_zona: String
    $clave_a: Int
    $telefono: String
    $zona_reporte: String
    $nivel: Int
    $no_inmueble: Int
    $regimen: Int
    $tipo_unidad: Int
  ) {
    updateInmueble(
      clave: $clave
      descripcion: $descripcion
      desc_corta: $desc_corta
      encargado: $encargado
      direccion: $direccion
      calle: $calle
      numero: $numero
      colonia: $colonia
      ciudad: $ciudad
      municipio: $municipio
      cp: $cp
      ppal: $ppal
      clave_zona: $clave_zona
      clave_a: $clave_a
      telefono: $telefono
      zona_reporte: $zona_reporte
      nivel: $nivel
      no_inmueble: $no_inmueble
      regimen: $regimen
      tipo_unidad: $tipo_unidad
    ) {
      clave
      descripcion
    }
  }
`;

export const DELETE_INMUEBLE_MUTATION = gql`
  mutation DeleteInmueble($clave: ID!) {
    deleteInmueble(clave: $clave)
  }
`;
