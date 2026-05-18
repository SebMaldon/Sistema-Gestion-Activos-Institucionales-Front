import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import {
  GET_CAT_ATRIBUTOS,
  GET_ATRIBUTOS_POR_TIPO_DISPOSITIVO,
  CREATE_ATRIBUTO,
  UPDATE_ATRIBUTO,
  DELETE_ATRIBUTO,
  SET_ATRIBUTO_TIPO_DISPOSITIVO,
  REMOVE_ATRIBUTO_TIPO_DISPOSITIVO
} from '../api/atributos.queries';

// ─── Catálogo Maestro de Atributos ──────────────────────────────────────────

export function useCatAtributos(soloActivos = false) {
  return useQuery({
    queryKey: ['catAtributos', { soloActivos }],
    queryFn: async () => {
      const data = await gqlClient.request(GET_CAT_ATRIBUTOS, { soloActivos });
      return data.catAtributos;
    },
    staleTime: 60_000,
  });
}

export function useCreateAtributo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input) => {
      const data = await gqlClient.request(CREATE_ATRIBUTO, input);
      return data.createAtributo;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catAtributos'] });
    }
  });
}

export function useUpdateAtributo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input) => {
      const data = await gqlClient.request(UPDATE_ATRIBUTO, input);
      return data.updateAtributo;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catAtributos'] });
    }
  });
}

export function useDeleteAtributo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id_atributo) => {
      const data = await gqlClient.request(DELETE_ATRIBUTO, { id_atributo });
      return data.deleteAtributo;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catAtributos'] });
      qc.invalidateQueries({ queryKey: ['atributosPorTipoDispositivo'] });
      qc.invalidateQueries({ queryKey: ['bienAtributos'] });
    }
  });
}

// ─── Atributos por Tipo de Dispositivo ──────────────────────────────────────

export function useAtributosPorTipoDispositivo(tipo_disp) {
  return useQuery({
    queryKey: ['atributosPorTipoDispositivo', tipo_disp],
    queryFn: async () => {
      const data = await gqlClient.request(GET_ATRIBUTOS_POR_TIPO_DISPOSITIVO, { tipo_disp });
      return data.atributosPorTipoDispositivo;
    },
    enabled: !!tipo_disp,
  });
}

export function useSetAtributoTipoDispositivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input) => {
      const data = await gqlClient.request(SET_ATRIBUTO_TIPO_DISPOSITIVO, input);
      return data.setAtributoTipoDispositivo;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['atributosPorTipoDispositivo', variables.tipo_disp] });
    }
  });
}

export function useRemoveAtributoTipoDispositivo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input) => {
      const data = await gqlClient.request(REMOVE_ATRIBUTO_TIPO_DISPOSITIVO, input);
      return data.removeAtributoTipoDispositivo;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['atributosPorTipoDispositivo', variables.tipo_disp] });
    }
  });
}
