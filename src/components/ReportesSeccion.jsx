import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { useApp } from '../context/AppContext';
import { 
 GET_REPORTES_GARANTIA, 
 CREATE_REPORTE_GARANTIA, 
 UPDATE_REPORTE_GARANTIA, 
 DELETE_REPORTE_GARANTIA 
} from '../api/garantias.queries';
import { 
 Plus, Edit, Trash2, ShieldAlert, Calendar, CheckCircle2,
 Clock, Hammer, Wrench, PackageSearch, AlertCircle, Info, X
} from 'lucide-react';
import { formatDate } from '../lib/utils';

// Constantes de estatus
const ESTATUS_OPTIONS = [
 'Enviado a proveedor',
 'En revisión',
 'En reparación',
 'Esperando piezas',
 'Listo para recoger',
 'Resuelto / Entregado',
 'Rechazado'
];

function EstatusIcon({ estatus, size = 16 }) {
 switch (estatus) {
 case 'Enviado a proveedor': return <PackageSearch size={size} className="text-blue-500" />;
 case 'En revisión': return <Clock size={size} className="text-purple-500" />;
 case 'En reparación': return <Hammer size={size} className="text-orange-500" />;
 case 'Esperando piezas': return <Wrench size={size} className="text-amber-500" />;
 case 'Listo para recoger': return <CheckCircle2 size={size} className="text-teal-500" />;
 case 'Resuelto / Entregado': return <CheckCircle2 size={size} className="text-emerald-500" />;
 case 'Rechazado': return <ShieldAlert size={size} className="text-red-500" />;
 default: return <Info size={size} className="text-gray-400" />;
 }
}

