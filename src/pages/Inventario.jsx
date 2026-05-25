import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import { useBienes } from '../hooks/useBienes';
import { useCatalogosBienes } from '../hooks/useCatalogosBienes';
import { useCreateBien, useUpdateBien, useDeleteBien, useUpsertEspecificacionTI } from '../hooks/useBienMutations';
import { useAuthStore } from '../store/auth.store';
import { useApp } from '../context/AppContext';
import {
  Search, Plus, Eye, Edit, Trash2, QrCode,
  ChevronLeft, ChevronRight, X, AlertTriangle,
  Server, Monitor, Cpu, HardDrive, Wifi, Save,
  Package, Shield, Calendar, MapPin, User, Tag,
  ChevronDown, ChevronUp, Loader2, RefreshCw, Check, Layers, Cpu as CpuIcon, Bookmark, StickyNote, Settings,
  SlidersHorizontal, FilterX
} from 'lucide-react';

import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import {
  GET_UBICACIONES_POR_UNIDAD, CREATE_UBICACION,
  GET_MARCAS_TIPOS_QUERY, CREATE_MARCA_MUTATION,
  CREATE_TIPO_DISPOSITIVO_MUTATION, CREATE_CAT_MODELO_MUTATION,
  GET_BIENES_MONITOR, ASIGNAR_MONITOR_MUTATION, DESASIGNAR_MONITOR_MUTATION
} from '../api/inventario.queries';
import { GET_PROVEEDORES, CREATE_GARANTIA, UPDATE_GARANTIA } from '../api/garantias.queries';
import { formatDate, formatDateTime } from '../lib/utils';
import SearchableSelect from '../components/SearchableSelect';
import MultiSearchableSelect from '../components/MultiSearchableSelect';
import PrintLabelsTab from '../components/PrintLabelsTab';
import PrintStickerSheet from '../components/PrintStickerSheet';
import BienAtributosPanel from '../components/BienAtributosPanel';
import AtributosCatalogModal from '../components/AtributosCatalogModal';
import { UPSERT_BIEN_ATRIBUTOS, GET_CAT_ATRIBUTOS, GET_ATRIBUTOS_POR_TIPO_DISPOSITIVO } from '../api/atributos.queries';

// ─── Roles reales de BD ───────────────────────────────────────────────────────
const ROL_ADMIN    = 1;
const ROL_MAESTRO  = 2;

// Categorías TI (id_categoria = 1: Equipo de Cómputo, 3: Redes y Telecomunicaciones)
// NOTA: Esta constante ya no se usa para mostrar/ocultar specs TI; el control ahora
// es por tipo_disp del modelo. Se mantiene solo por compatibilidad con filtros existentes.
const CATEGORIAS_TI = [1, 3];

/**
 * Detecta el modo del dispositivo basado en el nombre_tipo del tipo de dispositivo.
 * Retorna: 'PC' | 'LAPTOP' | 'MONITOR' | 'OTHER' | null
 */
