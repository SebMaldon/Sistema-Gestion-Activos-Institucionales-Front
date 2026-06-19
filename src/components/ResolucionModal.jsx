import React, { useState } from 'react';
import { X, CheckCircle, Loader2, Users } from 'lucide-react';
import ReactDOM from 'react-dom';
/**
 * ResolucionModal
 *
 * Props:
 * isOpen – boolean
 * onClose – () => void
 * onConfirm – (incidenciaId, resolucion_textual) => Promise<void>
 * incidencia – objeto incidencia completo (shape de mapIncidenciaNode)
 * Necesitamos: incidencia.id y incidencia._raw.bien.unidad.id_unidad
 */
export default function ResolucionModal({ isOpen, onClose, onConfirm, incidencia }) {
 const [resolucion, setResolucion] = useState('');
 const [isSaving, setIsSaving] = useState(false);
 const [errors, setErrors] = useState({});

 if (!isOpen || !incidencia) return null;

 const validate = () => {
 const newErrors = {};
 if (!resolucion.trim()) newErrors.resolution = 'La descripción de la resolución es obligatoria';
 else if (resolucion.trim().length < 5) newErrors.resolution = 'Proporcione más detalles sobre la solución';
 
 setErrors(newErrors);
 return Object.keys(newErrors).length === 0;
 };

 const handleSubmit = async (e) => {
 e.preventDefault();
 if (!validate()) return;

 setIsSaving(true);
 try {
 await onConfirm(incidencia.id, resolucion.trim());
 setResolucion('');
 setErrors({});
 } catch (err) {
 setErrors(prev => ({ ...prev, global: 'Error al procesar la resolución' }));
 } finally {
 setIsSaving(false);
 }
 };

 const handleCerrar = () => {
 setResolucion('');
 setErrors({});
 onClose();
 };

 return ReactDOM.createPortal(
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 fade-in">
 <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

 {/* HEADER */}
 <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-[#00472e] dark:bg-[#002618]">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white">
 <CheckCircle size={20} />
 </div>
 <div>
 <h2 className="text-lg font-bold text-white">Finalizar Incidencia</h2>
 <p className="text-xs text-gray-200 dark:text-gray-300">
 ID: {incidencia.id} — {incidencia.numSerie}
 </p>
 </div>
 </div>
 <button onClick={handleCerrar} className="p-2 text-white hover:bg-[#003824] dark:hover:bg-[#003824] rounded-full transition-colors">
 <X size={20} />
 </button>
 </div>

 {/* BODY */}
 <form id="resolucion-form" onSubmit={handleSubmit} className="p-6 space-y-5">

 {/* Detalle de la resolución */}
 <div>
 <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
 Detalles de la Resolución <span className="text-red-500">*</span>
 </label>
 <textarea
 value={resolucion}
 onChange={(e) => {
 setResolucion(e.target.value);
 if (e.target.value.trim()) setErrors(prev => ({ ...prev, resolution: null }));
 }}
 rows="4"
 placeholder="Describa cómo se solucionó la falla, piezas cambiadas, etc..."
 className={`w-full px-3 py-2 text-sm border ${errors.resolution ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600 '} rounded-lg focus:ring-2 focus:ring-green-500 outline-none resize-none transition-all`}
 />
 {errors.resolution && <p className="text-[10px] font-bold text-red-600 dark:text-red-400 mt-1">{errors.resolution}</p>}
 </div>

 {errors.global && (
 <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 dark:text-red-300 rounded-xl border border-red-100 dark:border-red-800/50 text-xs font-bold animate-pulse">
 {errors.global}
 </div>
 )}
 </form>

 {/* FOOTER */}
 <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex items-center justify-end gap-3">
 <button type="button" onClick={handleCerrar} disabled={isSaving} className="px-5 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
 Cancelar
 </button>
 <button
 type="submit"
 form="resolucion-form"
 disabled={isSaving || !resolucion.trim()}
 className="px-6 py-2 bg-[#00472e] dark:bg-[#00472e] text-white text-sm font-semibold rounded-lg hover:bg-[#003824] dark:hover:bg-[#003824] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
 {isSaving ? 'Guardando...' : 'Marcar como Resuelto'}
 </button>
 </div>
 </div>
 </div>,
 document.body
 );
}