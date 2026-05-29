import React, { useState, useEffect, useCallback } from 'react';
import { gqlClient } from '../api/client';
import {
  GET_SOLICITUDES_PENDIENTES,
  APROBAR_CAMBIO,
  RECHAZAR_CAMBIO,
} from '../api/aprobaciones.queries';
import { useApp } from '../context/AppContext';
import RevisionCambiosModal from '../components/RevisionCambiosModal';
import { ClipboardCheck, Clock, User, Monitor, Search, RefreshCcw, Inbox } from 'lucide-react';

export default function Aprobaciones() {
  const { showToast } = useApp();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSolicitud, setSelectedSolicitud] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSolicitudes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await gqlClient.request(GET_SOLICITUDES_PENDIENTES);
      setSolicitudes(data.obtenerSolicitudesPendientes || []);
    } catch (err) {
      showToast?.('Error cargando solicitudes: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchSolicitudes();
  }, [fetchSolicitudes]);

  const handleAprobar = async (solicitudId, camposAprobados = null) => {
    try {
      await gqlClient.request(APROBAR_CAMBIO, { 
        solicitudId: parseInt(solicitudId),
        camposAprobados
      });
      showToast?.('Cambio aprobado exitosamente.', 'success');
      setSelectedSolicitud(null);
      fetchSolicitudes();
    } catch (err) {
      showToast?.('Error al aprobar: ' + err.message, 'error');
    }
  };

  const handleRechazar = async (solicitudId, motivo) => {
    try {
      await gqlClient.request(RECHAZAR_CAMBIO, {
        solicitudId: parseInt(solicitudId),
        motivo: motivo || null,
      });
      showToast?.('Cambio rechazado.', 'success');
      setSelectedSolicitud(null);
      fetchSolicitudes();
    } catch (err) {
      showToast?.('Error al rechazar: ' + err.message, 'error');
    }
  };

  const filtered = solicitudes.filter((s) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.solicitante?.nombre_completo?.toLowerCase().includes(term) ||
      s.solicitante?.matricula?.toLowerCase().includes(term) ||
      s.bien?.num_serie?.toLowerCase().includes(term) ||
      s.bien?.num_inv?.toLowerCase().includes(term)
    );
  });

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Aprobaciones Pendientes</h1>
            <p className="text-sm text-gray-500">Revisa y aprueba los cambios solicitados por los usuarios</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por solicitante, serie, inventario..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
          />
        </div>
        <button
          onClick={fetchSolicitudes}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
        <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm font-semibold text-amber-700">
          {filtered.length} pendiente{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Inbox className="w-12 h-12 mb-3 text-gray-300" />
            <p className="text-base font-medium">No hay solicitudes pendientes</p>
            <p className="text-sm">Todas las solicitudes han sido procesadas</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Solicitante</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Equipo</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sol) => {
                const datosP = typeof sol.datos_nuevos === 'string' ? JSON.parse(sol.datos_nuevos) : sol.datos_nuevos;
                const esCreacion = datosP._esCreacion === true;
                return (
                  <tr key={sol.id} className="border-b border-gray-50 hover:bg-green-50/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {formatDate(sol.fecha_solicitud)}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <User className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{sol.solicitante?.nombre_completo || '—'}</p>
                          <p className="text-xs text-gray-400">{sol.solicitante?.matricula || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            {sol.bien?.num_inv || sol.bien?.num_serie || datosP.num_serie || sol.bien_id?.substring(0, 8) + '...'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {sol.bien?.modelo?.descrip_disp || datosP.clave_modelo || 'Sin modelo'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        esCreacion
                          ? 'bg-blue-50 text-blue-600 border border-blue-200'
                          : 'bg-amber-50 text-amber-600 border border-amber-200'
                      }`}>
                        {esCreacion ? 'Creación' : 'Actualización'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => setSelectedSolicitud(sol)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                      >
                        Revisar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {selectedSolicitud && (
        <RevisionCambiosModal
          solicitud={selectedSolicitud}
          onAprobar={handleAprobar}
          onRechazar={handleRechazar}
          onClose={() => setSelectedSolicitud(null)}
        />
      )}
    </div>
  );
}
