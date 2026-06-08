/* eslint-disable no-unused-vars */
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import { useBienes, mapBienNode } from '../hooks/useBienes';
import { useCatalogosBienes } from '../hooks/useCatalogosBienes';
import { useCreateBien, useUpdateBien, useDeleteBien, useUpsertEspecificacionTI, useCreateCuentaPC, useUpdateCuentaPC } from '../hooks/useBienMutations';
import { useCreateNotaBien } from '../hooks/useEscaner';
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
import { useLocation } from 'react-router-dom';
import {
  GET_UBICACIONES_POR_UNIDAD, CREATE_UBICACION,
  GET_MARCAS_TIPOS_QUERY, CREATE_MARCA_MUTATION,
  CREATE_TIPO_DISPOSITIVO_MUTATION, CREATE_CAT_MODELO_MUTATION,
  GET_BIENES_MONITOR, ASIGNAR_MONITOR_MUTATION, DESASIGNAR_MONITOR_MUTATION,
  SET_SYNC_PENDING_MUTATION, SET_SYNC_PENDING_ALL_MUTATION
} from '../api/inventario.queries';
import { GET_PROVEEDORES, CREATE_GARANTIA, UPDATE_GARANTIA, CREATE_PROVEEDOR } from '../api/garantias.queries';
import { formatDate, formatDateTime } from '../lib/utils';
import SearchableSelect from '../components/SearchableSelect';
import MultiSearchableSelect from '../components/MultiSearchableSelect';
import PrintLabelsTab from '../components/PrintLabelsTab';
import PrintStickerSheet from '../components/PrintStickerSheet';
import ProveedorModal from '../components/ProveedorModal';
import BienAtributosPanel from '../components/BienAtributosPanel';
import AtributosCatalogModal from '../components/AtributosCatalogModal';
import CargaMasivaPanel from '../components/CargaMasivaPanel';
import { UPSERT_BIEN_ATRIBUTOS, GET_CAT_ATRIBUTOS, GET_ATRIBUTOS_POR_TIPO_DISPOSITIVO } from '../api/atributos.queries';
import ExportExcelModal from '../components/ExportExcelModal';
import { EditBienModal } from '../components/EditBienModal';
import ConfirmModal from '../components/ConfirmModal';

import ReportePanel from '../components/ReportePanel';

// ─── Roles reales de BD ───────────────────────────────────────────────────────
const ROL_ADMIN = 1;
const ROL_MAESTRO = 2;

// Categorías TI (id_categoria = 1: Equipo de Cómputo, 3: Redes y Telecomunicaciones)
// NOTA: Esta constante ya no se usa para mostrar/ocultar specs TI; el control ahora
// es por tipo_disp del modelo. Se mantiene solo por compatibilidad con filtros existentes.
const CATEGORIAS_TI = [1, 3];

/**
 * Detecta el modo del dispositivo basado en el nombre_tipo del tipo de dispositivo.
 * Retorna: 'PC' | 'LAPTOP' | 'MONITOR' | 'OTHER' | null
 */
