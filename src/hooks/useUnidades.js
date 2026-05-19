import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { useAuthStore } from '../store/auth.store';
import {
  GET_UNIDADES_FISICAS_QUERY,
  GET_UNIDAD_BY_CLAVE_QUERY,
  CREATE_UNIDAD_MUTATION,
  UPDATE_UNIDAD_MUTATION,
  DELETE_UNIDAD_MUTATION,
  GET_CAT_TIPO_UNIDADES,
  GET_DISTINCT_FILTROS_QUERY,
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
        const data = await gqlClient.request(GET_UNIDADES_FISICAS_QUERY, {
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
    staleTime: 60_000 * 5,
  });
}

export function useUnidadByClave(clave) {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useQuery({
    queryKey: ['unidad', clave],
    queryFn: async () => {
      try {
        const data = await gqlClient.request(GET_UNIDAD_BY_CLAVE_QUERY, { clave });
        return data.unidad;
      } catch (error) {
        const code = error?.response?.errors?.[0]?.extensions?.code;
        if (code === 'UNAUTHENTICATED') clearAuth();
        throw error;
      }
    },
    enabled: !!clave,
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
      if (data?.updateUnidad?.clave) {
        qc.invalidateQueries({ queryKey: ['unidad', data.updateUnidad.clave] });
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

export function useCatDistinctFiltros() {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useQuery({
    queryKey: ['distinctFiltros'],
    queryFn: async () => {
      try {
        const data = await gqlClient.request(GET_DISTINCT_FILTROS_QUERY);
        return data.catDistinctFiltros;
      } catch (error) {
        const code = error?.response?.errors?.[0]?.extensions?.code;
        if (code === 'UNAUTHENTICATED') clearAuth();
        throw error;
      }
    },
    staleTime: 60_000 * 30, // 30 minutes cache since it is relatively static
  });
}


