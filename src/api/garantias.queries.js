import { gql } from 'graphql-request';

// ─── Consultas ──────────────────────────────────────────────

export const GET_GARANTIAS = gql`
  query GetGarantias($id_bien: ID, $estado_garantia: String) {
    garantias(id_bien: $id_bien, estado_garantia: $estado_garantia) {
      id_garantia
      id_bien
      fecha_inicio
      fecha_fin
      id_proveedor
      estado_garantia
      proveedorObj {
        id_proveedor
        nombre_proveedor
      }
      bien {
        num_serie
        num_inv
        clave_modelo
        unidad {
          clave
          descripcion
          desc_corta
        }
        modelo {
          descrip_disp
          marca {
            marca
          }
          tipoDispositivo {
            nombre_tipo
          }
        }
      }
      reportes {
        id_reporte_garantia
        estatus
        fecha_reporte
        fecha_resolucion
        descripcion_falla
        resolucion
        numero_reporte
        tipo_dispositivo
        tipoDispositivoObj {
          tipo_disp
          nombre_tipo
        }
        usuario_reporta
        serie_pieza_nueva
        fecha_atencion
        usuarioRegistra {
          nombre_completo
          matricula
        }
        usuarioReportaObj {
          id_usuario
          matricula
          nombre_completo
        }
      }
    }
  }
`;

export const GET_PROVEEDORES = gql`
  query GetProveedores {
    proveedores {
      id_proveedor
      nombre_proveedor
      contactos {
        id_contacto
        contacto
        tipo_contacto
      }
    }
  }
`;

export const GET_BIEN_BY_SERIE = gql`
  query GetBienBySerie($num_serie: String!) {
    bienByNumSerie(num_serie: $num_serie) {
      id_bien
      num_serie
      num_inv
      clave_modelo
      modelo {
        descrip_disp
        marca {
          marca
        }
      }
    }
  }
`;

export const GET_BIEN_BY_INV = gql`
  query GetBienByInv($num_inv: String!) {
    bienByNumInv(num_inv: $num_inv) {
      id_bien
      num_serie
      num_inv
      clave_modelo
      modelo {
        descrip_disp
        marca {
          marca
        }
      }
    }
  }
`;

export const GET_BIEN_BY_TERMINO = gql`
  query GetBienByTermino($termino: String!) {
    bienByTermino(termino: $termino) {
      id_bien
      num_serie
      num_inv
      clave_modelo
      modelo {
        descrip_disp
        marca {
          marca
        }
        tipoDispositivo {
          nombre_tipo
        }
      }
      especificacionTI {
        dir_ip
      }
      garantias {
        id_garantia
        estado_garantia
        fecha_inicio
        fecha_fin
        proveedorObj {
          id_proveedor
        }
      }
    }
  }
`;

// ─── Mutaciones ──────────────────────────────────────────────

export const CREATE_GARANTIA = gql`
  mutation CreateGarantia(
    $id_bien: ID!
    $fecha_inicio: Date
    $fecha_fin: Date!
    $id_proveedor: Int
    $estado_garantia: String
  ) {
    createGarantia(
      id_bien: $id_bien
      fecha_inicio: $fecha_inicio
      fecha_fin: $fecha_fin
      id_proveedor: $id_proveedor
      estado_garantia: $estado_garantia
    ) {
      id_garantia
      estado_garantia
    }
  }
`;

export const UPDATE_GARANTIA = gql`
  mutation UpdateGarantia(
    $id_garantia: ID!
    $fecha_inicio: Date
    $fecha_fin: Date
    $id_proveedor: Int
    $estado_garantia: String
  ) {
    updateGarantia(
      id_garantia: $id_garantia
      fecha_inicio: $fecha_inicio
      fecha_fin: $fecha_fin
      id_proveedor: $id_proveedor
      estado_garantia: $estado_garantia
    ) {
      id_garantia
      estado_garantia
    }
  }
`;

export const DELETE_GARANTIA = gql`
  mutation DeleteGarantia($id_garantia: ID!) {
    deleteGarantia(id_garantia: $id_garantia)
  }
`;

export const CREATE_PROVEEDOR = gql`
  mutation CreateProveedor($nombre_proveedor: String!, $contactos: [ContactoInput!]) {
    createProveedor(nombre_proveedor: $nombre_proveedor, contactos: $contactos) {
      id_proveedor
      nombre_proveedor
      contactos {
        id_contacto
        contacto
        tipo_contacto
      }
    }
  }
`;

