import React, { useState } from 'react';
import { X, CheckCircle, Loader2, Users } from 'lucide-react';
import { useRotacionesPorUnidad, useUsuariosActivos } from '../hooks/useIncidencias';

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

  // Obtener id_unidad del bien para consultar la rotación
  const idUnidad = incidencia?._raw?.bien?.unidad?.id_unidad ?? null;

  // Técnicos en rotación para esa unidad
  const { data: rotaciones = [], isLoading: loadingRot } = useRotacionesPorUnidad(idUnidad);

  // Fallback: todos los usuarios activos si no hay rotación en esa unidad
  const { data: todosUsuarios = [], isLoading: loadingUsuarios } = useUsuariosActivos();

  if (!isOpen || !incidencia) return null;

  // Usar técnicos de rotación; si está vacío usar todos los usuarios activos
  const tieneRotacion = rotaciones.length > 0;
  const loadingOpts   = tieneRotacion ? loadingRot : loadingUsuarios;

  const opciones = tieneRotacion
    ? rotaciones.map(r => ({ id: r.id_usuario, nombre: r.usuario?.nombre_completo, matricula: r.usuario?.matricula }))
    : todosUsuarios.map(u => ({ id: u.id_usuario, nombre: u.nombre_completo, matricula: u.matricula }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resolucion.trim()) return;
    if (!idUsuarioResuelve)  { alert('Selecciona quién resolvió la incidencia.'); return; }

    setIsSaving(true);
    try {
      await onConfirm(incidencia.id, resolucion.trim(), parseInt(idUsuarioResuelve));
      setResolucion('');
      setIdUsuarioResuelve('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCerrar = () => {
    setResolucion('');
    setIdUsuarioResuelve('');
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

            {/* Badge: si mostramos desde rotación o desde todos */}
            <div className="flex items-center gap-2 mb-2">
              {loadingOpts ? (
                <span className="text-xs text-gray-400 flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Cargando personal...</span>
              ) : tieneRotacion ? (
                <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                  Personal en rotación para esta unidad
                </span>
              ) : (
                <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                  Sin rotación configurada — mostrando todos los usuarios
                </span>
              )}
            </div>

            <select
              value={idUsuarioResuelve}
              onChange={(e) => setIdUsuarioResuelve(e.target.value)}
              required
              disabled={loadingOpts}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">{loadingOpts ? 'Cargando...' : 'Seleccione quien resolvió...'}</option>
              {opciones.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {opt.nombre}{opt.matricula ? ` (${opt.matricula})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Detalle de la resolución */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Detalles de la Resolución <span className="text-red-500">*</span>
            </label>
            <textarea
              value={resolucion}
              onChange={(e) => setResolucion(e.target.value)}
              rows="4"
              placeholder="Describa cómo se solucionó la falla, piezas cambiadas, etc..."
              required
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none resize-none"
            />
          </div>
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