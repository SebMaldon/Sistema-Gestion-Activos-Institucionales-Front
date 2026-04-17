import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { useAuthStore } from '../store/auth.store';
import {
  UPDATE_INCIDENCIA_MUTATION,
  GET_INCIDENCIAS_QUERY,
  GET_TIPOS_INCIDENCIA_QUERY,
  GET_USUARIOS_QUERY,
  GET_BIEN_BY_TERMINO_QUERY,
  GET_UNIDADES_QUERY,
  GET_NOTAS_INCIDENCIA_QUERY,
  CREATE_INCIDENCIA_MUTATION,
  CREATE_TIPO_INCIDENCIA_MUTATION,
  PASAR_A_EN_PROCESO_MUTATION,
  RESOLVER_INCIDENCIA_MUTATION,
  AGREGAR_NOTA_MUTATION,
  UPDATE_ESTATUS_MUTATION,
  DELETE_INCIDENCIA_MUTATION,
} from '../api/incidencias.queries';


// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Mapea un nodo de la API al shape que usa la UI del Kanban */
export function mapIncidenciaNode(node) {
  return {
    id: node.id_incidencia,
    id_bien: node.id_bien,
    id_tipo_incidencia: node.id_tipo_incidencia,
    numSerie: node.bien?.num_serie || node.num_inv || 'Sin serie',
    equipo:
      node.bien?.modelo?.descrip_disp ||
      node.bien?.categoria?.nombre_categoria ||
      'Equipo sin descripción',
    falla: node.descripcion_falla,
    estatus: node.estatus_reparacion,   // 'Pendiente' | 'En proceso' | 'Resuelto'
    tipoIncidencia: node.tipoIncidencia?.nombre_tipo || 'Sin tipo',
    unidad: node.unidad?.nombre || '',
    alias: node.alias || '',
    requerimiento: node.requerimiento || '',
    fecha: (() => {
      if (!node.fecha_reporte) return '';
      let str = node.fecha_reporte;
      // Si el servidor envía "YYYY-MM-DD HH:mm:ss" sin zona, JS lo toma como local.
      // SQL Server suele guardarlo en UTC, así que forzamos la 'Z' si falta.
      if (typeof str === 'string' && !str.includes('Z') && !str.includes('+')) {
        str = str.replace(' ', 'T') + 'Z';
      }
      return new Date(str).toLocaleDateString('es-MX');
    })(),
    horaCreacion: (() => {
      if (!node.fecha_reporte) return '';
      let str = node.fecha_reporte;
      if (typeof str === 'string' && !str.includes('Z') && !str.includes('+')) {
        str = str.replace(' ', 'T') + 'Z';
      }
      return new Date(str).toLocaleTimeString('es-MX', {
        hour: '2-digit', minute: '2-digit', hour12: true
      });
    })(),
    generadoPor: node.usuarioGeneraReporte?.nombre_completo || '',
    matriculaGenera: node.usuarioGeneraReporte?.matricula || '',
    tecnico: node.usuarioResuelve?.nombre_completo || 'Sin asignar',
    resolucion: node.resolucion_textual || '',
    fechaResolucion: (() => {
      if (!node.fecha_resolucion) return null;
      let str = node.fecha_resolucion;
      if (typeof str === 'string' && !str.includes('Z') && !str.includes('+')) {
        str = str.replace(' ', 'T') + 'Z';
      }
      return str; // Devolvemos el string normalizado o el objeto date
    })(),
    notas: node.notas || [],
    _raw: node, // nodo original por si se necesita
  };
}

// ─── Hook: lista de incidencias ───────────────────────────────────────────────

export function useIncidencias(filtros = {}) {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useQuery({
    queryKey: ['incidencias', filtros],
    queryFn: async () => {
      try {
        const data = await gqlClient.request(GET_INCIDENCIAS_QUERY, {
          first: 100,
          ...filtros,
        });
        return data.incidencias.edges.map(({ node }) => mapIncidenciaNode(node));
      } catch (error) {
        const code = error?.response?.errors?.[0]?.extensions?.code;
        if (code === 'UNAUTHENTICATED') clearAuth();
        throw error;
      }
    },
    staleTime: 45_000,       // 45s — refresca en background sin bloquear navegacion
    refetchOnWindowFocus: false, // evita refetch innecesario al cambiar de pestana
  });
}

