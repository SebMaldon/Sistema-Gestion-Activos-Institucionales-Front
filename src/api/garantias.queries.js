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
        modelo {
          descrip_disp
          marca {
            marca
          }
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
