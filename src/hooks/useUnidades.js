import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { useAuthStore } from '../store/auth.store';
import {
  GET_UNIDADES_QUERY,
  GET_UNIDAD_BY_ID_QUERY,
  CREATE_UNIDAD_MUTATION,
  UPDATE_UNIDAD_MUTATION,
  DELETE_UNIDAD_MUTATION,
  GET_CAT_TIPO_UNIDADES,
} from '../api/unidades.queries';

export function useCatTipoUnidades() {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useQuery({
    queryKey: ['catTipoUnidades'],
    queryFn: async () => {
      try {
        const data = await gqlClient.request(GET_CAT_TIPO_UNIDADES);
        return data.catTipoUnidades;
      } catch (error) {
        const code = error?.response?.errors?.[0]?.extensions?.code;
        if (code === 'UNAUTHENTICATED') clearAuth();
        throw error;
      }
    },
    staleTime: 60_000 * 60, // 1 hour
  });
}

export function useUnidades(filtros = {}) {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useQuery({
    queryKey: ['unidades', filtros],
    queryFn: async () => {
      try {
        const data = await gqlClient.request(GET_UNIDADES_QUERY, {
          ...filtros,
          pagination: filtros.pagination || { first: 10 }
        });
        return data.unidades;
      } catch (error) {
        const code = error?.response?.errors?.[0]?.extensions?.code;
        if (code === 'UNAUTHENTICATED') clearAuth();
        throw error;
      }
    },
    staleTime: 60_000 * 5, // 5 minutes
  });
}

export function useUnidadById(id_unidad) {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useQuery({
    queryKey: ['unidad', id_unidad],
    queryFn: async () => {
      try {
        const data = await gqlClient.request(GET_UNIDAD_BY_ID_QUERY, { id_unidad });
        return data.unidadById;
      } catch (error) {
        const code = error?.response?.errors?.[0]?.extensions?.code;
        if (code === 'UNAUTHENTICATED') clearAuth();
        throw error;
      }
    },
    enabled: !!id_unidad,
  });
}

export function useCreateUnidad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => gqlClient.request(CREATE_UNIDAD_MUTATION, vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unidades'] });
    },
  });
}

export function useUpdateUnidad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => gqlClient.request(UPDATE_UNIDAD_MUTATION, vars),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['unidades'] });
      if (data?.updateUnidad?.id_unidad) {
        qc.invalidateQueries({ queryKey: ['unidad', data.updateUnidad.id_unidad] });
      }
    },
  });
}

export function useDeleteUnidad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => gqlClient.request(DELETE_UNIDAD_MUTATION, vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unidades'] });
    },
  });
}
