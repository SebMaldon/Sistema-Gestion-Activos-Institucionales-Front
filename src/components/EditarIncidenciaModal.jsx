import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import {
  useTiposIncidencia,
  useUsuariosActivos,
  useUnidades,
  useUpdateIncidencia,
} from '../hooks/useIncidencias';

const PRIORIDADES = ['Baja', 'Media', 'Alta', 'Crítica'];

/**
 * EditarIncidenciaModal
 * Props:
 *   isOpen       – boolean
 *   onClose      – () => void
 *   onUpdated    – () => void  (callback de éxito)
 *   incidencia   – objeto con los datos actuales de la incidencia (shape de mapIncidenciaNode)
 */
export default function EditarIncidenciaModal({ isOpen, onClose, onUpdated, incidencia }) {
  const { data: tiposIncidencia = [], isLoading: loadingTipos }   = useTiposIncidencia();
  const { data: usuarios        = [], isLoading: loadingUsuarios } = useUsuariosActivos();
  const { data: unidades        = [], isLoading: loadingUnidades } = useUnidades();
  const updateIncidencia = useUpdateIncidencia();

  const [idTipo,       setIdTipo]       = useState('');
  const [descripcion,  setDescripcion]  = useState('');
  const [prioridad,    setPrioridad]    = useState('Media');
  const [unidadId,     setUnidadId]     = useState('');
  const [idReporta,    setIdReporta]    = useState('');
  const [idAsignado,   setIdAsignado]   = useState('');

  // Pre-llenar con los datos actuales cada vez que abre o cambia la incidencia
  useEffect(() => {
    if (isOpen && incidencia) {
      setIdTipo(String(incidencia.id_tipo_incidencia ?? ''));
      setDescripcion(incidencia.falla ?? '');
      setPrioridad(incidencia.prioridad ?? 'Media');
      setIdReporta(String(incidencia._raw?.id_usuario_reporta ?? ''));
      setIdAsignado(String(incidencia._raw?.id_usuario_asignado ?? ''));

      // Resolver el id_unidad desde el nombre almacenado o desde el bien
      const idU = incidencia._raw?.bien?.unidad?.id_unidad;
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

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    // Obtener el nombre de la unidad seleccionada para guardar el campo texto
    const unidadSel = unidades.find(u => String(u.id_unidad) === String(unidadId));
    try {
      await updateIncidencia.mutateAsync({
        id_incidencia:       String(incidencia.id),
        id_tipo_incidencia:  idTipo     ? parseInt(idTipo)     : undefined,
        descripcion_falla:   descripcion || undefined,
        prioridad:           prioridad   || undefined,
        unidad:              unidadSel?.nombre || undefined,
        id_usuario_reporta:  idReporta  ? parseInt(idReporta)  : undefined,
        id_usuario_asignado: idAsignado ? parseInt(idAsignado) : undefined,
      });
      onUpdated?.();
      onClose();
    } catch (err) {
      const msg = err?.response?.errors?.[0]?.message || 'Error al actualizar la incidencia';
      alert(msg);
    }
  }, [incidencia, idTipo, descripcion, prioridad, unidadId, idReporta, idAsignado, unidades, updateIncidencia, onUpdated, onClose]);

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
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tipo de Incidencia</label>
              <select
                value={idTipo}
                onChange={(e) => setIdTipo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                disabled={loadingTipos}
              >
                <option value="">{loadingTipos ? 'Cargando...' : 'Seleccione un tipo...'}</option>
                {tiposIncidencia.map(t => (
                  <option key={t.id_tipo_incidencia} value={t.id_tipo_incidencia}>{t.nombre_tipo}</option>
                ))}
              </select>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Descripción de la Falla <span className="text-red-500">*</span>
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows="4"
                required
                placeholder="Describa el problema..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

              {/* Prioridad */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Prioridad</label>
                <select
                  value={prioridad}
                  onChange={(e) => setPrioridad(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                >
                  {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Unidad — select desde BD */}
              <div>
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

              {/* Usuario reportante */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Usuario Reportante</label>
                <select
                  value={idReporta}
                  onChange={(e) => setIdReporta(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                  disabled={loadingUsuarios}
                >
                  <option value="">{loadingUsuarios ? 'Cargando...' : 'Seleccione usuario...'}</option>
                  {optsUsuarios.map(u => (
                    <option key={u.id} value={u.id}>{u.label}</option>
                  ))}
                </select>
              </div>

              {/* Técnico asignado */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Técnico Asignado</label>
                <select
                  value={idAsignado}
                  onChange={(e) => setIdAsignado(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                  disabled={loadingUsuarios}
                >
                  <option value="">{loadingUsuarios ? 'Cargando...' : 'Sin asignar'}</option>
                  {optsUsuarios.map(u => (
                    <option key={u.id} value={u.id}>{u.label}</option>
                  ))}
                </select>
              </div>
            </div>
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
