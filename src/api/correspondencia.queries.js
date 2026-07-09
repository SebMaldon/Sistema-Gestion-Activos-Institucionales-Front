import { gql } from 'graphql-request';
import { gqlClient } from './client';

export const GET_ARCHIVOS = gql`
  query GetArchivos {
    getArchivos {
      ID
      Archivo
    }
  }
`;

export const GET_MESA_CORRESPONDENCIAS = gql`
  query GetMesaCorrespondencias($filter: CorrespondenciaFilterInput, $pagination: PaginationInput) {
    getMesaCorrespondencias(filter: $filter, pagination: $pagination) {
      edges {
        cursor
        node {
          Folio
          Anio
          NoOficio
          FechaRecepcion
          FechaOficio
          Remitente
          Descripcion
          Tipo
          Archivo
          unidad {
            clave
            descripcion
          }
          ubicacion {
            id_ubicacion
            nombre_ubicacion
          }
          archivo_ref {
            ID
            Archivo
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
        totalCount
      }
    }
  }
`;

export const CREAR_MESA_CORRESPONDENCIA = gql`
  mutation CrearMesaCorrespondencia($input: MesaCorrespondenciaInput!) {
    crearMesaCorrespondencia(input: $input) {
      Folio
      Anio
      NoOficio
    }
  }
`;

export const EDITAR_MESA_CORRESPONDENCIA = gql`
  mutation EditarMesaCorrespondencia($Folio: Int!, $Anio: Int, $input: MesaCorrespondenciaInput!) {
    editarMesaCorrespondencia(Folio: $Folio, Anio: $Anio, input: $input) {
      Folio
      Anio
      NoOficio
    }
  }
`;

export const ELIMINAR_MESA_CORRESPONDENCIA = gql`
  mutation EliminarMesaCorrespondencia($Folio: Int!, $Anio: Int) {
    eliminarMesaCorrespondencia(Folio: $Folio, Anio: $Anio)
  }
`;

export const getArchivos = async () => {
  const { getArchivos } = await gqlClient.request(GET_ARCHIVOS);
  return getArchivos;
};

export const getMesaCorrespondencias = async (filter, pagination) => {
  const { getMesaCorrespondencias } = await gqlClient.request(GET_MESA_CORRESPONDENCIAS, { filter, pagination });
  return getMesaCorrespondencias;
};

export const crearMesaCorrespondencia = async (input) => {
  const { crearMesaCorrespondencia } = await gqlClient.request(CREAR_MESA_CORRESPONDENCIA, { input });
  return crearMesaCorrespondencia;
};

export const editarMesaCorrespondencia = async (Folio, Anio, input) => {
  if (typeof Anio === 'object' && !input) {
    input = Anio;
    Anio = undefined;
  }
  const { editarMesaCorrespondencia } = await gqlClient.request(EDITAR_MESA_CORRESPONDENCIA, { Folio, Anio, input });
  return editarMesaCorrespondencia;
};

export const eliminarMesaCorrespondencia = async (Folio, Anio) => {
  if (typeof Folio === 'object' && Folio !== null && Folio.Folio !== undefined) {
    Anio = Folio.Anio;
    Folio = Folio.Folio;
  }
  const { eliminarMesaCorrespondencia } = await gqlClient.request(ELIMINAR_MESA_CORRESPONDENCIA, { Folio, Anio });
  return eliminarMesaCorrespondencia;
};
