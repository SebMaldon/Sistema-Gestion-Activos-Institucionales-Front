import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { X, CheckCircle, Clock, AlertTriangle, Loader2 } from 'lucide-react';

export function FinalizarPrestamoModal({ isOpen, onClose, onConfirm, bien, nuevoEstatus, isLoading }) {
  // Obtener fecha y hora local para default del input datetime-local
  const getLocalIsoString = () => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);
    return localISOTime;
  };

  const [fechaEntrega, setFechaEntrega] = useState(getLocalIsoString);
  const [descripcion, setDescripcion] = useState('');

  if (!isOpen) return null;

  const prestamo = bien?.prestamoActivo || bien?.prestamos?.[0];
  const fechaPlazo = prestamo?.fecha_a_terminar_prestamo ? new Date(prestamo.fecha_a_terminar_prestamo) : null;
  const fechaReal = fechaEntrega ? new Date(fechaEntrega) : new Date();

  // Comparación de cumplimiento
  let estadoCumplimiento = null;
  if (fechaPlazo) {
    const dPlazo = new Date(fechaPlazo.getFullYear(), fechaPlazo.getMonth(), fechaPlazo.getDate());
    const dReal = new Date(fechaReal.getFullYear(), fechaReal.getMonth(), fechaReal.getDate());
    
    if (dReal < dPlazo) {
      estadoCumplimiento = { texto: 'Devuelto antes de la fecha acordada', color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800', icono: CheckCircle };
    } else if (dReal.getTime() === dPlazo.getTime()) {
      estadoCumplimiento = { texto: 'Devuelto exactamente en la fecha acordada', color: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800', icono: CheckCircle };
    } else {
      const diasRetraso = Math.ceil((dReal.getTime() - dPlazo.getTime()) / (1000 * 60 * 60 * 24));
      estadoCumplimiento = { texto: `Devuelto con ${diasRetraso} día(s) de retraso`, color: 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800', icono: AlertTriangle };
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fechaEntrega) {
      alert('Por favor indica la fecha real de entrega.');
      return;
    }
    if (!descripcion || descripcion.trim().length === 0) {
      alert('Por favor ingresa las observaciones de finalización.');
      return;
    }
    onConfirm({
      estatus_operativo_nuevo: nuevoEstatus,
      fecha_entrega: new Date(fechaEntrega).toISOString(),
      descripcion_prestamo_finalizacion: descripcion.trim(),
    });
  };

  const labelCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5';
  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100';

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/70 fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
              <CheckCircle size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Finalizar Préstamo / Devolución</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Nuevo estatus: <span className="font-bold text-emerald-600 dark:text-emerald-400">{nuevoEstatus}</span>
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={isLoading} className="p-2 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <form id="finalizar-prestamo-form" onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {fechaPlazo && (
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-center text-xs">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5 font-medium">
                <Clock size={14} /> Fecha acordada de devolución:
              </span>
              <span className="font-bold text-gray-800 dark:text-gray-200">
                {fechaPlazo.toLocaleDateString('es-MX')}
              </span>
            </div>
          )}

          <div>
            <label className={labelCls}>
              Fecha y Hora real de entrega <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="datetime-local"
              value={fechaEntrega}
              onChange={e => setFechaEntrega(e.target.value)}
              className={inputCls}
              disabled={isLoading}
            />
          </div>

          {estadoCumplimiento && (
            <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${estadoCumplimiento.color}`}>
              <estadoCumplimiento.icono size={16} className="shrink-0" />
              <span>{estadoCumplimiento.texto}</span>
            </div>
          )}

          <div>
            <label className={labelCls}>
              Observaciones de Finalización <span className="text-red-500 font-bold">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Indica en qué condiciones se devuelve el equipo, si reportaron alguna falla, si falta algún cable, etc."
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
            form="finalizar-prestamo-form"
            disabled={isLoading}
            className="px-5 py-2 text-sm font-semibold text-white rounded-lg transition-colors flex items-center gap-2 shadow-md hover:opacity-95"
            style={{ backgroundColor: '#059669' }}
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            Registrar Devolución
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
