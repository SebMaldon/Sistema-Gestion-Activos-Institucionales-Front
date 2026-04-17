import { gql } from 'graphql-request';

export const UPDATE_INCIDENCIA_MUTATION = gql`
  mutation UpdateIncidencia(
    $id_incidencia: ID!
    $id_tipo_incidencia: Int
    $descripcion_falla: String
    $id_unidad: Int
    $alias: String
    $requerimiento: String
  ) {
    updateIncidencia(
      id_incidencia: $id_incidencia
      id_tipo_incidencia: $id_tipo_incidencia
      descripcion_falla: $descripcion_falla
      id_unidad: $id_unidad
      alias: $alias
      requerimiento: $requerimiento
    ) {
      id_incidencia
      id_tipo_incidencia
      descripcion_falla
      id_unidad
      alias
      requerimiento
      estatus_reparacion
    }
  }
`;



// ─── QUERIES ─────────────────────────────────────────────────────────────────

export const GET_INCIDENCIAS_QUERY = gql`
  query GetIncidencias(
    $estatus_reparacion: String
    $id_tipo_incidencia: Int
    $id_unidad: Int
    $search: String
    $first: Int
    $after: String
  ) {
    incidencias(
      estatus_reparacion: $estatus_reparacion
      id_tipo_incidencia: $id_tipo_incidencia
      id_unidad: $id_unidad
      search: $search
      pagination: { first: $first, after: $after }
    ) {
      edges {
        node {
          id_incidencia
          id_bien
          id_tipo_incidencia
          descripcion_falla
          estatus_reparacion
          fecha_reporte
          resolucion_textual
          fecha_resolucion
          alias
          requerimiento
          id_unidad
          tipoIncidencia {
            id_tipo_incidencia
            nombre_tipo
          }
          unidad {
            id_unidad
            nombre
          }
          bien {
            num_serie
            num_inv
            clave_presupuestal
            modelo {
              descrip_disp
            }
            categoria {
              nombre_categoria
            }
            unidad {
              id_unidad
              nombre
            }
          }
          usuarioGeneraReporte {
            id_usuario
            nombre_completo
            matricula
          }
          usuarioResuelve {
            id_usuario
            nombre_completo
          }
        }
      }
      pageInfo {
        totalCount
        hasNextPage
        endCursor
      }
    }
  }
`;

export const GET_TIPOS_INCIDENCIA_QUERY = gql`
  query GetTiposIncidencia {
    tiposIncidencia {
      id_tipo_incidencia
      nombre_tipo
    }
  }
`;

export const GET_USUARIOS_QUERY = gql`
  query GetUsuariosActivos {
    usuarios(estatus: true, pagination: { first: 200 }) {
      edges {
        node {
          id_usuario
          nombre_completo
          matricula
          id_rol
        }
      }
    }
  }
`;

export const GET_BIEN_BY_TERMINO_QUERY = gql`
  query GetBienByTermino($termino: String!) {
    bienByTermino(termino: $termino) {
      id_bien
      num_serie
      num_inv
      clave_presupuestal
      estatus_operativo
      modelo {
        clave_modelo
        descrip_disp
        marca {
          marca
        }
      }
      categoria {
        nombre_categoria
      }
      unidad {
        id_unidad
        nombre
        no_ref
      }
      inmueble {
        clave_inmueble
        nombre_ubicacion
      }
      usuarioResguardo {
        id_usuario
        nombre_completo
      }
    }
  }
`;

// ─── MUTATIONS ───────────────────────────────────────────────────────────────

export const CREATE_INCIDENCIA_MUTATION = gql`
  mutation CreateIncidencia(
    $id_bien: ID!
    $id_tipo_incidencia: Int!
    $descripcion_falla: String!
    $id_unidad: Int
    $alias: String
    $requerimiento: String
  ) {
    createIncidencia(
      id_bien: $id_bien
      id_tipo_incidencia: $id_tipo_incidencia
      descripcion_falla: $descripcion_falla
      id_unidad: $id_unidad
      alias: $alias
      requerimiento: $requerimiento
    ) {
      id_incidencia
      estatus_reparacion
    }
  }
`;

export const CREATE_TIPO_INCIDENCIA_MUTATION = gql`
  mutation CreateTipoIncidencia($nombre_tipo: String!) {
    createTipoIncidencia(nombre_tipo: $nombre_tipo) {
      id_tipo_incidencia
      nombre_tipo
    }
  }
`;

export const PASAR_A_EN_PROCESO_MUTATION = gql`
  mutation PasarAEnProceso(
    $id_incidencia: ID!
    $contenido_nota: String
  ) {
    pasarAEnProceso(
      id_incidencia: $id_incidencia
      contenido_nota: $contenido_nota
    ) {
      id_incidencia
      estatus_reparacion
    }
  }
`;

export const RESOLVER_INCIDENCIA_MUTATION = gql`
  mutation ResolverIncidencia(
    $id_incidencia: ID!
    $estatus_cierre: String!
    $resolucion_textual: String!
    $id_usuario_resuelve: Int
  ) {
    resolverIncidencia(
      id_incidencia: $id_incidencia
      estatus_cierre: $estatus_cierre
      resolucion_textual: $resolucion_textual
      id_usuario_resuelve: $id_usuario_resuelve
    ) {
      id_incidencia
      estatus_reparacion
      resolucion_textual
      fecha_resolucion
      usuarioResuelve {
        nombre_completo
      }
    }
  }
`;

export const AGREGAR_NOTA_MUTATION = gql`
  mutation AgregarNota($id_incidencia: ID!, $contenido_nota: String!) {
    agregarNotaSeguimiento(
      id_incidencia: $id_incidencia
      contenido_nota: $contenido_nota
    ) {
      id_nota
      contenido_nota
      fecha_creacion
    }
  }
`;

export const UPDATE_ESTATUS_MUTATION = gql`
  mutation UpdateEstatusIncidencia(
    $id_incidencia: ID!
    $estatus_reparacion: String!
  ) {
    updateIncidenciaEstatus(
      id_incidencia: $id_incidencia
      estatus_reparacion: $estatus_reparacion
    ) {
      id_incidencia
      estatus_reparacion
    }
  }
`;

// ASIGNAR_INCIDENCIA_MUTATION ha sido removida del backend

export const DELETE_INCIDENCIA_MUTATION = gql`
  mutation DeleteIncidencia($id_incidencia: ID!) {
    deleteIncidencia(id_incidencia: $id_incidencia)
  }
`;

export const GET_UNIDADES_QUERY = gql`
  query GetUnidades {
    unidades(estatus: 1) {
      id_unidad
      nombre
      no_ref
    }
  }
`;

// GET_ROTACIONES_POR_UNIDAD_QUERY ha sido removida del backend

export const GET_NOTAS_INCIDENCIA_QUERY = gql`
  query GetNotasIncidencia($id_incidencia: Int!) {
    notasIncidencia(id_incidencia: $id_incidencia) {
      id_nota
      contenido_nota
      fecha_creacion
      usuarioAutor {
        nombre_completo
      }
    }
  }
`;

