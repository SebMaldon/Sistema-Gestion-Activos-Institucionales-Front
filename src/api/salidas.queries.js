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
