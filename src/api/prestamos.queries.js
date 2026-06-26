import { gql } from 'graphql-request';

export const GET_PRESTAMOS_POR_BIEN = gql`
  query GetPrestamosPorBien($id_bien: ID!) {
    prestamosPorBien(id_bien: $id_bien) {
      id_registro_prestamo
      id_bien
      id_usuario_registra_prestamo
      id_usuario_registra_entrega
      fecha_inicio_prestamo
      fecha_a_terminar_prestamo
      fecha_entrega
      descripcion_prestamo_inicio
      descripcion_prestamo_finalizacion
      usuarioRegistraPrestamo {
        id_usuario
        nombre_completo
        matricula
      }
      usuarioRegistraEntrega {
        id_usuario
        nombre_completo
        matricula
      }
    }
  }
`;

export const CREATE_PRESTAMO_MUTATION = gql`
  mutation CrearPrestamoBien(
    $id_bien: ID!
    $fecha_a_terminar_prestamo: DateTime
    $descripcion_prestamo_inicio: String
  ) {
    crearPrestamoBien(
      id_bien: $id_bien
      fecha_a_terminar_prestamo: $fecha_a_terminar_prestamo
      descripcion_prestamo_inicio: $descripcion_prestamo_inicio
    ) {
      id_registro_prestamo
      fecha_inicio_prestamo
    }
  }
`;

export const FINALIZAR_PRESTAMO_MUTATION = gql`
  mutation FinalizarPrestamoBien(
    $id_bien: ID!
    $estatus_operativo_nuevo: String!
    $fecha_entrega: DateTime
    $descripcion_prestamo_finalizacion: String
  ) {
    finalizarPrestamoBien(
      id_bien: $id_bien
      estatus_operativo_nuevo: $estatus_operativo_nuevo
      fecha_entrega: $fecha_entrega
      descripcion_prestamo_finalizacion: $descripcion_prestamo_finalizacion
    ) {
      id_registro_prestamo
      fecha_entrega
    }
  }
`;

export const ACTUALIZAR_PRESTAMO_MUTATION = gql`
  mutation ActualizarPrestamoBien(
    $id_registro_prestamo: Int!
    $fecha_a_terminar_prestamo: DateTime!
    $descripcion_prestamo_inicio: String!
  ) {
    actualizarPrestamoBien(
      id_registro_prestamo: $id_registro_prestamo
      fecha_a_terminar_prestamo: $fecha_a_terminar_prestamo
      descripcion_prestamo_inicio: $descripcion_prestamo_inicio
    ) {
      id_registro_prestamo
      fecha_a_terminar_prestamo
      descripcion_prestamo_inicio
    }
  }
`;