// ─── Hook: tipos de incidencia ────────────────────────────────────────────────

export function useTiposIncidencia() {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useQuery({
    queryKey: ['tiposIncidencia'],
    queryFn: async () => {
      try {
        const data = await gqlClient.request(GET_TIPOS_INCIDENCIA_QUERY);
        return data.tiposIncidencia;
      } catch (error) {
        const code = error?.response?.errors?.[0]?.extensions?.code;
        if (code === 'UNAUTHENTICATED') clearAuth();
        throw error;
      }
    },
    staleTime: 60_000 * 30, // 30 min — cambia muy poco
  });
}

// ─── Hook: usuarios activos ───────────────────────────────────────────────────

export function useUsuariosActivos() {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useQuery({
    queryKey: ['usuarios', 'activos'],
    queryFn: async () => {
      try {
        const data = await gqlClient.request(GET_USUARIOS_QUERY);
        return data.usuarios.edges.map(e => e.node);
      } catch (error) {
        const code = error?.response?.errors?.[0]?.extensions?.code;
        if (code === 'UNAUTHENTICATED') clearAuth();
        throw error;
      }
    },
    staleTime: 60_000 * 30, // 30 min
  });
}

// ─── Hook: unidades de la BD ─────────────────────────────────────────────────

export function useUnidades(filtros = {}) {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useQuery({
    queryKey: ['unidades', filtros],
    queryFn: async () => {
      try {
        const data = await gqlClient.request(GET_UNIDADES_QUERY, filtros);
        return data.unidades;
      } catch (error) {
        const code = error?.response?.errors?.[0]?.extensions?.code;
        if (code === 'UNAUTHENTICATED') clearAuth();
        throw error;
      }
    },
    staleTime: 60_000 * 10, // 10 min — las unidades cambian muy poco
  });
}

// useRotacionesPorUnidad ha sido removida ya que la rotación ya no existe en el backend

// ─── Hook: buscar bien por número de serie o IP ─────────────────────────────────

export function useBienPorTermino(termino) {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useQuery({
    queryKey: ['bienByTermino', termino],
    enabled: !!termino && termino.trim().length > 0,
    queryFn: async () => {
      try {
        const data = await gqlClient.request(GET_BIEN_BY_TERMINO_QUERY, {
          termino: termino.trim(),
        });
        return data.bienByTermino || null;
      } catch (error) {
        const code = error?.response?.errors?.[0]?.extensions?.code;
        if (code === 'UNAUTHENTICATED') clearAuth();
        throw error;
      }
    },
    retry: false,
  });
}

// ─── Hook: notas de una incidencia (carga lazy) ────────────────────────────

export function useNotasIncidencia(id_incidencia) {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  return useQuery({
    queryKey: ['notasIncidencia', id_incidencia],
    enabled: !!id_incidencia,
    queryFn: async () => {
      try {
        const data = await gqlClient.request(GET_NOTAS_INCIDENCIA_QUERY, {
          id_incidencia: parseInt(id_incidencia, 10),
        });
        return data.notasIncidencia ?? [];
      } catch (error) {
        const code = error?.response?.errors?.[0]?.extensions?.code;
        if (code === 'UNAUTHENTICATED') clearAuth();
        throw error;
      }
    },
    staleTime: 60_000, // 1 min
  });
}

// ─── Helpers para actualizaciones optimistas ─────────────────────────────────

function optimisticStatus(qc, id_incidencia, newStatus) {
  qc.setQueriesData(
    { queryKey: ['incidencias'] },
    (old) => Array.isArray(old)
      ? old.map(i => String(i.id) === String(id_incidencia) ? { ...i, estatus: newStatus } : i)
      : old
  );
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateIncidencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => gqlClient.request(CREATE_INCIDENCIA_MUTATION, vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidencias'] }),
  });
}

