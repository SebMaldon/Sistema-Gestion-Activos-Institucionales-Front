import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import {
  useTiposIncidencia,
  useUsuariosActivos,
  useUnidades,
  useUpdateIncidencia,
} from '../hooks/useIncidencias';



/**
 * EditarIncidenciaModal
 * Props:
 *   isOpen       – boolean
 *   onClose      – () => void
 *   onUpdated    – () => void  (callback de éxito)
 *   incidencia   – objeto con los datos actuales de la incidencia (shape de mapIncidenciaNode)
 */
export default function EditarIncidenciaModal({ isOpen, onClose, onUpdated, incidencia }) {
  const { data: tiposIncidencia = [], isLoading: loadingTipos } = useTiposIncidencia();
  const { data: usuarios = [], isLoading: loadingUsuarios } = useUsuariosActivos();
  const { data: unidades = [], isLoading: loadingUnidades } = useUnidades();
  const updateIncidencia = useUpdateIncidencia();

  const [idTipo, setIdTipo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [unidadId, setUnidadId] = useState('');
  const [alias, setAlias] = useState('');
  const [requerimiento, setRequerimiento] = useState('');

  const [errors, setErrors] = useState({});

  // Pre-llenar con los datos actuales cada vez que abre o cambia la incidencia
  useEffect(() => {
    if (isOpen && incidencia) {
      setIdTipo(String(incidencia.id_tipo_incidencia ?? ''));
      setDescripcion(incidencia.falla ?? '');
      setAlias(incidencia.alias ?? '');
      setRequerimiento(incidencia.requerimiento ?? '');
      setErrors({});

      // Resolver el id_unidad desde el objeto que viene del mapIncidenciaNode o _raw
      const idU = incidencia._raw?.id_unidad || incidencia._raw?.bien?.unidad?.id_unidad;
      setUnidadId(idU ? String(idU) : '');
    }
  }, [isOpen, incidencia]);

  // useMemo: arrays de opciones estables entre renders
  const optsUsuarios = useMemo(() => usuarios.map(u => ({
    id: u.id_usuario,
    label: `${u.nombre_completo} (${u.matricula})`,
  })), [usuarios]);

  const optsUnidades = useMemo(() => unidades.map(u => ({
    id: u.id_unidad,
    label: u.nombre || u.no_ref,
  })), [unidades]);

  const validate = () => {
    const newErrors = {};
    if (!idTipo) newErrors.type = 'Seleccione el tipo de incidencia';
    if (!descripcion.trim()) newErrors.description = 'La descripción es obligatoria';
    else if (descripcion.trim().length < 5) newErrors.description = 'Descripción demasiado corta';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await updateIncidencia.mutateAsync({
        id_incidencia: String(incidencia.id),
        id_tipo_incidencia: idTipo ? parseInt(idTipo) : undefined,
        descripcion_falla: descripcion || undefined,
        id_unidad: unidadId ? parseInt(unidadId) : undefined,
        alias: alias || undefined,
        requerimiento: requerimiento || undefined,
      });
      onUpdated?.();
      onClose();
    } catch (err) {
      const msg = err?.response?.errors?.[0]?.message || 'Error al actualizar la incidencia';
      setErrors(prev => ({ ...prev, global: msg }));
    }
  }, [incidencia, idTipo, descripcion, unidadId, alias, requerimiento, updateIncidencia, onUpdated, onClose, validate]);

  if (!isOpen || !incidencia) return null;

  const isSaving = updateIncidencia.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* HEADER */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-amber-50/60">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Editar Incidencia</h2>
            <p className="text-xs text-gray-500">ID: {incidencia.id} — {incidencia.numSerie}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-700 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <form id="editar-incidencia-form" onSubmit={handleSubmit} className="space-y-5">

            {/* Tipo de incidencia */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tipo de Incidencia <span className="text-red-500">*</span></label>
              <select
                value={idTipo}
                onChange={(e) => {
                  setIdTipo(e.target.value);
                  setErrors(prev => ({ ...prev, type: null }));
                }}
                className={`w-full px-3 py-2 text-sm border ${errors.type ? 'border-red-500 bg-red-50' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white transition-all`}
                disabled={loadingTipos}
              >
                <option value="">{loadingTipos ? 'Cargando...' : 'Seleccione un tipo...'}</option>
                {tiposIncidencia.map(t => (
                  <option key={t.id_tipo_incidencia} value={t.id_tipo_incidencia}>{t.nombre_tipo}</option>
                ))}
              </select>
              {errors.type && <p className="text-[10px] font-bold text-red-600 mt-1">{errors.type}</p>}
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Descripción de la Falla <span className="text-red-500">*</span>
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => {
                  setDescripcion(e.target.value);
                  if (e.target.value.trim()) setErrors(prev => ({ ...prev, description: null }));
                }}
                rows="4"
                placeholder="Describa el problema..."
                className={`w-full px-3 py-2 text-sm border ${errors.description ? 'border-red-500 bg-red-50' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-amber-500 outline-none resize-none transition-all`}
              />
              {errors.description && <p className="text-[10px] font-bold text-red-600 mt-1">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">



              {/* Unidad — select desde BD */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Unidad</label>
                <select
                  value={unidadId}
                  onChange={(e) => setUnidadId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                  disabled={loadingUnidades}
                >
                  <option value="">{loadingUnidades ? 'Cargando...' : 'Seleccione una unidad...'}</option>
                  {optsUnidades.map(u => (
                    <option key={u.id} value={u.id}>{u.label}</option>
                  ))}
                </select>
              </div>

              {/* Alias */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Alias (Opcional)</label>
                <input
                  type="text"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="Ej: PC-ADM-01"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                />
              </div>

              {/* Requerimiento */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Requerimiento</label>
                <input
                  type="text"
                  value={requerimiento}
                  onChange={(e) => setRequerimiento(e.target.value)}
                  placeholder="Ej: REQ-2024-001"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                />
              </div>




            </div>

            {errors.global && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-xl border border-red-100 text-xs font-bold animate-pulse">
                {errors.global}
              </div>
            )}
          </form>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="editar-incidencia-form"
            disabled={isSaving || !descripcion.trim()}
            className="px-6 py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
