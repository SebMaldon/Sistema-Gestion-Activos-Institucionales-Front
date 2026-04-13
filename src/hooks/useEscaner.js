import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { GET_BIEN_BY_QR, UPDATE_BIEN, DELETE_BIEN, UPSERT_ESPEC_TI, CREATE_NOTA_BIEN } from '../api/escaner.queries';
import { useAuthStore } from '../store/auth.store';

export function useBienByQR(termino) {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useQuery({
    queryKey: ['bienByQR', termino],
    queryFn: async () => {
      try {
        const data = await gqlClient.request(GET_BIEN_BY_QR, { termino });
        if (!data.bienByTermino) return null;
        
        const node = data.bienByTermino;
        return {
          id: node.id_bien,
          numSerie: node.num_serie || 'N/D',
          qrHash: node.qr_hash,
          cantidad: node.cantidad,
          idCategoria: node.id_categoria,
          idUnidad: node.id_unidad,
          idUsuarioResguardo: node.usuarioResguardo?.id_usuario || node.id_usuario_resguardo || '',
          claveInmueble: node.clave_inmueble,
          equipo: node.modelo?.descrip_disp || node.categoria?.nombre_categoria || 'Sin especificar',
          resguardo: node.usuarioResguardo?.nombre_completo || 'Sin resguardo',
          usuario: node.usuarioResguardo?.nombre_completo || 'N/A',
          matricula: node.usuarioResguardo?.matricula || 'N/A',
          unidad: node.unidad?.nombre || 'N/A',
          ubicacion: node.ubicacion?.nombre_ubicacion || node.unidad?.nombre || node.inmueble?.nombre_ubicacion || 'Sin ubicación',
          idUbicacion: node.ubicacion?.id_ubicacion || '',
          estatus: node.estatus_operativo || 'Activo',
          actualizacion: node.fecha_actualizacion ? new Date(isNaN(Number(node.fecha_actualizacion)) ? node.fecha_actualizacion : Number(node.fecha_actualizacion)).toLocaleString('es-MX') : 'N/A',
          adquisicion: node.fecha_adquisicion ? new Date(isNaN(Number(node.fecha_adquisicion)) ? node.fecha_adquisicion : Number(node.fecha_adquisicion)).toISOString().split('T')[0] : '',
          specs: node.especificacionTI ? {
            hasSpecs: true,
            nom_pc: node.especificacionTI.nom_pc || '',
            cpu: node.especificacionTI.cpu_info || '',
            ram: node.especificacionTI.ram_gb || '',
            almacenamiento: node.especificacionTI.almacenamiento_gb || '',
            mac_wifi: node.especificacionTI.mac_address || '',
            ip: node.especificacionTI.dir_ip || '',
            mac_eth: node.especificacionTI.dir_mac || '',
            puerto_red: node.especificacionTI.puerto_red || '',
            switch_red: node.especificacionTI.switch_red || '',
            os: node.especificacionTI.modelo_so || ''
          } : { hasSpecs: false }
        };
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
      await gqlClient.request(DELETE_BIEN, { id: id_bien });
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
        nom_pc: specs.nom_pc,
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
