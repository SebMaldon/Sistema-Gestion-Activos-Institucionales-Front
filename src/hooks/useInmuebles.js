import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { useAuthStore } from '../store/auth.store';
import {
  GET_INMUEBLES_QUERY,
  GET_INMUEBLE_BY_ID_QUERY,
  CREATE_INMUEBLE_MUTATION,
  UPDATE_INMUEBLE_MUTATION,
  DELETE_INMUEBLE_MUTATION,
} from '../api/inmuebles.queries';

export function useInmuebles(filtros = {}) {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useQuery({
    queryKey: ['inmuebles', filtros],
    queryFn: async () => {
      try {
        const data = await gqlClient.request(GET_INMUEBLES_QUERY, {
          ...filtros,
          pagination: filtros.pagination || { first: 10 }
        });
        return data.inmuebles;
      } catch (error) {
        const code = error?.response?.errors?.[0]?.extensions?.code;
        if (code === 'UNAUTHENTICATED') clearAuth();
        throw error;
      }
    },
    staleTime: 60_000 * 5,
  });
}

export function useInmuebleByClave(clave) {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useQuery({
    queryKey: ['inmueble', clave],
    queryFn: async () => {
      try {
        const data = await gqlClient.request(GET_INMUEBLE_BY_ID_QUERY, { clave });
        return data.inmueble;
      } catch (error) {
        const code = error?.response?.errors?.[0]?.extensions?.code;
        if (code === 'UNAUTHENTICATED') clearAuth();
        throw error;
      }
    },
    enabled: !!clave,
  });
}

export function useCreateInmueble() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => gqlClient.request(CREATE_INMUEBLE_MUTATION, vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inmuebles'] });
    },
  });
}

export function useUpdateInmueble() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => gqlClient.request(UPDATE_INMUEBLE_MUTATION, vars),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['inmuebles'] });
      if (data?.updateInmueble?.clave) {
        qc.invalidateQueries({ queryKey: ['inmueble', data.updateInmueble.clave] });
      }
    },
  });
}

export function useDeleteInmueble() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => gqlClient.request(DELETE_INMUEBLE_MUTATION, vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inmuebles'] });
    },
  });
}