export const UPDATE_PROVEEDOR = gql`
  mutation UpdateProveedor($id_proveedor: ID!, $nombre_proveedor: String, $contactos: [ContactoInput!]) {
    updateProveedor(id_proveedor: $id_proveedor, nombre_proveedor: $nombre_proveedor, contactos: $contactos) {
      id_proveedor
      nombre_proveedor
      contactos {
        id_contacto
        contacto
        tipo_contacto
      }
    }
  }
`;

export const DELETE_PROVEEDOR = gql`
  mutation DeleteProveedor($id_proveedor: ID!) {
    deleteProveedor(id_proveedor: $id_proveedor)
  }
`;

// ─── Reportes de Garantía ────────────────────────────────────

export const GET_REPORTES_GARANTIA = gql`
  query GetReportesPorGarantia($id_garantia: ID!) {
    reportesPorGarantia(id_garantia: $id_garantia) {
      id_reporte_garantia
      id_garantia
      id_bien
      num_serie
      estatus
      descripcion_falla
      resolucion
      fecha_reporte
      fecha_resolucion
      id_usuario_registra
      numero_reporte
      tipo_dispositivo
      tipoDispositivoObj {
        tipo_disp
        nombre_tipo
      }
      usuario_reporta
      serie_pieza_nueva
      fecha_atencion
      usuarioRegistra {
        id_usuario
        matricula
        nombre_completo
      }
      usuarioReportaObj {
        id_usuario
        matricula
        nombre_completo
      }
    }
  }
`;

export const CREATE_REPORTE_GARANTIA = gql`
  mutation CreateReporteGarantia(
    $id_garantia: ID!
    $id_bien: ID!
    $num_serie: String
    $estatus: String
    $descripcion_falla: String!
    $resolucion: String
    $numero_reporte: String
    $tipo_dispositivo: Int
    $usuario_reporta: Int
    $serie_pieza_nueva: String
    $fecha_atencion: DateTime
    $fecha_resolucion: DateTime
  ) {
    createReporteGarantia(
      id_garantia: $id_garantia
      id_bien: $id_bien
      num_serie: $num_serie
      estatus: $estatus
      descripcion_falla: $descripcion_falla
      resolucion: $resolucion
      numero_reporte: $numero_reporte
      tipo_dispositivo: $tipo_dispositivo
      usuario_reporta: $usuario_reporta
      serie_pieza_nueva: $serie_pieza_nueva
      fecha_atencion: $fecha_atencion
      fecha_resolucion: $fecha_resolucion
    ) {
      id_reporte_garantia
      estatus
      fecha_reporte
      fecha_resolucion
      numero_reporte
      tipo_dispositivo
      tipoDispositivoObj {
        tipo_disp
        nombre_tipo
      }
      usuario_reporta
      serie_pieza_nueva
      fecha_atencion
    }
  }
`;

export const UPDATE_REPORTE_GARANTIA = gql`
  mutation UpdateReporteGarantia(
    $id_reporte_garantia: ID!
    $estatus: String
    $descripcion_falla: String
    $resolucion: String
    $numero_reporte: String
    $tipo_dispositivo: Int
    $usuario_reporta: Int
    $serie_pieza_nueva: String
    $fecha_atencion: DateTime
    $fecha_resolucion: DateTime
  ) {
    updateReporteGarantia(
      id_reporte_garantia: $id_reporte_garantia
      estatus: $estatus
      descripcion_falla: $descripcion_falla
      resolucion: $resolucion
      numero_reporte: $numero_reporte
      tipo_dispositivo: $tipo_dispositivo
      usuario_reporta: $usuario_reporta
      serie_pieza_nueva: $serie_pieza_nueva
      fecha_atencion: $fecha_atencion
      fecha_resolucion: $fecha_resolucion
    ) {
      id_reporte_garantia
      estatus
      fecha_resolucion
      numero_reporte
      tipo_dispositivo
      tipoDispositivoObj {
        tipo_disp
        nombre_tipo
      }
      usuario_reporta
      serie_pieza_nueva
      fecha_atencion
    }
  }
`;

export const DELETE_REPORTE_GARANTIA = gql`
  mutation DeleteReporteGarantia($id_reporte_garantia: ID!) {
    deleteReporteGarantia(id_reporte_garantia: $id_reporte_garantia)
  }
`;
