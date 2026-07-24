import { gql } from 'graphql-request';

// ─── QUERIES ──────────────────────────────────────────────────────────────────

/**
 * Obtiene el folio actual (último emitido) y el siguiente a emitir.
 */
export const GET_FOLIO_SALIDAS = gql`
  query GetFolioSalidas {
    folioSalidas {
      folio_actual
      siguiente
    }
  }
`;

/**
 * Busca un usuario por matrícula exacta — para autocompletado en el formulario de salidas.
 */
export const GET_USUARIO_POR_MATRICULA = gql`
  query GetUsuarioPorMatricula($matricula: String!) {
    usuarioPorMatricula(matricula: $matricula) {
      id_usuario
      matricula
      nombre_completo
      correo_electronico
      unidadFisica {
        descripcion
        desc_corta
      }
    }
  }
`;

// ─── MUTATIONS ────────────────────────────────────────────────────────────────

/**
 * Confirma e incrementa el folio de forma atómica.
 * Devuelve el folio que quedó registrado (folio_actual) y el próximo (siguiente).
 */
export const CONFIRMAR_FOLIO = gql`
  mutation ConfirmarFolio {
    confirmarFolio {
      folio_actual
      siguiente
    }
  }
`;

/**
 * Solo Maestro: inserta manualmente un folio en la tabla Folio_Salidas.
 * El próximo folio emitido será mayor al valor insertado.
 */
export const SET_FOLIO_MANUAL = gql`
  mutation SetFolioManual($folio: String!) {
    setFolioManual(folio: $folio) {
      folio_actual
      siguiente
    }
  }
`;

export const GET_REGISTRO_SALIDAS = gql`
  query GetRegistroSalidas($filter: RegistroSalidasFilterInput, $pagination: PaginationInput) {
    registroSalidas(filter: $filter, pagination: $pagination) {
      edges {
        node {
          id_salida
          folio
          fecha_salida
          id_usuario_solicitante
          matricula
          solicitante
          adscripcion
          empresa
          identificacion
          telefono
          responsable
          motivo
          sujeto_devolucion
          fecha_devolucion
          origen_bienes
          observaciones
          usuarioRegistra {
            nombre_completo
          }
          bienes {
            id_salida_bien
            id_bien
            cantidad_o_id
            naturaleza
            descripcion
            bienRef {
              num_serie
              num_inv
              modelo {
                descrip_disp
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        totalCount
      }
    }
  }
`;

export const GET_REGISTRO_SALIDA = gql`
  query GetRegistroSalida($id_salida: Int!) {
    registroSalida(id_salida: $id_salida) {
      id_salida
      folio
      fecha_salida
      id_usuario_solicitante
      matricula
      solicitante
      adscripcion
      empresa
      identificacion
      telefono
      motivo
      origen_bienes
      responsable
      sujeto_devolucion
      fecha_devolucion
      observaciones
      bienes {
        id_salida_bien
        id_bien
        cantidad_o_id
        naturaleza
        descripcion
        bienRef {
          num_serie
          num_inv
          modelo {
            descrip_disp
          }
        }
      }
    }
  }
`;

export const REGISTRAR_SALIDA = gql`
  mutation RegistrarSalida($input: RegistroSalidaInput!) {
    registrarSalida(input: $input) {
      id_salida
      folio
    }
  }
`;

export const ACTUALIZAR_SALIDA = gql`
  mutation ActualizarSalida($id_salida: Int!, $input: RegistroSalidaInput!) {
    actualizarSalida(id_salida: $id_salida, input: $input) {
      id_salida
      folio
    }
  }
`;

export const ELIMINAR_SALIDA = gql`
  mutation EliminarSalida($id_salida: Int!) {
    eliminarSalida(id_salida: $id_salida)
  }
`;

export const GET_SALIDAS_ANTIGUAS = gql`
  query GetSalidasAntiguas($filter: SalidasAntiguoFilterInput, $pagination: PaginationInput) {
    salidasAntiguas(filter: $filter, pagination: $pagination) {
      edges {
        node {
          id
          responsable
          m_responsable
          p_responsable
          solicitante
          m_solicitante
          p_solicitante
          fecha
          identificacion
          telefono
          devolucion
          para_su
          estado_fisico
          fecha_devolucion
          procedencia
          adscripcion
          unidad_bien
          area
          articulos {
            id
            id_articulo
            naturaleza
            descripcion
            cantidad
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        totalCount
      }
    }
  }
`;