export function useCreateTipoIncidencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => gqlClient.request(CREATE_TIPO_INCIDENCIA_MUTATION, vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tiposIncidencia'] }),
  });
}

export function usePasarAEnProceso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => gqlClient.request(PASAR_A_EN_PROCESO_MUTATION, vars),
    // Optimistic: la tarjeta salta a "En proceso" de inmediato
    onMutate: async ({ id_incidencia }) => {
      await qc.cancelQueries({ queryKey: ['incidencias'] });
      const snapshots = qc.getQueriesData({ queryKey: ['incidencias'] });
      optimisticStatus(qc, id_incidencia, 'En proceso');
      return { snapshots };
    },
    onError: (_, __, ctx) =>
      ctx?.snapshots?.forEach(([key, data]) => qc.setQueryData(key, data)),
    onSettled: () => qc.invalidateQueries({ queryKey: ['incidencias'] }),
  });
}

export function useResolverIncidencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => gqlClient.request(RESOLVER_INCIDENCIA_MUTATION, vars),
    // Optimistic: la tarjeta salta a "Resuelto" de inmediato
    onMutate: async ({ id_incidencia }) => {
      await qc.cancelQueries({ queryKey: ['incidencias'] });
      const snapshots = qc.getQueriesData({ queryKey: ['incidencias'] });
      optimisticStatus(qc, id_incidencia, 'Resuelto');
      return { snapshots };
    },
    onError: (_, __, ctx) =>
      ctx?.snapshots?.forEach(([key, data]) => qc.setQueryData(key, data)),
    onSettled: () => qc.invalidateQueries({ queryKey: ['incidencias'] }),
  });
}

export function useAgregarNota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => gqlClient.request(AGREGAR_NOTA_MUTATION, vars),
    // Solo invalida las notas de ESA incidencia, no recarga toda la lista
    onSuccess: (_, { id_incidencia }) =>
      qc.invalidateQueries({ queryKey: ['notasIncidencia', parseInt(id_incidencia)] }),
  });
}

export function useUpdateEstatusIncidencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => gqlClient.request(UPDATE_ESTATUS_MUTATION, vars),
    // Optimistic: la tarjeta cambia de columna sin esperar al servidor
    onMutate: async ({ id_incidencia, estatus_reparacion }) => {
      await qc.cancelQueries({ queryKey: ['incidencias'] });
      const snapshots = qc.getQueriesData({ queryKey: ['incidencias'] });
      optimisticStatus(qc, id_incidencia, estatus_reparacion);
      return { snapshots };
    },
    onError: (_, __, ctx) =>
      ctx?.snapshots?.forEach(([key, data]) => qc.setQueryData(key, data)),
    onSettled: () => qc.invalidateQueries({ queryKey: ['incidencias'] }),
  });
}

export function useDeleteIncidencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => gqlClient.request(DELETE_INCIDENCIA_MUTATION, vars),
    // Optimistic: elimina la tarjeta de la UI antes de confirmar
    onMutate: async ({ id_incidencia }) => {
      await qc.cancelQueries({ queryKey: ['incidencias'] });
      const snapshots = qc.getQueriesData({ queryKey: ['incidencias'] });
      qc.setQueriesData(
        { queryKey: ['incidencias'] },
        (old) => Array.isArray(old)
          ? old.filter(i => String(i.id) !== String(id_incidencia))
          : old
      );
      return { snapshots };
    },
    onError: (_, __, ctx) =>
      ctx?.snapshots?.forEach(([key, data]) => qc.setQueryData(key, data)),
    onSettled: () => qc.invalidateQueries({ queryKey: ['incidencias'] }),
  });
}

export function useUpdateIncidencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => gqlClient.request(UPDATE_INCIDENCIA_MUTATION, vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['incidencias'] }),
  });
}

