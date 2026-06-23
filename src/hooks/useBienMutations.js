import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import {
  CREATE_BIEN_MUTATION,
  UPDATE_BIEN_MUTATION,
  DELETE_BIEN_MUTATION,
  UPSERT_ESPECIFICACION_TI_MUTATION,
  CREATE_CUENTA_PC_MUTATION,
  UPDATE_CUENTA_PC_MUTATION,
  DELETE_CUENTA_PC_MUTATION,
} from '../api/inventario.queries';

/** Invalida la cache de bienes tras cualquier mutación */
function useInvalidateBienes() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['bienes'] });
    queryClient.invalidateQueries({ queryKey: ['bienDetail'] });
    queryClient.invalidateQueries({ queryKey: ['bienByQR'] });
  };
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

// ─── Upsert Especificación TI ─────────────────────────────────────────────────────────
function useUpsertEspecificacionTI({ onSuccess, onError } = {}) {
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
export { useUpsertEspecificacionTI };

// ─── Crear CuentaPC ────────────────────────────────────────────────────────────
export function useCreateCuentaPC({ onSuccess, onError } = {}) {
  const invalidate = useInvalidateBienes();
  return useMutation({
    mutationFn: (variables) => gqlClient.request(CREATE_CUENTA_PC_MUTATION, variables),
    onSuccess: (data) => {
      invalidate();
      onSuccess?.(data.createCuentaPC);
    },
    onError,
  });
}

// ─── Actualizar CuentaPC ──────────────────────────────────────────────────────────
export function useUpdateCuentaPC({ onSuccess, onError } = {}) {
  const invalidate = useInvalidateBienes();
  return useMutation({
    mutationFn: (variables) => gqlClient.request(UPDATE_CUENTA_PC_MUTATION, variables),
    onSuccess: (data) => {
      invalidate();
      onSuccess?.(data.updateCuentaPC);
    },
    onError,
  });
}

// ─── Eliminar CuentaPC ────────────────────────────────────────────────────────────
export function useDeleteCuentaPC({ onSuccess, onError } = {}) {
  const invalidate = useInvalidateBienes();
  return useMutation({
    mutationFn: (id_cuenta) => gqlClient.request(DELETE_CUENTA_PC_MUTATION, { id_cuenta }),
    onSuccess: () => {
      invalidate();
      onSuccess?.();
    },
    onError,
  });
}