function getDeviceMode(nombreTipo) {
  if (!nombreTipo) return null;
  const n = nombreTipo.toLowerCase();
  if (n.includes('pc') || n.includes('desktop') || n.includes('escritorio')) return 'PC';
  if (n.includes('laptop') || n.includes('port') || n.includes('notebook')) return 'LAPTOP';
  if (n.includes('monitor')) return 'MONITOR';
  return 'OTHER';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(v) { return v || '—'; }

// ─── Badge de Estatus ─────────────────────────────────────────────────────────
function EstatusBadge({ estatus }) {
  const map = {
    'ACTIVO':        { bg: '#dcfce7', color: '#15803d', label: 'Activo' },
    'Activo':        { bg: '#dcfce7', color: '#15803d', label: 'Activo' },
    'EN_REPARACION': { bg: '#fef9c3', color: '#a16207', label: 'En Reparación' },
    'En Reparación': { bg: '#fef9c3', color: '#a16207', label: 'En Reparación' },
    'BAJA':          { bg: '#fee2e2', color: '#b91c1c', label: 'Baja' },
    'Baja':          { bg: '#fee2e2', color: '#b91c1c', label: 'Baja' },
  };
  const s = map[estatus] ?? { bg: '#f3f4f6', color: '#374151', label: estatus };
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

// ─── Estado inicial del formulario ────────────────────────────────────────────
const FORM_EMPTY = {
  id_categoria: '',
  id_unidad_medida: '',
  id_unidad: '',
  id_ubicacion: '',
  num_serie: '',
  num_inv: '',
  cantidad: 1,
  estatus_operativo: 'ACTIVO',
  clave_unidad_ref: '',
  clave_modelo: '',
  id_usuario_resguardo: '',
  fecha_adquisicion: '',
};
const TI_EMPTY = {
  cpu_info: '', ram_gb: '', almacenamiento_gb: '', dir_ip: '', dir_mac: '', mac_address: '', modelo_so: '',
  puerto_red: '', switch_red: '', cuenta_windows: '', correo: '', last_scan: '', tipo_user: '', nombre_host: '', windows_serial: ''
};
// ─── Mini-CRUD: Modal de Catálogos (Marcas / Tipos / Modelos) ────────────────
function ModeloCatalogModal({ onClose, onSelectModelo, modeloActual, catalogos }) {
  const { showToast } = useApp();
  const qc = useQueryClient();
  const [tab, setTab] = useState('modelos');

  // Formularios locales para cada sección
  const [nuevaMarca, setNuevaMarca] = useState('');
  const [nuevoTipo, setNuevoTipo] = useState('');
  const [nuevoModelo, setNuevoModelo] = useState({ clave_modelo: '', descrip_disp: '', clave_marca: '', tipo_disp: '' });
  const [searchModelo, setSearchModelo] = useState('');

  // Query: marcas y tipos (ligero)
  const { data: catAux, refetch: refetchAux } = useQuery({
    queryKey: ['marcas-tipos'],
    queryFn: () => gqlClient.request(GET_MARCAS_TIPOS_QUERY),
    staleTime: 30_000,
  });
  const marcas = catAux?.marcas ?? [];
  const tipos  = catAux?.tiposDispositivo ?? [];
  const modelos = catalogos?.modelos ?? [];

  const modelosFiltrados = useMemo(() => {
    const q = searchModelo.toLowerCase();
    if (!q) return modelos;
    return modelos.filter(m =>
      (m.descrip_disp || m.clave_modelo).toLowerCase().includes(q)
    );
  }, [modelos, searchModelo]);

  // Mutations
  const mutMarca = useMutation({
    mutationFn: (vars) => gqlClient.request(CREATE_MARCA_MUTATION, vars),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['marcas-tipos'] });
      qc.invalidateQueries({ queryKey: ['catalogos-bienes'] });
      setNuevaMarca('');
      showToast(`Marca "${data.createMarca.marca}" creada`, 'success');
    },
    onError: (e) => {
      const msg = e?.response?.errors?.[0]?.message ?? '';
      if (msg.startsWith('LA_MARCA_YA_EXISTE:')) {
        // Parsear: LA_MARCA_YA_EXISTE:clave_marca:nombre
        const parts = msg.split(':');
        const nombre = parts.slice(2).join(':');
        showToast(`La marca "${nombre}" ya existe. Seleccionándola.`, 'warning');
        setNuevaMarca('');
        setTab('modelos');
      } else {
        showToast(msg || 'Error al crear la marca', 'error');
      }
    },
  });

  const mutTipo = useMutation({
    mutationFn: (vars) => gqlClient.request(CREATE_TIPO_DISPOSITIVO_MUTATION, vars),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['marcas-tipos'] });
      qc.invalidateQueries({ queryKey: ['catalogos-bienes'] });
      setNuevoTipo('');
      showToast(`Tipo "${data.createTipoDispositivo.nombre_tipo}" creado`, 'success');
    },
    onError: (e) => {
      const msg = e?.response?.errors?.[0]?.message ?? '';
      if (msg.startsWith('EL_TIPO_YA_EXISTE:')) {
        const parts = msg.split(':');
        const nombre = parts.slice(2).join(':');
        showToast(`El tipo "${nombre}" ya existe.`, 'warning');
        setNuevoTipo('');
      } else {
        showToast(msg || 'Error al crear el tipo', 'error');
      }
    },
  });

  const mutModelo = useMutation({
    mutationFn: (vars) => gqlClient.request(CREATE_CAT_MODELO_MUTATION, vars),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['catalogos-bienes'] });
      const m = data.createCatModelo;
      showToast(`Modelo "${m.descrip_disp || m.clave_modelo}" creado`, 'success');
      setNuevoModelo({ clave_modelo: '', descrip_disp: '', clave_marca: '', tipo_disp: '' });
      onSelectModelo(m.clave_modelo, { tipo_disp: m.tipo_disp });
      onClose();
    },
    onError: (e) => {
      const msg = e?.response?.errors?.[0]?.message ?? '';
      if (msg.startsWith('EL_MODELO_YA_EXISTE:')) {
        // Parsear: EL_MODELO_YA_EXISTE:clave:descrip
        const parts = msg.split(':');
        const clave = parts[1];
        showToast(`El modelo "${clave}" ya existe. Seleccionándolo.`, 'warning');
        const dupModel = modelos.find(m => m.clave_modelo === clave);
        onSelectModelo(clave, { tipo_disp: dupModel?.tipo_disp });
        onClose();
      } else {
        showToast(msg || 'Error al crear modelo', 'error');
      }
    },
  });

  const handleCrearMarca = () => {
    const trimmed = nuevaMarca.trim();
    if (!trimmed) return;
    // Verificar duplicado local (case-insensitive)
    const dup = marcas.find(m => m.marca?.toLowerCase() === trimmed.toLowerCase());
    if (dup) {
      showToast(`La marca "${dup.marca}" ya existe. Seleccionándola automáticamente.`, 'warning');
      setNuevaMarca('');
      // Cambiar a tab de modelos para que el usuario pueda asociarla
      setTab('modelos');
      return;
    }
    mutMarca.mutate({ marca: trimmed });
  };

  const handleCrearTipo = () => {
    const trimmed = nuevoTipo.trim();
    if (!trimmed) return;
    // Verificar duplicado local (case-insensitive)
    const dup = tipos.find(t => t.nombre_tipo?.toLowerCase() === trimmed.toLowerCase());
    if (dup) {
      showToast(`El tipo "${dup.nombre_tipo}" ya existe.`, 'warning');
      setNuevoTipo('');
      return;
    }
    mutTipo.mutate({ nombre_tipo: trimmed });
  };

  const handleCrearModelo = () => {
    const clave = nuevoModelo.clave_modelo.trim().toUpperCase();
    if (!clave) return showToast('La clave del modelo es obligatoria', 'warning');
    // Verificar duplicado local
    const dup = modelos.find(m => m.clave_modelo?.toUpperCase() === clave);
    if (dup) {
      showToast(`El modelo "${clave}" ya existe. Seleccionándolo automáticamente.`, 'warning');
      onSelectModelo(dup.clave_modelo, { tipo_disp: dup.tipo_disp });
      onClose();
      return;
    }
    const vars = {
      clave_modelo: clave,
      descrip_disp: nuevoModelo.descrip_disp?.trim() || null,
      clave_marca:  nuevoModelo.clave_marca ? parseInt(nuevoModelo.clave_marca) : null,
      tipo_disp:    nuevoModelo.tipo_disp ? parseInt(nuevoModelo.tipo_disp) : null,
    };
    mutModelo.mutate(vars);
  };

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white';
  const tabs = [
    { id: 'modelos', label: 'Modelos',           icon: Layers },
    { id: 'tipos',   label: 'Tipos Dispositivo', icon: CpuIcon },
    { id: 'marcas',  label: 'Marcas',            icon: Bookmark },
  ];

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/70 fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
          <h2 className="text-base font-bold text-gray-900">Catálogos de Modelos</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0 bg-gray-50">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 text-xs font-semibold border-b-2 transition-colors ${
                  tab === t.id ? 'border-green-600 text-green-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                <Icon size={13} />{t.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ── TAB MODELOS ── */}
          {tab === 'modelos' && (
            <div className="space-y-4 fade-in">
              {/* Buscador */}
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Buscar modelo..." value={searchModelo}
                  onChange={e => setSearchModelo(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              {/* Lista */}
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {modelosFiltrados.map(m => (
                  <button key={m.clave_modelo} onClick={() => { onSelectModelo(m.clave_modelo, { tipo_disp: m.tipo_disp }); onClose(); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                      m.clave_modelo === modeloActual ? 'bg-green-50 text-green-700 font-semibold' : 'hover:bg-gray-50 text-gray-700'
                    }`}>
                    {m.clave_modelo === modeloActual && <Check size={13} className="flex-shrink-0" />}
                    <span className="font-mono text-xs text-gray-400 shrink-0">{m.clave_modelo}</span>
                    <span className="truncate">{m.descrip_disp || '—'}</span>
                  </button>
                ))}
                {modelosFiltrados.length === 0 && <p className="text-center text-xs text-gray-400 py-4">Sin resultados</p>}
              </div>
              {/* Crear nuevo modelo */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Crear Nuevo Modelo</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Clave <span className="text-red-500">*</span></label>
                    <input type="text" value={nuevoModelo.clave_modelo} placeholder="Ej: HP-1020"
                      onChange={e => setNuevoModelo(p => ({ ...p, clave_modelo: e.target.value }))}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción</label>
                    <input type="text" value={nuevoModelo.descrip_disp} placeholder="Ej: HP LaserJet 1020"
                      onChange={e => setNuevoModelo(p => ({ ...p, descrip_disp: e.target.value }))}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Marca</label>
                    <SearchableSelect 
                      value={nuevoModelo.clave_marca ? String(nuevoModelo.clave_marca) : ''}
                      onChange={val => setNuevoModelo(p => ({ ...p, clave_marca: val }))}
                      options={marcas.map(m => ({ value: String(m.clave_marca), label: m.marca }))}
                      placeholder="— Ninguna —"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo Dispositivo</label>
                    <SearchableSelect 
                      value={nuevoModelo.tipo_disp ? String(nuevoModelo.tipo_disp) : ''}
                      onChange={val => setNuevoModelo(p => ({ ...p, tipo_disp: val }))}
                      options={tipos.map(t => ({ value: String(t.tipo_disp), label: t.nombre_tipo }))}
                      placeholder="— Ninguno —"
                    />
                  </div>
                </div>
                <button onClick={handleCrearModelo} disabled={mutModelo.isPending || !nuevoModelo.clave_modelo.trim()}
                  className="mt-3 w-full py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                  style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
                  {mutModelo.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {mutModelo.isPending ? 'Creando...' : 'Crear Modelo y Seleccionar'}
                </button>
              </div>
            </div>
          )}

          {/* ── TAB TIPOS DISPOSITIVO ── */}
          {tab === 'tipos' && (
            <div className="space-y-3 fade-in">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tipos existentes</p>
              <div className="space-y-1 max-h-56 overflow-y-auto">
                {tipos.map(t => (
                  <div key={t.tipo_disp} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm">
                    <span className="font-mono text-xs text-gray-400 w-6">{t.tipo_disp}</span>
                    <span className="text-gray-700">{t.nombre_tipo}</span>
                  </div>
                ))}
                {tipos.length === 0 && <p className="text-center text-xs text-gray-400 py-4">Sin tipos registrados</p>}
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Crear Nuevo Tipo</p>
                <div className="flex gap-2">
                  <input type="text" value={nuevoTipo} placeholder="Nombre del tipo..."
                    onChange={e => setNuevoTipo(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCrearTipo()}
                    className={`${inputCls} flex-1`} />
                  <button onClick={handleCrearTipo} disabled={mutTipo.isPending || !nuevoTipo.trim()}
                    className="px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                    style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
                    {mutTipo.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    Crear
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB MARCAS ── */}
          {tab === 'marcas' && (
            <div className="space-y-3 fade-in">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Marcas existentes</p>
              <div className="space-y-1 max-h-56 overflow-y-auto">
                {marcas.map(m => (
                  <div key={m.clave_marca} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm">
                    <span className="font-mono text-xs text-gray-400 w-6">{m.clave_marca}</span>
                    <span className="text-gray-700">{m.marca}</span>
                  </div>
                ))}
                {marcas.length === 0 && <p className="text-center text-xs text-gray-400 py-4">Sin marcas registradas</p>}
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Crear Nueva Marca</p>
                <div className="flex gap-2">
                  <input type="text" value={nuevaMarca} placeholder="Nombre de la marca..."
                    onChange={e => setNuevaMarca(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCrearMarca()}
                    className={`${inputCls} flex-1`} />
                  <button onClick={handleCrearMarca} disabled={mutMarca.isPending || !nuevaMarca.trim()}
                    className="px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                    style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
                    {mutMarca.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    Crear
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Componente para seleccionar monitores ────────────────────────────────────
function MonitoresSelector({ idBienEquipo, isCreateMode, asignados = [], onAsignar, onDesasignar, asignando, desasignando }) {
  const [showPicker, setShowPicker] = useState(false);
  
  // Buscar monitores disponibles
  const { data: monitoresData, isLoading } = useQuery({
    queryKey: ['bienes-monitores'],
    queryFn: () => gqlClient.request(GET_BIENES_MONITOR),
    enabled: showPicker,
  });
  
  const monitoresDisponibles = (monitoresData?.bienesMonitor ?? []).filter(
    // Excluir los que ya están asignados a este equipo
    m => !asignados.some(a => a.id_monitor === m.id_bien)
  );

  return (
    <div className="rounded-xl border border-teal-200 overflow-hidden mt-4">
      <div className="px-4 py-3 bg-teal-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor size={14} className="text-teal-700" />
          <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Monitores Asignados</span>
        </div>
        <button 
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="text-xs flex items-center gap-1 text-teal-600 hover:text-teal-800 bg-teal-100 hover:bg-teal-200 px-2 py-1 rounded transition-colors"
        >
          {showPicker ? <X size={12} /> : <Plus size={12} />} {showPicker ? 'Cerrar' : 'Agregar Monitor'}
        </button>
      </div>
      
      <div className="p-4 bg-white">
        {isCreateMode && (
          <div className="flex items-center gap-2 py-2 px-3 mb-4 bg-teal-50 border border-teal-100 rounded-lg">
            <Monitor size={14} className="text-teal-500 flex-shrink-0" />
            <p className="text-xs text-teal-700">
              Los monitores se asignarán automáticamente después de guardar el equipo.
            </p>
          </div>
        )}
        <>
          {asignados.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-2 italic">Sin monitores asignados</p>
            ) : (
              <div className="space-y-2 mb-4">
                {asignados.map(am => (
                  <div key={am.id_bien_monitor} className="flex justify-between items-center p-2 rounded-lg border border-gray-100 bg-gray-50">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-gray-800">
                        {am.monitor?.modelo?.descrip_disp || 'Monitor genérico'}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        S/N: {am.monitor?.num_serie || 'S/N'} | INV: {am.monitor?.num_inv || 'S/N'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDesasignar(am.id_bien_monitor)}
                      disabled={desasignando}
                      className="text-red-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 disabled:opacity-50"
                      title="Desasignar monitor"
                    >
                      {desasignando ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {showPicker && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-700 mb-2">Seleccionar Monitor Disponible</p>
                {isLoading ? (
                  <div className="flex justify-center p-4"><Loader2 size={16} className="animate-spin text-teal-500" /></div>
                ) : (
                  <SearchableSelect
                    value=""
                    onChange={(val) => {
                      if(val) {
                        const m = monitoresDisponibles.find(x => x.id_bien === val);
                        onAsignar(isCreateMode ? { monitor: m } : { id_bien: idBienEquipo, id_monitor: val });
                      }
                      setShowPicker(false);
                    }}
                    options={monitoresDisponibles.map(m => ({
                      value: m.id_bien,
                      label: `${m.modelo?.descrip_disp || 'Monitor'} - ${m.num_serie || 'Sin Serie'}`
                    }))}
                    placeholder="Buscar por número de serie o modelo..."
                  />
                )}
              </div>
            )}
          </>
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function Inventario() {
  const { showToast } = useApp();
  const usuario = useAuthStore((s) => s.usuario);
  const idRol = usuario?.id_rol ?? 3;
  const canEdit   = [ROL_ADMIN, ROL_MAESTRO].includes(idRol);
  const canDelete = [ROL_ADMIN, ROL_MAESTRO].includes(idRol);

  // ── Estado de UI ──────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('Capitalizable');
  const [search, setSearch]       = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const filterPanelRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (filterPanelRef.current && !filterPanelRef.current.contains(event.target)) {
        setShowAdvancedFilters(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [filterStatus, setFilterStatus]     = useState('');
  const [filterUbicacion, setFilterUbicacion] = useState('');
  
  const [cursor, setCursor] = useState(null);
  const [cursors, setCursors] = useState([]); // historial para retroceder
  const PAGE_SIZE = 15;

  // Debounce búsqueda simple
  useEffect(() => {
    if (window._searchTimer) clearTimeout(window._searchTimer);
    window._searchTimer = setTimeout(() => {
      setDebouncedSearch(search);
      setCursor(null);
      setCursors([]);
    }, 400);
  }, [search]);

  // ── Filtros Avanzados ───────────────────────────────────────────────────
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advFilters, setAdvFilters] = useState({
    // Ubicación
    clave_unidad_ref: [], // Inmuebles seleccionados
    id_segmento: [],      // Segmentos seleccionados
    id_ubicacion: [],     // Ubicaciones seleccionadas
    // Equipo
    tipo_disp: [],        // Tipos de dispositivo
    clave_marca: [],      // Marcas
    id_categoria: [],     // Categorías
    // Especificaciones TI
    ram_min: '',
    ram_max: '',
    almacenamiento_min: '',
    almacenamiento_max: '',
    modelo_so: '',
    cpu_info: '',
    dir_ip: '',
    // Garantía
    tiene_garantia: '',   // '' | 'true' | 'false'
    garantia_vigente: '', // '' | 'true'
    garantia_fin_desde: '',
    garantia_fin_hasta: '',
    // EAV
    atributo_id: '',
    atributo_valor: '',
  });

  const EMPTY_ADV = {
    clave_unidad_ref: [], id_segmento: [], id_ubicacion: [],
    tipo_disp: [], clave_marca: [], id_categoria: [],
    ram_min: '', ram_max: '', almacenamiento_min: '', almacenamiento_max: '',
    modelo_so: '', cpu_info: '', dir_ip: '',
    tiene_garantia: '', garantia_vigente: '', garantia_fin_desde: '', garantia_fin_hasta: '',
    atributo_id: '', atributo_valor: '',
  };

  // Contar filtros activos
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (advFilters.clave_unidad_ref.length) count++;
    if (advFilters.id_segmento.length) count++;
    if (advFilters.id_ubicacion.length) count++;
    if (advFilters.tipo_disp.length) count++;
    if (advFilters.clave_marca.length) count++;
    if (advFilters.id_categoria.length) count++;
    if (advFilters.ram_min || advFilters.ram_max) count++;
    if (advFilters.almacenamiento_min || advFilters.almacenamiento_max) count++;
    if (advFilters.modelo_so) count++;
    if (advFilters.cpu_info) count++;
    if (advFilters.dir_ip) count++;
    if (advFilters.tiene_garantia) count++;
    if (advFilters.garantia_vigente) count++;
    if (advFilters.garantia_fin_desde || advFilters.garantia_fin_hasta) count++;
    if (advFilters.atributo_id && advFilters.atributo_valor) count++;
    return count;
  }, [advFilters]);

  // Construir objeto de filtro para la API
  const serverFilter = useMemo(() => {
    const f = {};
    if (search) f.search = search;
    if (filterStatus) f.estatus_operativo = filterStatus;
    f.es_capitalizable = activeTab === 'Capitalizable';
    // Avanzados
    if (advFilters.clave_unidad_ref.length) f.clave_unidad_ref = advFilters.clave_unidad_ref;
    if (advFilters.id_segmento.length) f.id_segmento = advFilters.id_segmento.map(Number);
    if (advFilters.id_ubicacion.length) f.id_ubicacion = advFilters.id_ubicacion.map(Number);
    if (advFilters.tipo_disp.length) f.tipo_disp = advFilters.tipo_disp.map(Number);
    if (advFilters.clave_marca.length) f.clave_marca = advFilters.clave_marca.map(Number);
    if (advFilters.id_categoria.length) f.id_categoria = advFilters.id_categoria.map(Number);
    if (advFilters.ram_min) f.ram_min = parseInt(advFilters.ram_min);
    if (advFilters.ram_max) f.ram_max = parseInt(advFilters.ram_max);
    if (advFilters.almacenamiento_min) f.almacenamiento_min = parseInt(advFilters.almacenamiento_min);
    if (advFilters.almacenamiento_max) f.almacenamiento_max = parseInt(advFilters.almacenamiento_max);
    if (advFilters.modelo_so) f.modelo_so = advFilters.modelo_so;
    if (advFilters.cpu_info) f.cpu_info = advFilters.cpu_info;
    if (advFilters.dir_ip) f.dir_ip = advFilters.dir_ip;
    if (advFilters.tiene_garantia === 'true') f.tiene_garantia = true;
    if (advFilters.tiene_garantia === 'false') f.tiene_garantia = false;
    if (advFilters.garantia_vigente === 'true') f.garantia_vigente = true;
    if (advFilters.garantia_fin_desde) f.garantia_fin_desde = advFilters.garantia_fin_desde;
    if (advFilters.garantia_fin_hasta) f.garantia_fin_hasta = advFilters.garantia_fin_hasta;
    if (advFilters.atributo_id && advFilters.atributo_valor) {
      f.atributo_id = parseInt(advFilters.atributo_id);
      f.atributo_valor = advFilters.atributo_valor;
    }
    return f;
  }, [debouncedSearch, filterStatus, activeTab, advFilters]);

  // ── Modales ────────────────────────────────────────────────────────────────
  const [modalQR, setModalQR]           = useState(null);
  const [modalFicha, setModalFicha]     = useState(null);
  const [modalForm, setModalForm]       = useState(null); // null | 'create' | bien
  const [modalConfirmDel, setModalConfirmDel] = useState(null);
  const [showTI, setShowTI]             = useState(false);
  const [deviceMode, setDeviceMode]     = useState(null); // 'PC' | 'LAPTOP' | 'MONITOR' | 'OTHER' | null
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [showAtributosModal, setShowAtributosModal] = useState(false);

  // ── Formulario ────────────────────────────────────────────────────────────
  const [form, setForm]   = useState(FORM_EMPTY);
  const [tiForm, setTiForm] = useState(TI_EMPTY);
  const [formErrors, setFormErrors] = useState({});
  const [pendingEavValues, setPendingEavValues] = useState({}); // {id_atributo: valor} para modo creación
  const [pendingMonitors, setPendingMonitors] = useState([]); // [{ monitor: object, id_monitor: string }] para modo creación
  const [garantiaForm, setGarantiaForm] = useState({ show: false, id_garantia: null, fecha_inicio: '', fecha_fin: '', id_proveedor: '' });

  // ── Estado para Impresión ─────────────────────────────────────────────────
  const [printSelectedBienes, setPrintSelectedBienes] = useState([]);
  const [printStartOffset, setPrintStartOffset] = useState(0);

  // ── Datos ─────────────────────────────────────────────────────────────────
  const { data: bienesData, isLoading, isError, refetch } = useBienes(serverFilter, { first: PAGE_SIZE, after: cursor ?? undefined });
  const bienes = bienesData?.items ?? [];
  const pageInfo = bienesData?.pageInfo ?? {};

  const handleNextPage = () => {
    if (pageInfo?.hasNextPage && pageInfo.endCursor) {
      setCursors(p => [...p, cursor]);
      setCursor(pageInfo.endCursor);
    }
  };

  const handlePrevPage = () => {
    const prev = [...cursors];
    const prevCursor = prev.pop() ?? null;
    setCursors(prev);
    setCursor(prevCursor);
  };

  const { data: catalogos, isLoading: loadingCat } = useCatalogosBienes();
  
  const todasLasUbicaciones = useMemo(() => {
    if (!catalogos?.unidades) return [];
    const ubs = [];
    const filterUnidades = advFilters.clave_unidad_ref || [];
    catalogos.unidades.forEach(uni => {
      if (filterUnidades.length > 0 && !filterUnidades.includes(String(uni.clave))) return;
      if (uni.ubicaciones) {
        uni.ubicaciones.forEach(ub => ubs.push(ub));
      }
    });
    return ubs;
  }, [catalogos?.unidades, advFilters.clave_unidad_ref]);

  const { data: atributosData } = useQuery({
    queryKey: ['cat-atributos', { soloActivos: true }],
    queryFn: () => gqlClient.request(GET_CAT_ATRIBUTOS, { soloActivos: true }),
  });
  
  const selectedEAVTiposObj = useMemo(() => {
    return (catalogos?.tipos ?? []).filter(t => advFilters.tipo_disp.includes(String(t.tipo_disp)));
  }, [catalogos?.tipos, advFilters.tipo_disp]);

  const eavQueries = useQueries({
    queries: selectedEAVTiposObj
      .filter(t => {
        const mode = getDeviceMode(t.nombre_tipo);
        return mode === 'OTHER' || mode === 'MONITOR';
      })
      .map(t => ({
        queryKey: ['atributos-por-tipo', t.tipo_disp],
        queryFn: () => gqlClient.request(GET_ATRIBUTOS_POR_TIPO_DISPOSITIVO, { tipo_disp: Number(t.tipo_disp) }),
        staleTime: 5 * 60 * 1000,
      }))
  });

  const allowedAtributosIds = useMemo(() => {
    const ids = new Set();
    eavQueries.forEach(q => {
      if (q.data?.atributosPorTipoDispositivo) {
        q.data.atributosPorTipoDispositivo.forEach(mapping => {
          ids.add(Number(mapping.id_atributo));
        });
      }
    });
    return ids;
  }, [eavQueries]);

  const eav_atributos = useMemo(() => {
    const all = atributosData?.catAtributos ?? [];
    if (advFilters.tipo_disp.length === 0) return all;
    return all.filter(a => allowedAtributosIds.has(Number(a.id_atributo)));
  }, [atributosData, allowedAtributosIds, advFilters.tipo_disp.length]);

  const qc = useQueryClient();
  const [isAddingUbicacion, setIsAddingUbicacion] = useState(false);
  const [newUbicacionName, setNewUbicacionName] = useState('');

  const { data: ubicacionesData } = useQuery({
    queryKey: ['ubicaciones', form.clave_unidad_ref],
    queryFn: () => gqlClient.request(GET_UBICACIONES_POR_UNIDAD, { id_unidad: form.clave_unidad_ref }),
    enabled: !!form.clave_unidad_ref,
  });
  const ubicacionesUnidad = ubicacionesData?.ubicacionesPorUnidad ?? [];

  const { data: proveedoresData } = useQuery({
    queryKey: ['proveedores'],
    queryFn: () => gqlClient.request(GET_PROVEEDORES),
    select: d => d.proveedores ?? [],
  });
  const proveedores = proveedoresData || [];

  const { mutate: createUbicacion, isPending: creatingUbicacion } = useMutation({
    mutationFn: (vars) => gqlClient.request(CREATE_UBICACION, vars),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ubicaciones', form.clave_unidad_ref] });
      setForm(f => ({ ...f, id_ubicacion: data.createUbicacion.id_ubicacion }));
      setIsAddingUbicacion(false);
      setNewUbicacionName('');
      showToast('Ubicación agregada correctamente', 'success');
    },
    onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al crear ubicación', 'error'),
  });

  const handleCreateUbicacion = () => {
    if (!newUbicacionName.trim() || !form.clave_unidad_ref) return;
    createUbicacion({ id_unidad: form.clave_unidad_ref, nombre_ubicacion: newUbicacionName.trim() });
  };

  const { mutate: createGarantia } = useMutation({
    mutationFn: (vars) => gqlClient.request(CREATE_GARANTIA, vars),
    onSuccess: () => showToast('Garantía guardada', 'success'),
    onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al guardar garantía', 'error'),
  });
  const { mutate: updateGarantia } = useMutation({
    mutationFn: (vars) => gqlClient.request(UPDATE_GARANTIA, vars),
    onSuccess: () => showToast('Garantía actualizada', 'success'),
    onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al actualizar garantía', 'error'),
  });

  const { mutate: createBien, isPending: creating } = useCreateBien({
    onSuccess: () => { closeForm(); showToast('Bien registrado correctamente.', 'success'); },
    onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al crear bien.', 'error'),
  });
  const { mutate: updateBien, isPending: updating } = useUpdateBien({
    onSuccess: () => { closeForm(); showToast('Bien actualizado correctamente.', 'success'); },
    onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al actualizar bien.', 'error'),
  });

  const handleAutoCalcGarantia = (years) => {
    if (!garantiaForm.fecha_inicio) {
        showToast('Selecciona primero la Fecha de Inicio', 'warning');
        return;
    }
    const d = new Date(garantiaForm.fecha_inicio);
    d.setFullYear(d.getFullYear() + years);
    setGarantiaForm(p => ({ ...p, fecha_fin: d.toISOString().split('T')[0] }));
  };
  const { mutate: deleteBien, isPending: deleting } = useDeleteBien({
    onSuccess: () => { setModalConfirmDel(null); showToast('Bien eliminado.', 'success'); },
    onError: (e) => {
      setModalConfirmDel(null);
      showToast(e?.response?.errors?.[0]?.message ?? 'No se pudo eliminar el bien.', 'error');
    },
  });
  const { mutate: upsertTI } = useUpsertEspecificacionTI({
    onSuccess: () => showToast('Especificaciones TI guardadas.', 'success'),
    onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al guardar TI.', 'error'),
  });

  // ── Mutaciones de monitores ────────────────────────────────────────────────
  const { mutate: asignarMonitor, isPending: asignando } = useMutation({
    mutationFn: (vars) => gqlClient.request(ASIGNAR_MONITOR_MUTATION, vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bienes'] });
      showToast('Monitor asignado.', 'success');
    },
    onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al asignar monitor.', 'error'),
  });
  const { mutate: desasignarMonitor, isPending: desasignando } = useMutation({
    mutationFn: (vars) => gqlClient.request(DESASIGNAR_MONITOR_MUTATION, vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bienes'] });
      showToast('Monitor desasignado.', 'success');
    },
    onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al desasignar monitor.', 'error'),
  });

  // ── Filtrado local obsoleto (se hace en servidor) ─────────────────────────
  const paginated = bienes.filter((b) => {
    const ub = b.ubicacion?.toLowerCase() ?? '';
    if (filterUbicacion && ub !== filterUbicacion.toLowerCase()) return false;
    return true;
  });

  // ── Formulario: abrir ───────────────────────────────────────────────────────
  const openCreate = useCallback(() => {
    setForm(FORM_EMPTY);
    setTiForm(TI_EMPTY);
    setFormErrors({});
    setPendingEavValues({});
    setPendingMonitors([]);
    setShowTI(false);
    setDeviceMode(null);
    setModalForm('create');
  }, []);

  const openEdit = useCallback((bien) => {
    setForm({
      id_categoria:       bien.idCategoria ?? '',
      id_unidad_medida:   bien.idUnidadMedida ?? '',
      id_segmento:        bien.idSegmento ?? '',
      id_ubicacion:       bien.id_ubicacion ?? '',
      num_serie:          bien.numSerie === 'N/D' ? '' : (bien.numSerie ?? ''),
      num_inv:            bien.numInv === 'N/D' ? '' : (bien.numInv ?? ''),
      cantidad:           bien.cantidad ?? 1,
      estatus_operativo:  bien.estatusOperativo ?? 'ACTIVO',
      clave_unidad_ref:   bien.claveUnidadRef ?? '',
      clave_modelo:       bien.claveModelo ?? '',
      id_usuario_resguardo: bien.idUsuarioResguardo ?? '',
      fecha_adquisicion: bien.fechaAdquisicion
        ? new Date(bien.fechaAdquisicion).toISOString().split('T')[0] : '',
    });
    setTiForm({
      cpu_info: bien.especificacionTI?.cpu_info ?? '',
      ram_gb: bien.especificacionTI?.ram_gb ?? '',
      almacenamiento_gb: bien.especificacionTI?.almacenamiento_gb ?? '',
      dir_ip: bien.especificacionTI?.dir_ip ?? '',
      dir_mac: bien.especificacionTI?.dir_mac ?? '',
      mac_address: bien.especificacionTI?.mac_address ?? '',
      modelo_so: bien.especificacionTI?.modelo_so ?? '',
      puerto_red: bien.especificacionTI?.puerto_red ?? '',
      switch_red: bien.especificacionTI?.switch_red ?? '',
      cuenta_windows: bien.especificacionTI?.cuenta_windows ?? '',
      correo: bien.especificacionTI?.correo ?? '',
      last_scan: bien.especificacionTI?.last_scan ?? '',
      tipo_user: bien.especificacionTI?.tipo_user ?? '',
      nombre_host: bien.especificacionTI?.nombre_host ?? '',
      windows_serial: bien.especificacionTI?.windows_serial ?? '',
    });
    // Detectar deviceMode por tipo de dispositivo del modelo
    const nombreTipo = bien.modelo?.tipoDispositivo?.nombre_tipo ?? null;
    const mode = getDeviceMode(nombreTipo);
    setDeviceMode(mode);
    setShowTI(mode === 'PC' || mode === 'LAPTOP');
    setFormErrors({});
    setPendingEavValues({});
    setPendingMonitors([]);
    
    // Cargar Garantía si existe
    const primeraGarantia = bien.garantias && bien.garantias.length > 0 ? bien.garantias[0] : null;
    if (primeraGarantia) {
      setGarantiaForm({
        show: true,
        id_garantia: primeraGarantia.id_garantia,
        fecha_inicio: primeraGarantia.fecha_inicio ? new Date(primeraGarantia.fecha_inicio).toISOString().split('T')[0] : '',
        fecha_fin: primeraGarantia.fecha_fin ? new Date(primeraGarantia.fecha_fin).toISOString().split('T')[0] : '',
        id_proveedor: primeraGarantia.id_proveedor || '',
      });
    } else {
      setGarantiaForm({ show: false, id_garantia: null, fecha_inicio: '', fecha_fin: '', id_proveedor: '' });
    }

    setModalForm(bien);
  }, []);

  const closeForm = useCallback(() => {
    setModalForm(null);
    setForm(FORM_EMPTY);
    setTiForm(TI_EMPTY);
    setFormErrors({});
    setPendingEavValues({});
    setPendingMonitors([]);
    setGarantiaForm({ show: false, id_garantia: null, fecha_inicio: '', fecha_fin: '', id_proveedor: '' });
    setDeviceMode(null);
    setShowTI(false);
  }, []);

  // ID de la unidad de medida "Pieza" en Cat_UnidadesMedida
  const ID_UNIDAD_PIEZA = useMemo(() => {
    const pza = (catalogos?.unidadesMedida ?? []).find(
      (u) => u.abreviatura === 'PZA' || u.nombre_unidad?.toLowerCase() === 'pieza'
    );
    return pza ? String(pza.id_unidad_medida) : '1';
  }, [catalogos?.unidadesMedida]);

  // ¿La categoría seleccionada maneja número de serie individual? (→ cantidad forzada a 1)
  const categoriaSeleccionada = useMemo(() =>
    (catalogos?.categorias ?? []).find((c) => String(c.id_categoria) === String(form.id_categoria)),
    [catalogos?.categorias, form.id_categoria]
  );
  const esSerie = categoriaSeleccionada?.maneja_serie_individual ?? false;

  // Forzar a Pieza si es dispositivo de hardware (PC, LAPTOP, MONITOR)
  const forcePieza = deviceMode === 'PC' || deviceMode === 'LAPTOP' || deviceMode === 'MONITOR';

  // ── Detectar tipo de dispositivo al cambiar modelo ────────────────────────
  // La categoría ya NO controla el panel de especificaciones TI.
  // Ahora es el tipo_disp del modelo el que determina qué panel mostrar.
  // modelMeta: { tipo_disp } opcional, se usa cuando el modelo acaba de ser creado
  // y aún no está en el caché de catalogos.modelos.
  const handleModeloChange = useCallback((clave, modelMeta) => {
    if (!clave) {
      setDeviceMode(null);
      setShowTI(false);
      setForm(f => ({ ...f, clave_modelo: '' }));
      return;
    }
    // Intentar obtener tipo_disp del caché o del meta pasado directamente
    const modelo = (catalogos?.modelos ?? []).find(m => m.clave_modelo === clave);
    const tipoDispRaw = modelMeta?.tipo_disp ?? modelo?.tipo_disp;
    const tipoDispStr = String(tipoDispRaw ?? '');
    const tipo = (catalogos?.tipos ?? []).find(t => String(t.tipo_disp) === tipoDispStr);
    const mode = getDeviceMode(tipo?.nombre_tipo ?? null);
    console.log('[handleModeloChange]', { clave, tipoDispStr, nombre_tipo: tipo?.nombre_tipo, mode });
    setDeviceMode(mode);
    setShowTI(mode === 'PC' || mode === 'LAPTOP');
    setForm(f => ({ ...f, clave_modelo: clave }));
  }, [catalogos?.modelos, catalogos?.tipos]);

  // ── handleCatChange ya no activa specs TI ─────────────────────────────────
  const handleCatChange = (val) => {
    const catInfo = (catalogos?.categorias ?? []).find((c) => String(c.id_categoria) === String(val));
    const esSerieCat = catInfo?.maneja_serie_individual ?? false;
    setForm((f) => ({
      ...f,
      id_categoria: val,
      cantidad: esSerieCat ? 1 : f.cantidad,
    }));
    // showTI ya NO se activa por categoría — se activa por tipo de dispositivo del modelo
  };

  // ── Validación básica ──────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!form.id_categoria)     errs.id_categoria     = 'Requerido';
    if (!form.id_unidad_medida && !forcePieza) errs.id_unidad_medida = 'Requerido';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Enviar formulario ──────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!validate()) return;
    const vars = {
      id_categoria:      Number(form.id_categoria),
      id_unidad_medida:  forcePieza ? Number(ID_UNIDAD_PIEZA) : Number(form.id_unidad_medida),
      id_segmento:       form.id_segmento ? Number(form.id_segmento) : null,
      id_ubicacion:      form.id_ubicacion ? Number(form.id_ubicacion) : null,
      num_serie:         form.num_serie || null,
      num_inv:           form.num_inv || null,
      cantidad:          esSerie ? 1 : (Number(form.cantidad) || 1),
      estatus_operativo: form.estatus_operativo,
      clave_unidad_ref:  form.clave_unidad_ref || null,
      clave_modelo:      form.clave_modelo || null,
      id_usuario_resguardo: form.id_usuario_resguardo ? Number(form.id_usuario_resguardo) : null,
      fecha_adquisicion: form.fecha_adquisicion || null,
    };

    if (modalForm === 'create') {
      // IMPORTANTE: el callback de mutate() recibe el dato RAW de GraphQL
      // ({ createBien: {...} }), no el dato normalizado del hook.
      // Por eso extraemos data.createBien para obtener el id_bien.
      createBien(vars, {
        onSuccess: (data) => {
          const bienCreado = data?.createBien;
          if (!bienCreado?.id_bien) return;

          // Guardar Especificaciones TI si aplica
          if (showTI) {
            const tiData = parseTI();
            const hayDatosTI = Object.values(tiData).some((v) => v !== null && v !== '');
            if (hayDatosTI) {
              upsertTI({ id_bien: bienCreado.id_bien, ...tiData });
            }
          }

          // Guardar atributos EAV pendientes si aplica (deviceMode === 'OTHER')
          const eavEntries = Object.entries(pendingEavValues).filter(([, val]) => val && String(val).trim());
          if (eavEntries.length > 0) {
            const atributos = eavEntries.map(([id, valor]) => ({
              id_atributo: parseInt(id),
              valor: String(valor).trim(),
            }));
            gqlClient.request(UPSERT_BIEN_ATRIBUTOS, { id_bien: bienCreado.id_bien, atributos })
              .then(() => showToast('Atributos técnicos guardados', 'success'))
              .catch((e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al guardar atributos', 'error'));
          }

          // Asignar Monitores pendientes si aplica
          if (pendingMonitors.length > 0) {
            pendingMonitors.forEach(m => {
              asignarMonitor({ id_bien: bienCreado.id_bien, id_monitor: m.id_monitor });
            });
          }

          // Crear Garantía si aplica
          if (garantiaForm.show && garantiaForm.fecha_fin) {
            createGarantia({
              id_bien: bienCreado.id_bien,
              fecha_inicio: garantiaForm.fecha_inicio || null,
              fecha_fin: garantiaForm.fecha_fin,
              id_proveedor: garantiaForm.id_proveedor ? parseInt(garantiaForm.id_proveedor) : null,
              estado_garantia: 'VIGENTE'
            });
          }
        },
      });
    } else {
      updateBien({ id_bien: modalForm.id_bien, ...vars }, {
        onSuccess: () => {
          if (showTI && modalForm.id_bien) {
            const tiData = parseTI();
            const hayDatosTI = Object.values(tiData).some((v) => v !== null && v !== '');
            if (hayDatosTI) {
              upsertTI({ id_bien: modalForm.id_bien, ...tiData });
            }
          }
          if (garantiaForm.show && garantiaForm.fecha_fin) {
            if (garantiaForm.id_garantia) {
              updateGarantia({
                id_garantia: garantiaForm.id_garantia,
                fecha_inicio: garantiaForm.fecha_inicio || null,
                fecha_fin: garantiaForm.fecha_fin,
                id_proveedor: garantiaForm.id_proveedor ? parseInt(garantiaForm.id_proveedor) : null,
                estado_garantia: 'VIGENTE'
              });
            } else {
              createGarantia({
                id_bien: modalForm.id_bien,
                fecha_inicio: garantiaForm.fecha_inicio || null,
                fecha_fin: garantiaForm.fecha_fin,
                id_proveedor: garantiaForm.id_proveedor ? parseInt(garantiaForm.id_proveedor) : null,
                estado_garantia: 'VIGENTE'
              });
            }
          }
        },
      });
    }
  };

  const parseTI = () => ({
    cpu_info:          tiForm.cpu_info || null,
    ram_gb:            tiForm.ram_gb ? Number(tiForm.ram_gb) : null,
    almacenamiento_gb: tiForm.almacenamiento_gb ? Number(tiForm.almacenamiento_gb) : null,
    dir_ip:            tiForm.dir_ip || null,
    dir_mac:           tiForm.dir_mac || null,
    mac_address:       tiForm.mac_address || null,
    modelo_so:         tiForm.modelo_so || null,
    puerto_red:        tiForm.puerto_red || null,
    switch_red:        tiForm.switch_red || null,
    cuenta_windows:    tiForm.cuenta_windows || null,
    correo:            tiForm.correo || null,
    last_scan:         tiForm.last_scan || null,
    tipo_user:         tiForm.tipo_user || null,
    nombre_host:       tiForm.nombre_host || null,
    windows_serial:    tiForm.windows_serial || null,
  });

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <>
    <div className="flex flex-col h-[calc(100dvh-70px)] sm:h-[calc(100vh-70px)] overflow-hidden p-4 sm:p-6 gap-4 fade-in no-print">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Inventario de Bienes</h1>
          <p className="text-sm text-gray-500 mt-1">Padrón de activos institucionales — Delegación Nayarit</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            title="Refrescar"
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={16} />
          </button>
          {canEdit && (
            <button
              id="btn-nuevo-bien"
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}
            >
              <Plus size={16} />
              Nuevo Bien
            </button>
          )}
        </div>
      </div>

      {/* ── Pestañas ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4 w-full">
        <div className="flex flex-wrap sm:flex-nowrap gap-1 p-1 bg-gray-100 rounded-xl w-full sm:w-fit">
          {[
            { key: 'Capitalizable',    label: 'Bienes Capitalizables' },
          { key: 'No Capitalizable', label: 'Bienes No Capitalizables' },
          { key: 'Impresión de Etiquetas', label: 'Impresión de Etiquetas QR' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setCursor(null); setCursors([]); }}
            className={`flex-1 sm:flex-none px-3 sm:px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap text-center ${
              activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
        </div>
        {[ROL_ADMIN, ROL_MAESTRO].includes(idRol) && (
          <button
            onClick={() => setShowAtributosModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all border border-purple-200 text-purple-700 hover:bg-purple-50 shrink-0 bg-white shadow-sm"
          >
            <Settings size={15} /> Gestión de Atributos EAV
          </button>
        )}
      </div>

      {/* ── Filtros ──────────────────────────────────────────────────────── */}
      {activeTab !== 'Impresión de Etiquetas' ? (
        <>
          <div ref={filterPanelRef} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm relative z-20">
            {/* Barra principal de búsqueda */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por serie, inventario, clave presupuestal..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCursor(null); setCursors([]); }}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setCursor(null); setCursors([]); }}
                  className="flex-1 sm:flex-none text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                >
                  <option value="">Todos los estatus</option>
                  <option value="ACTIVO">Activo</option>
                  <option value="EN_REPARACION">En Reparación</option>
                  <option value="BAJA">Baja</option>
                  <option value="INACTIVO">Inactivo</option>
                </select>
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border transition-all whitespace-nowrap ${
                    showAdvancedFilters || activeFilterCount > 0
                      ? 'bg-green-50 border-green-300 text-green-700 shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <SlidersHorizontal size={14} />
                  Filtros
                  {activeFilterCount > 0 && (
                    <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-green-600 text-white font-bold">{activeFilterCount}</span>
                  )}
                </button>
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => { setAdvFilters({...EMPTY_ADV}); setCursor(null); setCursors([]); }}
                    className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                    title="Limpiar todos los filtros"
                  >
                    <FilterX size={13} /> Limpiar
                  </button>
                )}
              </div>
            </div>

            {/* Chips de filtros activos */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100">
                {advFilters.tipo_disp.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                    <Cpu size={10} /> {advFilters.tipo_disp.length} tipo(s) disp.
                    <button onClick={() => setAdvFilters(p => ({...p, tipo_disp: []}))} className="ml-0.5 hover:text-blue-900"><X size={10}/></button>
                  </span>
                )}
                {advFilters.clave_marca.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                    <Tag size={10} /> {advFilters.clave_marca.length} marca(s)
                    <button onClick={() => setAdvFilters(p => ({...p, clave_marca: []}))} className="ml-0.5 hover:text-purple-900"><X size={10}/></button>
                  </span>
                )}
                {advFilters.clave_unidad_ref.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                    <MapPin size={10} /> {advFilters.clave_unidad_ref.length} inmueble(s)
                    <button onClick={() => setAdvFilters(p => ({...p, clave_unidad_ref: []}))} className="ml-0.5 hover:text-amber-900"><X size={10}/></button>
                  </span>
                )}
                {(advFilters.ram_min || advFilters.ram_max) && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 font-medium">
                    <Server size={10} /> RAM: {advFilters.ram_min || '0'}–{advFilters.ram_max || '∞'} GB
                    <button onClick={() => setAdvFilters(p => ({...p, ram_min: '', ram_max: ''}))} className="ml-0.5 hover:text-cyan-900"><X size={10}/></button>
                  </span>
                )}
                {advFilters.modelo_so && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                    <Monitor size={10} /> SO: {advFilters.modelo_so}
                    <button onClick={() => setAdvFilters(p => ({...p, modelo_so: ''}))} className="ml-0.5 hover:text-indigo-900"><X size={10}/></button>
                  </span>
                )}
                {advFilters.tiene_garantia && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">
                    <Shield size={10} /> {advFilters.tiene_garantia === 'true' ? 'Con Garantía' : 'Sin Garantía'}
                    <button onClick={() => setAdvFilters(p => ({...p, tiene_garantia: '', garantia_vigente: '', garantia_fin_desde: '', garantia_fin_hasta: ''}))} className="ml-0.5 hover:text-green-900"><X size={10}/></button>
                  </span>
                )}
                {(advFilters.atributo_id && advFilters.atributo_valor) && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-200 font-medium">
                    <Tag size={10} /> Atributo EAV
                    <button onClick={() => setAdvFilters(p => ({...p, atributo_id: '', atributo_valor: ''}))} className="ml-0.5 hover:text-pink-900"><X size={10}/></button>
                  </span>
                )}
              </div>
            )}

            {/* Panel de filtros avanzados desplegable */}
            {showAdvancedFilters && (() => {
              const selectedTiposObj = (catalogos?.tipos ?? []).filter(t => advFilters.tipo_disp.includes(String(t.tipo_disp)));
              const hasPCorLaptop = selectedTiposObj.some(t => {
                const mode = getDeviceMode(t.nombre_tipo);
                return mode === 'PC' || mode === 'LAPTOP';
              });
              const hasOtherDevice = selectedTiposObj.some(t => {
                const mode = getDeviceMode(t.nombre_tipo);
                return mode === 'OTHER' || mode === 'MONITOR';
              });
              const showTIFilter = advFilters.tipo_disp.length > 0 && hasPCorLaptop;
              const showEAVFilter = advFilters.tipo_disp.length > 0 && hasOtherDevice;

              return (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-2xl z-50 space-y-4 animate-in fade-in slide-in-from-top-2 overflow-y-auto max-h-[70vh] custom-scrollbar">
                  {/* Sección: Ubicación */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><MapPin size={11}/> Ubicación</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1">Inmueble</label>
                      <MultiSearchableSelect
                        placeholder="Seleccionar inmuebles..."
                        value={advFilters.clave_unidad_ref}
                        onChange={(val) => { setAdvFilters(p => ({...p, clave_unidad_ref: val})); setCursor(null); setCursors([]); }}
                        options={(catalogos?.unidades ?? []).map(u => ({
                          value: u.clave,
                          label: u.desc_corta || u.descripcion || u.clave
                        }))}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1">Segmento</label>
                      <MultiSearchableSelect
                        placeholder="Seleccionar segmentos..."
                        value={advFilters.id_segmento}
                        onChange={(val) => { setAdvFilters(p => ({...p, id_segmento: val.map(String)})); setCursor(null); setCursors([]); }}
                        options={(catalogos?.segmentos ?? []).map(s => ({
                          value: String(s.id_segmento),
                          label: s.nombre || s.clave || s.id_segmento
                        }))}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1">Ubicación Física</label>
                      <MultiSearchableSelect
                        placeholder="Seleccionar ubicaciones..."
                        value={advFilters.id_ubicacion}
                        onChange={(val) => { setAdvFilters(p => ({...p, id_ubicacion: val})); setCursor(null); setCursors([]); }}
                        options={todasLasUbicaciones.map(u => ({
                          value: String(u.id_ubicacion),
                          label: u.nombre_ubicacion
                        }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Sección: Equipo / Dispositivo */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Cpu size={11}/> Equipo / Dispositivo</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1">Tipo Dispositivo</label>
                      <MultiSearchableSelect
                        placeholder="Seleccionar tipos..."
                        value={advFilters.tipo_disp}
                        onChange={(val) => { setAdvFilters(p => ({...p, tipo_disp: val.map(String)})); setCursor(null); setCursors([]); }}
                        options={(catalogos?.tipos ?? []).map(t => ({
                          value: String(t.tipo_disp),
                          label: t.nombre_tipo
                        }))}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1">Marca</label>
                      <MultiSearchableSelect
                        placeholder="Seleccionar marcas..."
                        value={advFilters.clave_marca}
                        onChange={(val) => { setAdvFilters(p => ({...p, clave_marca: val.map(String)})); setCursor(null); setCursors([]); }}
                        options={(catalogos?.marcas ?? []).map(m => ({
                          value: String(m.clave_marca),
                          label: m.marca
                        }))}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1">Categoría</label>
                      <MultiSearchableSelect
                        placeholder="Seleccionar categorías..."
                        value={advFilters.id_categoria}
                        onChange={(val) => { setAdvFilters(p => ({...p, id_categoria: val.map(String)})); setCursor(null); setCursors([]); }}
                        options={(catalogos?.categorias ?? []).map(c => ({
                          value: String(c.id_categoria),
                          label: c.nombre_categoria
                        }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Sección: Especificaciones TI */}
                {showTIFilter && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><HardDrive size={11}/> Especificaciones TI</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">RAM Mín. (GB)</label>
                        <input type="number" min="0" placeholder="Ej. 4"
                          value={advFilters.ram_min}
                          onChange={e => { setAdvFilters(p => ({...p, ram_min: e.target.value})); setCursor(null); setCursors([]); }}
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">RAM Máx. (GB)</label>
                        <input type="number" min="0" placeholder="Ej. 32"
                          value={advFilters.ram_max}
                          onChange={e => { setAdvFilters(p => ({...p, ram_max: e.target.value})); setCursor(null); setCursors([]); }}
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">Almac. Mín. (GB)</label>
                        <input type="number" min="0" placeholder="Ej. 128"
                          value={advFilters.almacenamiento_min}
                          onChange={e => { setAdvFilters(p => ({...p, almacenamiento_min: e.target.value})); setCursor(null); setCursors([]); }}
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">Almac. Máx. (GB)</label>
                        <input type="number" min="0" placeholder="Ej. 1024"
                          value={advFilters.almacenamiento_max}
                          onChange={e => { setAdvFilters(p => ({...p, almacenamiento_max: e.target.value})); setCursor(null); setCursors([]); }}
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">Sistema Operativo</label>
                        <input type="text" placeholder='Ej. "Windows", "Linux"'
                          value={advFilters.modelo_so}
                          onChange={e => { setAdvFilters(p => ({...p, modelo_so: e.target.value})); setCursor(null); setCursors([]); }}
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">CPU</label>
                        <input type="text" placeholder='Ej. "i7", "Ryzen"'
                          value={advFilters.cpu_info}
                          onChange={e => { setAdvFilters(p => ({...p, cpu_info: e.target.value})); setCursor(null); setCursors([]); }}
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">Dirección IP</label>
                        <input type="text" placeholder='Ej. "10.28"'
                          value={advFilters.dir_ip}
                          onChange={e => { setAdvFilters(p => ({...p, dir_ip: e.target.value})); setCursor(null); setCursors([]); }}
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Sección: Garantía */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Shield size={11}/> Garantía</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-1">Estado</label>
                      <select
                        value={advFilters.tiene_garantia}
                        onChange={e => { setAdvFilters(p => ({...p, tiene_garantia: e.target.value, garantia_vigente: '', garantia_fin_desde: '', garantia_fin_hasta: ''})); setCursor(null); setCursors([]); }}
                        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-green-500 bg-white"
                      >
                        <option value="">Todos</option>
                        <option value="true">Con Garantía</option>
                        <option value="false">Sin Garantía</option>
                      </select>
                    </div>
                    {advFilters.tiene_garantia === 'true' && (
                      <>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 mb-1">Solo Vigentes</label>
                          <select
                            value={advFilters.garantia_vigente}
                            onChange={e => { setAdvFilters(p => ({...p, garantia_vigente: e.target.value})); setCursor(null); setCursors([]); }}
                            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-green-500 bg-white"
                          >
                            <option value="">Todas</option>
                            <option value="true">Solo Vigentes</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 mb-1">Vence Desde</label>
                          <input type="date"
                            value={advFilters.garantia_fin_desde}
                            onChange={e => { setAdvFilters(p => ({...p, garantia_fin_desde: e.target.value})); setCursor(null); setCursors([]); }}
                            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-green-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 mb-1">Vence Hasta</label>
                          <input type="date"
                            value={advFilters.garantia_fin_hasta}
                            onChange={e => { setAdvFilters(p => ({...p, garantia_fin_hasta: e.target.value})); setCursor(null); setCursors([]); }}
                            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-green-500"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Sección: Atributos Técnicos (EAV) */}
                {showEAVFilter && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Tag size={11}/> Atributo Técnico (EAV)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">Atributo</label>
                        <SearchableSelect
                          placeholder="-- Seleccionar Atributo --"
                          value={advFilters.atributo_id ? Number(advFilters.atributo_id) : ''}
                          onChange={(val) => { setAdvFilters(p => ({...p, atributo_id: val})); setCursor(null); setCursors([]); }}
                          options={eav_atributos.map(a => ({
                            value: a.id_atributo,
                            label: `${a.nombre_atributo} ${a.unidad_medida ? `(${a.unidad_medida})` : ''}`
                          }))}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">Valor (búsqueda parcial)</label>
                        <input type="text" placeholder='Ej. "4000", "Samsung"'
                          value={advFilters.atributo_valor}
                          onChange={e => { setAdvFilters(p => ({...p, atributo_valor: e.target.value})); setCursor(null); setCursors([]); }}
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )})()}

            <p className="text-xs text-gray-400 mt-2">
              {pageInfo?.totalCount ?? 0} {(pageInfo?.totalCount ?? 0) === 1 ? 'registro' : 'registros'} encontrados
              {activeFilterCount > 0 && <span className="text-green-600 font-semibold"> · {activeFilterCount} filtro(s) avanzado(s) activo(s)</span>}
            </p>
          </div>

      {/* ── Contenedor con scroll — tabla desktop + tarjetas móvil ──────── */}
      <div className="flex-1 min-h-0 flex flex-col gap-3">

        {/* Estado de carga / error */}
        {isLoading && (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
            <Loader2 size={22} className="animate-spin" />
            <span className="text-sm">Cargando inventario...</span>
          </div>
        )}
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center text-red-600 text-sm">
            Ocurrió un error al cargar el inventario. <button onClick={() => refetch()} className="underline font-semibold">Reintentar</button>
          </div>
        )}

        {/* TABLA desktop */}
        {!isLoading && !isError && (
          <div className="hidden md:flex md:flex-col flex-1 min-h-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex-1 overflow-y-auto relative">
              <table className="w-full text-sm text-left">
                <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-100 shadow-sm">
                  <tr>
                    <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">ID / Serie</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Modelo / Categoría</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ubicación / Unidad</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Resguardo</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estatus</th>
                    <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {bienes.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-14 text-gray-400 text-sm">
                      <Package size={32} className="mx-auto mb-2 opacity-30" />
                      No se encontraron bienes con los filtros aplicados.
                    </td></tr>
                  ) : bienes.map((bien) => (
                    <tr key={bien.id} className="hover:bg-gray-50/70 transition-colors group">
                      <td className="px-4 py-3.5">
                        <div>
                          <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                            {fmt(bien.numSerie)}
                          </span>
                          <p className="text-xs text-gray-400 mt-0.5">Inv: {fmt(bien.numInv)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-gray-900 text-sm">{bien.equipo}</p>
                        <p className="text-xs text-gray-400">{bien.categoria?.nombre_categoria}</p>
                      </td>
                      <td className="px-4 py-3.5 text-xs max-w-[160px] truncate">
                        <p className="font-semibold text-gray-900 text-[13px]">{fmt(bien.ubicacion)}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{fmt(bien.unidadFisica)}</p>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-600 max-w-[140px] truncate">{fmt(bien.resguardo)}</td>
                      <td className="px-4 py-3.5"><EstatusBadge estatus={bien.estatusOperativo} /></td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setModalFicha(bien)} title="Ver Ficha Técnica"
                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                            <Eye size={14} />
                          </button>
                          <button onClick={() => setModalQR(bien)} title="Ver Identificadores QR"
                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                            <QrCode size={14} />
                          </button>
                          {canEdit && (
                            <button onClick={() => openEdit(bien)} title="Editar bien"
                              className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors">
                              <Edit size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => setModalConfirmDel(bien)} title="Eliminar bien"
                              className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TARJETAS mobile */}
        {!isLoading && !isError && (
          <div className="md:hidden flex-1 min-h-0 overflow-y-auto space-y-3 pb-2">
            {bienes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-12 text-gray-400 text-sm">
                <Package size={32} className="mx-auto mb-2 opacity-30" />
                No se encontraron bienes.
              </div>
            ) : bienes.map((bien) => (
              <div key={bien.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm leading-tight">{bien.equipo}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{bien.categoria?.nombre_categoria}</p>
                    <span className="font-mono text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded mt-1 inline-block">
                      {fmt(bien.numSerie)}
                    </span>
                  </div>
                  <EstatusBadge estatus={bien.estatusOperativo} />
                </div>
                <div className="text-xs text-gray-500 space-y-1 mb-3">
                  <p><span className="text-gray-400">Ubicación:</span> {fmt(bien.ubicacion)}</p>
                  <p><span className="text-gray-400">Resguardo:</span> {fmt(bien.resguardo)}</p>
                  <p><span className="text-gray-400">Inv:</span> {fmt(bien.numInv)}</p>
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-gray-50 flex-wrap">
                  <button onClick={() => setModalFicha(bien)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors text-xs font-semibold">
                    <Eye size={13} /> Ficha
                  </button>
                  <button onClick={() => setModalQR(bien)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors text-xs font-semibold">
                    <QrCode size={13} /> QR
                  </button>
                  {canEdit && (
                    <button onClick={() => openEdit(bien)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors text-xs font-semibold">
                      <Edit size={13} /> Editar
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={() => setModalConfirmDel(bien)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors text-xs font-semibold">
                      <Trash2 size={13} /> Eliminar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>{/* fin contenedor scroll */}

      {/* Paginación - conectada al servidor */}
      {!isLoading && !isError && (pageInfo?.hasNextPage || cursors.length > 0) && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex flex-col gap-0.5">
            <p className="text-xs text-gray-500 font-medium">Total: <span className="text-gray-900 font-bold">{pageInfo.totalCount || 0}</span> bienes registrados.</p>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
              Página {cursors.length + 1} {pageInfo.totalCount > 0 && ` de ${Math.ceil(pageInfo.totalCount / PAGE_SIZE)}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrevPage} disabled={cursors.length === 0} 
              className="px-4 py-1.5 text-xs font-semibold bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm">
              Anterior
            </button>
            <button onClick={handleNextPage} disabled={!pageInfo?.hasNextPage} 
              className="px-4 py-1.5 text-xs font-semibold bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm">
              Siguiente
            </button>
          </div>
        </div>
      )}
        </>
      ) : (
        <PrintLabelsTab 
          bienes={bienes} 
          categorias={catalogos?.categorias ?? []}
          onUpdateSelection={setPrintSelectedBienes} 
          onUpdateOffset={setPrintStartOffset} 
        />
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MODAL: FICHA TÉCNICA
      ═══════════════════════════════════════════════════════════════════════ */}
      {modalFicha && (() => {
        const fichaMode = getDeviceMode(modalFicha.modelo?.tipoDispositivo?.nombre_tipo);
        return (
        <Modal onClose={() => setModalFicha(null)} title="Ficha Técnica" wide>
          <div className="space-y-4 text-sm">
            {/* Encabezado del bien */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#006341,#004d32)' }}>
                <Package size={22} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-base leading-tight">{modalFicha.equipo}</p>
                <p className="text-xs text-gray-500">{modalFicha.categoria?.nombre_categoria}</p>
              </div>
              <EstatusBadge estatus={modalFicha.estatusOperativo} />
            </div>

            {/* Campos informativos en grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoField icon={<Tag size={14}/>}      label="No. Serie"          value={fmt(modalFicha.numSerie)} mono />
              <InfoField icon={<Tag size={14}/>}      label="No. Inventario"     value={fmt(modalFicha.numInv)} mono />
              <InfoField icon={<Shield size={14}/>}   label="Clave Presupuestal" value={fmt(modalFicha.clavePresupuestal)} mono />
              <InfoField icon={<MapPin size={14}/>}   label="Ubicación"          value={fmt(modalFicha.ubicacion)} />
              <InfoField icon={<User size={14}/>}     label="En Resguardo de"    value={fmt(modalFicha.resguardo)} />
              <InfoField icon={<Calendar size={14}/>} label="Fecha Adquisición"  value={formatDate(modalFicha.fechaAdquisicion)} />
              <InfoField icon={<Calendar size={14}/>} label="Última Actualización" value={formatDateTime(modalFicha.fechaActualizacion)} />
              <InfoField icon={<Package size={14}/>}  label="Cantidad"           value={modalFicha.cantidad} />
            </div>

            {/* Especificaciones TI */}
            {modalFicha.especificacionTI && (fichaMode === 'PC' || fichaMode === 'LAPTOP') && (
              <div className="rounded-xl border border-blue-100 overflow-hidden">
                <div className="bg-blue-50 px-4 py-2.5 flex items-center gap-2">
                  <Monitor size={15} className="text-blue-600" />
                  <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Especificaciones TI</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
                  <InfoField icon={<Cpu size={13}/>}       label="CPU"            value={fmt(modalFicha.especificacionTI.cpu_info)} />
                  <InfoField icon={<Server size={13}/>}    label="RAM"            value={modalFicha.especificacionTI.ram_gb ? `${modalFicha.especificacionTI.ram_gb} GB` : '—'} />
                  <InfoField icon={<HardDrive size={13}/>} label="Almacenamiento" value={modalFicha.especificacionTI.almacenamiento_gb ? `${modalFicha.especificacionTI.almacenamiento_gb} GB` : '—'} />
                  <InfoField icon={<Wifi size={13}/>}      label="Dirección IP"   value={fmt(modalFicha.especificacionTI.dir_ip)} mono />
                  <InfoField icon={<Wifi size={13}/>}      label="MAC Address"    value={fmt(modalFicha.especificacionTI.mac_address)} mono />
                  <InfoField icon={<Wifi size={13}/>}      label="Dir. MAC Alt"   value={fmt(modalFicha.especificacionTI.dir_mac)} mono />
                  <InfoField icon={<Monitor size={13}/>}   label="Sistema Op."    value={fmt(modalFicha.especificacionTI.modelo_so)} />
                  <InfoField icon={<User size={13}/>}      label="Cuenta Win."    value={fmt(modalFicha.especificacionTI.cuenta_windows)} />
                  <InfoField icon={<User size={13}/>}      label="Correo"         value={fmt(modalFicha.especificacionTI.correo)} />
                  <InfoField icon={<User size={13}/>}      label="Tipo Usuario"   value={fmt(modalFicha.especificacionTI.tipo_user)} />
                  <InfoField icon={<Calendar size={13}/>}  label="Último Escaneo" value={formatDateTime(modalFicha.especificacionTI.last_scan)} />
                  <InfoField icon={<Monitor size={13}/>}   label="Host Name"      value={fmt(modalFicha.especificacionTI.nombre_host)} />
                  <InfoField icon={<Tag size={13}/>}       label="Win Serial"     value={fmt(modalFicha.especificacionTI.windows_serial)} mono />
                  <InfoField icon={<Wifi size={13}/>}      label="Pto. Red"       value={fmt(modalFicha.especificacionTI.puerto_red)} />
                  <InfoField icon={<Wifi size={13}/>}      label="Switch Red"     value={fmt(modalFicha.especificacionTI.switch_red)} />
                </div>
              </div>
            )}

            {/* Monitores Asignados (Para PC / Laptop) */}
            {(fichaMode === 'PC' || fichaMode === 'LAPTOP') && modalFicha.monitores?.length > 0 && (
              <div className="rounded-xl border border-teal-200 overflow-hidden mt-4">
                <div className="bg-teal-50 px-4 py-2.5 flex items-center gap-2">
                  <Monitor size={15} className="text-teal-600" />
                  <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Monitores Asignados</span>
                </div>
                <div className="p-4 space-y-2 bg-white">
                  {modalFicha.monitores.map((am) => (
                    <div key={am.id_bien_monitor} className="flex justify-between items-center p-2 rounded-lg border border-gray-100 bg-gray-50">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-800">
                          {am.monitor?.modelo?.descrip_disp || 'Monitor genérico'}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          S/N: {am.monitor?.num_serie || 'S/N'} | INV: {am.monitor?.num_inv || 'S/N'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Atributos Técnicos (EAV) */}
            {fichaMode === 'OTHER' && (
              <div className="rounded-xl border border-purple-200 overflow-hidden mt-4">
                <div className="bg-purple-50 px-4 py-2.5 flex items-center gap-2">
                  <Tag size={15} className="text-purple-600" />
                  <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Atributos Técnicos</span>
                </div>
                <div className="p-4 bg-white">
                  <BienAtributosPanel id_bien={modalFicha.id_bien} readOnly={true} />
                </div>
              </div>
            )}

            {/* Póliza de Garantía */}
            {modalFicha.garantias && modalFicha.garantias.length > 0 && (
              <div className="rounded-xl border border-green-200 overflow-hidden mt-4">
                <div className="bg-green-50 px-4 py-2.5 flex items-center gap-2">
                  <Shield size={15} className="text-green-600" />
                  <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Póliza de Garantía</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-white">
                  <InfoField icon={<Calendar size={13}/>} label="Fecha Inicio" value={formatDate(modalFicha.garantias[0].fecha_inicio)} />
                  <InfoField icon={<Calendar size={13}/>} label="Fecha Fin" value={formatDate(modalFicha.garantias[0].fecha_fin)} />
                  <InfoField icon={<User size={13}/>} label="Proveedor" value={modalFicha.garantias[0].proveedorObj?.nombre_proveedor || 'Sin proveedor'} />
                  <div>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mb-0.5">Estado</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
                        modalFicha.garantias[0].estado_garantia === 'VIGENTE' ? 'bg-green-100 text-green-800' :
                        modalFicha.garantias[0].estado_garantia === 'VENCIDA' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                    }`}>
                      {modalFicha.garantias[0].estado_garantia || 'VIGENTE'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Notas de Observación */}
            {modalFicha.notas && modalFicha.notas.length > 0 && (
              <div className="rounded-xl border border-gray-200 overflow-hidden mt-4">
                <div className="bg-gray-50 px-4 py-2.5 flex items-center gap-2 border-b border-gray-100">
                  <StickyNote size={15} className="text-gray-500" />
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Notas de Observación</span>
                </div>
                <div className="p-4 space-y-3 bg-white">
                  {modalFicha.notas.map((nota) => (
                    <div key={nota.id_nota} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-sm text-gray-800">{nota.contenido_nota}</p>
                      <div className="flex justify-between items-center mt-2 text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                        <span>{nota.usuarioAutor?.nombre_completo || 'Sistema'}</span>
                        <span>{new Date(isNaN(Number(nota.fecha_creacion)) ? nota.fecha_creacion : Number(nota.fecha_creacion)).toLocaleString('es-MX')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
        );
      })()}

      {/* ════════════════════════════════════════════════════════════════════
          MODAL: QR / CÓDIGO DE BARRAS
      ═══════════════════════════════════════════════════════════════════════ */}
      {modalQR && (
        <Modal onClose={() => setModalQR(null)} title="Identificadores" small>
          <div className="flex flex-col items-center gap-2 text-center mb-4">
            <p className="font-semibold text-gray-900">{modalQR.equipo}</p>
            <p className="text-xs text-gray-400 font-mono">Serie: {fmt(modalQR.numSerie)}</p>
            <p className="text-xs text-gray-400 font-mono">Inv: {fmt(modalQR.numInv)}</p>
          </div>
          {!modalQR.qrHash ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 text-center">
              Este bien no tiene un identificador único (qr_hash) en la base de datos.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col items-center">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Código QR</p>
                <QRCodeSVG value={modalQR.qrHash} size={170} level="H" includeMargin={false} />
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col items-center overflow-hidden">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Código de Barras</p>
                <Barcode value={modalQR.qrHash} width={1.6} height={50} fontSize={12} background="transparent" margin={0} />
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MODAL: CREAR / EDITAR BIEN
      ═══════════════════════════════════════════════════════════════════════ */}
      {modalForm && (
        <Modal
          onClose={closeForm}
          title={modalForm === 'create' ? 'Registrar Nuevo Bien' : 'Editar Bien'}
          wide
          footer={
            <div className="flex justify-end gap-3">
              <button onClick={closeForm}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={creating || updating}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#006341,#004d32)' }}
              >
                {(creating || updating) ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {modalForm === 'create' ? 'Registrar Bien' : 'Guardar Cambios'}
              </button>
            </div>
          }
        >
          {loadingCat ? (
            <div className="flex justify-center py-10 text-gray-400 gap-3">
              <Loader2 size={20} className="animate-spin" /> Cargando catálogos...
            </div>
          ) : (
            <div className="space-y-5 text-sm">

              {/* — Campos de solo lectura (solo al editar) — */}
              {modalForm !== 'create' && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Información de Solo Lectura</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <ReadonlyField label="ID Bien" value={modalForm.id_bien} mono />
                    <ReadonlyField label="No. Serie" value={fmt(modalForm.numSerie)} mono />
                    <ReadonlyField label="Clave Presupuestal" value={fmt(modalForm.clavePresupuestal)} mono />
                  </div>
                </div>
              )}

              {/* — Sección principal — */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Categoría */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Categoría <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    value={form.id_categoria ? String(form.id_categoria) : ''}
                    onChange={(val) => handleCatChange(val)}
                    options={(catalogos?.categorias ?? []).map(c => ({ value: String(c.id_categoria), label: c.nombre_categoria }))}
                    placeholder="Seleccionar…"
                    error={!!formErrors.id_categoria}
                  />
                  {formErrors.id_categoria && <p className="text-xs text-red-500 mt-0.5">{formErrors.id_categoria}</p>}
                </div>

                {/* Unidad de Medida — bloqueada a Pieza si es hardware */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Unidad de Medida <span className="text-red-500">*</span>
                    {forcePieza && <span className="ml-2 text-xs text-blue-500 font-normal">(forzado a Pieza)</span>}
                  </label>
                  <select
                    value={forcePieza ? ID_UNIDAD_PIEZA : form.id_unidad_medida}
                    onChange={(e) => !forcePieza && setForm((f) => ({ ...f, id_unidad_medida: e.target.value }))}
                    disabled={forcePieza}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 ${
                      forcePieza ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'
                    } ${formErrors.id_unidad_medida && !forcePieza ? 'border-red-400' : 'border-gray-200'}`}
                  >
                    <option value="">Seleccionar…</option>
                    {(catalogos?.unidadesMedida ?? []).map((u) => (
                      <option key={u.id_unidad_medida} value={u.id_unidad_medida}>{u.nombre_unidad} ({u.abreviatura})</option>
                    ))}
                  </select>
                  {formErrors.id_unidad_medida && !forcePieza && <p className="text-xs text-red-500 mt-0.5">{formErrors.id_unidad_medida}</p>}
                </div>

                {/* Número de Serie */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Número de Serie</label>
                  <input
                    type="text"
                    value={form.num_serie}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, num_serie: e.target.value }));
                      if (formErrors.num_serie) setFormErrors(e2 => { const n = {...e2}; delete n.num_serie; return n; });
                    }}
                    onBlur={() => {
                      const val = form.num_serie?.trim();
                      if (!val) return;
                      const currentId = modalForm !== 'create' ? modalForm.id_bien : null;
                      const dup = bienes.find(b => b.numSerie === val && b.id_bien !== currentId);
                      if (dup) {
                        setFormErrors(e2 => ({ ...e2, num_serie: `Ya está registrado en otro bien` }));
                      } else {
                        setFormErrors(e2 => { const n = {...e2}; delete n.num_serie; return n; });
                      }
                    }}
                    placeholder="Ej. SN202400001"
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 ${
                      formErrors.num_serie ? 'border-red-400 bg-red-50' : 'border-gray-200'
                    }`}
                  />
                  {formErrors.num_serie && <p className="text-xs text-red-500 mt-0.5">{formErrors.num_serie}</p>}
                </div>

                {/* Modelo — selector con mini-CRUD */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Modelo</label>
                  <div className="flex gap-2">
                    <div
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700 cursor-pointer hover:border-green-400 transition-colors flex items-center justify-between min-w-0"
                      onClick={() => setShowCatalogModal(true)}
                    >
                      {form.clave_modelo ? (
                        <span className="truncate">
                          {(catalogos?.modelos ?? []).find(m => m.clave_modelo === form.clave_modelo)?.descrip_disp || form.clave_modelo}
                        </span>
                      ) : (
                        <span className="text-gray-400">Sin modelo</span>
                      )}
                      <ChevronDown size={13} className="ml-2 text-gray-400 flex-shrink-0" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCatalogModal(true)}
                      className="px-3 py-2 rounded-lg border border-green-200 bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 transition-colors flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
                    >
                      <Plus size={13} /> Gestionar
                    </button>
                    {form.clave_modelo && (
                      <button
                        type="button"
                        onClick={() => handleModeloChange('')}
                        className="w-9 h-9 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-red-400 transition-colors flex items-center justify-center flex-shrink-0"
                        title="Quitar modelo"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>


                {/* Número de Inventario */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Número de Inventario</label>
                  <input
                    type="text"
                    value={form.num_inv}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, num_inv: e.target.value }));
                      if (formErrors.num_inv) setFormErrors(e2 => { const n = {...e2}; delete n.num_inv; return n; });
                    }}
                    onBlur={() => {
                      const val = form.num_inv?.trim();
                      if (!val) return;
                      const currentId = modalForm !== 'create' ? modalForm.id_bien : null;
                      const dup = bienes.find(b => b.numInv === val && b.id_bien !== currentId);
                      if (dup) {
                        setFormErrors(e2 => ({ ...e2, num_inv: `Ya está registrado en otro bien` }));
                      } else {
                        setFormErrors(e2 => { const n = {...e2}; delete n.num_inv; return n; });
                      }
                    }}
                    placeholder="Ej. INV-2024-001"
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 ${
                      formErrors.num_inv ? 'border-red-400 bg-red-50' : 'border-gray-200'
                    }`}
                  />
                  {formErrors.num_inv && <p className="text-xs text-red-500 mt-0.5">{formErrors.num_inv}</p>}
                </div>


                {/* Estatus Operativo */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Estatus Operativo</label>
                  <select
                    value={form.estatus_operativo}
                    onChange={(e) => setForm((f) => ({ ...f, estatus_operativo: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                  >
                    <option value="ACTIVO">Activo</option>
                    <option value="EN_REPARACION">En Reparación</option>
                    <option value="BAJA">Baja</option>
                  </select>
                </div>

                {/* Cantidad - bloqueada si la categoria maneja serie individual */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cantidad{esSerie && <span className="ml-2 text-xs text-blue-500 font-normal"> (forzado a 1)</span>}</label>
                  <input
                    type="number"
                    min="1"
                    value={esSerie ? 1 : form.cantidad}
                    onChange={(e) => !esSerie && setForm((f) => ({ ...f, cantidad: e.target.value }))}
                    disabled={esSerie}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>

                {/* Segmento de Red */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Segmento de Red</label>
                  <SearchableSelect
                    value={form.id_segmento ? String(form.id_segmento) : ''}
                    onChange={(val) => {
                      setForm((f) => ({ ...f, id_segmento: val }));
                    }}
                    options={(catalogos?.segmentos ?? []).map(u => ({ value: String(u.id_segmento), label: u.nombre || u.clave }))}
                    placeholder="Sin segmento"
                  />
                </div>

                {/* Unidad Física */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Unidad Física</label>
                  <SearchableSelect
                    value={form.clave_unidad_ref || ''}
                    onChange={(val) => {
                      setForm((f) => ({ ...f, clave_unidad_ref: val, id_ubicacion: '' }));
                      setIsAddingUbicacion(false);
                      setNewUbicacionName('');
                    }}
                    options={(catalogos?.unidades ?? []).map(i => ({ value: String(i.clave), label: i.desc_corta || i.descripcion || i.clave }))}
                    placeholder="Sin unidad"
                  />
                </div>

                {/* Ubicacion Física (Depende de Unidad Física) */}
                {form.clave_unidad_ref && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Área / Ubicación Física</label>
                    {isAddingUbicacion ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newUbicacionName}
                          onChange={e => setNewUbicacionName(e.target.value)}
                          placeholder="Nombre de ubicación..."
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                          autoFocus
                        />
                        <button type="button" onClick={handleCreateUbicacion} disabled={creatingUbicacion || !newUbicacionName.trim()}
                          className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors">
                          Guardar
                        </button>
                        <button type="button" onClick={() => { setIsAddingUbicacion(false); setNewUbicacionName(''); }}
                          className="px-3 py-2 border border-gray-200 text-gray-500 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <div className="flex-1 min-w-0">
                          <SearchableSelect
                            value={form.id_ubicacion ? String(form.id_ubicacion) : ''}
                            onChange={(val) => setForm((f) => ({ ...f, id_ubicacion: val }))}
                            options={ubicacionesUnidad.map(u => ({ value: String(u.id_ubicacion), label: u.nombre_ubicacion }))}
                            placeholder="Seleccionar ubicación..."
                          />
                        </div>
                        <button type="button" onClick={() => setIsAddingUbicacion(true)} title="Añadir nueva ubicación a la Unidad"
                          className="px-3 py-2 border border-gray-200 text-gray-500 flex items-center justify-center rounded-lg hover:bg-gray-50 transition-colors">
                          <Plus size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Usuario Resguardo */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Usuario en Resguardo</label>
                  <SearchableSelect
                    value={form.id_usuario_resguardo ? String(form.id_usuario_resguardo) : ''}
                    onChange={(val) => setForm((f) => ({ ...f, id_usuario_resguardo: val }))}
                    options={(catalogos?.usuarios ?? []).map(u => ({ value: String(u.id_usuario), label: `${u.nombre_completo} (${u.matricula})` }))}
                    placeholder="Sin resguardo"
                  />
                </div>

                {/* Fecha Adquisición */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha de Adquisición</label>
                  <input
                    type="date"
                    value={form.fecha_adquisicion}
                    onChange={(e) => setForm((f) => ({ ...f, fecha_adquisicion: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* — Sección Especificaciones TI — */}
              {showTI && (
                <div className="rounded-xl border border-blue-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowTI((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wide"
                  >
                    <span className="flex items-center gap-2"><Monitor size={14}/> Especificaciones TI</span>
                    {showTI ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {showTI && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
                      {[
                        { key: 'cpu_info',           label: 'CPU',                  placeholder: 'Intel Core i5-12400' },
                        { key: 'ram_gb',             label: 'RAM (GB)',              placeholder: '8', type: 'number' },
                        { key: 'almacenamiento_gb',  label: 'Almacenamiento (GB)',   placeholder: '256', type: 'number' },
                        { key: 'modelo_so',          label: 'Sistema Operativo',     placeholder: 'Windows 11 Pro' },
                        { key: 'cuenta_windows',     label: 'Cuenta de Windows',     placeholder: 'usuario.local' },
                        { key: 'correo',             label: 'Correo Electrónico',    placeholder: 'usuario@imss.gob.mx', type: 'email' },
                        { key: 'last_scan',          label: 'Último Escaneo',        placeholder: '', type: 'datetime-local' },
                        { key: 'tipo_user',          label: 'Tipo de Usuario',       placeholder: 'Estándar' },
                        { key: 'nombre_host',        label: 'Nombre de Host',        placeholder: 'PC-ADMIN' },
                        { key: 'windows_serial',     label: 'Serial de Windows',     placeholder: 'XXXXX-XXXXX-XXXXX' },
                        { key: 'dir_ip',             label: 'Dirección IP',          placeholder: '192.168.1.100' },
                        { key: 'mac_address',        label: 'MAC Address',           placeholder: 'AA:BB:CC:DD:EE:FF' },
                        { key: 'dir_mac',            label: 'Dir. MAC Alt.',         placeholder: '—' },
                        { key: 'puerto_red',         label: 'Puerto de Red',         placeholder: 'Pto. 12' },
                        { key: 'switch_red',         label: 'Switch (IP/Nombre)',    placeholder: '10.28.X.X' },
                      ].map(({ key, label, placeholder, type = 'text' }) => (
                        <div key={key}>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>
                          <input
                            type={type}
                            value={tiForm[key]}
                            onChange={(e) => setTiForm((f) => ({ ...f, [key]: e.target.value }))}
                            placeholder={placeholder}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* — Sección Monitores (Solo PC y Laptop) — */}
              {(deviceMode === 'PC' || deviceMode === 'LAPTOP') && (
                <MonitoresSelector 
                  idBienEquipo={modalForm?.id_bien} 
                  isCreateMode={modalForm === 'create'} 
                  asignados={modalForm === 'create' ? pendingMonitors : (modalForm?.monitores ?? [])}
                  onAsignar={(vars) => {
                    if (modalForm === 'create') {
                      if (!pendingMonitors.some(p => p.id_monitor === vars.monitor.id_bien)) {
                        setPendingMonitors(prev => [...prev, {
                          id_bien_monitor: `temp-${Date.now()}`,
                          id_monitor: vars.monitor.id_bien,
                          monitor: vars.monitor
                        }]);
                      }
                    } else {
                      asignarMonitor(vars);
                    }
                  }}
                  onDesasignar={(id) => {
                    if (modalForm === 'create') {
                      setPendingMonitors(prev => prev.filter(p => p.id_bien_monitor !== id));
                    } else {
                      desasignarMonitor({ id_bien_monitor: id });
                    }
                  }}
                  asignando={asignando}
                  desasignando={desasignando}
                />
              )}

              {/* — Sección Atributos Técnicos — */}
              {deviceMode === 'OTHER' && (
                <div className="rounded-xl border border-purple-200 overflow-hidden mt-4">
                  <div className="px-4 py-3 bg-purple-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag size={14} className="text-purple-700" />
                      <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Atributos Técnicos</span>
                    </div>
                    {[ROL_ADMIN, ROL_MAESTRO].includes(idRol) && (
                      <button 
                        onClick={() => setShowAtributosModal(true)}
                        className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-800 bg-purple-100 hover:bg-purple-200 px-2 py-1 rounded transition-colors"
                      >
                        <Settings size={12} /> Configurar Catálogo
                      </button>
                    )}
                  </div>
                  <div className="p-4 bg-white">
                    <BienAtributosPanel
                      id_bien={modalForm !== 'create' ? modalForm?.id_bien : null}
                      tipo_disp={(() => {
                        // Obtener tipo_disp del modelo seleccionado
                        if (modalForm !== 'create' && modalForm?.modelo?.tipo_disp) return modalForm.modelo.tipo_disp;
                        // En modo creación, buscar por clave_modelo
                        const mod = (catalogos?.modelos ?? []).find(m => m.clave_modelo === form.clave_modelo);
                        return mod?.tipo_disp ?? null;
                      })()}
                      onValuesChange={modalForm === 'create' ? setPendingEavValues : undefined}
                    />
                  </div>
                </div>
              )}

              {/* Sección de Garantía (Opcional) */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-2">
                <div className="bg-gray-50 border-b border-gray-100 p-4 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center">
                    <Shield size={16} className="text-green-600 mr-2" />
                    {garantiaForm.id_garantia ? 'Garantía Actual' : 'Asociar Garantía'}
                  </h3>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={garantiaForm.show}
                      onChange={(e) => setGarantiaForm(p => ({ ...p, show: e.target.checked }))}
                      className="sr-only"
                    />
                    <div className={`relative w-10 h-5 transition-colors rounded-full ${garantiaForm.show ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${garantiaForm.show ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                  </label>
                </div>
                {garantiaForm.show && (
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-green-50/20">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha Inicio</label>
                      <input
                        type="date"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                        value={garantiaForm.fecha_inicio}
                        onChange={e => setGarantiaForm(p => ({ ...p, fecha_inicio: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha Fin *</label>
                      <input
                        type="date"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                        value={garantiaForm.fecha_fin}
                        onChange={e => setGarantiaForm(p => ({ ...p, fecha_fin: e.target.value }))}
                      />
                      <div className="flex gap-1 mt-1.5">
                        <button type="button" onClick={() => handleAutoCalcGarantia(1)} className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 border border-green-200 rounded hover:bg-green-200">+1 Año</button>
                        <button type="button" onClick={() => handleAutoCalcGarantia(2)} className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 border border-green-200 rounded hover:bg-green-200">+2 Años</button>
                        <button type="button" onClick={() => handleAutoCalcGarantia(3)} className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 border border-green-200 rounded hover:bg-green-200">+3 Años</button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Proveedor</label>
                      <select
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                        value={garantiaForm.id_proveedor}
                        onChange={e => setGarantiaForm(p => ({ ...p, id_proveedor: e.target.value }))}
                      >
                        <option value="">-- Ninguno --</option>
                        {proveedores.map(p => (
                          <option key={p.id_proveedor} value={p.id_proveedor}>{p.nombre_proveedor}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MODAL: CONFIRMAR ELIMINACIÓN
      ═══════════════════════════════════════════════════════════════════════ */}
      {modalConfirmDel && (
        <Modal onClose={() => setModalConfirmDel(null)} title="Confirmar Eliminación" small>
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle size={26} className="text-red-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">¿Eliminar este bien?</p>
              <p className="text-sm text-gray-500 mt-1">
                <span className="font-mono font-semibold">{modalConfirmDel.equipo}</span>
                {' '}— Serie: <span className="font-mono">{fmt(modalConfirmDel.numSerie)}</span>
              </p>
              <p className="text-xs text-red-500 mt-2 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                Esta acción es irreversible. Si el bien tiene incidencias o movimientos asociados, la eliminación será bloqueada por el sistema.
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setModalConfirmDel(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteBien(modalConfirmDel.id_bien)}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Eliminar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Mini-CRUD: catalogo de modelos */}
      {showCatalogModal && modalForm && (
        <ModeloCatalogModal
          onClose={() => setShowCatalogModal(false)}
          onSelectModelo={handleModeloChange}
          modeloActual={form.clave_modelo}
          catalogos={catalogos}
        />
      )}

      {showAtributosModal && (
        <AtributosCatalogModal onClose={() => setShowAtributosModal(false)} />
      )}

    </div>
    <PrintStickerSheet items={printSelectedBienes} startOffset={printStartOffset} />
    </>
  );
}

// ─── Sub-componentes ───────────────────────────────────────────────────────────


function Modal({ onClose, title, children, footer, wide = false, small = false }) {
  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6" 
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50 fade-in pointer-events-none" />
      <div className={`relative bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100vh-4rem)] ${
        small ? 'max-w-sm' : wide ? 'max-w-3xl' : 'max-w-lg'
      } fade-in`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>
        {/* Body scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5">
          {children}
        </div>
        {/* Footer sticky (opcional) */}
        {footer && (
          <div className="px-5 sm:px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function InfoField({ label, value, icon, mono = false }) {
  return (
    <div>
      <p className="text-xs text-gray-400 flex items-center gap-1 mb-0.5">
        {icon}{label}
      </p>
      <p className={`text-sm font-semibold text-gray-800 ${mono ? 'font-mono' : ''}`}>
        {value ?? '—'}
      </p>
    </div>
  );
}

function ReadonlyField({ label, value, mono = false }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className={`text-xs py-1.5 px-2 bg-white border border-gray-200 rounded-lg text-gray-600 truncate ${mono ? 'font-mono' : ''}`}>
        {value ?? '—'}
      </p>
    </div>
  );
}

function Pagination({ page, totalPages, onPage, mobile = false }) {
  if (totalPages <= 1) return null;
  return (
    <div className={`flex items-center justify-between ${
      mobile ? 'bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3' : 'px-5 py-3 border-t border-gray-100'
    }`}>
      <p className="text-xs text-gray-500">Página {page} de {totalPages}</p>
      <div className="flex gap-1">
        <PageBtn onClick={() => onPage((p) => Math.max(1, p - 1))} disabled={page === 1} icon={<ChevronLeft size={14} />} />
        {!mobile && Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((n) => (
          <button key={n} onClick={() => onPage(n)}
            className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
              page === n ? 'text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
            style={page === n ? { backgroundColor: '#006341' } : {}}>
            {n}
          </button>
        ))}
        <PageBtn onClick={() => onPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} icon={<ChevronRight size={14} />} />
      </div>
    </div>
  );
}

function PageBtn({ onClick, disabled, icon }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
      {icon}
    </button>
  );
}
