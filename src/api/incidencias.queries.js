import { gql } from 'graphql-request';

export const UPDATE_INCIDENCIA_MUTATION = gql`
  mutation UpdateIncidencia(
    $id_incidencia: ID!
    $id_tipo_incidencia: Int
    $descripcion_falla: String
    $prioridad: String
    $unidad: String
    $id_usuario_reporta: Int
    $id_usuario_asignado: Int
  ) {
    updateIncidencia(
      id_incidencia: $id_incidencia
      id_tipo_incidencia: $id_tipo_incidencia
      descripcion_falla: $descripcion_falla
      prioridad: $prioridad
      unidad: $unidad
      id_usuario_reporta: $id_usuario_reporta
      id_usuario_asignado: $id_usuario_asignado
    ) {
      id_incidencia
      id_tipo_incidencia
      descripcion_falla
      prioridad
      unidad
      estatus_reparacion
    }
  }
`;



// ─── QUERIES ─────────────────────────────────────────────────────────────────

export const GET_INCIDENCIAS_QUERY = gql`
  query GetIncidencias(
    $estatus_reparacion: String
    $id_tipo_incidencia: Int
    $prioridad: String
    $unidad: String
    $search: String
    $first: Int
  ) {
    incidencias(
      estatus_reparacion: $estatus_reparacion
      id_tipo_incidencia: $id_tipo_incidencia
      prioridad: $prioridad
      unidad: $unidad
      search: $search
      pagination: { first: $first }
    ) {
      edges {
        node {
          id_incidencia
          id_bien
          id_tipo_incidencia
          prioridad
          descripcion_falla
          estatus_reparacion
          fecha_reporte
          resolucion_textual
          fecha_resolucion
          unidad
          tipoIncidencia {
            id_tipo_incidencia
            nombre_tipo
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
          usuarioReporta {
            id_usuario
            nombre_completo
            matricula
          }
          usuarioAsignado {
            id_usuario
            nombre_completo
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

export const GET_BIEN_BY_SERIE_QUERY = gql`
  query GetBienByNumSerie($num_serie: String!) {
    bienByNumSerie(num_serie: $num_serie) {
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
    $id_usuario_reporta: Int!
    $id_tipo_incidencia: Int!
    $descripcion_falla: String!
    $prioridad: String
    $unidad: String
  ) {
    createIncidencia(
      id_bien: $id_bien
      id_usuario_reporta: $id_usuario_reporta
      id_tipo_incidencia: $id_tipo_incidencia
      descripcion_falla: $descripcion_falla
      prioridad: $prioridad
      unidad: $unidad
    ) {
      id_incidencia
      estatus_reparacion
      prioridad
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
    $id_usuario_asignado: Int
    $contenido_nota: String
  ) {
    pasarAEnProceso(
      id_incidencia: $id_incidencia
      id_usuario_asignado: $id_usuario_asignado
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

export const ASIGNAR_INCIDENCIA_MUTATION = gql`
  mutation AsignarIncidencia($id_incidencia: ID!, $id_usuario_asignado: Int!) {
    asignarIncidencia(
      id_incidencia: $id_incidencia
      id_usuario_asignado: $id_usuario_asignado
    ) {
      id_incidencia
      usuarioAsignado {
        nombre_completo
      }
    }
  }
`;

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

export const GET_ROTACIONES_POR_UNIDAD_QUERY = gql`
  query GetRotacionesPorUnidad($id_unidad: Int!) {
    rotaciones(estatus: true, id_unidad: $id_unidad) {
      id_rotacion
      id_usuario
      usuario {
        id_usuario
        nombre_completo
        matricula
      }
    }
  }
`;

export const GET_NOTAS_INCIDENCIA_QUERY = gql`
  query GetNotasIncidencia($id_incidencia: ID!) {
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

