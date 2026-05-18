import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { GET_MARCAS_TIPOS_QUERY } from '../api/inventario.queries';
import { X, Tag, List, Plus, Save, Trash2, Edit2, Loader2, Link as LinkIcon, Unlink } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  useCatAtributos, useCreateAtributo, useUpdateAtributo, useDeleteAtributo,
  useAtributosPorTipoDispositivo, useSetAtributoTipoDispositivo, useRemoveAtributoTipoDispositivo
} from '../hooks/useAtributos';

const TIPO_OPCIONES = [
  { value: 'TEXT', label: 'Texto libre' },
  { value: 'NUMERO', label: 'Número' },
  { value: 'BOOLEANO', label: 'Sí/No (Booleano)' },
  { value: 'FECHA', label: 'Fecha' }
];

export default function AtributosCatalogModal({ onClose }) {
  const { showToast } = useApp();
  const [tab, setTab] = useState('catalogo'); // 'catalogo' | 'asignacion'

  // Datos
  const { data: catData, isLoading: loadingCat } = useCatAtributos(false);
  const catAtributos = catData || [];

  const { data: mtData } = useQuery({
    queryKey: ['marcas-tipos'],
    queryFn: () => gqlClient.request(GET_MARCAS_TIPOS_QUERY),
  });
  const tipos = mtData?.tiposDispositivo ?? [];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/70 fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Tag size={18} className="text-purple-600" /> Atributos Técnicos (EAV)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Define qué atributos se pueden registrar para cada tipo de dispositivo.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0 bg-gray-50">
          <button onClick={() => setTab('catalogo')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 text-xs font-semibold border-b-2 transition-colors ${
              tab === 'catalogo' ? 'border-purple-600 text-purple-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <List size={14} /> Catálogo Maestro
          </button>
          <button onClick={() => setTab('asignacion')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 text-xs font-semibold border-b-2 transition-colors ${
              tab === 'asignacion' ? 'border-purple-600 text-purple-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <LinkIcon size={14} /> Asignación por Tipo
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 bg-white">
          {tab === 'catalogo' && <TabCatalogo atributos={catAtributos} loading={loadingCat} showToast={showToast} />}
          {tab === 'asignacion' && <TabAsignacion tipos={tipos} atributos={catAtributos} showToast={showToast} />}
        </div>
      </div>
    </div>
  );
}

// ─── TAB: Catálogo Maestro ───────────────────────────────────────────────────
function TabCatalogo({ atributos, loading, showToast }) {
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nombre_atributo: '', tipo_valor: 'TEXT', unidad_medida: '', descripcion: '' });

  const { mutate: createAttr, isPending: isCreating } = useCreateAtributo();
  const { mutate: updateAttr, isPending: isUpdating } = useUpdateAtributo();
  const { mutate: deleteAttr } = useDeleteAtributo();

  const handleEdit = (a) => {
    setEditingId(a.id_atributo);
    setFormData({ nombre_atributo: a.nombre_atributo, tipo_valor: a.tipo_valor, unidad_medida: a.unidad_medida || '', descripcion: a.descripcion || '' });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ nombre_atributo: '', tipo_valor: 'TEXT', unidad_medida: '', descripcion: '' });
  };

  const handleSave = () => {
    if (!formData.nombre_atributo.trim()) {
      showToast('El nombre del atributo es obligatorio', 'warning');
      return;
    }
    const payload = {
      nombre_atributo: formData.nombre_atributo.trim(),
      tipo_valor: formData.tipo_valor,
      unidad_medida: formData.unidad_medida.trim() || null,
      descripcion: formData.descripcion.trim() || null,
    };

    if (editingId) {
      updateAttr({ id_atributo: editingId, ...payload, activo: true }, {
        onSuccess: () => { showToast('Atributo actualizado', 'success'); handleCancel(); },
        onError: () => showToast('Error al actualizar atributo', 'error')
      });
    } else {
      createAttr(payload, {
        onSuccess: () => { showToast('Atributo creado', 'success'); handleCancel(); },
        onError: () => showToast('Error al crear atributo', 'error')
      });
    }
  };

  const handleDelete = (id, nombre) => {
    if (!window.confirm(`¿Eliminar el atributo "${nombre}"? Esta acción borrará los valores de los bienes que lo utilicen.`)) return;
    deleteAttr(id, {
      onSuccess: () => showToast('Atributo eliminado', 'success'),
      onError: () => showToast('Error al eliminar. Podría estar en uso por un bien.', 'error')
    });
  };

  const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-purple-500 outline-none";

  return (
    <div className="space-y-6 fade-in">
      {/* Formulario Crear/Editar */}
      <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
        <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-3">
          {editingId ? 'Editar Atributo' : 'Crear Nuevo Atributo'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div className="lg:col-span-1">
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Nombre *</label>
            <input type="text" value={formData.nombre_atributo} onChange={e => setFormData({ ...formData, nombre_atributo: e.target.value })} className={inputCls} placeholder="Ej. Memoria RAM" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Tipo de Dato</label>
            <select value={formData.tipo_valor} onChange={e => setFormData({ ...formData, tipo_valor: e.target.value })} className={inputCls}>
              {TIPO_OPCIONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Unidad Medida</label>
            <input type="text" value={formData.unidad_medida} onChange={e => setFormData({ ...formData, unidad_medida: e.target.value })} className={inputCls} placeholder="Ej. GB, Pulgadas" />
          </div>
          <div className="lg:col-span-1">
            <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Descripción</label>
            <input type="text" value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value })} className={inputCls} placeholder="Opcional..." />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          {editingId && (
            <button onClick={handleCancel} className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50">Cancelar</button>
          )}
          <button onClick={handleSave} disabled={isCreating || isUpdating} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold bg-purple-600 hover:bg-purple-700 disabled:opacity-50">
            {(isCreating || isUpdating) ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {editingId ? 'Guardar Cambios' : 'Agregar Atributo'}
          </button>
        </div>
      </div>

      {/* Lista */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Atributos Existentes</h3>
        {loading ? (
          <div className="flex items-center justify-center py-6 text-gray-400"><Loader2 size={20} className="animate-spin" /></div>
        ) : atributos.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6 border border-dashed rounded-xl">No hay atributos registrados.</p>
        ) : (
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-2">ID</th>
                  <th className="px-4 py-2">Nombre</th>
                  <th className="px-4 py-2">Tipo</th>
                  <th className="px-4 py-2">Unidad</th>
                  <th className="px-4 py-2 w-20">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {atributos.map(a => (
                  <tr key={a.id_atributo} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2 text-gray-400 font-mono text-xs">#{a.id_atributo}</td>
                    <td className="px-4 py-2 font-medium text-gray-800">
                      {a.nombre_atributo}
                      {a.descripcion && <span className="block text-[10px] text-gray-400 font-normal">{a.descripcion}</span>}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">{TIPO_OPCIONES.find(o => o.value === a.tipo_valor)?.label}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{a.unidad_medida || '—'}</td>
                    <td className="px-4 py-2 flex gap-1">
                      <button onClick={() => handleEdit(a)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded" title="Editar"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(a.id_atributo, a.nombre_atributo)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Eliminar"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TAB: Asignación por Tipo ───────────────────────────────────────────────
function TabAsignacion({ tipos, atributos, showToast }) {
  const [selectedTipo, setSelectedTipo] = useState('');
  
  const { data: asignadosData, isLoading } = useAtributosPorTipoDispositivo(parseInt(selectedTipo));
  const asignados = asignadosData || [];
  
  const { mutate: assignAttr, isPending: isAssigning } = useSetAtributoTipoDispositivo();
  const { mutate: removeAttr } = useRemoveAtributoTipoDispositivo();

  const handleAssign = (id_atributo) => {
    if (!selectedTipo) return;
    assignAttr({ tipo_disp: parseInt(selectedTipo), id_atributo: parseInt(id_atributo), es_requerido: false }, {
      onSuccess: () => showToast('Atributo asignado', 'success'),
      onError: () => showToast('Error al asignar atributo', 'error')
    });
  };

  const handleRemove = (id_atributo) => {
    removeAttr({ tipo_disp: parseInt(selectedTipo), id_atributo: parseInt(id_atributo) }, {
      onSuccess: () => showToast('Asignación removida', 'success'),
      onError: () => showToast('Error al remover', 'error')
    });
  };

  const asignadosSet = new Set(asignados.map(a => a.id_atributo));
  const disponibles = atributos.filter(a => !asignadosSet.has(a.id_atributo));

  return (
    <div className="space-y-5 fade-in">
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <label className="block text-xs font-bold text-gray-700 mb-2">Selecciona un Tipo de Dispositivo</label>
        <select 
          value={selectedTipo} 
          onChange={e => setSelectedTipo(e.target.value)}
          className="w-full sm:w-1/2 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
        >
          <option value="">— Seleccionar Tipo —</option>
          {tipos.map(t => <option key={t.tipo_disp} value={t.tipo_disp}>{t.nombre_tipo}</option>)}
        </select>
      </div>

      {selectedTipo ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Asignados */}
          <div className="border border-green-200 rounded-xl overflow-hidden flex flex-col">
            <div className="bg-green-50 px-4 py-3 border-b border-green-200">
              <h3 className="text-xs font-bold text-green-800 uppercase">Atributos Sugeridos</h3>
              <p className="text-[10px] text-green-600">Aparecerán automáticamente en la Ficha Técnica de este tipo.</p>
            </div>
            <div className="p-3 space-y-2 flex-1 bg-white">
              {isLoading ? (
                <Loader2 size={16} className="animate-spin text-green-500 mx-auto my-4" />
              ) : asignados.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No hay atributos sugeridos para este tipo.</p>
              ) : (
                asignados.map(a => (
                  <div key={a.id_atributo} className="flex items-center justify-between p-2 rounded-lg bg-green-50/50 border border-green-100">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{a.atributo?.nombre_atributo}</p>
                      <p className="text-[10px] text-gray-500">{TIPO_OPCIONES.find(o => o.value === a.atributo?.tipo_valor)?.label}</p>
                    </div>
                    <button onClick={() => handleRemove(a.id_atributo)} className="text-red-400 hover:text-red-600 p-1 bg-white rounded shadow-sm border border-red-100" title="Quitar">
                      <Unlink size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Disponibles */}
          <div className="border border-gray-200 rounded-xl overflow-hidden flex flex-col">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="text-xs font-bold text-gray-700 uppercase">Otros Atributos</h3>
              <p className="text-[10px] text-gray-500">Haz clic en el '+' para agregarlo a la lista de sugeridos.</p>
            </div>
            <div className="p-3 space-y-2 flex-1 bg-white max-h-80 overflow-y-auto">
              {disponibles.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No hay más atributos disponibles en el catálogo.</p>
              ) : (
                disponibles.map(a => (
                  <div key={a.id_atributo} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 group transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{a.nombre_atributo}</p>
                    </div>
                    <button onClick={() => handleAssign(a.id_atributo)} disabled={isAssigning} className="text-purple-600 hover:text-white hover:bg-purple-600 p-1 border border-purple-200 rounded transition-colors disabled:opacity-50" title="Asignar">
                      <Plus size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-gray-400 text-sm">
          <LinkIcon size={32} className="mx-auto mb-3 opacity-20" />
          Selecciona un tipo de dispositivo arriba para ver y configurar sus atributos.
        </div>
      )}
    </div>
  );
}
