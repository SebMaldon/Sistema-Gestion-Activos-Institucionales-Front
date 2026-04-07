import { useQuery } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { GET_BIEN_BY_QR } from '../api/escaner.queries';
import { useAuthStore } from '../store/auth.store';

export function useBienByQR(qrHash) {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useQuery({
    queryKey: ['bienByQR', qrHash],
    queryFn: async () => {
      try {
        const data = await gqlClient.request(GET_BIEN_BY_QR, { qr_hash: qrHash });
        if (!data.bienByQR) return null;
        
        const node = data.bienByQR;
        return {
          id: node.id_bien,
          numSerie: node.num_serie || 'N/D',
          qrHash: node.qr_hash,
          equipo: node.modelo?.descrip_disp || node.categoria?.nombre_categoria || 'Sin especificar',
          resguardo: node.usuarioResguardo?.nombre_completo || 'Sin resguardo',
          ubicacion: node.unidad?.nombre || node.inmueble?.nombre_ubicacion || 'Sin ubicación',
          estatus: node.estatus_operativo || 'Activo',
          specs: {
            cpu: node.especificacionTI?.cpu_info || 'N/D',
            ram: node.especificacionTI?.ram_gb ? `${node.especificacionTI.ram_gb} GB` : 'N/D'
          }
        };
      } catch (error) {
        const code = error?.response?.errors?.[0]?.extensions?.code;
        if (code === 'UNAUTHENTICATED') {
          clearAuth();
        }
        throw error;
      }
    },
    enabled: !!qrHash, // Run only when input is present
    retry: false,
  });
}
