import React, { useState } from 'react';
import { X, CheckCircle, Loader2, Users } from 'lucide-react';
import { useUsuariosActivos } from '../hooks/useIncidencias';

/**
 * ResolucionModal
 *
 * Props:
 *   isOpen        – boolean
 *   onClose       – () => void
 *   onConfirm     – (incidenciaId, resolucion_textual, id_usuario_resuelve) => Promise<void>
 *   incidencia    – objeto incidencia completo (shape de mapIncidenciaNode)
 *                   Necesitamos: incidencia.id y incidencia._raw.bien.unidad.id_unidad
 */
export default function ResolucionModal({ isOpen, onClose, onConfirm, incidencia }) {
  const [resolucion, setResolucion]         = useState('');
  const [idUsuarioResuelve, setIdUsuarioResuelve] = useState('');
  const [isSaving, setIsSaving]             = useState(false);
  const [errors, setErrors] = useState({});

  // Todos los usuarios activos
  const { data: todosUsuarios = [], isLoading: loadingUsuarios } = useUsuariosActivos();

  if (!isOpen || !incidencia) return null;

  const loadingOpts = loadingUsuarios;
  const opciones    = todosUsuarios.map(u => ({ id: u.id_usuario, nombre: u.nombre_completo, matricula: u.matricula }));

  const validate = () => {
    const newErrors = {};
    if (!resolucion.trim()) newErrors.resolution = 'La descripción de la resolución es obligatoria';
    else if (resolucion.trim().length < 5) newErrors.resolution = 'Proporcione más detalles sobre la solución';
    
    if (!idUsuarioResuelve) newErrors.resolver = 'Debe seleccionar al personal que resolvió';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      await onConfirm(incidencia.id, resolucion.trim(), parseInt(idUsuarioResuelve));
      setResolucion('');
      setIdUsuarioResuelve('');
      setErrors({});
    } catch (err) {
      setErrors(prev => ({ ...prev, global: 'Error al procesar la resolución' }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCerrar = () => {
    setResolucion('');
    setIdUsuarioResuelve('');
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 fade-in" onClick={handleCerrar}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* HEADER */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-green-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <CheckCircle size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Finalizar Incidencia</h2>
              <p className="text-xs text-gray-500">
                ID: {incidencia.id} — {incidencia.numSerie}
              </p>
            </div>
          </div>
          <button onClick={handleCerrar} className="p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-700 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <form id="resolucion-form" onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Selección de quién resolvió */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
              <Users size={13} className="text-green-600" />
              ¿Quién resolvió la incidencia? <span className="text-red-500">*</span>
            </label>

            <select
              value={idUsuarioResuelve}
              onChange={(e) => {
                setIdUsuarioResuelve(e.target.value);
                setErrors(prev => ({ ...prev, resolver: null }));
              }}
              disabled={loadingOpts}
              className={`w-full px-3 py-2 text-sm border ${errors.resolver ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white disabled:bg-gray-50 disabled:text-gray-400 transition-all`}
            >
              <option value="">{loadingOpts ? 'Cargando...' : 'Seleccione quien resolvió...'}</option>
              {opciones.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {opt.nombre}{opt.matricula ? ` (${opt.matricula})` : ''}
                </option>
              ))}
            </select>
            {errors.resolver && <p className="text-[10px] font-bold text-red-600 mt-1">{errors.resolver}</p>}
          </div>

          {/* Detalle de la resolución */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
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
              className={`w-full px-3 py-2 text-sm border ${errors.resolution ? 'border-red-500 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-500 outline-none resize-none transition-all`}
            />
            {errors.resolution && <p className="text-[10px] font-bold text-red-600 mt-1">{errors.resolution}</p>}
          </div>

          {errors.global && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-100 text-xs font-bold animate-pulse">
              {errors.global}
            </div>
          )}
        </form>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
          <button type="button" onClick={handleCerrar} disabled={isSaving} className="px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
            Cancelar
          </button>
          <button
            type="submit"
            form="resolucion-form"
            disabled={isSaving || !resolucion.trim() || !idUsuarioResuelve}
            className="px-6 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            {isSaving ? 'Guardando...' : 'Marcar como Resuelto'}
          </button>
        </div>
      </div>
    </div>
  );
}