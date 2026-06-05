import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { GET_BIEN_BY_QR, UPDATE_BIEN, DELETE_BIEN, UPSERT_ESPEC_TI, CREATE_NOTA_BIEN } from '../api/escaner.queries';
import { useAuthStore } from '../store/auth.store';
import { mapBienNode } from './useBienes';

export function useBienByQR(termino) {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useQuery({
    queryKey: ['bienByQR', termino],
    queryFn: async () => {
      try {
        const data = await gqlClient.request(GET_BIEN_BY_QR, { termino });
        if (!data.bienByTermino || data.bienByTermino.length === 0) return [];
        return data.bienByTermino.map(mapBienNode);
      } catch (error) {
        const code = error?.response?.errors?.[0]?.extensions?.code;
        if (code === 'UNAUTHENTICATED') {
          clearAuth();
        }
        throw error;
      }
    },
    enabled: !!termino, // Run only when input is present
    retry: false,
  });
}

export function useDeleteBien() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id_bien) => {
      await gqlClient.request(DELETE_BIEN, { id_bien });
    },
    onSuccess: (_, id_bien) => {
      queryClient.invalidateQueries({ queryKey: ['bienByQR'] });
      queryClient.invalidateQueries({ queryKey: ['bienes'] });
    }
  });
}

export function useEditBien() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id_bien, input }) => {
      const data = await gqlClient.request(UPDATE_BIEN, { id_bien, ...input });
      return data.updateBien;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bienByQR'] });
      queryClient.invalidateQueries({ queryKey: ['bienes'] });
    }
  });
}

export function useUpsertSpecsTI() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id_bien, specs }) => {
      // Filtrar y castear numericos
      const payload = {
        id_bien,
        cpu_info: specs.cpu,
        ram_gb: specs.ram ? parseInt(specs.ram, 10) : null,
        almacenamiento_gb: specs.almacenamiento ? parseInt(specs.almacenamiento, 10) : null,
        mac_address: specs.mac_wifi,
        dir_ip: specs.ip,
        dir_mac: specs.mac_eth,
        puerto_red: specs.puerto_red,
        switch_red: specs.switch_red,
        modelo_so: specs.os
      };
      const data = await gqlClient.request(UPSERT_ESPEC_TI, payload);
      return data.upsertEspecificacionTI;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bienByQR'] });
    }
  });
}

export function useCreateNotaBien() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id_bien, contenido_nota }) => {
      const data = await gqlClient.request(CREATE_NOTA_BIEN, { id_bien, contenido_nota });
      return data.createNotaBien;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bienByQR'] });
      queryClient.invalidateQueries({ queryKey: ['bienes'] });
    }
  });
}
