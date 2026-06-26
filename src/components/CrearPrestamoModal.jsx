import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { X, Calendar, FileText, Share2, Loader2 } from 'lucide-react';

export function CrearPrestamoModal({ isOpen, onClose, onConfirm, bien, prestamoToEdit, isLoading }) {
  const [fechaTermino, setFechaTermino] = useState(() => prestamoToEdit?.fecha_a_terminar_prestamo ? prestamoToEdit.fecha_a_terminar_prestamo.split('T')[0] : '');
  const [descripcion, setDescripcion] = useState(() => prestamoToEdit?.descripcion_prestamo_inicio || '');

  // Efecto por si cambia prestamoToEdit con modal abierto
  React.useEffect(() => {
    if (prestamoToEdit) {
      setFechaTermino(prestamoToEdit.fecha_a_terminar_prestamo ? prestamoToEdit.fecha_a_terminar_prestamo.split('T')[0] : '');
      setDescripcion(prestamoToEdit.descripcion_prestamo_inicio || '');
    } else {
      setFechaTermino('');
      setDescripcion('');
    }
  }, [prestamoToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fechaTermino) {
      alert('Por favor selecciona la fecha estimada de devolución.');
      return;
    }
    if (!descripcion || descripcion.trim().length === 0) {
      alert('Por favor ingresa los detalles o motivo del préstamo.');
      return;
    }
    onConfirm({
      ...(prestamoToEdit ? { id_registro_prestamo: prestamoToEdit.id_registro_prestamo } : {}),
      fecha_a_terminar_prestamo: new Date(`${fechaTermino}T23:59:59`).toISOString(),
      descripcion_prestamo_inicio: descripcion.trim(),
    });
  };

  const labelCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5';
  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100';

  const isEditing = !!prestamoToEdit;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/70 fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-amber-50 dark:bg-amber-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-700 dark:text-amber-400">
              <Share2 size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{isEditing ? 'Extender / Editar Préstamo' : 'Registrar Préstamo de Equipo'}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {bien?.num_serie ? `Serie: ${bien.num_serie}` : (bien?.num_inv ? `Inv: ${bien.num_inv}` : 'Equipo seleccionado')}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={isLoading} className="p-2 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <form id="crear-prestamo-form" onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-xl text-xs flex gap-2.5 items-start">
            <Calendar size={16} className="shrink-0 mt-0.5" />
            <span>
              {isEditing 
                ? 'Modifica la fecha acordada de entrega para extender el plazo o corrige las observaciones iniciales de salida.'
                : 'Al confirmar, el estatus operativo del equipo cambiará automáticamente a PRÉSTAMO y quedará registrado en su ficha técnica.'}
            </span>
          </div>

          <div>
            <label className={labelCls}>
              Fecha estimada de devolución <span className="text-red-500 font-bold">*</span>
            </label>
            <input
              required
              type="date"
              value={fechaTermino}
              onChange={e => setFechaTermino(e.target.value)}
              className={inputCls}
              disabled={isLoading}
            />
            <p className="text-[11px] text-gray-400 mt-1">Obligatorio: Sirve para alertar si el equipo no se devuelve a tiempo.</p>
          </div>

          <div>
            <label className={labelCls}>
              Detalles y Motivo del Préstamo <span className="text-red-500 font-bold">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Indica a quién se presta, área destino, accesorios incluidos o cualquier nota importante..."
              className={inputCls}
              disabled={isLoading}
            />
          </div>
        </form>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="crear-prestamo-form"
            disabled={isLoading}
            className="px-5 py-2 text-sm font-semibold text-white rounded-lg transition-colors flex items-center gap-2 shadow-md hover:opacity-95"
            style={{ backgroundColor: '#d97706' }}
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            {isEditing ? 'Guardar Cambios' : 'Confirmar Préstamo'}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
