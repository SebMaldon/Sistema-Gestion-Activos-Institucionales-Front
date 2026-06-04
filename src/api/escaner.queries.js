import { gql } from 'graphql-request';
import { BIEN_FIELDS } from './inventario.queries';

export const GET_BIEN_BY_TERMINO = gql`
  ${BIEN_FIELDS}
  query GetBienByTermino($termino: String!) {
    bienByTermino(termino: $termino) {
      ...BienFields
    }
  }
`;

// Alias para compatibilidad con el escáner USB/QR
export const GET_BIEN_BY_QR = GET_BIEN_BY_TERMINO;

export const UPDATE_BIEN = gql`
  mutation UpdateBien(
    $id_bien: ID!
    $id_categoria: Int
    $id_segmento: Int
    $num_serie: String
    $cantidad: Float
    $estatus_operativo: String
    $clave_unidad_ref: String
    $id_usuario_resguardo: Int
    $id_ubicacion: Int
    $fecha_adquisicion: Date
  ) {
    updateBien(
      id_bien: $id_bien
      id_categoria: $id_categoria
      id_segmento: $id_segmento
      num_serie: $num_serie
      cantidad: $cantidad
      estatus_operativo: $estatus_operativo
      clave_unidad_ref: $clave_unidad_ref
      id_usuario_resguardo: $id_usuario_resguardo
      id_ubicacion: $id_ubicacion
      fecha_adquisicion: $fecha_adquisicion
    ) {
      id_bien
      estatus_operativo
    }
  }
`;

export const UPSERT_ESPEC_TI = gql`
  mutation UpsertEspecificacionTI(
    $id_bien: ID!
    $cpu_info: String
    $ram_gb: Int
    $almacenamiento_gb: Int
    $mac_address: String
    $dir_ip: String
    $dir_mac: String
    $puerto_red: String
    $switch_red: String
    $modelo_so: String
  ) {
    upsertEspecificacionTI(
      id_bien: $id_bien
      cpu_info: $cpu_info
      ram_gb: $ram_gb
      almacenamiento_gb: $almacenamiento_gb
      mac_address: $mac_address
      dir_ip: $dir_ip
      dir_mac: $dir_mac
      puerto_red: $puerto_red
      switch_red: $switch_red
      modelo_so: $modelo_so
    ) {
      cpu_info
    }
  }
`;

export const DELETE_BIEN = gql`
  mutation DeleteBien($id_bien: ID!) {
    deleteBien(id_bien: $id_bien)
  }
`;

export const CREATE_NOTA_BIEN = gql`
  mutation CreateNotaBien($id_bien: ID!, $contenido_nota: String!) {
    createNotaBien(id_bien: $id_bien, contenido_nota: $contenido_nota) {
      id_nota
      contenido_nota
      fecha_creacion
      usuarioAutor {
        nombre_completo
      }
    }
  }
`;
