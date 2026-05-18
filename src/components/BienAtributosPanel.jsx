import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import {
  GET_BIEN_ATRIBUTOS, GET_CAT_ATRIBUTOS,
  UPSERT_BIEN_ATRIBUTOS, DELETE_BIEN_ATRIBUTO
} from '../api/atributos.queries';
import { Plus, Trash2, Save, Loader2, ChevronDown, Tag } from 'lucide-react';
import { useApp } from '../context/AppContext';

const TIPO_PLACEHOLDER = { TEXT: 'Texto libre...', NUMERO: '0', BOOLEANO: 'true/false', FECHA: 'YYYY-MM-DD' };

// Icono por tipo de valor
function TipoBadge({ tipo }) {
  const map = {
    NUMERO:   { bg: '#eff6ff', color: '#1d4ed8', label: 'Número' },
    TEXT:     { bg: '#f0fdf4', color: '#15803d', label: 'Texto'  },
    BOOLEANO: { bg: '#fef9c3', color: '#a16207', label: 'Booleano' },
    FECHA:    { bg: '#fdf4ff', color: '#7e22ce', label: 'Fecha'  },
  };
  const s = map[tipo] ?? map.TEXT;
  return (
    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}>{s.label}</span>
  );
}

/**
 * Panel de atributos técnicos para un bien.
 * Props:
 *   id_bien    — UUID del bien
 *   tipo_disp  — tipo_disp del modelo (para sugerencias, opcional)
 *   readOnly   — solo lectura
 */
