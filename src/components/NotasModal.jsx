import React, { useState } from 'react';
import { X, FileText } from 'lucide-react';
import ReactDOM from 'react-dom';

export default function NotaModal({ isOpen, onClose, onSave, incidenciaId }) {
 const [nota, setNota] = useState('');
 const [errors, setErrors] = useState({});

 if (!isOpen) return null;

 const handleSubmit = (e) => {
 e.preventDefault();
 if (!nota.trim()) {
 setErrors({ note: 'La nota no puede estar vacía' });
 return;
 }

 onSave(incidenciaId, nota);
 setNota(''); 
 setErrors({});
 };

 const handleClose = () => {
 setNota('');
 setErrors({});
 onClose();
 };

 return ReactDOM.createPortal(
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 fade-in">
 <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

 {/* HEADER */}
 <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-[#00472e] dark:bg-[#002618]">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
 <FileText size={16} />
 </div>
 <div>
 <h2 className="text-sm font-bold text-white">Agregar Nota de Seguimiento</h2>
 <p className="text-xs text-gray-200 dark:text-gray-300">ID: {incidenciaId}</p>
 </div>
 </div>
 <button onClick={handleClose} className="p-1.5 text-white hover:bg-[#003824] dark:hover:bg-[#003824] rounded-full transition-colors">
 <X size={18} />
 </button>
 </div>

 {/* BODY */}
 <form id="nota-form" onSubmit={handleSubmit} className="p-5">
 <textarea
 value={nota}
 onChange={(e) => {
 setNota(e.target.value);
 if (e.target.value.trim()) setErrors({});
 }}
 rows="3"
 placeholder="Ej. Se solicitó la fuente de poder al almacén. Esperando respuesta..."
 autoFocus
 className={`w-full px-3 py-2 text-sm border ${errors.note ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600 '} rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-all`}
 />
 {errors.note && <p className="text-[10px] font-bold text-red-600 dark:text-red-400 mt-1">{errors.note}</p>}
 </form>

 {/* FOOTER */}
 <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex items-center justify-end gap-2">
 <button
 type="button"
 onClick={handleClose}
 className="px-4 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
 >
 Cancelar
 </button>
 <button
 type="submit"
 form="nota-form"
 className="px-4 py-1.5 bg-[#00472e] dark:bg-[#00472e] text-white text-xs font-semibold rounded-lg hover:bg-[#003824] dark:hover:bg-[#003824] transition-colors"
 >
 Guardar Nota
 </button>
 </div>

 </div>
 </div>,
 document.body
 );
}