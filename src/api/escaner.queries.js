import { gql } from 'graphql-request';

export const GET_BIEN_BY_QR = gql`
  query GetBienByQR($qr_hash: String!) {
    bienByQR(qr_hash: $qr_hash) {
      id_bien
      num_serie
      qr_hash
      estatus_operativo
      cantidad
      id_categoria
      id_unidad
      id_usuario_resguardo
      clave_inmueble
      categoria {
        nombre_categoria
      }
      modelo {
        descrip_disp
      }
      unidad {
        nombre
      }
      ubicacion {
        id_ubicacion
        nombre_ubicacion
      }
      inmueble {
        nombre_ubicacion
      }
      usuarioResguardo {
        id_usuario
        nombre_completo
        matricula
      }
      fecha_actualizacion
      fecha_adquisicion
      especificacionTI {
        nom_pc
        cpu_info
        ram_gb
        almacenamiento_gb
        mac_address
        dir_ip
        dir_mac
        puerto_red
        switch_red
        modelo_so
      }
    }
  }
`;

export const UPDATE_BIEN = gql`
  mutation UpdateBien(
    $id_bien: ID!
    $id_categoria: Int
    $id_unidad: Int
    $num_serie: String
    $cantidad: Float
    $estatus_operativo: String
    $clave_inmueble: String
    $id_usuario_resguardo: Int
    $id_ubicacion: Int
    $fecha_adquisicion: Date
  ) {
    updateBien(
      id_bien: $id_bien
      id_categoria: $id_categoria
      id_unidad: $id_unidad
      num_serie: $num_serie
      cantidad: $cantidad
      estatus_operativo: $estatus_operativo
      clave_inmueble: $clave_inmueble
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
    $nom_pc: String
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
      nom_pc: $nom_pc
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
      nom_pc
      cpu_info
    }
  }
`;

export const DELETE_BIEN = gql`
  mutation DeleteBien($id: ID!) {
    deleteBien(id: $id)
  }
`;

export const CREATE_NOTA_BIEN = gql`
  mutation CreateNotaBien($id_bien: ID!, $contenido_nota: String!) {
    createNotaBien(id_bien: $id_bien, contenido_nota: $contenido_nota) {
      id_nota
    }
  }
`;