export default function BienAtributosPanel({ id_bien, tipo_disp, readOnly = false }) {
  const { showToast } = useApp();
  const qc = useQueryClient();
  const [pendingValues, setPendingValues] = useState({});  // { id_atributo: string }
  const [showAdd, setShowAdd] = useState(false);
  const [selectedAtributo, setSelectedAtributo] = useState('');
  const [newValor, setNewValor] = useState('');

  // Atributos actuales del bien
  const { data: bienAtribData, isLoading } = useQuery({
    queryKey: ['bienAtributos', id_bien],
    queryFn: () => gqlClient.request(GET_BIEN_ATRIBUTOS, { id_bien }),
    enabled: !!id_bien,
  });
  const bienAtributos = bienAtribData?.bienAtributos ?? [];

  // Catálogo de atributos disponibles (activos)
  const { data: catData } = useQuery({
    queryKey: ['catAtributos'],
    queryFn: () => gqlClient.request(GET_CAT_ATRIBUTOS, { soloActivos: true }),
    staleTime: 60_000,
  });
  const catAtributos = catData?.catAtributos ?? [];

  // Atributos no asignados aún al bien
  const assignedIds = new Set(bienAtributos.map(a => a.id_atributo));
  const disponibles = useMemo(() =>
    catAtributos.filter(a => !assignedIds.has(a.id_atributo)),
    [catAtributos, assignedIds]
  );

  // Upsert masivo
  const { mutate: upsert, isPending: saving } = useMutation({
    mutationFn: (vars) => gqlClient.request(UPSERT_BIEN_ATRIBUTOS, vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bienAtributos', id_bien] });
      setPendingValues({});
      showToast('Atributos guardados', 'success');
    },
    onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al guardar atributos', 'error'),
  });

  // Eliminar un atributo del bien
  const { mutate: deleteAtrib } = useMutation({
    mutationFn: (vars) => gqlClient.request(DELETE_BIEN_ATRIBUTO, vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bienAtributos', id_bien] });
      showToast('Atributo eliminado', 'success');
    },
    onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error', 'error'),
  });

  const handleSave = () => {
    const atributos = [
      // Actualizar existentes con pending changes
      ...bienAtributos
        .filter(a => pendingValues[a.id_atributo] !== undefined)
        .map(a => ({ id_atributo: a.id_atributo, valor: pendingValues[a.id_atributo] })),
    ];
    if (atributos.length === 0) return;
    upsert({ id_bien, atributos });
  };

  const handleAddNew = () => {
    if (!selectedAtributo || !newValor.trim()) return;
    upsert({
      id_bien,
      atributos: [{ id_atributo: parseInt(selectedAtributo), valor: newValor.trim() }],
    });
    setShowAdd(false);
    setSelectedAtributo('');
    setNewValor('');
  };

  const hasPending = Object.keys(pendingValues).length > 0;
  const inputCls = 'w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none';

  if (isLoading) return (
    <div className="flex items-center justify-center py-8 text-gray-400 gap-2">
      <Loader2 size={18} className="animate-spin" /><span className="text-sm">Cargando atributos...</span>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Tabla de atributos existentes */}
      {bienAtributos.length > 0 ? (
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 w-1/3">Atributo</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Valor</th>
                {!readOnly && <th className="w-8" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bienAtributos.map(ba => {
                const val = pendingValues[ba.id_atributo] ?? ba.valor;
                const atr = ba.atributo;
                return (
                  <tr key={ba.id_bien_atributo} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-gray-800 text-xs">{atr?.nombre_atributo ?? `#${ba.id_atributo}`}</span>
                        <div className="flex items-center gap-1">
                          {atr && <TipoBadge tipo={atr.tipo_valor} />}
                          {atr?.unidad_medida && (
                            <span className="text-[10px] text-gray-400">{atr.unidad_medida}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {readOnly ? (
                        <span className="text-gray-700">{ba.valor}</span>
                      ) : (
                        <input
                          type={atr?.tipo_valor === 'NUMERO' ? 'number' : atr?.tipo_valor === 'FECHA' ? 'date' : 'text'}
                          value={val}
                          onChange={e => setPendingValues(p => ({ ...p, [ba.id_atributo]: e.target.value }))}
                          placeholder={TIPO_PLACEHOLDER[atr?.tipo_valor] ?? ''}
                          className={inputCls}
                        />
                      )}
                    </td>
                    {!readOnly && (
                      <td className="px-2 py-2">
                        <button
                          onClick={() => deleteAtrib({ id_bien_atributo: ba.id_bien_atributo })}
                          className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Eliminar atributo"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-6 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
          <Tag size={24} className="mx-auto mb-2 opacity-30" />
          Sin atributos técnicos registrados
        </div>
      )}

      {/* Botones de acción */}
      {!readOnly && (
        <div className="flex items-center gap-2 flex-wrap">
          {hasPending && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#006341,#004d32)' }}
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Guardar cambios
            </button>
          )}
          <button
            onClick={() => setShowAdd(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-green-700 bg-green-50 hover:bg-green-100 text-xs font-semibold transition-colors"
          >
            <Plus size={12} />{showAdd ? 'Cancelar' : 'Agregar atributo'}
          </button>
        </div>
      )}

      {/* Formulario para agregar atributo nuevo */}
      {showAdd && !readOnly && (
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-2 fade-in">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nuevo Atributo</p>
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[160px]">
              <select
                value={selectedAtributo}
                onChange={e => { setSelectedAtributo(e.target.value); setNewValor(''); }}
                className="w-full px-2.5 py-1.5 pr-7 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white appearance-none"
              >
                <option value="">— Seleccionar atributo —</option>
                {disponibles.map(a => (
                  <option key={a.id_atributo} value={a.id_atributo}>
                    {a.nombre_atributo}{a.unidad_medida ? ` (${a.unidad_medida})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <input
              type={catAtributos.find(a => String(a.id_atributo) === selectedAtributo)?.tipo_valor === 'NUMERO' ? 'number' : 'text'}
              value={newValor}
              onChange={e => setNewValor(e.target.value)}
              placeholder="Valor..."
              disabled={!selectedAtributo}
              className="flex-1 min-w-[120px] px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none disabled:bg-gray-100"
            />
            <button
              onClick={handleAddNew}
              disabled={saving || !selectedAtributo || !newValor.trim()}
              className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1"
              style={{ background: 'linear-gradient(135deg,#006341,#004d32)' }}
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Agregar
            </button>
          </div>
          {selectedAtributo && (() => {
            const a = catAtributos.find(x => String(x.id_atributo) === selectedAtributo);
            return a?.descripcion ? (
              <p className="text-xs text-gray-400 italic">{a.descripcion}</p>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
}
