import React from 'react';
import { X, Clock, Calendar, User, Users, FileText, CheckCircle, Info, Wrench, Monitor, Building2, AlignLeft, Send, Activity, Trash2 } from 'lucide-react';
import ReactDOM from 'react-dom';
import { useNotasIncidencia } from '../hooks/useIncidencias';
import { parseServerDate } from '../lib/utils';

export default function DetalleIncidenciaModal({ isOpen, onClose, incidencia, onDeleteNota }) {
 // Cargar notas de la incidencia (el hook maneja enabled internamente si el id es null)
 const { data: notas = [], isLoading: isLoadingNotas } = useNotasIncidencia(incidencia?.id);

 if (!isOpen || !incidencia) return null;



 const eBadge =
 incidencia.estatus === 'Resuelto' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 dark:text-green-300' :
 incidencia.estatus === 'En proceso' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 dark:text-blue-300' :
 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400';

 return ReactDOM.createPortal(
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 fade-in" onClick={onClose}>
 <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
 
 {/* HEADER */}
 <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-[#00472e] dark:bg-[#002618]">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white">
 <Info size={20} />
 </div>
 <div>
 <h2 className="text-xl font-bold text-white flex items-center gap-2">
 Detalles de Incidencia 
 <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase bg-white text-[#00472e]`}>
 {incidencia.estatus}
 </span>
 </h2>
 <p className="text-sm text-gray-200 dark:text-gray-300">ID: {incidencia.id} — Creada el {incidencia.fecha} a las {incidencia.horaCreacion || '--:--'}</p>
 </div>
 </div>
 <button onClick={onClose} className="p-2 text-white hover:bg-[#003824] dark:hover:bg-[#003824] rounded-full transition-colors">
 <X size={20} />
 </button>
 </div>

 {/* BODY */}
 <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 dark:bg-gray-900/20">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 
 {/* Columna Izquierda: Detalles del Equipo y Falla */}
 <div className="space-y-6">
 
 {/* Info del Equipo */}
 <section className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
 <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
 <Monitor size={16} className="text-blue-500" /> Información del Equipo
 </h3>
 <div className="space-y-3 text-sm">
 <div className="flex justify-between gap-4">
 <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Número de Serie:</span>
 <span className="font-semibold text-gray-900 dark:text-gray-100 break-words text-right">{incidencia.numSerie}</span>
 </div>
 <div className="flex justify-between gap-4">
 <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Alias:</span>
 <span className="font-semibold text-blue-600 dark:text-blue-400 break-words text-right">{incidencia.alias || '—'}</span>
 </div>
 <div className="flex justify-between gap-4">
 <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Requerimiento:</span>
 <span className="font-semibold text-gray-900 dark:text-gray-100 break-words text-right">{incidencia.requerimiento || '—'}</span>
 </div>
 <div className="flex justify-between gap-4">
 <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Equipo:</span>
 <span className="font-semibold text-gray-900 dark:text-gray-100 text-right break-words overflow-hidden" title={incidencia.equipo}>{incidencia.equipo}</span>
 </div>
 <div className="flex justify-between items-center gap-4">
 <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Unidad:</span>
 <span className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1 text-right break-words">
 <Building2 size={13} className="text-gray-400 flex-shrink-0" /> {incidencia.unidad || 'Sin unidad'}
 </span>
 </div>
 </div>
 </section>

 {/* Usuarios Involucrados */}
 <section className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
 <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
 <Users size={16} className="text-purple-500" /> Personal Involucrado
 </h3>
 <div className="space-y-4 text-sm bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">


 <div>
 <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Registrado en sistema por</span>
 <span className="font-medium text-gray-800 dark:text-gray-200 break-words block">
 {incidencia.matriculaGenera ? `${incidencia.matriculaGenera} - ` : ''}{incidencia.generadoPor || 'Sin nombre registrado'}
 </span>
 </div>
 </div>
 </section>

 </div>

 {/* Columna Derecha: Falla, Resolución y Notas */}
 <div className="space-y-6">
 
 {/* Descripción de Falla */}
 <section className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm border-l-4 border-l-red-400">
 <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
 <Activity size={16} className="text-red-500" /> Descripción de la Falla
 </h3>
 <p className="text-sm text-gray-700 dark:text-gray-300 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-50 dark:border-red-800/50 break-words whitespace-pre-wrap">
 {incidencia.falla || 'Sin descripción.'}
 </p>
 <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
 <span className="font-medium bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md text-gray-600 dark:text-gray-400 ">Tipo: {incidencia.tipoIncidencia}</span>
 </div>
 </section>

 {/* Resolución */}
 {incidencia.estatus === 'Resuelto' && (
 <section className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm border-l-4 border-l-green-500">
 <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
 <CheckCircle size={16} className="text-green-600 dark:text-green-400" /> Detalles de Resolución
 </h3>
 
 <div className="space-y-3">
 <p className="text-sm text-gray-700 dark:text-gray-300 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-100 dark:border-green-800/50 leading-relaxed whitespace-pre-wrap break-words">
 {incidencia._raw?.resolucion_textual || 'No se proporcionaron detalles de resolución.'}
 </p>
 
 <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-xs bg-gray-50 dark:bg-gray-900 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 ">
 <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300 ">
 <Calendar size={13} className="text-gray-400" />
 <span className="font-semibold text-gray-500 dark:text-gray-400 mr-1">Fecha:</span>
 <span className="font-medium">
 {(() => {
 const d = parseServerDate(incidencia._raw?.fecha_resolucion);
 return d ? d.toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' }) : 'Fecha no registrada';
 })()}
 </span>
 </div>
 </div>
 </div>
 </section>
 )}

 {/* Notas de Seguimiento */}
 <section className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
 <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
 <AlignLeft size={16} className="text-gray-500 dark:text-gray-400 " /> Notas de Seguimiento
 </h3>
 
 <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin">
 {isLoadingNotas ? (
 <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Cargando notas...</p>
 ) : notas.length === 0 ? (
 <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 ">
 No hay notas registradas para esta incidencia.
 </p>
 ) : (
 notas.map((n) => {
 const fecha = n.fecha_creacion ? new Date(n.fecha_creacion).toLocaleString('es-MX', {
 dateStyle: 'short', timeStyle: 'short'
 }) : '--:--';
 return (
 <div key={n.id_nota} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-100 dark:border-gray-800 relative group/nota">
 <p className="text-xs text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-800 mb-2 leading-relaxed break-words whitespace-pre-wrap pr-8">
 {n.contenido_nota}
 </p>
 <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-[10px] sm:text-xs mt-1">
 <div className="flex items-center gap-3">
 <span className="font-medium flex items-center gap-1">
 <User size={10} /> {n.usuarioAutor?.nombre_completo || 'Sistema'}
 </span>
 <span className="flex items-center gap-1 text-gray-400">
 <Clock size={10} /> {(() => {
 const d = parseServerDate(n.fecha_creacion);
 return d ? d.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '--:--';
 })()}
 </span>
 </div>
 {onDeleteNota && (
 <button 
 onClick={(e) => { e.stopPropagation(); if(window.confirm('¿Eliminar esta nota?')) onDeleteNota(n.id_nota, incidencia.id); }}
 className="opacity-0 group-hover/nota:opacity-100 p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500 transition-all absolute right-4 top-4"
 title="Eliminar Nota"
 >
 <Trash2 size={13} />
 </button>
 )}
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
 <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end bg-gray-50 dark:bg-gray-900">
 <button onClick={onClose} className="px-5 py-2 bg-[#00472e] dark:bg-[#00472e] text-white hover:bg-[#003824] dark:hover:bg-[#003824] font-semibold text-sm rounded-lg transition-colors">
 Cerrar Detalles
 </button>
 </div>

 </div>
 </div>,
 document.body
 );
}