function getDeviceMode(nombreTipo, nombreCategoria = null) {
  const n = (nombreTipo || '').toLowerCase();
  const c = (nombreCategoria || '').toLowerCase();

  if (n.includes('monitor') || c.includes('monitor')) return 'MONITOR';
  if (n.includes('laptop') || n.includes('port') || n.includes('notebook') || c.includes('laptop')) return 'LAPTOP';
  if (n.includes('pc') || n.includes('desktop') || n.includes('escritorio') || n.includes('cómputo') || n.includes('computo') || c.includes('cómputo') || c.includes('computo')) return 'PC';

  return 'OTHER';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(v) { return v || '—'; }

// ─── Badge de Estatus ─────────────────────────────────────────────────────────
function EstatusBadge({ estatus }) {
  const map = {
    'ACTIVO': { bg: '#dcfce7', color: '#15803d', label: 'Activo' },
    'Activo': { bg: '#dcfce7', color: '#15803d', label: 'Activo' },
    'EN_REPARACION': { bg: '#fef9c3', color: '#a16207', label: 'En Reparación' },
    'En Reparación': { bg: '#fef9c3', color: '#a16207', label: 'En Reparación' },
    'BAJA': { bg: '#fee2e2', color: '#b91c1c', label: 'Baja' },
    'Baja': { bg: '#fee2e2', color: '#b91c1c', label: 'Baja' },
    'PRESTAMO': { bg: '#dbeafe', color: '#1d4ed8', label: 'Préstamo' },
    'Préstamo': { bg: '#dbeafe', color: '#1d4ed8', label: 'Préstamo' },
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
  nombre_host: '', cpu_info: '', ram_gb: '', almacenamiento_gb: '', dir_ip: '', dir_mac: '', mac_address: '', modelo_so: '', version_office: '',
  puerto_red: '', switch_red: '', last_scan: '', windows_serial: ''
};
const CUENTA_EMPTY = {
  cuenta_windows: '', correo: '', tipo_user: '', nombre_host: ''
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
  const [selectedTipoFilter, setSelectedTipoFilter] = useState('');
  const [selectedMarcaFilter, setSelectedMarcaFilter] = useState('');
  // Estado de selección local (dos pasos: resaltar → confirmar)
  const [localSelected, setLocalSelected] = useState(modeloActual || '');
  // Toggle del mini-formulario de creación
  const [showCrearForm, setShowCrearForm] = useState(false);

  // Ref para scroll al modelo seleccionado
  const selectedItemRef = useRef(null);
  const listContainerRef = useRef(null);

  // Query: marcas y tipos (ligero)
  const { data: catAux, refetch: refetchAux } = useQuery({
    queryKey: ['marcas-tipos'],
    queryFn: () => gqlClient.request(GET_MARCAS_TIPOS_QUERY),
    staleTime: 30_000,
  });
  const marcas = catAux?.marcas ?? [];
  const tipos = catAux?.tiposDispositivo ?? [];
  const modelos = catalogos?.modelos ?? [];

  // Auto-scroll al modelo destacado (localSelected) cuando se abre el tab
  useEffect(() => {
    if (tab === 'modelos' && selectedItemRef.current && listContainerRef.current) {
      const timer = setTimeout(() => {
        selectedItemRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [tab, localSelected]);

  const modelosFiltrados = useMemo(() => {
    let res = modelos;
    if (selectedTipoFilter) {
      res = res.filter(m => String(m.tipo_disp) === selectedTipoFilter);
    }
    if (selectedMarcaFilter) {
      res = res.filter(m => String(m.clave_marca) === selectedMarcaFilter);
    }
    const q = searchModelo.toLowerCase();
    if (!q) return res;
    return res.filter(m =>
      (m.clave_modelo || '').toLowerCase().includes(q) ||
      (m.descrip_disp || '').toLowerCase().includes(q)
    );
  }, [modelos, searchModelo, selectedTipoFilter, selectedMarcaFilter]);

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
      setShowCrearForm(false);
      // Seleccionar el nuevo modelo localmente (el usuario confirma con el botón)
      setLocalSelected(m.clave_modelo);
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
      clave_marca: nuevoModelo.clave_marca ? parseInt(nuevoModelo.clave_marca) : null,
      tipo_disp: nuevoModelo.tipo_disp ? parseInt(nuevoModelo.tipo_disp) : null,
    };
    mutModelo.mutate(vars);
  };

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white';
  const tabs = [
    { id: 'modelos', label: 'Modelos', icon: Layers },
    { id: 'tipos', label: 'Tipos Dispositivo', icon: CpuIcon },
    { id: 'marcas', label: 'Marcas', icon: Bookmark },
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
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 text-xs font-semibold border-b-2 transition-colors ${tab === t.id ? 'border-green-600 text-green-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
                <Icon size={13} />{t.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {tab === 'modelos' && (() => {
            // Buscar el objeto del modelo en el estado local
            const modeloLocal = localSelected
              ? modelos.find(m => m.clave_modelo === localSelected)
              : null;
            // Helpers con String() para evitar mismatch number vs string
            const tipoDeModelo = (m) => m
              ? tipos.find(t => String(t.tipo_disp) === String(m.tipo_disp))
              : null;
            const marcaDeModelo = (m) => m
              ? marcas.find(mk => String(mk.clave_marca) === String(m.clave_marca))
              : null;

            const tipoSelObj = tipoDeModelo(modeloLocal);
            const marcaSelObj = marcaDeModelo(modeloLocal);

            // Hay cambio pendiente si localSelected difiere del original (incluso si es '')
            const hasPendingChange = localSelected !== modeloActual;

            return (
              <div className="space-y-3 fade-in">

                {/* —— Tarjeta: estado de selección local —— */}
                {modeloLocal ? (
                  <div className={`rounded-xl border-2 p-3 transition-colors ${hasPendingChange ? 'border-amber-300 bg-amber-50' : 'border-green-200 bg-green-50'
                    }`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${hasPendingChange ? 'text-amber-700' : 'text-green-700'
                        }`}>
                        {hasPendingChange
                          ? <>○ Pendiente confirmar</>
                          : <><Check size={11} /> Modelo seleccionado</>}
                      </p>
                      <button
                        onClick={() => setLocalSelected('')}
                        className="text-[10px] text-red-400 hover:text-red-600 font-semibold px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors"
                      >
                        Quitar
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <div>
                        <p className={`text-[9px] font-bold uppercase tracking-wide ${hasPendingChange ? 'text-amber-600' : 'text-green-600'}`}>Clave</p>
                        <p className={`font-mono text-xs font-bold ${hasPendingChange ? 'text-amber-900' : 'text-green-900'}`}>{modeloLocal.clave_modelo}</p>
                      </div>
                      <div>
                        <p className={`text-[9px] font-bold uppercase tracking-wide ${hasPendingChange ? 'text-amber-600' : 'text-green-600'}`}>Descripción</p>
                        <p className={`text-xs font-semibold truncate ${hasPendingChange ? 'text-amber-900' : 'text-green-900'}`}>{modeloLocal.descrip_disp || '—'}</p>
                      </div>
                      <div>
                        <p className={`text-[9px] font-bold uppercase tracking-wide ${hasPendingChange ? 'text-amber-600' : 'text-green-600'}`}>Marca</p>
                        <p className={`text-xs ${hasPendingChange ? 'text-amber-800' : 'text-green-800'}`}>{marcaSelObj?.marca || '— Sin marca —'}</p>
                      </div>
                      <div>
                        <p className={`text-[9px] font-bold uppercase tracking-wide ${hasPendingChange ? 'text-amber-600' : 'text-green-600'}`}>Tipo</p>
                        <p className={`text-xs ${hasPendingChange ? 'text-amber-800' : 'text-green-800'}`}>{tipoSelObj?.nombre_tipo || '— Sin tipo —'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-center">
                    <p className="text-xs text-gray-400 italic">
                      {modeloActual
                        ? <><span className="font-semibold text-red-400">Selección quitada</span> — confirma para guardar el cambio</>
                        : 'Ningún modelo seleccionado — elige uno de la lista'}
                    </p>
                  </div>
                )}

                {/* —— Botón Confirmar / Quitar —— siempre visible cuando hay cambio pendiente */}
                <button
                  onClick={() => {
                    const m = localSelected ? modelos.find(x => x.clave_modelo === localSelected) : null;
                    onSelectModelo(localSelected, m ? { tipo_disp: m.tipo_disp } : null);
                    onClose();
                  }}
                  disabled={!hasPendingChange}
                  className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${hasPendingChange
                      ? 'text-white shadow-md hover:opacity-90 cursor-pointer'
                      : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                    }`}
                  style={hasPendingChange ? {
                    background: localSelected
                      ? 'linear-gradient(135deg, #006341, #004d32)'
                      : 'linear-gradient(135deg, #B91C1C, #991B1B)'
                  } : {}}
                >
                  {localSelected
                    ? <><Check size={15} /> {hasPendingChange ? `Confirmar “${modeloLocal?.descrip_disp || localSelected}”` : 'Selección confirmada'}</>
                    : <><X size={15} /> Confirmar: quitar modelo</>}
                </button>

                {/* —— Buscador + Filtros —— */}
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por clave o descripción..."
                      value={searchModelo}
                      onChange={e => setSearchModelo(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={selectedTipoFilter}
                      onChange={e => setSelectedTipoFilter(e.target.value)}
                      className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white text-gray-700 font-semibold"
                    >
                      <option value="">Todos los tipos</option>
                      {tipos.map(t => (
                        <option key={t.tipo_disp} value={String(t.tipo_disp)}>{t.nombre_tipo}</option>
                      ))}
                    </select>
                    <select
                      value={selectedMarcaFilter}
                      onChange={e => setSelectedMarcaFilter(e.target.value)}
                      className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white text-gray-700 font-semibold"
                    >
                      <option value="">Todas las marcas</option>
                      {marcas.map(mk => (
                        <option key={mk.clave_marca} value={String(mk.clave_marca)}>{mk.marca}</option>
                      ))}
                    </select>
                    {(selectedTipoFilter || selectedMarcaFilter || searchModelo) && (
                      <button
                        onClick={() => { setSelectedTipoFilter(''); setSelectedMarcaFilter(''); setSearchModelo(''); }}
                        className="px-2 py-1.5 rounded-lg text-xs text-red-500 border border-red-200 hover:bg-red-50 transition-colors shrink-0"
                        title="Limpiar filtros"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* —— Encabezado de columnas —— */}
                <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-3 px-3 py-1.5 bg-gray-100 rounded-lg">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider w-16">Clave</span>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Descripción</span>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Marca</span>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Tipo</span>
                </div>

                {/* —— Lista de modelos —— */}
                <div ref={listContainerRef} className="space-y-0.5 max-h-44 overflow-y-auto rounded-xl border border-gray-100">
                  {modelosFiltrados.map(m => {
                    const tipoObj = tipoDeModelo(m);
                    const marcaObj = marcaDeModelo(m);
                    const isHighlighted = m.clave_modelo === localSelected;
                    const isOriginal = m.clave_modelo === modeloActual && !isHighlighted;
                    return (
                      <button
                        key={m.clave_modelo}
                        ref={isHighlighted ? selectedItemRef : null}
                        onClick={() => setLocalSelected(m.clave_modelo)}
                        className={`w-full grid grid-cols-[auto_1fr_auto_auto] gap-x-3 items-center px-3 py-2.5 text-left text-sm transition-colors ${isHighlighted
                            ? 'bg-green-50 border-l-[3px] border-green-500'
                            : isOriginal
                              ? 'bg-gray-50 border-l-[3px] border-gray-300'
                              : 'hover:bg-gray-50 border-l-[3px] border-transparent'
                          }`}
                      >
                        {/* Clave */}
                        <div className="flex items-center gap-1.5 w-16">
                          {isHighlighted
                            ? <Check size={11} className="text-green-600 shrink-0" />
                            : <span className="w-[11px] shrink-0" />}
                          <span className={`font-mono text-[11px] font-bold truncate ${isHighlighted ? 'text-green-700' : 'text-gray-500'
                            }`}>
                            {m.clave_modelo}
                          </span>
                        </div>
                        {/* Descripción */}
                        <span className={`text-xs truncate ${isHighlighted ? 'text-green-800 font-semibold' : 'text-gray-700'
                          }`}>
                          {m.descrip_disp || <em className="text-gray-400">Sin descripción</em>}
                        </span>
                        {/* Marca (String lookup) */}
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 max-w-[80px] truncate border ${marcaObj
                            ? 'bg-purple-50 text-purple-700 border-purple-100'
                            : 'bg-gray-50 text-gray-400 border-gray-200'
                          }`}>
                          {marcaObj?.marca || '—'}
                        </span>
                        {/* Tipo (String lookup) */}
                        {tipoObj ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 shrink-0 max-w-[80px] truncate">
                            {tipoObj.nombre_tipo}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-300 shrink-0 w-[72px]">—</span>
                        )}
                      </button>
                    );
                  })}
                  {modelosFiltrados.length === 0 && (
                    <p className="text-center text-xs text-gray-400 py-6">
                      Sin resultados para los filtros aplicados
                    </p>
                  )}
                </div>

                <p className="text-[10px] text-gray-400 text-right">
                  {modelosFiltrados.length} de {modelos.length} modelos
                </p>

                {/* —— Toggle mini-formulario —— */}
                <div className="border-t border-gray-100 pt-3">
                  <button
                    onClick={() => setShowCrearForm(v => !v)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border-2 border-dashed border-gray-300 text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
                  >
                    {showCrearForm ? <><X size={13} /> Cerrar formulario</> : <><Plus size={13} /> Crear nuevo modelo</>}
                  </button>

                  {showCrearForm && (
                    <div className="mt-3 space-y-3">
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
                      <button
                        onClick={handleCrearModelo}
                        disabled={mutModelo.isPending || !nuevoModelo.clave_modelo.trim()}
                        className="w-full py-2 rounded-xl text-blue-600 bg-white border-2 border-blue-100 hover:border-blue-300 hover:bg-blue-50 text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                      >
                        {mutModelo.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                        {mutModelo.isPending ? 'Creando...' : 'Crear y seleccionar'}
                      </button>
                    </div>
                  )}
                </div>

              </div>
            );
          })()}

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
  // Estado para el diálogo de confirmación de reasignación forzada
  const [conflictInfo, setConflictInfo] = useState(null); // { monitorId, monitorLabel, equipoNombre, vars }

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

  const handleSelectMonitor = (val) => {
    if (!val) return;
    const m = monitoresDisponibles.find(x => x.id_bien === val);
    if (!m) return;

    // Verificar si el monitor ya está ocupado en otro equipo
    const eqAsig = m.equipoAsignado;
    if (eqAsig && eqAsig.id_bien !== idBienEquipo) {
      const eq = eqAsig.equipo;
      const nombre = [
        eq?.num_inv ? `INV: ${eq.num_inv}` : null,
        eq?.num_serie ? `S/N: ${eq.num_serie}` : null,
        eq?.modelo?.descrip_disp ? `(${eq.modelo.descrip_disp})` : null,
      ].filter(Boolean).join(' ') || 'otro equipo';
      setConflictInfo({
        monitorId: m.id_bien,
        monitorLabel: m.modelo?.descrip_disp || `Monitor S/N: ${m.num_serie}`,
        equipoNombre: nombre,
        vars: isCreateMode ? { monitor: m } : { id_bien: idBienEquipo, id_monitor: val },
      });
      setShowPicker(false);
      return;
    }

    // Sin conflicto, asignar directamente
    onAsignar(isCreateMode ? { monitor: m } : { id_bien: idBienEquipo, id_monitor: val });
    setShowPicker(false);
  };

  return (
    <div className="rounded-xl border border-teal-200 overflow-hidden mt-4">
      {/* Modal de conflicto renderizado en Portal para evitar recortes por el contenedor padre */}
      {conflictInfo && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[10010] flex items-center justify-center bg-gray-900/60 p-4" onClick={() => setConflictInfo(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Monitor en uso</h3>
                <p className="text-xs text-gray-500 mt-0.5">Este monitor ya está asignado a:</p>
                <p className="text-xs font-semibold text-amber-700 mt-1 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                  {conflictInfo.equipoNombre}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-600 mb-5">
              ¿Deseas <strong>forzar la reasignación</strong>? Esto desvinculará el monitor de su equipo actual y lo asignará a este equipo.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConflictInfo(null)}
                className="flex-1 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  // Pasar forzar=true para que el back desvincule primero
                  const vars = { ...conflictInfo.vars, forzar: true };
                  onAsignar(vars);
                  setConflictInfo(null);
                }}
                className="flex-1 py-2 text-sm font-semibold text-white rounded-xl transition-colors"
                style={{ background: 'linear-gradient(135deg,#b45309,#92400e)' }}
              >
                Forzar Reasignación
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

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
                  onChange={handleSelectMonitor}
                  options={monitoresDisponibles.map(m => ({
                    value: m.id_bien,
                    label: `${m.modelo?.descrip_disp || 'Monitor'} - ${m.num_serie || 'Sin Serie'}${m.equipoAsignado ? ' ⚠ En uso' : ''
                      }`
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
  const canEdit = [ROL_ADMIN, ROL_MAESTRO].includes(idRol);
  const canDelete = [ROL_ADMIN, ROL_MAESTRO].includes(idRol);
  const queryClient = useQueryClient();
  const location = useLocation();

  // ── Estado de UI ──────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('Capitalizable');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [nuevaNotaText, setNuevaNotaText] = useState('');
  const { mutateAsync: createNotaBien, isLoading: isCreatingNota } = useCreateNotaBien();

  const [filterStatus, setFilterStatus] = useState(location.state?.filterStatus || '');
  const [filterUbicacion, setFilterUbicacion] = useState('');

  const [cursor, setCursor] = useState(null);
  const [cursors, setCursors] = useState([]); // historial para retroceder
  const PAGE_SIZE = activeTab === 'Impresión de Etiquetas' ? 60 : 15;

  useEffect(() => {
    if (location.state?.filterStatus) {
      setFilterStatus(location.state.filterStatus);
      setSearch(''); // clear search just in case
      // clear router state so it doesn't get stuck if we refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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
    clave_unidad_ref: [], // Unidades seleccionadas
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
    // Quick filters
    con_notas_recientes: false,
    inconvenientes: false,
  });

  const EMPTY_ADV = {
    clave_unidad_ref: [], id_segmento: [], id_ubicacion: [],
    tipo_disp: [], clave_marca: [], id_categoria: [],
    ram_min: '', ram_max: '', almacenamiento_min: '', almacenamiento_max: '',
    modelo_so: '', version_office: '', cpu_info: '', dir_ip: '',
    tiene_garantia: '', garantia_vigente: '', garantia_fin_desde: '', garantia_fin_hasta: '',
    atributo_id: '', atributo_valor: '',
    con_notas_recientes: false, inconvenientes: false,
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
    if (advFilters.con_notas_recientes) count++;
    if (advFilters.inconvenientes) count++;
    return count;
  }, [advFilters]);

  // Construir objeto de filtro para la API
  const serverFilter = useMemo(() => {
    const f = {};
    if (search) f.search = search;
    if (filterStatus) f.estatus_operativo = filterStatus;

    if (activeTab === 'Capitalizable') {
      f.es_capitalizable = true;
    } else if (activeTab === 'No Capitalizable') {
      f.es_capitalizable = false;
    }
    // En 'Impresión de Etiquetas', no filtramos por es_capitalizable para mostrar todo

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
    if (advFilters.con_notas_recientes) f.con_notas_recientes = true;
    if (advFilters.inconvenientes) f.inconvenientes = true;
    return f;
  }, [debouncedSearch, filterStatus, activeTab, advFilters]);

  // ── Modales ────────────────────────────────────────────────────────────────
  const [modalQR, setModalQR] = useState(null);
  const [modalFicha, setModalFicha] = useState(null);
  const [fichaTabs, setFichaTabs] = useState('info'); // 'info' | 'tecnico'
  const [modalForm, setModalForm] = useState(null); // null | 'create' | bien
  const [formTab, setFormTab] = useState('general'); // 'general' | 'tecnico'
  const [modalConfirmDel, setModalConfirmDel] = useState(null);
  const [showTI, setShowTI] = useState(false);
  const [deviceMode, setDeviceMode] = useState(null); // 'PC' | 'LAPTOP' | 'MONITOR' | 'OTHER' | null
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [showAtributosModal, setShowAtributosModal] = useState(false);
  const [showConfirmSyncAll, setShowConfirmSyncAll] = useState(false);

  // ── Formulario ────────────────────────────────────────────────────────────
  const [form, setForm] = useState(FORM_EMPTY);
  const [tiForm, setTiForm] = useState(TI_EMPTY);
  // cuentas 1:N: array de { id_cuenta?, cuenta_windows, correo, tipo_user, nombre_host, _editing?, _new? }
  const [cuentasList, setCuentasList] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [pendingEavValues, setPendingEavValues] = useState({}); // {id_atributo: valor} para modo creación
  const [pendingMonitors, setPendingMonitors] = useState([]); // [{ monitor: object, id_monitor: string }] para modo creación
  const [garantiaForm, setGarantiaForm] = useState({ show: false, id_garantia: null, fecha_inicio: '', fecha_fin: '', id_proveedor: '' });

  // ── Estado para Impresión ─────────────────────────────────────────────────
  const [printSelectedBienes, setPrintSelectedBienes] = useState([]);
  const [printStartOffset, setPrintStartOffset] = useState(0);

  // ── Estado para Exportar y Reporte ───────────────────────────────────────
  const [showExportModal, setShowExportModal] = useState(false);
  const [showReporte, setShowReporte] = useState(false);

  // ── Datos ─────────────────────────────────────────────────────────────────
  const { data: bienesData, isLoading, isError, refetch, isFetching } = useBienes(serverFilter, { first: PAGE_SIZE, after: cursor ?? undefined });
  const bienes = bienesData?.items ?? [];
  const pageInfo = bienesData?.pageInfo ?? {};

  // Sincronizar modalFicha con bienes actualizados (ej. después de agregar una nota o editar)
  useEffect(() => {
    if (modalFicha && bienes.length > 0) {
      const updatedBien = bienes.find(b => b.id_bien === modalFicha.id_bien);
      if (updatedBien && JSON.stringify(updatedBien) !== JSON.stringify(modalFicha)) {
        setModalFicha(updatedBien);
      }
    }
  }, [bienes]);

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

  // Fetch all bienes with current filter (max 180 per backend limit, multiple of 30 for sheets)
  const handleFetchAllForPrint = async () => {
    try {
      const data = await gqlClient.request(
        (await import('../api/inventario.queries')).GET_BIENES_QUERY,
        { filter: serverFilter, pagination: { first: 180 } }
      );
      const edges = data.bienes.edges ?? [];
      return edges.map(({ node }) => mapBienNode(node));
    } catch {
      return [];
    }
  };

  const { data: catalogos, isLoading: loadingCat } = useCatalogosBienes();

  const todasLasUbicaciones = useMemo(() => {
    if (!catalogos?.ubicaciones) return [];
    const filterUnidades = advFilters.clave_unidad_ref || [];
    return catalogos.ubicaciones.filter(ub => {
      if (filterUnidades.length > 0 && !filterUnidades.includes(String(ub.id_unidad))) return false;
      return true;
    });
  }, [catalogos?.ubicaciones, advFilters.clave_unidad_ref]);

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
        const mode = getDeviceMode(t.nombre_tipo, t.nombre_categoria);
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
  const [showAddProveedorModal, setShowAddProveedorModal] = useState(false);

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
  const { mutate: createCuentaPC } = useCreateCuentaPC({
    onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al guardar cuenta PC.', 'error'),
  });
  const { mutate: updateCuentaPC } = useUpdateCuentaPC({
    onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al actualizar cuenta PC.', 'error'),
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
    setCuentasList([]);
    setFormErrors({});
    setPendingEavValues({});
    setPendingMonitors([]);
    setShowTI(false);
    setDeviceMode(null);
    setModalForm('create');
  }, []);

  const openEdit = useCallback((bien) => {
    setForm({
      id_categoria: bien.idCategoria ?? '',
      id_unidad_medida: bien.idUnidadMedida ?? '',
      id_segmento: bien.idSegmento ?? '',
      id_ubicacion: bien.id_ubicacion ?? '',
      num_serie: bien.numSerie === 'N/D' ? '' : (bien.numSerie ?? ''),
      num_inv: bien.numInv === 'N/D' ? '' : (bien.numInv ?? ''),
      cantidad: bien.cantidad ?? 1,
      estatus_operativo: bien.estatusOperativo ?? 'ACTIVO',
      clave_unidad_ref: bien.claveUnidadRef ?? '',
      clave_modelo: bien.claveModelo ?? '',
      id_usuario_resguardo: bien.idUsuarioResguardo ?? '',
      fecha_adquisicion: bien.fechaAdquisicion
        ? new Date(bien.fechaAdquisicion).toISOString().split('T')[0] : '',
    });
    setTiForm({
      nombre_host: bien.especificacionTI?.nombre_host ?? '',
      cpu_info: bien.especificacionTI?.cpu_info ?? '',
      ram_gb: bien.especificacionTI?.ram_gb ?? '',
      almacenamiento_gb: bien.especificacionTI?.almacenamiento_gb ?? '',
      dir_ip: bien.especificacionTI?.dir_ip ?? '',
      dir_mac: bien.especificacionTI?.dir_mac ?? '',
      mac_address: bien.especificacionTI?.mac_address ?? '',
      modelo_so: bien.especificacionTI?.modelo_so ?? '',
      version_office: bien.especificacionTI?.version_office ?? '',
      puerto_red: bien.especificacionTI?.puerto_red ?? '',
      switch_red: bien.especificacionTI?.switch_red ?? '',
      last_scan: bien.especificacionTI?.last_scan ?? '',
      windows_serial: bien.especificacionTI?.windows_serial ?? '',
    });
    // Cargar todas las cuentas PC
    setCuentasList((bien.cuentasPC ?? []).map(c => ({ ...c, _editing: false })));
    // Detectar deviceMode por tipo de dispositivo del modelo
    const nombreTipo = bien.modelo?.tipoDispositivo?.nombre_tipo ?? null;
    const mode = getDeviceMode(nombreTipo, bien.categoria?.nombre_categoria);
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
    setFormTab('general');
    setForm(FORM_EMPTY);
    setTiForm(TI_EMPTY);
    setCuentasList([]);
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
    const mode = getDeviceMode(tipo?.nombre_tipo ?? null, null);
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
    if (!form.id_categoria) errs.id_categoria = 'Requerido';
    if (!form.id_unidad_medida && !forcePieza) errs.id_unidad_medida = 'Requerido';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Enviar formulario ──────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!validate()) return;
    const vars = {
      id_categoria: Number(form.id_categoria),
      id_unidad_medida: forcePieza ? Number(ID_UNIDAD_PIEZA) : Number(form.id_unidad_medida),
      id_segmento: form.id_segmento ? Number(form.id_segmento) : null,
      id_ubicacion: form.id_ubicacion ? Number(form.id_ubicacion) : null,
      num_serie: form.num_serie || null,
      num_inv: form.num_inv || null,
      cantidad: esSerie ? 1 : (Number(form.cantidad) || 1),
      estatus_operativo: form.estatus_operativo,
      clave_unidad_ref: form.clave_unidad_ref || null,
      clave_modelo: form.clave_modelo || null,
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
            if (hayDatosTI) upsertTI({ id_bien: bienCreado.id_bien, ...tiData });
            // Guardar cuentas PC (1:N)
            cuentasList.forEach(c => {
              const data = { cuenta_windows: c.cuenta_windows || null, correo: c.correo || null, tipo_user: c.tipo_user || null };
              createCuentaPC({ id_bien: bienCreado.id_bien, data });
            });
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
              asignarMonitor({ id_bien: bienCreado.id_bien, id_monitor: m.id_monitor, forzar: m.forzar || false });
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
            if (hayDatosTI) upsertTI({ id_bien: modalForm.id_bien, ...tiData });
            // Sync cuentas PC 1:N
            cuentasList.forEach(c => {
              const data = { cuenta_windows: c.cuenta_windows || null, correo: c.correo || null, tipo_user: c.tipo_user || null };
              if (c.id_cuenta && !c._new) {
                updateCuentaPC({ id_cuenta: c.id_cuenta, data });
              } else {
                createCuentaPC({ id_bien: modalForm.id_bien, data });
              }
            });
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
    nombre_host: tiForm.nombre_host || null,
    cpu_info: tiForm.cpu_info || null,
    ram_gb: tiForm.ram_gb ? Number(tiForm.ram_gb) : null,
    almacenamiento_gb: tiForm.almacenamiento_gb ? Number(tiForm.almacenamiento_gb) : null,
    dir_ip: tiForm.dir_ip || null,
    dir_mac: tiForm.dir_mac || null,
    mac_address: tiForm.mac_address || null,
    modelo_so: tiForm.modelo_so || null,
    version_office: tiForm.version_office || null,
    puerto_red: tiForm.puerto_red || null,
    switch_red: tiForm.switch_red || null,
    last_scan: tiForm.last_scan || null,
    windows_serial: tiForm.windows_serial || null,
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
              onClick={() => {
                setSearch('');
                setDebouncedSearch('');
                setFilterStatus('');
                setAdvFilters(EMPTY_ADV);
                setCursor(null);
                setCursors([]);
                queryClient.invalidateQueries({ queryKey: ['bienes'] });
                refetch();
              }}
              title="Refrescar"
              className="w-9 h-9 rounded-xl flex items-center justify-center border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
            </button>
            {/* Botón Exportar — solo en tabs de bienes, no en Impresión ni Carga Masiva */}
            {(activeTab === 'Capitalizable' || activeTab === 'No Capitalizable') && (
              <button
                id="btn-exportar-excel"
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10,9 9,9 8,9" /></svg>
                <span className="hidden sm:inline">Exportar</span>
              </button>
            )}
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
            {[ROL_ADMIN, ROL_MAESTRO].includes(idRol) && (
              <button
                onClick={() => setShowConfirmSyncAll(true)}
                title="Forzar Escaneo de Todos"
                className="w-9 h-9 sm:w-auto sm:px-4 sm:py-2.5 rounded-xl flex items-center justify-center gap-2 text-white text-sm font-semibold transition-all hover:opacity-90 bg-amber-600 shadow-sm"
              >
                <RefreshCw size={16} />
                <span className="hidden sm:inline">Forzar Todos</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Pestañas ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-4 w-full">
          <div className="flex flex-wrap sm:flex-nowrap gap-1 p-1 bg-gray-100 rounded-xl w-full sm:w-fit">
            {[
              { key: 'Capitalizable', label: 'Bienes Capitalizables' },
              { key: 'No Capitalizable', label: 'Bienes No Capitalizables' },
              ...(canEdit ? [{ key: 'Carga Masiva', label: 'Carga Masiva' }] : []),
              { key: 'Impresión de Etiquetas', label: 'Impresión de Etiquetas QR' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setCursor(null);
                  setCursors([]);
                  if (tab.key === 'Capitalizable') {
                    setAdvFilters(prev => ({ ...prev, inconvenientes: false }));
                  }
                }}
                className={`flex-1 sm:flex-none px-3 sm:px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap text-center ${activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
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

        {/* ── Filtros y Contenido ──────────────────────────────────────────────────────── */}
        {activeTab === 'Carga Masiva' ? (
          <CargaMasivaPanel />
        ) : (
          <>
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm relative z-20">
              {/* Barra principal de búsqueda */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por serie, inventario, IP o clave..."
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
                    <option value="PRESTAMO">Préstamo</option>
                  </select>
                  <button
                    onClick={() => { setAdvFilters(p => ({ ...p, con_notas_recientes: !p.con_notas_recientes })); setCursor(null); setCursors([]); }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border transition-all whitespace-nowrap ${advFilters.con_notas_recientes
                        ? 'bg-amber-100 border-amber-200 text-amber-800 shadow-sm'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    title="Mostrar bienes con notas recientes (últimos 30 días)"
                  >
                    <AlertTriangle size={14} className={advFilters.con_notas_recientes ? "text-amber-600" : "text-amber-500"} /> Notas Recientes
                  </button>
                  <button
                    onClick={() => { setAdvFilters(p => ({ ...p, inconvenientes: !p.inconvenientes })); setCursor(null); setCursors([]); }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border transition-all whitespace-nowrap ${advFilters.inconvenientes
                        ? 'bg-red-50 border-red-300 text-red-700 shadow-sm'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    title="Mostrar equipos con inconvenientes (Sin número de inventario o IP duplicada)"
                  >
                    <AlertTriangle size={14} /> Inconvenientes
                  </button>
                  <button
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border transition-all whitespace-nowrap ${showAdvancedFilters || activeFilterCount > 0
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
                  {/* Botón Reporte */}
                  {(activeTab === 'Capitalizable' || activeTab === 'No Capitalizable') && (
                    <button
                      onClick={() => { setShowReporte(r => !r); if (showAdvancedFilters) setShowAdvancedFilters(false); }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border transition-all whitespace-nowrap ${showReporte
                          ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      title="Panel de estadísticas y reporte de los datos filtrados"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                      Reporte
                    </button>
                  )}
                  {activeFilterCount > 0 && (
                    <button
                      onClick={() => { setAdvFilters({ ...EMPTY_ADV }); setCursor(null); setCursors([]); }}
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
                      <button onClick={() => setAdvFilters(p => ({ ...p, tipo_disp: [] }))} className="ml-0.5 hover:text-blue-900"><X size={10} /></button>
                    </span>
                  )}
                  {advFilters.clave_marca.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                      <Tag size={10} /> {advFilters.clave_marca.length} marca(s)
                      <button onClick={() => setAdvFilters(p => ({ ...p, clave_marca: [] }))} className="ml-0.5 hover:text-purple-900"><X size={10} /></button>
                    </span>
                  )}
                  {advFilters.clave_unidad_ref.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                      <MapPin size={10} /> {advFilters.clave_unidad_ref.length} Unidad(es)
                      <button onClick={() => setAdvFilters(p => ({ ...p, clave_unidad_ref: [] }))} className="ml-0.5 hover:text-amber-900"><X size={10} /></button>
                    </span>
                  )}
                  {(advFilters.ram_min || advFilters.ram_max) && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 font-medium">
                      <Server size={10} /> RAM: {advFilters.ram_min || '0'}–{advFilters.ram_max || '∞'} GB
                      <button onClick={() => setAdvFilters(p => ({ ...p, ram_min: '', ram_max: '' }))} className="ml-0.5 hover:text-cyan-900"><X size={10} /></button>
                    </span>
                  )}
                  {advFilters.modelo_so && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                      <Monitor size={10} /> SO: {advFilters.modelo_so}
                      <button onClick={() => setAdvFilters(p => ({ ...p, modelo_so: '' }))} className="ml-0.5 hover:text-indigo-900"><X size={10} /></button>
                    </span>
                  )}
                  {advFilters.tiene_garantia && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">
                      <Shield size={10} /> {advFilters.tiene_garantia === 'true' ? 'Con Garantía' : 'Sin Garantía'}
                      <button onClick={() => setAdvFilters(p => ({ ...p, tiene_garantia: '', garantia_vigente: '', garantia_fin_desde: '', garantia_fin_hasta: '' }))} className="ml-0.5 hover:text-green-900"><X size={10} /></button>
                    </span>
                  )}
                  {(advFilters.atributo_id && advFilters.atributo_valor) && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-200 font-medium">
                      <Tag size={10} /> Atributo EAV
                      <button onClick={() => setAdvFilters(p => ({ ...p, atributo_id: '', atributo_valor: '' }))} className="ml-0.5 hover:text-pink-900"><X size={10} /></button>
                    </span>
                  )}
                </div>
              )}

              {/* Panel de filtros avanzados desplegable */}
              {showAdvancedFilters && (() => {
                const selectedTiposObj = (catalogos?.tipos ?? []).filter(t => advFilters.tipo_disp.includes(String(t.tipo_disp)));
                const hasPCorLaptop = selectedTiposObj.some(t => {
                  const mode = getDeviceMode(t.nombre_tipo, t.nombre_categoria);
                  return mode === 'PC' || mode === 'LAPTOP';
                });
                const hasOtherDevice = selectedTiposObj.some(t => {
                  const mode = getDeviceMode(t.nombre_tipo, t.nombre_categoria);
                  return mode === 'OTHER' || mode === 'MONITOR';
                });
                const showTIFilter = advFilters.tipo_disp.length > 0 && hasPCorLaptop;
                const showEAVFilter = advFilters.tipo_disp.length > 0 && hasOtherDevice;

                return (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-2xl z-50 space-y-4 animate-in fade-in slide-in-from-top-2 overflow-y-auto max-h-[70vh] custom-scrollbar">
                    {/* Sección: Ubicación */}
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><MapPin size={11} /> Ubicación</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 mb-1">Unidades</label>
                          <MultiSearchableSelect
                            placeholder="Seleccionar unidades..."
                            value={advFilters.clave_unidad_ref}
                            onChange={(val) => { setAdvFilters(p => ({ ...p, clave_unidad_ref: val })); setCursor(null); setCursors([]); }}
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
                            onChange={(val) => { setAdvFilters(p => ({ ...p, id_segmento: val.map(String) })); setCursor(null); setCursors([]); }}
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
                            onChange={(val) => { setAdvFilters(p => ({ ...p, id_ubicacion: val })); setCursor(null); setCursors([]); }}
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
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Cpu size={11} /> Equipo / Dispositivo</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 mb-1">Tipo Dispositivo</label>
                          <MultiSearchableSelect
                            placeholder="Seleccionar tipos..."
                            value={advFilters.tipo_disp}
                            onChange={(val) => { setAdvFilters(p => ({ ...p, tipo_disp: val.map(String) })); setCursor(null); setCursors([]); }}
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
                            onChange={(val) => { setAdvFilters(p => ({ ...p, clave_marca: val.map(String) })); setCursor(null); setCursors([]); }}
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
                            onChange={(val) => { setAdvFilters(p => ({ ...p, id_categoria: val.map(String) })); setCursor(null); setCursors([]); }}
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
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><HardDrive size={11} /> Especificaciones TI</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">RAM Mín. (GB)</label>
                            <input type="number" min="0" placeholder="Ej. 4"
                              value={advFilters.ram_min}
                              onChange={e => { setAdvFilters(p => ({ ...p, ram_min: e.target.value })); setCursor(null); setCursors([]); }}
                              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">RAM Máx. (GB)</label>
                            <input type="number" min="0" placeholder="Ej. 32"
                              value={advFilters.ram_max}
                              onChange={e => { setAdvFilters(p => ({ ...p, ram_max: e.target.value })); setCursor(null); setCursors([]); }}
                              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Almac. Mín. (GB)</label>
                            <input type="number" min="0" placeholder="Ej. 128"
                              value={advFilters.almacenamiento_min}
                              onChange={e => { setAdvFilters(p => ({ ...p, almacenamiento_min: e.target.value })); setCursor(null); setCursors([]); }}
                              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Almac. Máx. (GB)</label>
                            <input type="number" min="0" placeholder="Ej. 1024"
                              value={advFilters.almacenamiento_max}
                              onChange={e => { setAdvFilters(p => ({ ...p, almacenamiento_max: e.target.value })); setCursor(null); setCursors([]); }}
                              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Sistema Operativo</label>
                            <input type="text" placeholder='Ej. "Windows", "Linux"'
                              value={advFilters.modelo_so}
                              onChange={e => { setAdvFilters(p => ({ ...p, modelo_so: e.target.value })); setCursor(null); setCursors([]); }}
                              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">CPU</label>
                            <input type="text" placeholder='Ej. "i7", "Ryzen"'
                              value={advFilters.cpu_info}
                              onChange={e => { setAdvFilters(p => ({ ...p, cpu_info: e.target.value })); setCursor(null); setCursors([]); }}
                              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Dirección IP</label>
                            <input type="text" placeholder='Ej. "10.28"'
                              value={advFilters.dir_ip}
                              onChange={e => { setAdvFilters(p => ({ ...p, dir_ip: e.target.value })); setCursor(null); setCursors([]); }}
                              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sección: Garantía */}
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Shield size={11} /> Garantía</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-500 mb-1">Estado</label>
                          <select
                            value={advFilters.tiene_garantia}
                            onChange={e => { setAdvFilters(p => ({ ...p, tiene_garantia: e.target.value, garantia_vigente: '', garantia_fin_desde: '', garantia_fin_hasta: '' })); setCursor(null); setCursors([]); }}
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
                                onChange={e => { setAdvFilters(p => ({ ...p, garantia_vigente: e.target.value })); setCursor(null); setCursors([]); }}
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
                                onChange={e => { setAdvFilters(p => ({ ...p, garantia_fin_desde: e.target.value })); setCursor(null); setCursors([]); }}
                                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-green-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-gray-500 mb-1">Vence Hasta</label>
                              <input type="date"
                                value={advFilters.garantia_fin_hasta}
                                onChange={e => { setAdvFilters(p => ({ ...p, garantia_fin_hasta: e.target.value })); setCursor(null); setCursors([]); }}
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
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Tag size={11} /> Atributo Técnico (EAV)</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Atributo</label>
                            <SearchableSelect
                              placeholder="-- Seleccionar Atributo --"
                              value={advFilters.atributo_id ? Number(advFilters.atributo_id) : ''}
                              onChange={(val) => { setAdvFilters(p => ({ ...p, atributo_id: val })); setCursor(null); setCursors([]); }}
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
                              onChange={e => { setAdvFilters(p => ({ ...p, atributo_valor: e.target.value })); setCursor(null); setCursors([]); }}
                              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              <p className="text-xs text-gray-400 mt-2">
                {pageInfo?.totalCount ?? 0} {(pageInfo?.totalCount ?? 0) === 1 ? 'registro' : 'registros'} encontrados
                {activeFilterCount > 0 && <span className="text-green-600 font-semibold"> · {activeFilterCount} filtro(s) avanzado(s) activo(s)</span>}
              </p>
            </div>

            {/* ── Panel de Reporte (desplegable, separado de filtros) ─────── */}
            {showReporte && (activeTab === 'Capitalizable' || activeTab === 'No Capitalizable') && (
              <ReportePanel
                serverFilter={serverFilter}
                activeTab={activeTab}
                onClose={() => setShowReporte(false)}
              />
            )}

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

              {/* TABLA desktop o Impresión */}
              {!isLoading && !isError && activeTab === 'Impresión de Etiquetas' ? (
                <PrintLabelsTab
                  bienes={bienes}
                  categorias={catalogos?.categorias ?? []}
                  selectedBienes={printSelectedBienes}
                  setSelectedBienes={setPrintSelectedBienes}
                  startOffset={printStartOffset}
                  setStartOffset={setPrintStartOffset}
                  pageInfo={pageInfo}
                  cursors={cursors}
                  onNextPage={handleNextPage}
                  onPrevPage={handlePrevPage}
                  pageSize={PAGE_SIZE}
                  onFetchAll={handleFetchAllForPrint}
                />
              ) : !isLoading && !isError && (
                <div className="hidden md:flex md:flex-col flex-1 min-h-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex-1 overflow-y-auto relative">
                    <table className="w-full text-sm text-left">
                      <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-100 shadow-sm">
                        <tr>
                          <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">ID / Serie</th>
                          <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Modelo / Categoría</th>
                          <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unidad / Ubicación</th>
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
                        ) : bienes.map((bien) => {
                          const mode = getDeviceMode(bien.modelo?.tipoDispositivo?.nombre_tipo, bien.categoria?.nombre_categoria);
                          const isPcOrLaptop = mode === 'PC' || mode === 'LAPTOP';
                          const isMissingInv = !bien.numInv || bien.numInv === 'N/D';
                          const isConflictRow = (isPcOrLaptop && isMissingInv) || (bien.inconvenientes && bien.inconvenientes.length > 0);
                          const wifiConflictMsg = bien.inconvenientes?.find(i => i.startsWith('IP Repetida'));
                          const hasWifiConflict = !!wifiConflictMsg;

                          const hasRecentNotes = bien.notas?.some(n => {
                            const d = new Date(isNaN(Number(n.fecha_creacion)) ? n.fecha_creacion : Number(n.fecha_creacion));
                            return (new Date() - d) < 86400000;
                          });

                          return (
                            <tr key={bien.id} className={`hover:bg-gray-50/70 transition-colors group ${isConflictRow ? 'bg-red-50/60' : ''}`}>
                              <td className="px-4 py-3.5 relative">
                                {isConflictRow && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>}
                                <div className="flex items-center justify-between gap-3 w-full">
                                  <div className="min-w-0">
                                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700 inline-block truncate max-w-full">
                                      {fmt(bien.numSerie)}
                                    </span>
                                    <p className={`text-xs mt-0.5 truncate max-w-full ${(isPcOrLaptop && isMissingInv) ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>Inv: {fmt(bien.numInv)}</p>
                                    {hasWifiConflict && (
                                      <div className="flex items-center gap-1 mt-1 text-red-600 font-semibold text-[10px]" title={wifiConflictMsg}>
                                        <Wifi size={12} className="animate-pulse" />
                                        <span>{wifiConflictMsg}</span>
                                      </div>
                                    )}
                                  </div>
                                  {hasRecentNotes && (
                                    <div title="Tiene notas de observación recientes (últimas 24h)" className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-600 shadow-sm flex-shrink-0">
                                      <AlertTriangle size={14} className="animate-pulse" />
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3.5">
                                <p className="font-semibold text-gray-900 text-sm">{bien.equipo}</p>
                                <p className="text-xs text-gray-400">{bien.categoria?.nombre_categoria}</p>
                              </td>
                              <td className="px-4 py-3.5 text-xs min-w-[200px]">
                                <p className="font-semibold text-gray-900 text-[13px] break-words">{fmt(bien.unidadFisica)}</p>
                                <p className="text-[11px] text-gray-400 mt-0.5 break-words">{fmt(bien.ubicacion)}</p>
                              </td>
                              <td className="px-4 py-3.5 text-xs text-gray-600 min-w-[180px] break-words">{fmt(bien.resguardo)}</td>
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
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TARJETAS mobile */}
              {!isLoading && !isError && activeTab !== 'Impresión de Etiquetas' && (
                <div className="md:hidden flex-1 min-h-0 overflow-y-auto space-y-3 pb-2">
                  {bienes.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-12 text-gray-400 text-sm">
                      <Package size={32} className="mx-auto mb-2 opacity-30" />
                      No se encontraron bienes.
                    </div>
                  ) : bienes.map((bien) => {
                    const mode = getDeviceMode(bien.modelo?.tipoDispositivo?.nombre_tipo, bien.categoria?.nombre_categoria);
                    const isPcOrLaptop = mode === 'PC' || mode === 'LAPTOP';
                    const isMissingInv = !bien.numInv || bien.numInv === 'N/D';
                    const isConflictRow = (isPcOrLaptop && isMissingInv) || (bien.inconvenientes && bien.inconvenientes.length > 0);
                    const wifiConflictMsg = bien.inconvenientes?.find(i => i.startsWith('IP Repetida'));
                    const hasWifiConflict = !!wifiConflictMsg;

                    const hasRecentNotes = bien.notas?.some(n => {
                      const d = new Date(isNaN(Number(n.fecha_creacion)) ? n.fecha_creacion : Number(n.fecha_creacion));
                      return (new Date() - d) < 86400000;
                    });

                    return (
                      <div key={bien.id} className={`rounded-2xl border shadow-sm p-4 relative overflow-hidden ${isConflictRow ? 'bg-red-50/40 border-red-200' : 'bg-white border-gray-100'}`}>
                        {isConflictRow && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>}
                        <div className="flex items-start justify-between gap-3 mb-3 pl-1">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`font-semibold text-sm leading-tight ${isConflictRow ? 'text-red-700' : 'text-gray-900'}`}>{bien.equipo}</p>
                              {hasRecentNotes && <AlertTriangle size={14} className="text-amber-500 animate-pulse" title="Tiene notas recientes" />}
                              {hasWifiConflict && <Wifi size={14} className="text-red-600 animate-pulse" title={wifiConflictMsg} />}
                            </div>
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
                    );
                  })}
                </div>
              )}

            </div>{/* fin contenedor scroll */}

            {/* Paginación - conectada al servidor */}
            {!isLoading && !isError && activeTab !== 'Impresión de Etiquetas' && (pageInfo?.hasNextPage || cursors.length > 0) && (
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
        )}

        {/* ── Modal de Exportación Excel ─────────────────────────────────── */}
        {showExportModal && (
          <ExportExcelModal
            onClose={() => setShowExportModal(false)}
            serverFilter={serverFilter}
            advFilters={advFilters}
            activeTab={activeTab}
            filterStatus={filterStatus}
            search={search}
            catalogos={catalogos}
            pageInfo={pageInfo}
          />
        )}

        {/* ════════════════════════════════════════════════════════════════════
          MODAL: FICHA TÉCNICA
      ═══════════════════════════════════════════════════════════════════════ */}
        {modalFicha && (() => {
          const activeFicha = (() => {
            const b = bienes.find(x => x.id === modalFicha.id);
            if (!b) return modalFicha;
            return { ...b, notas: (modalFicha.notas?.length > (b.notas?.length || 0)) ? modalFicha.notas : b.notas };
          })();
          const fichaMode = getDeviceMode(activeFicha.modelo?.tipoDispositivo?.nombre_tipo, activeFicha.categoria?.nombre_categoria);
          const hasTecnico = activeFicha.especificacionTI || (activeFicha.cuentasPC?.length > 0) || (activeFicha.monitores?.length > 0) || activeFicha.equipoAsignado || (activeFicha.garantias?.length > 0) || fichaMode === 'OTHER';
          return (
            <Modal onClose={() => { setModalFicha(null); setFichaTabs('info'); }} title="Ficha Técnica" subtitle="Detalles y especificaciones del equipo" wide>
              <div className="space-y-4 text-sm">
                {/* Encabezado del bien */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#006341,#004d32)' }}>
                    <Package size={22} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-base leading-tight">{activeFicha.equipo}</p>
                    <p className="text-xs text-gray-500">{activeFicha.categoria?.nombre_categoria}</p>
                  </div>
                  <EstatusBadge estatus={activeFicha.estatusOperativo} />
                  {(fichaMode === 'PC' || fichaMode === 'LAPTOP') && (
                    <button
                      ref={el => { if (el) console.log('DEBUG programasPC:', activeFicha.programasPC); }}
                      disabled={!activeFicha.programasPC?.some(p => p.programa?.includes('Gestor Activos HW'))}
                      onClick={async () => {
                        try {
                          await gqlClient.request(SET_SYNC_PENDING_MUTATION, { id_bien: activeFicha.id_bien });
                          showToast('Sincronización programada', 'success');
                        } catch (e) {
                          showToast('Error al programar', 'error');
                        }
                      }}
                      title={!activeFicha.programasPC?.some(p => p.programa?.includes('Gestor Activos HW')) ? "Agente no instalado" : "Forzar escaneo de este equipo"}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors ${!activeFicha.programasPC?.some(p => p.programa?.includes('Gestor Activos HW')) ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed' : 'bg-white border border-amber-200 text-amber-700 hover:bg-amber-50'}`}
                    >
                      <RefreshCw size={12} />
                      <span className="hidden sm:inline">Forzar Escaneo</span>
                    </button>
                  )}
                </div>

                {/* ── Pestañas Ficha ── */}
                <div className="flex gap-1 border-b border-gray-200">
                  {[
                    { key: 'info', label: 'Información' },
                    ...(hasTecnico ? [{ key: 'tecnico', label: 'Técnico / Garantía' }] : []),
                    ...(activeFicha.programasPC && activeFicha.programasPC.length > 0 ? [{ key: 'software', label: 'Software Instalado' }] : []),
                  ].map(t => (
                    <button
                      key={t.key}
                      onClick={() => setFichaTabs(t.key)}
                      className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border-b-2 -mb-px ${fichaTabs === t.key
                          ? 'border-green-600 text-green-700 bg-green-50/50'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* ── Tab: Información ── */}
                {fichaTabs === 'info' && (
                  <div className="space-y-4 fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <InfoField icon={<Tag size={14} />} label="No. Serie" value={fmt(activeFicha.numSerie)} mono />
                      <InfoField icon={<Tag size={14} />} label="No. Inventario" value={fmt(activeFicha.numInv)} mono />
                      <InfoField icon={<Shield size={14} />} label="Clave Presupuestal" value={fmt(activeFicha.clavePresupuestal)} mono />
                      <InfoField icon={<MapPin size={14} />} label="Ubicación" value={fmt(activeFicha.ubicacion)} />
                      <InfoField icon={<User size={14} />} label="En Resguardo de" value={fmt(activeFicha.resguardo) + (activeFicha.usuarioResguardo?.matricula ? ` (Mat: ${activeFicha.usuarioResguardo.matricula})` : '')} />
                      <InfoField icon={<Calendar size={14} />} label="Fecha Adquisición" value={formatDate(activeFicha.fechaAdquisicion)} />
                      <InfoField icon={<Calendar size={14} />} label="Última Actualización" value={formatDateTime(activeFicha.fechaActualizacion)} />
                      <InfoField icon={<Package size={14} />} label="Cantidad" value={activeFicha.cantidad} />
                    </div>

                    {/* Notas de Observación */}
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2.5 flex items-center gap-2 border-b border-gray-100">
                        <StickyNote size={15} className="text-gray-500" />
                        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Notas de Observación</span>
                      </div>
                      <div className="p-4 space-y-3 bg-white">
                        {activeFicha.notas && activeFicha.notas.length > 0 ? (
                          activeFicha.notas.map((nota) => (
                            <div key={nota.id_nota} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                              <p className="text-sm text-gray-800">{nota.contenido_nota}</p>
                              <div className="flex justify-between items-center mt-2 text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                                <span>{nota.usuarioAutor?.nombre_completo || 'Sistema'}</span>
                                <span>{new Date(isNaN(Number(nota.fecha_creacion)) ? nota.fecha_creacion : Number(nota.fecha_creacion)).toLocaleString('es-MX')}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-400 italic">No hay notas registradas para este bien.</p>
                        )}
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <textarea
                            value={nuevaNotaText}
                            onChange={(e) => setNuevaNotaText(e.target.value)}
                            placeholder="Escribe una nueva nota u observación..."
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-teal-500 outline-none resize-none"
                            rows={2}
                          />
                          <div className="flex justify-end mt-2">
                            <button
                              onClick={async () => {
                                if (!nuevaNotaText.trim()) return;
                                try {
                                  const res = await createNotaBien({ id_bien: activeFicha.id_bien, contenido_nota: nuevaNotaText });
                                  showToast('Nota agregada correctamente', 'success');
                                  setNuevaNotaText('');
                                  if (res) {
                                    setModalFicha(prev => {
                                      if (!prev) return null;
                                      return { ...prev, notas: [...(prev.notas || []), res] };
                                    });
                                  }
                                } catch (error) {
                                  showToast('Error al agregar nota', 'error');
                                }
                              }}
                              disabled={!nuevaNotaText.trim() || isCreatingNota}
                              className="px-4 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
                            >
                              {isCreatingNota ? <Loader2 size={14} className="animate-spin" /> : 'Guardar Nota'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Tab: Técnico / Garantía ── */}
                {fichaTabs === 'tecnico' && (
                  <div className="space-y-4 fade-in">
                    {/* Especificaciones TI */}
                    {activeFicha.especificacionTI && (fichaMode === 'PC' || fichaMode === 'LAPTOP') && (
                      <div className="rounded-xl border border-blue-100 overflow-hidden">
                        <div className="bg-blue-50 px-4 py-2.5 flex items-center gap-2">
                          <Monitor size={15} className="text-blue-600" />
                          <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Especificaciones TI</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
                          <InfoField icon={<Monitor size={13} />} label="Host Name" value={fmt(activeFicha.especificacionTI.nombre_host)} />
                          <InfoField icon={<Cpu size={13} />} label="CPU" value={fmt(activeFicha.especificacionTI.cpu_info)} />
                          <InfoField icon={<Server size={13} />} label="RAM" value={activeFicha.especificacionTI.ram_gb ? `${activeFicha.especificacionTI.ram_gb} GB` : '—'} />
                          <InfoField icon={<HardDrive size={13} />} label="Almacenamiento" value={activeFicha.especificacionTI.almacenamiento_gb ? `${activeFicha.especificacionTI.almacenamiento_gb} GB` : '—'} />
                          <InfoField icon={<Wifi size={13} />} label="Dirección IP" value={fmt(activeFicha.especificacionTI.dir_ip)} mono />
                          <InfoField icon={<Wifi size={13} />} label="MAC Address" value={fmt(activeFicha.especificacionTI.mac_address)} mono />
                          <InfoField icon={<Wifi size={13} />} label="Dir. MAC Alt" value={fmt(activeFicha.especificacionTI.dir_mac)} mono />
                          <InfoField icon={<Monitor size={13} />} label="Sistema Op." value={fmt(activeFicha.especificacionTI.modelo_so)} />
                          <InfoField icon={<Monitor size={13} />} label="Versión Office" value={fmt(activeFicha.especificacionTI.version_office)} />
                          <InfoField icon={<Calendar size={13} />} label="Último Escaneo" value={formatDateTime(activeFicha.especificacionTI.last_scan)} />
                          <InfoField icon={<Tag size={13} />} label="Win Serial" value={fmt(activeFicha.especificacionTI.windows_serial)} mono />
                          <InfoField icon={<Wifi size={13} />} label="Pto. Red" value={fmt(activeFicha.especificacionTI.puerto_red)} />
                          <InfoField icon={<Wifi size={13} />} label="Switch Red" value={fmt(activeFicha.especificacionTI.switch_red)} />
                        </div>
                      </div>
                    )}

                    {/* Cuentas PC */}
                    {activeFicha.cuentasPC && activeFicha.cuentasPC.length > 0 && (
                      <div className="rounded-xl border border-purple-200 overflow-hidden">
                        <div className="bg-purple-50 px-4 py-2.5 flex items-center gap-2">
                          <User size={15} className="text-purple-600" />
                          <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Cuentas de Usuario</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-white">
                          {activeFicha.cuentasPC.map((c, i) => (
                            <div key={i} className="col-span-full border-b border-gray-100 last:border-0 pb-2 mb-2 last:pb-0 last:mb-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <InfoField icon={<User size={13} />} label={`Cuenta Win. ${i + 1}`} value={fmt(c.cuenta_windows)} />
                              <InfoField icon={<User size={13} />} label="Correo" value={fmt(c.correo)} />
                              <InfoField icon={<User size={13} />} label="Tipo Usuario" value={fmt(c.tipo_user)} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Monitores Asignados */}
                    {(fichaMode === 'PC' || fichaMode === 'LAPTOP') && activeFicha.monitores?.length > 0 && (
                      <div className="rounded-xl border border-teal-200 overflow-hidden">
                        <div className="bg-teal-50 px-4 py-2.5 flex items-center gap-2">
                          <Monitor size={15} className="text-teal-600" />
                          <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Monitores Asignados</span>
                        </div>
                        <div className="p-4 space-y-2 bg-white">
                          {activeFicha.monitores.map((am) => (
                            <div key={am.id_bien_monitor} className="flex justify-between items-center p-2 rounded-lg border border-gray-100 bg-gray-50">
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-gray-800">{am.monitor?.modelo?.descrip_disp || 'Monitor genérico'}</span>
                                <span className="text-[10px] text-gray-500 font-mono">S/N: {am.monitor?.num_serie || 'S/N'} | INV: {am.monitor?.num_inv || 'S/N'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Equipo Asignado (Monitores) */}
                    {activeFicha.equipoAsignado && (
                      <div className="rounded-xl border border-teal-200 overflow-hidden">
                        <div className="bg-teal-50 px-4 py-2.5 flex items-center gap-2">
                          <Monitor size={15} className="text-teal-600" />
                          <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Equipo Asignado</span>
                        </div>
                        <div className="p-4 bg-white">
                          <div className="flex flex-col p-2 rounded-lg border border-gray-100 bg-gray-50">
                            <span className="text-xs font-semibold text-gray-800">{activeFicha.equipoAsignado.equipo?.modelo?.descrip_disp || 'Equipo genérico'}</span>
                            <span className="text-[10px] text-gray-500 font-mono mt-1">ID: {activeFicha.equipoAsignado.equipo?.id_bien || 'N/A'}</span>
                            <span className="text-[10px] text-gray-500 font-mono">S/N: {activeFicha.equipoAsignado.equipo?.num_serie || 'S/N'} | INV: {activeFicha.equipoAsignado.equipo?.num_inv || 'S/N'}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Atributos EAV */}
                    {fichaMode === 'OTHER' && (
                      <div className="rounded-xl border border-purple-200 overflow-hidden">
                        <div className="bg-purple-50 px-4 py-2.5 flex items-center gap-2">
                          <Tag size={15} className="text-purple-600" />
                          <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Atributos Técnicos</span>
                        </div>
                        <div className="p-4 bg-white">
                          <BienAtributosPanel id_bien={activeFicha.id_bien} readOnly={true} />
                        </div>
                      </div>
                    )}

                    {/* Póliza de Garantía */}
                    {activeFicha.garantias && activeFicha.garantias.length > 0 && (
                      <div className="rounded-xl border border-green-200 overflow-hidden">
                        <div className="bg-green-50 px-4 py-2.5 flex items-center gap-2">
                          <Shield size={15} className="text-green-600" />
                          <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Póliza de Garantía</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-white">
                          <InfoField icon={<Calendar size={13} />} label="Fecha Inicio" value={formatDate(activeFicha.garantias[0].fecha_inicio)} />
                          <InfoField icon={<Calendar size={13} />} label="Fecha Fin" value={formatDate(activeFicha.garantias[0].fecha_fin)} />
                          <InfoField icon={<User size={13} />} label="Proveedor" value={activeFicha.garantias[0].proveedorObj?.nombre_proveedor || 'Sin proveedor'} />
                          <div>
                            <p className="text-xs text-gray-400 flex items-center gap-1 mb-0.5">Estado</p>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${activeFicha.garantias[0].estado_garantia === 'VIGENTE' ? 'bg-green-100 text-green-800' :
                                activeFicha.garantias[0].estado_garantia === 'VENCIDA' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                              }`}>{activeFicha.garantias[0].estado_garantia || 'VIGENTE'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Tab: Software Instalado ── */}
                {fichaTabs === 'software' && activeFicha.programasPC && (
                  <SoftwareTable programas={activeFicha.programasPC} />
                )}
              </div>
            </Modal>
          );
        })()}

        {/* ════════════════════════════════════════════════════════════════════
          MODAL: QR / CÓDIGO DE BARRAS
      ═══════════════════════════════════════════════════════════════════════ */}
        {modalQR && (
          <Modal onClose={() => setModalQR(null)} title="Identificadores" subtitle="Códigos QR y de barras generados" small>
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
          MODAL: ELIMINAR BIEN
      ═══════════════════════════════════════════════════════════════════════ */}
        {modalConfirmDel && (
          <Modal onClose={() => setModalConfirmDel(null)} title="Eliminar Bien" subtitle="Esta acción no se puede deshacer" small>
            <div className="flex flex-col gap-4 text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600 mb-1">
                <AlertTriangle size={28} />
              </div>
              <p className="text-sm text-gray-600">
                ¿Estás seguro de que deseas eliminar permanentemente el bien <strong className="text-gray-900">{modalConfirmDel.equipo}</strong>?
              </p>
              <div className="bg-gray-50 p-3 rounded-lg text-left text-xs space-y-1 border border-gray-100">
                <p><span className="text-gray-400">ID:</span> <span className="font-mono text-gray-700">{modalConfirmDel.id_bien || modalConfirmDel.id}</span></p>
                <p><span className="text-gray-400">Serie:</span> <span className="font-mono text-gray-700">{modalConfirmDel.numSerie || 'S/N'}</span></p>
                <p><span className="text-gray-400">Inv:</span> <span className="font-mono text-gray-700">{modalConfirmDel.numInv || 'S/N'}</span></p>
              </div>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setModalConfirmDel(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => deleteBien(modalConfirmDel.id_bien || modalConfirmDel.id)}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  {deleting ? 'Eliminando...' : 'Sí, eliminar'}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* ════════════════════════════════════════════════════════════════════
          MODAL: CREAR / EDITAR BIEN
      ═══════════════════════════════════════════════════════════════════════ */}
        <EditBienModal
          isOpen={!!modalForm}
          mode={modalForm === 'create' ? 'create' : 'edit'}
          asset={modalForm !== 'create' ? modalForm : null}
          catalogos={catalogos}
          onClose={() => setModalForm(null)}
          refetch={refetch}
        />

        {showAtributosModal && (
          <AtributosCatalogModal onClose={() => setShowAtributosModal(false)} />
        )}

        <ConfirmModal
          isOpen={showConfirmSyncAll}
          onClose={() => setShowConfirmSyncAll(false)}
          onConfirm={async () => {
            setShowConfirmSyncAll(false);
            try {
              await gqlClient.request(SET_SYNC_PENDING_ALL_MUTATION);
              showToast('Sincronización masiva programada', 'success');
            } catch (e) {
              showToast('Error al programar sincronización', 'error');
            }
          }}
          title="Forzar Sincronización Masiva"
          message="¿Desea forzar la sincronización de todos los equipos en la red local? Esto puede tomar tiempo y consumir recursos de red."
          confirmText="Sí, forzar sincronización"
          cancelText="Cancelar"
          type="warning"
        />
      </div>
      <PrintStickerSheet items={printSelectedBienes} startOffset={printStartOffset} />
    </>
  );
}

// ─── Sub-componentes ───────────────────────────────────────────────────────────


function Modal({ onClose, title, subtitle, children, footer, wide = false, small = false }) {
  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50 fade-in pointer-events-none" />
      <div className={`relative bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100vh-4rem)] ${small ? 'max-w-sm' : wide ? 'max-w-3xl' : 'max-w-lg'
        } fade-in`}>
        {/* Header */}
        <div className="bg-[#00472e] px-5 sm:px-6 py-4 flex items-center justify-between text-white flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold">{title}</h3>
            {subtitle && <p className="text-sm text-green-100 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors">
            <X size={20} />
          </button>
        </div>
        {/* Body scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5">
          {children}
        </div>
        {/* Footer sticky (opcional) */}
        {footer && (
          <div className="px-5 sm:px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0 mt-auto">
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
      <input
        readOnly
        value={value ?? '—'}
        title={value ?? '—'}
        className={`w-full text-xs py-1.5 px-2 bg-white border border-gray-200 rounded-lg text-gray-600 focus:outline-none focus:ring-1 focus:ring-green-500 cursor-text ${mono ? 'font-mono' : ''}`}
      />
    </div>
  );
}

function Pagination({ page, totalPages, onPage, mobile = false }) {
  if (totalPages <= 1) return null;
  return (
    <div className={`flex items-center justify-between ${mobile ? 'bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3' : 'px-5 py-3 border-t border-gray-100'
      }`}>
      <p className="text-xs text-gray-500">Página {page} de {totalPages}</p>
      <div className="flex gap-1">
        <PageBtn onClick={() => onPage((p) => Math.max(1, p - 1))} disabled={page === 1} icon={<ChevronLeft size={14} />} />
        {!mobile && Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((n) => (
          <button key={n} onClick={() => onPage(n)}
            className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${page === n ? 'text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
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

function SoftwareTable({ programas }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query) return programas;
    const lower = query.toLowerCase();
    return programas.filter(p =>
      (p.programa || '').toLowerCase().includes(lower) ||
      (p.version || '').toLowerCase().includes(lower) ||
      (p.editor || '').toLowerCase().includes(lower)
    );
  }, [programas, query]);

  return (
    <div className="space-y-4 fade-in">
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-100 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Layers size={15} className="text-gray-500" />
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Programas Instalados ({filtered.length})
            </span>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar software..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 w-48"
            />
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 sticky top-0 border-b border-gray-100 shadow-sm z-10">
              <tr>
                <th className="px-4 py-2 font-semibold text-gray-500 uppercase tracking-wide">Programa</th>
                <th className="px-4 py-2 font-semibold text-gray-500 uppercase tracking-wide">Versión</th>
                <th className="px-4 py-2 font-semibold text-gray-500 uppercase tracking-wide">Editor</th>
                <th className="px-4 py-2 font-semibold text-gray-500 uppercase tracking-wide">Fecha Inst.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">No se encontraron programas</td></tr>
              ) : filtered.map((prog, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-900 font-medium break-words max-w-[250px]">{prog.programa || '—'}</td>
                  <td className="px-4 py-2 text-gray-600 break-words">{prog.version || '—'}</td>
                  <td className="px-4 py-2 text-gray-600 break-words max-w-[150px]">{prog.editor || '—'}</td>
                  <td className="px-4 py-2 text-gray-500 break-words whitespace-nowrap">
                    {prog.fecha_instalacion ? formatDate(prog.fecha_instalacion) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}