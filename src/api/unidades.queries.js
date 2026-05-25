import { gql } from 'graphql-request';

// ─── QUERIES — Unidades Físicas (tabla: unidades — datos físicos de la unidad) ───────

export const GET_UNIDADES_FISICAS_QUERY = gql`
  query GetUnidades(
    $search: String
    $clave_zona: [String!]
    $tipo_unidad: [Int!]
    $regimen: [Int!]
    $nivel: [Int!]
    $ciudad: [String!]
    $municipio: [String!]
    $segmento_velocidad: [String!]
    $segmento_proveedor: [String!]
    $segmento_monitorear: Int
    $pagination: PaginationInput
  ) {
    unidades(
      search: $search
      clave_zona: $clave_zona
      tipo_unidad: $tipo_unidad
      regimen: $regimen
      nivel: $nivel
      ciudad: $ciudad
      municipio: $municipio
      segmento_velocidad: $segmento_velocidad
      segmento_proveedor: $segmento_proveedor
      segmento_monitorear: $segmento_monitorear
      pagination: $pagination
    ) {
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
          zona_reporte
          nivel
          no_inmueble
          regimen
          tipo_unidad
          tipoUnidadInfo {
            tipo_unidad
          }
          unidadesACargo {
            id_rol_empleado
            id_usuario
            usuario {
              id_usuario
              nombre_completo
            }
          }
          contactos {
            id_contacto
            contacto
            tipo_contacto
          }
          segmentos {
            id_segmento
            no_ref
            nombre
            ip
            vlan
            velocidad
            bits
            proveedor
            tipo_enlace
            fecha_migracion
            estatus
            monitorear
            clave
            ip_init
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

export const GET_DISTINCT_FILTROS_QUERY = gql`
  query GetDistinctFiltros {
    catDistinctFiltros {
      zonas
      ciudades
      municipios
      regimenes
      niveles
      velocidades
      proveedores
    }
  }
`;

export const GET_UNIDAD_BY_CLAVE_QUERY = gql`
  query GetUnidadByClave($clave: ID!) {
    unidad(clave: $clave) {
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
      zona_reporte
      nivel
      no_inmueble
      regimen
      tipo_unidad
      unidadesACargo {
        id_rol_empleado
        id_usuario
        usuario {
          id_usuario
          nombre_completo
        }
      }
      contactos {
        id_contacto
        contacto
        tipo_contacto
      }
      segmentos {
        id_segmento
        no_ref
        nombre
        ip
        vlan
        velocidad
        bits
        proveedor
        tipo_enlace
        fecha_migracion
        estatus
        monitorear
        clave
        ip_init
      }
    }
  }
`;

// ─── MUTATIONS ───────────────────────────────────────────────────────────────

export const CREATE_UNIDAD_MUTATION = gql`
  mutation CreateUnidad(
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
    $zona_reporte: String
    $nivel: Int
    $no_inmueble: Int
    $regimen: Int
    $tipo_unidad: Int
    $unidadesACargo: [UnidadACargoInput!]
    $contactos: [ContactoInput!]
    $segmentos: [SegmentoInput!]
  ) {
    createUnidad(
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
      zona_reporte: $zona_reporte
      nivel: $nivel
      no_inmueble: $no_inmueble
      regimen: $regimen
      tipo_unidad: $tipo_unidad
      unidadesACargo: $unidadesACargo
      contactos: $contactos
      segmentos: $segmentos
    ) {
      clave
      descripcion
    }
  }
`;

export const UPDATE_UNIDAD_MUTATION = gql`
  mutation UpdateUnidad(
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
    $zona_reporte: String
    $nivel: Int
    $no_inmueble: Int
    $regimen: Int
    $tipo_unidad: Int
    $unidadesACargo: [UnidadACargoInput!]
    $contactos: [ContactoInput!]
    $segmentos: [SegmentoInput!]
  ) {
    updateUnidad(
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
      zona_reporte: $zona_reporte
      nivel: $nivel
      no_inmueble: $no_inmueble
      regimen: $regimen
      tipo_unidad: $tipo_unidad
      unidadesACargo: $unidadesACargo
      contactos: $contactos
      segmentos: $segmentos
    ) {
      clave
      descripcion
    }
  }
`;

export const DELETE_UNIDAD_MUTATION = gql`
  mutation DeleteUnidad($clave: ID!) {
    deleteUnidad(clave: $clave)
  }
`;

export const GET_CAT_UNIDADES_QUERY = gql`
  query GetCatUnidades {
    catUnidades {
      clave
      descripcion
      desc_corta
    }
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
