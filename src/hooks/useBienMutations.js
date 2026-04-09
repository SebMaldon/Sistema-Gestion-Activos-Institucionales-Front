import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import {
  CREATE_BIEN_MUTATION,
  UPDATE_BIEN_MUTATION,
  DELETE_BIEN_MUTATION,
  UPSERT_ESPECIFICACION_TI_MUTATION,
} from '../api/inventario.queries';

/** Invalida la cache de bienes tras cualquier mutación */
function useInvalidateBienes() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['bienes'] });
}

// ─── Crear Bien ───────────────────────────────────────────────────────────────
export function useCreateBien({ onSuccess, onError } = {}) {
  const invalidate = useInvalidateBienes();
  return useMutation({
    mutationFn: (variables) => gqlClient.request(CREATE_BIEN_MUTATION, variables),
    onSuccess: (data) => {
      invalidate();
      onSuccess?.(data.createBien);
    },
    onError,
  });
}

// ─── Actualizar Bien ──────────────────────────────────────────────────────────
export function useUpdateBien({ onSuccess, onError } = {}) {
  const invalidate = useInvalidateBienes();
  return useMutation({
    mutationFn: (variables) => gqlClient.request(UPDATE_BIEN_MUTATION, variables),
    onSuccess: (data) => {
      invalidate();
      onSuccess?.(data.updateBien);
    },
    onError,
  });
}

// ─── Eliminar Bien ────────────────────────────────────────────────────────────
export function useDeleteBien({ onSuccess, onError } = {}) {
  const invalidate = useInvalidateBienes();
  return useMutation({
    mutationFn: (id_bien) => gqlClient.request(DELETE_BIEN_MUTATION, { id_bien }),
    onSuccess: () => {
      invalidate();
      onSuccess?.();
    },
    onError,
  });
}

// ─── Upsert Especificación TI ─────────────────────────────────────────────────
export function useUpsertEspecificacionTI({ onSuccess, onError } = {}) {
  const invalidate = useInvalidateBienes();
  return useMutation({
    mutationFn: (variables) => gqlClient.request(UPSERT_ESPECIFICACION_TI_MUTATION, variables),
    onSuccess: (data) => {
      invalidate();
      onSuccess?.(data.upsertEspecificacionTI);
    },
    onError,
  });
}