export default function ReportesSeccion({ garantia, readOnly = false }) {
 const { showToast } = useApp();
 const qc = useQueryClient();
 const [editingReporte, setEditingReporte] = useState(null);
 const [isCreating, setIsCreating] = useState(false);
 const [reporteToDelete, setReporteToDelete] = useState(null);

 const [form, setForm] = useState({
 estatus: 'Enviado a proveedor',
 descripcion_falla: '',
 resolucion: ''
 });

 const { data: reportes = [], isLoading } = useQuery({
 queryKey: ['reportesGarantia', garantia.id_garantia],
 queryFn: () => gqlClient.request(GET_REPORTES_GARANTIA, { id_garantia: garantia.id_garantia }),
 select: d => d.reportesPorGarantia ?? []
 });

 const createMut = useMutation({
 mutationFn: (vars) => gqlClient.request(CREATE_REPORTE_GARANTIA, vars),
 onSuccess: () => {
 qc.invalidateQueries({ queryKey: ['reportesGarantia', garantia.id_garantia] });
 qc.invalidateQueries({ queryKey: ['garantias'] });
 showToast('Reporte registrado exitosamente', 'success');
 resetForm();
 },
 onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al registrar reporte', 'error')
 });

 const updateMut = useMutation({
 mutationFn: (vars) => gqlClient.request(UPDATE_REPORTE_GARANTIA, vars),
 onSuccess: () => {
 qc.invalidateQueries({ queryKey: ['reportesGarantia', garantia.id_garantia] });
 qc.invalidateQueries({ queryKey: ['garantias'] });
 showToast('Reporte actualizado', 'success');
 resetForm();
 },
 onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al actualizar reporte', 'error')
 });

 const deleteMut = useMutation({
 mutationFn: (vars) => gqlClient.request(DELETE_REPORTE_GARANTIA, vars),
 onSuccess: () => {
 qc.invalidateQueries({ queryKey: ['reportesGarantia', garantia.id_garantia] });
 qc.invalidateQueries({ queryKey: ['garantias'] });
 showToast('Reporte eliminado', 'success');
 setReporteToDelete(null);
 },
 onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al eliminar reporte', 'error')
 });

 const handleEditClick = (rep) => {
 setEditingReporte(rep);
 setIsCreating(false);
 setForm({
 estatus: rep.estatus,
 descripcion_falla: rep.descripcion_falla,
 resolucion: rep.resolucion || ''
 });
 };

 const handleCreateClick = () => {
 setIsCreating(true);
 setEditingReporte(null);
 setForm({
 estatus: 'Enviado a proveedor',
 descripcion_falla: '',
 resolucion: ''
 });
 };

 const resetForm = () => {
 setIsCreating(false);
 setEditingReporte(null);
 setForm({ estatus: 'Enviado a proveedor', descripcion_falla: '', resolucion: '' });
 };

 const handleSubmit = (e) => {
 e.preventDefault();
 if (!form.descripcion_falla.trim()) {
 showToast('La descripción es obligatoria', 'warning');
 return;
 }

 if (isCreating) {
 createMut.mutate({
 id_garantia: garantia.id_garantia,
 id_bien: garantia.id_bien,
 num_serie: garantia.bien?.num_serie,
 estatus: form.estatus,
 descripcion_falla: form.descripcion_falla,
 resolucion: form.resolucion
 });
 } else if (editingReporte) {
 updateMut.mutate({
 id_reporte_garantia: editingReporte.id_reporte_garantia,
 estatus: form.estatus,
 descripcion_falla: form.descripcion_falla,
 resolucion: form.resolucion
 });
 }
 };

 return (
 <div className="w-full">
 {/* Content */}
 <div className="w-full">
 {/* Listado de Reportes */}
 {!isCreating && !editingReporte ? (
 <div className="space-y-4">
 <div className="flex justify-between items-center mb-4">
 <h4 className="font-semibold text-slate-700 dark:text-slate-300 text-lg">Bitácora de Seguimiento</h4>
 {!readOnly && (
 <button type="button" onClick={handleCreateClick}
 className="bg-[#006341] hover:bg-[#004d32] text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm">
 <Plus size={16} /> Nueva Nota
 </button>
 )}
 </div>

 {isLoading ? (
 <div className="text-center py-10 text-slate-500">Cargando notas...</div>
 ) : reportes.length === 0 ? (
 <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700/50 rounded-xl p-8 text-center shadow-sm">
 <div className="bg-slate-100 dark:bg-slate-800/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
 <ShieldAlert size={32} className="text-slate-400" />
 </div>
 <h5 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">Sin seguimiento registrado</h5>
 <p className="text-sm text-slate-500 mb-4">No hay notas de seguimiento registradas para este bien.</p>
 {!readOnly && (
 <button type="button" onClick={handleCreateClick} className="text-[#006341] hover:underline font-semibold text-sm">
 Registrar primera nota
 </button>
 )}
 </div>
 ) : (
 <div className="space-y-4">
 {reportes.map(rep => (
 <div key={rep.id_reporte_garantia} className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
 <div className="bg-slate-100 dark:bg-slate-800/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800/50 px-4 py-3 flex justify-between items-center">
 <div className="flex items-center gap-2">
 <EstatusIcon estatus={rep.estatus} size={18} />
 <span className="font-bold text-slate-800 dark:text-slate-200">{rep.estatus}</span>
 </div>
 {!readOnly && (
 <div className="flex items-center gap-2">
 <button type="button" onClick={() => handleEditClick(rep)} className="p-1.5 text-slate-400 hover:text-[#006341] rounded bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700/50 shadow-sm transition-colors" title="Editar nota">
 <Edit size={14} />
 </button>
 <button type="button" onClick={() => setReporteToDelete(rep)} className="p-1.5 text-slate-400 hover:text-red-600 rounded bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700/50 shadow-sm transition-colors" title="Eliminar nota">
 <Trash2 size={14} />
 </button>
 </div>
 )}
 </div>
 <div className={`p-4 grid grid-cols-1 ${['Resuelto / Entregado', 'Listo para recoger'].includes(rep.estatus) ? 'md:grid-cols-2' : ''} gap-4`}>
 <div>
 <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Detalles de la Nota</p>
 <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{rep.descripcion_falla}</p>
 </div>
 {['Resuelto / Entregado', 'Listo para recoger'].includes(rep.estatus) && (
 <div>
 <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Resolución</p>
 {rep.resolucion ? (
 <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{rep.resolucion}</p>
 ) : (
 <p className="text-sm text-slate-400 italic">Sin resolución registrada aún.</p>
 )}
 </div>
 )}
 </div>
 <div className="bg-slate-50 dark:bg-slate-900/20 px-4 py-2 border-t border-slate-100 dark:border-slate-800/50 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
 <div className="flex items-center gap-1.5">
 <Calendar size={13} /> Registrado: <span className="font-semibold text-slate-700 dark:text-slate-300">{new Date(Number(rep.fecha_reporte) || rep.fecha_reporte).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</span>
 </div>
 {rep.fecha_resolucion && (
 <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
 <CheckCircle2 size={13} /> Resuelto: <span className="font-semibold">{new Date(Number(rep.fecha_resolucion) || rep.fecha_resolucion).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</span>
 </div>
 )}
 <div className="flex items-center gap-1.5 ml-auto">
 Por: <span className="font-semibold text-slate-700 dark:text-slate-300">{rep.usuarioRegistra?.nombre_completo || 'Sistema'}{rep.usuarioRegistra?.matricula ? ` (${rep.usuarioRegistra.matricula})` : ''}</span>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 ) : (
 /* Formulario Crear/Editar */
 <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm overflow-hidden">
 <div className="bg-slate-50 dark:bg-slate-900/20 px-5 py-4 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center">
 <h4 className="font-bold text-slate-800 dark:text-slate-200 text-lg">
 {isCreating ? 'Registrar Nueva Nota' : 'Editar Nota'}
 </h4>
 <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-600 dark:text-slate-400">
 <X size={20} />
 </button>
 </div>
 <div className="p-5 space-y-4">
 <div>
 <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Estatus de la Nota</label>
 <select 
 value={form.estatus}
 onChange={e => setForm(p => ({ ...p, estatus: e.target.value }))}
 className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600/50 rounded-lg focus:ring-2 focus:ring-[#006341] focus:border-[#006341] outline-none transition-all"
 >
 {ESTATUS_OPTIONS.map(opt => (
 <option key={opt} value={opt}>{opt}</option>
 ))}
 </select>
 </div>
 <div>
 <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
 <textarea 
 value={form.descripcion_falla}
 onChange={e => setForm(p => ({ ...p, descripcion_falla: e.target.value }))}
 placeholder="Detalles sobre el problema, envío, revisión, etc..."
 rows={4}
 className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600/50 rounded-lg focus:ring-2 focus:ring-[#006341] focus:border-[#006341] outline-none transition-all resize-none"
 />
 </div>
 {['Resuelto / Entregado', 'Listo para recoger'].includes(form.estatus) && (
 <div>
 <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Resolución / Diagnóstico del Proveedor</label>
 <textarea 
 value={form.resolucion}
 onChange={e => setForm(p => ({ ...p, resolucion: e.target.value }))}
 placeholder="Detalles de la reparación o solución (opcional hasta que se resuelva)..."
 rows={3}
 className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600/50 rounded-lg focus:ring-2 focus:ring-[#006341] focus:border-[#006341] outline-none transition-all resize-none"
 />
 </div>
 )}
 
 {form.estatus === 'Resuelto / Entregado' && (
 <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 rounded-lg p-3 flex items-start gap-3">
 <Info className="text-emerald-500 mt-0.5 shrink-0" size={18} />
 <p className="text-xs text-emerald-800 dark:text-emerald-300">
 Al guardar con estatus <strong>Resuelto / Entregado</strong>, se registrará automáticamente la fecha de resolución al día de hoy.
 </p>
 </div>
 )}

 <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/50">
 <button type="button" onClick={resetForm} disabled={createMut.isPending || updateMut.isPending}
 className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 transition-colors">
 Cancelar
 </button>
 <button type="button" onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}
 className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-60"
 style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
 {createMut.isPending || updateMut.isPending ? 'Guardando...' : 'Guardar Nota'}
 </button>
 </div>
 </div>
 </div>
 )}
 </div>

 {/* Modal Eliminación */}
 {reporteToDelete && ReactDOM.createPortal(
 <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 ">
 <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-sm w-full">
 <div className="flex justify-center mb-4">
 <div className="bg-red-100 dark:bg-red-900/20 p-3 rounded-full">
 <AlertCircle size={32} className="text-red-600 dark:text-red-400" />
 </div>
 </div>
 <h4 className="text-center font-bold text-lg text-slate-800 dark:text-slate-200 mb-2">¿Eliminar nota?</h4>
 <p className="text-center text-sm text-slate-500 mb-6">
 Esta acción no se puede deshacer y el historial de este evento se perderá.
 </p>
 <div className="flex gap-3">
 <button type="button" onClick={() => setReporteToDelete(null)} disabled={deleteMut.isPending}
 className="flex-1 py-2 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold rounded-lg transition-colors">
 Cancelar
 </button>
 <button type="button" onClick={() => deleteMut.mutate({ id_reporte_garantia: reporteToDelete.id_reporte_garantia })} disabled={deleteMut.isPending}
 className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-sm transition-colors">
 {deleteMut.isPending ? 'Borrando...' : 'Sí, eliminar'}
 </button>
 </div>
 </div>
 </div>,
 document.body
 )}
 </div>
 );
}
