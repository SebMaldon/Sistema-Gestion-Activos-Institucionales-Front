import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import {
  GET_BIEN_ATRIBUTOS, GET_CAT_ATRIBUTOS,
  UPSERT_BIEN_ATRIBUTOS, DELETE_BIEN_ATRIBUTO,
  GET_ATRIBUTOS_POR_TIPO_DISPOSITIVO
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
 * 
 * Modos de operación:
 * 1. **Con id_bien (edición)**: Carga atributos guardados y permite editar.
 * 2. **Sin id_bien + tipo_disp (creación)**: Muestra los atributos sugeridos
 *    para ese tipo_disp como campos vacíos. Los valores se recopilan vía
 *    pendingValues y se devuelven al padre con onValuesChange.
 * 
 * Props:
 *   id_bien        — UUID del bien (null en modo creación)
 *   tipo_disp      — tipo_disp del modelo (para filtrar atributos sugeridos)
 *   readOnly       — solo lectura
 *   onValuesChange — callback(values: {id_atributo: valor}) cuando hay cambios locales (modo creación)
 */
export default function BienAtributosPanel({ id_bien, tipo_disp, readOnly = false, onValuesChange }) {
  const { showToast } = useApp();
  const qc = useQueryClient();
  const [pendingValues, setPendingValues] = useState({});  // { id_atributo: string }
  const [showAdd, setShowAdd] = useState(false);
  const [selectedAtributo, setSelectedAtributo] = useState('');
  const [newValor, setNewValor] = useState('');

  const isCreateMode = !id_bien;

  // Atributos actuales del bien (solo en modo edición)
  const { data: bienAtribData, isLoading } = useQuery({
    queryKey: ['bienAtributos', id_bien],
    queryFn: () => gqlClient.request(GET_BIEN_ATRIBUTOS, { id_bien }),
    enabled: !!id_bien,
  });
  const bienAtributos = bienAtribData?.bienAtributos ?? [];

  // Atributos sugeridos para este tipo de dispositivo
  const { data: tipoAtribData } = useQuery({
    queryKey: ['atributosPorTipoDisp', tipo_disp],
    queryFn: () => gqlClient.request(GET_ATRIBUTOS_POR_TIPO_DISPOSITIVO, { tipo_disp: Number(tipo_disp) }),
    enabled: !!tipo_disp,
    staleTime: 60_000,
  });
  const atributosSugeridos = tipoAtribData?.atributosPorTipoDispositivo ?? [];

  // Catálogo completo de atributos disponibles (activos) — para agregar extras
  const { data: catData } = useQuery({
    queryKey: ['catAtributos'],
    queryFn: () => gqlClient.request(GET_CAT_ATRIBUTOS, { soloActivos: true }),
    staleTime: 60_000,
  });
  const catAtributos = catData?.catAtributos ?? [];

  // ── Modo EDICIÓN: atributos a mostrar ─────────────────────────────────────
  // Combinar atributos ya guardados + sugeridos del tipo_disp (sin duplicados)
  const atributosEditMode = useMemo(() => {
    if (isCreateMode) return [];
    const guardados = bienAtributos.map(ba => ({
      id_atributo: ba.id_atributo,
      atributo: ba.atributo,
      valor: ba.valor,
      id_bien_atributo: ba.id_bien_atributo,
      es_guardado: true,
      es_requerido: atributosSugeridos.some(s => s.id_atributo === ba.id_atributo && s.es_requerido),
    }));
    // Agregar sugeridos que aún no tienen valor guardado
    const guardadosIds = new Set(guardados.map(g => g.id_atributo));
    const sugeridosFaltantes = atributosSugeridos
      .filter(s => !guardadosIds.has(s.id_atributo))
      .map(s => ({
        id_atributo: s.id_atributo,
        atributo: s.atributo,
        valor: '',
        id_bien_atributo: null,
        es_guardado: false,
        es_requerido: s.es_requerido,
      }));
    return [...guardados, ...sugeridosFaltantes];
  }, [isCreateMode, bienAtributos, atributosSugeridos]);

  // ── Modo CREACIÓN: campos que se muestran ─────────────────────────────────
  const atributosCreateMode = useMemo(() => {
    if (!isCreateMode) return [];
    return atributosSugeridos.map(s => ({
      id_atributo: s.id_atributo,
      atributo: s.atributo,
      es_requerido: s.es_requerido,
    }));
  }, [isCreateMode, atributosSugeridos]);

  const atributosToShow = isCreateMode ? atributosCreateMode : atributosEditMode;

  // Atributos no asignados aún (para el selector "Agregar atributo")
  const assignedIds = new Set(atributosToShow.map(a => a.id_atributo));
  const disponibles = useMemo(() =>
    catAtributos.filter(a => !assignedIds.has(a.id_atributo)),
    [catAtributos, assignedIds]
  );

  // ── Notificar al padre cuando cambian los valores en modo creación ────────
  const updatePending = (newPending) => {
    setPendingValues(newPending);
    if (isCreateMode && onValuesChange) {
      onValuesChange(newPending);
    }
  };

  // Upsert masivo (solo modo edición)
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
    // Recopilar todos los atributos con cambios pendientes
    const atributos = atributosEditMode
      .filter(a => pendingValues[a.id_atributo] !== undefined)
      .map(a => ({
        id_atributo: a.id_atributo,
        valor: String(pendingValues[a.id_atributo]).trim(),
      }))
      .filter(a => a.valor); // No guardar vacíos

    if (atributos.length === 0) return;
    upsert({ id_bien, atributos });
  };

  const handleAddNew = () => {
    if (!selectedAtributo || !String(newValor).trim()) return;
    if (isCreateMode) {
      // En modo creación, agregar al state local
      const idNum = parseInt(selectedAtributo);
      const atr = catAtributos.find(a => a.id_atributo === idNum);
      // Agregar a la lista de sugeridos temporales
      updatePending({ ...pendingValues, [idNum]: String(newValor).trim() });
      setShowAdd(false);
      setSelectedAtributo('');
      setNewValor('');
    } else {
      upsert({
        id_bien,
        atributos: [{ id_atributo: parseInt(selectedAtributo), valor: String(newValor).trim() }],
      });
      setShowAdd(false);
      setSelectedAtributo('');
      setNewValor('');
    }
  };

  const hasPending = Object.keys(pendingValues).length > 0;
  const inputCls = 'w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none';

  if (!isCreateMode && isLoading) return (
    <div className="flex items-center justify-center py-8 text-gray-400 gap-2">
      <Loader2 size={18} className="animate-spin" /><span className="text-sm">Cargando atributos...</span>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Tabla de atributos */}
      {atributosToShow.length > 0 ? (
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 w-1/3">Atributo</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Valor</th>
                {!readOnly && !isCreateMode && <th className="w-8" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {atributosToShow.map(item => {
                const val = pendingValues[item.id_atributo] ?? (item.valor || '');
                const atr = item.atributo;
                return (
                  <tr key={item.id_atributo} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-gray-800 text-xs">
                          {atr?.nombre_atributo ?? `#${item.id_atributo}`}
                          {item.es_requerido && <span className="text-red-500 ml-0.5">*</span>}
                        </span>
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
                        <span className="text-gray-700">{item.valor}</span>
                      ) : (
                        <input
                          type={atr?.tipo_valor === 'NUMERO' ? 'number' : atr?.tipo_valor === 'FECHA' ? 'date' : 'text'}
                          value={val}
                          onChange={e => {
                            const newPending = { ...pendingValues, [item.id_atributo]: e.target.value };
                            updatePending(newPending);
                          }}
                          placeholder={TIPO_PLACEHOLDER[atr?.tipo_valor] ?? ''}
                          className={inputCls}
                        />
                      )}
                    </td>
                    {!readOnly && !isCreateMode && (
                      <td className="px-2 py-2">
                        {item.es_guardado && (
                          <button
                            onClick={() => deleteAtrib({ id_bien_atributo: item.id_bien_atributo })}
                            className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Eliminar atributo"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
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
          {tipo_disp
            ? 'No hay atributos configurados para este tipo de dispositivo.'
            : 'Selecciona un modelo para ver los atributos disponibles.'}
        </div>
      )}

      {/* Botones de acción (solo modo edición) */}
      {!readOnly && !isCreateMode && (
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
            <Plus size={12} />{showAdd ? 'Cancelar' : 'Agregar atributo extra'}
          </button>
        </div>
      )}

      {/* Formulario para agregar atributo extra (no sugerido) */}
      {showAdd && !readOnly && (
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-2 fade-in">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Agregar Atributo Extra</p>
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
