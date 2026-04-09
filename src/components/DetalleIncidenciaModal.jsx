import React from 'react';
import { X, Clock, Calendar, User, Users, FileText, CheckCircle, Info, Wrench, Monitor, Building2, AlignLeft, Send, Activity } from 'lucide-react';
import { useNotasIncidencia } from '../hooks/useIncidencias';

export default function DetalleIncidenciaModal({ isOpen, onClose, incidencia }) {
  // Cargar notas de la incidencia (el hook maneja enabled internamente si el id es null)
  const { data: notas = [], isLoading: isLoadingNotas } = useNotasIncidencia(incidencia?.id);

  if (!isOpen || !incidencia) return null;

  const pBadge = 
    incidencia.prioridad === 'Baja' ? 'bg-blue-100 text-blue-700' :
    incidencia.prioridad === 'Media' ? 'bg-yellow-100 text-yellow-700' :
    incidencia.prioridad === 'Alta' ? 'bg-orange-100 text-orange-700' :
    incidencia.prioridad === 'Crítica' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700';

  const eBadge =
    incidencia.estatus === 'Resuelto' ? 'bg-green-100 text-green-700' :
    incidencia.estatus === 'En proceso' ? 'bg-blue-100 text-blue-700' :
    'bg-yellow-100 text-yellow-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Info size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                Detalles de Incidencia 
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${eBadge}`}>
                  {incidencia.estatus}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${pBadge}`}>
                  {incidencia.prioridad || 'Media'}
                </span>
              </h2>
              <p className="text-sm text-gray-500">ID: {incidencia.id} — Creada el {incidencia.fecha} a las {incidencia.horaCreacion || '--:--'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-700 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Columna Izquierda: Detalles del Equipo y Falla */}
            <div className="space-y-6">
              
              {/* Info del Equipo */}
              <section className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Monitor size={16} className="text-blue-500" /> Información del Equipo
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Número de Serie:</span>
                    <span className="font-semibold text-gray-900">{incidencia.numSerie}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Equipo:</span>
                    <span className="font-semibold text-gray-900 text-right max-w-[200px] truncate" title={incidencia.equipo}>{incidencia.equipo}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Unidad:</span>
                    <span className="font-semibold text-gray-900 flex items-center gap-1">
                      <Building2 size={13} className="text-gray-400" /> {incidencia.unidad || 'Sin unidad'}
                    </span>
                  </div>
                </div>
              </section>

              {/* Usuarios Involucrados */}
              <section className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Users size={16} className="text-purple-500" /> Personal Involucrado
                </h3>
                <div className="space-y-4 text-sm bg-gray-50/50 p-3 rounded-lg">
                  <div>
                    <span className="block text-xs font-semibold text-gray-500 uppercase mb-0.5">Reportó falla</span>
                    <span className="font-medium text-gray-800 flex items-center gap-1.5">
                      <User size={14} className="text-gray-400" /> {incidencia.reportadoPor || 'No registrado'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-gray-500 uppercase mb-0.5">Técnico Asignado</span>
                    <span className="font-medium text-gray-800 flex items-center gap-1.5">
                      <Wrench size={14} className="text-gray-400" /> {incidencia.tecnico || 'Sin asignar'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-gray-500 uppercase mb-0.5">Registrado en sistema por</span>
                    <span className="font-medium text-gray-800">
                      {incidencia.generadoPor || 'Usuario del Sistema'} {incidencia.matriculaGenera && `(${incidencia.matriculaGenera})`}
                    </span>
                  </div>
                </div>
              </section>

            </div>

            {/* Columna Derecha: Falla, Resolución y Notas */}
            <div className="space-y-6">
              
              {/* Descripción de Falla */}
              <section className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-red-400">
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Activity size={16} className="text-red-500" /> Descripción de la Falla
                </h3>
                <p className="text-sm text-gray-700 bg-red-50/30 p-3 rounded-lg border border-red-50 break-words whitespace-pre-wrap">
                  {incidencia.falla || 'Sin descripción.'}
                </p>
                <div className="mt-3 text-xs text-gray-500 flex items-center gap-1.5">
                  <span className="font-medium bg-gray-100 px-2 py-0.5 rounded-md text-gray-600">Tipo: {incidencia.tipoIncidencia}</span>
                </div>
              </section>

              {/* Resolución */}
              {incidencia.estatus === 'Resuelto' && (
                <section className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-green-500">
                  <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-600" /> Detalles de Resolución
                  </h3>
                  
                  <div className="space-y-3">
                    <p className="text-sm text-gray-700 bg-green-50/50 p-3 rounded-lg border border-green-100 leading-relaxed whitespace-pre-wrap break-words">
                      {incidencia._raw?.resolucion_textual || 'No se proporcionaron detalles de resolución.'}
                    </p>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-1 text-gray-700">
                        <CheckCircle size={13} className="text-green-500" />
                        <span className="font-semibold text-gray-500 mr-1">Resolvió:</span>
                        <span className="font-bold">{incidencia._raw?.usuarioResuelve?.nombre_completo || 'Usuario Desconocido'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-700">
                        <Calendar size={13} className="text-gray-400" />
                        <span className="font-semibold text-gray-500 mr-1">Fecha:</span>
                        <span className="font-medium">
                          {incidencia._raw?.fecha_resolucion 
                            ? new Date(incidencia._raw.fecha_resolucion).toLocaleString('es-MX', {
                                dateStyle: 'long',
                                timeStyle: 'short'
                              }) 
                            : 'Fecha no registrada'}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Notas de Seguimiento */}
              <section className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <AlignLeft size={16} className="text-gray-500" /> Notas de Seguimiento
                </h3>
                
                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin">
                  {isLoadingNotas ? (
                    <p className="text-sm text-gray-500 text-center py-4">Cargando notas...</p>
                  ) : notas.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                      No hay notas registradas para esta incidencia.
                    </p>
                  ) : (
                    notas.map((n) => {
                      const fecha = n.fecha_creacion ? new Date(n.fecha_creacion).toLocaleString('es-MX', {
                        dateStyle: 'short', timeStyle: 'short'
                      }) : '--:--';
                      return (
                        <div key={n.id_nota} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                          <p className="text-xs text-gray-800 bg-white p-2 rounded border border-gray-100 mb-2 leading-relaxed break-words whitespace-pre-wrap">
                            {n.contenido_nota}
                          </p>
                          <div className="flex items-center justify-between text-gray-500 text-[10px] sm:text-xs">
                            <span className="font-medium flex items-center gap-1">
                              <User size={10} /> {n.usuarioAutor?.nombre_completo || 'Sistema'}
                            </span>
                            <span className="flex items-center gap-1 text-gray-400">
                              <Clock size={10} /> {fecha}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

            </div>
          </div>
        </div>
        
        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end bg-white">
          <button onClick={onClose} className="px-5 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 font-semibold text-sm rounded-lg transition-colors">
            Cerrar Detalles
          </button>
        </div>

      </div>
    </div>
  );
}
