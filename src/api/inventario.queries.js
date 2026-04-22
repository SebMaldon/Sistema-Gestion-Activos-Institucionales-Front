import { gql } from 'graphql-request';

// ─── Fragmento de Bien completo ──────────────────────────────────────────────
const BIEN_FIELDS = gql`
  fragment BienFields on Bien {
    id_bien
    num_serie
    num_inv
    qr_hash
    cantidad
    estatus_operativo
    clave_inmueble_ref
    clave_presupuestal
    clave_modelo
    id_categoria
    id_unidad_medida
    id_unidad
    id_ubicacion
    id_usuario_resguardo
    fecha_adquisicion
    fecha_actualizacion
    categoria {
      id_categoria
      nombre_categoria
      es_capitalizable
      maneja_serie_individual
    }
    modelo {
      clave_modelo
      descrip_disp
      clave_marca
      tipo_disp
    }
    unidadMedida {
      id_unidad_medida
      nombre_unidad
      abreviatura
    }
    unidad {
      id_unidad
      nombre
      clave
    }
    ubicacion {
      id_ubicacion
      nombre_ubicacion
    }
    inmueble {
      clave_inmueble
      nombre_ubicacion
    }
    usuarioResguardo {
      id_usuario
      nombre_completo
      matricula
    }
    especificacionTI {
      id_bien
      nom_pc
      cpu_info
      ram_gb
      almacenamiento_gb
      dir_ip
      dir_mac
      mac_address
      modelo_so
    }
    garantias {
      id_garantia
      fecha_inicio
      fecha_fin
      id_proveedor
      estado_garantia
      proveedorObj {
        id_proveedor
        nombre_proveedor
      }
    }
  }
`;

// ─── Queries ─────────────────────────────────────────────────────────────────

export const GET_BIENES_QUERY = gql`
  ${BIEN_FIELDS}
  query GetBienes($filter: BienesFilterInput, $pagination: PaginationInput) {
    bienes(filter: $filter, pagination: $pagination) {
      edges {
        node {
          ...BienFields
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        totalCount
        startCursor
        endCursor
      }
    }
  }
`;

export const GET_BIEN_DETAIL_QUERY = gql`
  ${BIEN_FIELDS}
  query GetBienDetail($id_bien: ID!) {
    bien(id_bien: $id_bien) {
      ...BienFields
    }
  }
`;

/** Catálogos necesarios para poblar los selects del formulario */
export const GET_CATALOGOS_BIENES_QUERY = gql`
  query GetCatalogosBienes {
    catCategoriasActivo {
      id_categoria
      nombre_categoria
      es_capitalizable
      maneja_serie_individual
    }
    catUnidadesMedida {
      id_unidad_medida
      nombre_unidad
      abreviatura
    }
    catModelos {
      clave_modelo
      descrip_disp
      clave_marca
    }
    unidades {
      id_unidad
      nombre
      clave
    }
    inmuebles {
      clave
      descripcion
      desc_corta
    }
    usuarios(estatus: true) {
      edges {
        node {
          id_usuario
          nombre_completo
          matricula
        }
      }
    }
  }
`;

// ─── Mutations ───────────────────────────────────────────────────────────────

export const CREATE_BIEN_MUTATION = gql`
  ${BIEN_FIELDS}
  mutation CreateBien(
    $id_categoria: Int!
    $id_unidad_medida: Int!
    $id_unidad: Int
    $id_ubicacion: Int
    $num_serie: String
    $num_inv: String
    $cantidad: Float
    $estatus_operativo: String
    $clave_inmueble_ref: String
    $clave_modelo: String
    $id_usuario_resguardo: Int
    $fecha_adquisicion: Date
  ) {
    createBien(
      id_categoria: $id_categoria
      id_unidad_medida: $id_unidad_medida
      id_unidad: $id_unidad
      id_ubicacion: $id_ubicacion
      num_serie: $num_serie
      num_inv: $num_inv
      cantidad: $cantidad
      estatus_operativo: $estatus_operativo
      clave_inmueble_ref: $clave_inmueble_ref
      clave_modelo: $clave_modelo
      id_usuario_resguardo: $id_usuario_resguardo
      fecha_adquisicion: $fecha_adquisicion
    ) {
      ...BienFields
    }
  }
`;

export const UPDATE_BIEN_MUTATION = gql`
  ${BIEN_FIELDS}
  mutation UpdateBien(
    $id_bien: ID!
    $id_categoria: Int
    $id_unidad_medida: Int
    $id_unidad: Int
    $id_ubicacion: Int
    $num_serie: String
    $num_inv: String
    $cantidad: Float
    $estatus_operativo: String
    $clave_inmueble_ref: String
    $clave_modelo: String
    $id_usuario_resguardo: Int
    $fecha_adquisicion: Date
  ) {
    updateBien(
      id_bien: $id_bien
      id_categoria: $id_categoria
      id_unidad_medida: $id_unidad_medida
      id_unidad: $id_unidad
      id_ubicacion: $id_ubicacion
      num_serie: $num_serie
      num_inv: $num_inv
      cantidad: $cantidad
      estatus_operativo: $estatus_operativo
      clave_inmueble_ref: $clave_inmueble_ref
      clave_modelo: $clave_modelo
      id_usuario_resguardo: $id_usuario_resguardo
      fecha_adquisicion: $fecha_adquisicion
    ) {
      ...BienFields
    }
  }
`;

export const DELETE_BIEN_MUTATION = gql`
  mutation DeleteBien($id_bien: ID!) {
    deleteBien(id_bien: $id_bien)
  }
`;

export const UPSERT_ESPECIFICACION_TI_MUTATION = gql`
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
      id_bien
      nom_pc
      cpu_info
      ram_gb
      almacenamiento_gb
      dir_ip
      dir_mac
      mac_address
      modelo_so
    }
  }
`;

export const GET_UBICACIONES_POR_UNIDAD = gql`
  query GetUbicacionesPorUnidad($id_unidad: Int!) {
    ubicacionesPorUnidad(id_unidad: $id_unidad) {
      id_ubicacion
      nombre_ubicacion
    }
  }
`;

export const CREATE_UBICACION = gql`
  mutation CreateUbicacion($id_unidad: Int!, $nombre_ubicacion: String!) {
    createUbicacion(id_unidad: $id_unidad, nombre_ubicacion: $nombre_ubicacion) {
      id_ubicacion
      id_unidad
      nombre_ubicacion
    }
  }
`;

// ─── Catálogos auxiliares: marcas, tipos, modelos ────────────────────────────

export const GET_MARCAS_TIPOS_QUERY = gql`
  query GetMarcasTipos {
    marcas { clave_marca marca }
    tiposDispositivo { tipo_disp nombre_tipo }
  }
`;

export const CREATE_MARCA_MUTATION = gql`
  mutation CreateMarca($marca: String!) {
    createMarca(marca: $marca) { clave_marca marca }
  }
`;

export const CREATE_TIPO_DISPOSITIVO_MUTATION = gql`
  mutation CreateTipoDispositivo($nombre_tipo: String!) {
    createTipoDispositivo(nombre_tipo: $nombre_tipo) { tipo_disp nombre_tipo }
  }
`;

export const CREATE_CAT_MODELO_MUTATION = gql`
  mutation CreateCatModelo($clave_modelo: ID!, $clave_marca: Int, $descrip_disp: String, $tipo_disp: Int) {
    createCatModelo(clave_modelo: $clave_modelo, clave_marca: $clave_marca, descrip_disp: $descrip_disp, tipo_disp: $tipo_disp) {
      clave_modelo
      descrip_disp
      clave_marca
      tipo_disp
    }
  }
`;

