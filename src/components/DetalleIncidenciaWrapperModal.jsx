import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { GET_INCIDENCIA_BY_ID_QUERY } from '../api/incidencias.queries';
import { mapIncidenciaNode } from '../hooks/useIncidencias';
import DetalleIncidenciaModal from './DetalleIncidenciaModal';
import { Loader2 } from 'lucide-react';

export default function DetalleIncidenciaWrapperModal({ id_incidencia, onClose }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['incidenciaDetail', String(id_incidencia)],
    queryFn: async () => {
      const res = await gqlClient.request(GET_INCIDENCIA_BY_ID_QUERY, { id_incidencia });
      return res.incidencia;
    },
    enabled: !!id_incidencia,
  });

  const incidenciaMapeada = useMemo(() => {
    if (!data) return null;
    return mapIncidenciaNode(data);
  }, [data]);

  if (!id_incidencia) return null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 fade-in" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl p-10 flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
          <Loader2 size={32} className="animate-spin text-indigo-600 mb-4" />
          <p className="text-sm font-semibold text-gray-700">Cargando detalles de la incidencia...</p>
        </div>
      </div>
    );
  }

  if (isError || !incidenciaMapeada) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 fade-in" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl p-10 flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
          <p className="text-sm font-semibold text-red-600 mb-4">Error al cargar la incidencia.</p>
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-bold">Cerrar</button>
        </div>
      </div>
    );
  }

  return (
    <DetalleIncidenciaModal
      isOpen={true}
      onClose={onClose}
      incidencia={incidenciaMapeada}
      onDeleteNota={undefined}
    />
  );
}
