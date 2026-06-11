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
  SET_SYNC_PENDING_MUTATION, SET_SYNC_PENDING_ALL_MUTATION,
  CHECK_DUPLICATE_IP_QUERY, CLEAR_IP_FROM_OTHER_BIENES_MUTATION
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
import ReportePanel from '../components/ReportePanel';

import { EditBienModal as Self } from './EditBienModal';
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
    'ACTIVO':          { bg: '#dcfce7', color: '#15803d', label: 'Activo' },
    'INACTIVO':      { bg: '#fee2e2', color: '#b91c1c', label: 'Inactivo' },
    'DAÑADO':        { bg: '#fef3c7', color: '#d97706', label: 'Dañado' },
    'DEVOLUCIÓN':    { bg: '#f3e8ff', color: '#7e22ce', label: 'Devolución' },
    'OTRO':          { bg: '#f3f4f6', color: '#374151', label: 'Otro' },
    'P_BAJA':        { bg: '#ffedd5', color: '#c2410c', label: 'Pre-Baja' },
    'PRESTAMO':      { bg: '#dbeafe', color: '#1d4ed8', label: 'Préstamo' },
    'SINIESTRADO':   { bg: '#fef2f2', color: '#991b1b', label: 'Siniestrado' },
    'SUSTITUIDO':    { bg: '#e0e7ff', color: '#4338ca', label: 'Sustituido' },
    'TRASPASO OOAD': { bg: '#ccfbf1', color: '#0f766e', label: 'Traspaso OOAD' },
    'TRASPASO_FORANEO': { bg: '#cffafe', color: '#0369a1', label: 'Traspaso Foráneo' },
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
  const tipos  = catAux?.tiposDispositivo ?? [];
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

            const tipoSelObj  = tipoDeModelo(modeloLocal);
            const marcaSelObj = marcaDeModelo(modeloLocal);

            // Hay cambio pendiente si localSelected difiere del original (incluso si es '')
            const hasPendingChange = localSelected !== modeloActual;

            return (
            <div className="space-y-3 fade-in">

              {/* —— Tarjeta: estado de selección local —— */}
              {modeloLocal ? (
                <div className={`rounded-xl border-2 p-3 transition-colors ${
                  hasPendingChange ? 'border-amber-300 bg-amber-50' : 'border-green-200 bg-green-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                      hasPendingChange ? 'text-amber-700' : 'text-green-700'
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
                className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  hasPendingChange
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
                  const tipoObj  = tipoDeModelo(m);
                  const marcaObj = marcaDeModelo(m);
                  const isHighlighted = m.clave_modelo === localSelected;
                  const isOriginal   = m.clave_modelo === modeloActual && !isHighlighted;
                  return (
                    <button
                      key={m.clave_modelo}
                      ref={isHighlighted ? selectedItemRef : null}
                      onClick={() => setLocalSelected(m.clave_modelo)}
                      className={`w-full grid grid-cols-[auto_1fr_auto_auto] gap-x-3 items-center px-3 py-2.5 text-left text-sm transition-colors ${
                        isHighlighted
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
                        <span className={`font-mono text-[11px] font-bold truncate ${
                          isHighlighted ? 'text-green-700' : 'text-gray-500'
                        }`}>
                          {m.clave_modelo}
                        </span>
                      </div>
                      {/* Descripción */}
                      <span className={`text-xs truncate ${
                        isHighlighted ? 'text-green-800 font-semibold' : 'text-gray-700'
                      }`}>
                        {m.descrip_disp || <em className="text-gray-400">Sin descripción</em>}
                      </span>
                      {/* Marca (String lookup) */}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 max-w-[80px] truncate border ${
                        marcaObj
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
        eq?.num_inv  ? `INV: ${eq.num_inv}`  : null,
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
                      label: `${m.modelo?.descrip_disp || 'Monitor'} - ${m.num_serie || 'Sin Serie'}${
                        m.equipoAsignado ? ' ⚠ En uso' : ''
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

export function Modal({ onClose, title, subtitle, children, footer, wide = false, small = false }) {
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
export function EditBienModal({ isOpen, onClose, asset, catalogos, mode = 'edit', refetch }) {
  const queryClient = useQueryClient();
  const { showToast } = useApp();
  const usuario = useAuthStore((s) => s.usuario);
  const idRol = usuario?.id_rol ?? 3;
  
  
  // Need this for deleteCuentaPC if it's a mutation:
  const deleteCuentaPC = () => { showToast('Borrado de cuenta PC no implementado localmente', 'warning') };
  
  // States
  const [formTab, setFormTab]           = useState(idRol === 3 ? 'tecnico' : 'general'); // 'general' | 'tecnico'
  const [inconveniencesWarning, setInconveniencesWarning] = useState(null);
  
  const [showTI, setShowTI]             = useState(false);
  const [deviceMode, setDeviceMode]     = useState(null); // 'PC' | 'LAPTOP' | 'MONITOR' | 'OTHER' | null
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [showAtributosModal, setShowAtributosModal] = useState(false);
  
  const loadingCat = !catalogos;
  const bienes = queryClient.getQueryData(['bienes'])?.items ?? [];

  // ── Formulario ────────────────────────────────────────────────────────────
  const [form, setForm]   = useState(FORM_EMPTY);
  const [redInterfaces, setRedInterfaces] = useState([{ ip: '', mac: '' }]);
  const [tiForm, setTiForm] = useState(TI_EMPTY);
  // cuentas 1:N: array de { id_cuenta?, cuenta_windows, correo, tipo_user, nombre_host, _editing?, _new? }
  const [cuentasList, setCuentasList] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [pendingEavValues, setPendingEavValues] = useState({}); // {id_atributo: valor} para modo creación
  const [pendingMonitors, setPendingMonitors] = useState([]); // [{ monitor: object, id_monitor: string }] para modo creación
  const [garantiaForm, setGarantiaForm] = useState({ show: false, id_garantia: null, fecha_inicio: '', fecha_fin: '', id_proveedor: '' });

  const [modalForm, setModalForm] = useState(mode === 'create' ? 'create' : asset);


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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bienes'] });
      qc.invalidateQueries({ queryKey: ['garantias'] });
      showToast('Garantía guardada', 'success');
    },
    onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al guardar garantía', 'error'),
  });
  const { mutate: updateGarantia } = useMutation({
    mutationFn: (vars) => gqlClient.request(UPDATE_GARANTIA, vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bienes'] });
      qc.invalidateQueries({ queryKey: ['garantias'] });
      showToast('Garantía actualizada', 'success');
    },
    onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al actualizar garantía', 'error'),
  });

  const { mutate: createBien, isPending: creating } = useCreateBien({
    onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al crear bien.', 'error'),
  });
  const { mutate: updateBien, isPending: updating } = useUpdateBien({
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
  // 
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
        onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['bienes'] });
      if (data?.asignarMonitor) {
        setModalForm(prev => {
          if (!prev || prev === 'create') return prev;
          const currentMonitors = prev.monitores || [];
          return {
            ...prev,
            monitores: [...currentMonitors, data.asignarMonitor]
          };
        });
      }
      showToast('Monitor asignado.', 'success');
    },
    onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al asignar monitor.', 'error'),
  });
  const { mutate: desasignarMonitor, isPending: desasignando } = useMutation({
    mutationFn: (vars) => gqlClient.request(DESASIGNAR_MONITOR_MUTATION, vars),
        onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ['bienes'] });
      setModalForm(prev => {
        if (!prev || prev === 'create') return prev;
        const currentMonitors = prev.monitores || [];
        return {
          ...prev,
          monitores: currentMonitors.filter(m => m.id_bien_monitor !== variables.id_bien_monitor)
        };
      });
      showToast('Monitor desasignado.', 'success');
    },
    onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al desasignar monitor.', 'error'),
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
    // parse existing ips and macs into redInterfaces
    const rawIp = bien.especificacionTI?.dir_ip || '';
    const rawMac = bien.especificacionTI?.mac_address || '';
    const ips = rawIp.split('/').map(x => x.trim()).filter(Boolean);
    const macs = rawMac.split('/').map(x => x.trim()).filter(Boolean);
    const interfaces = [];
    const len = Math.max(ips.length, macs.length, 1);
    for(let i=0; i<len; i++) {
      interfaces.push({ ip: ips[i] || '', mac: macs[i] || '' });
    }
    setRedInterfaces(interfaces);

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
    setFormTab(idRol === 3 ? 'tecnico' : 'general');
    setForm(FORM_EMPTY);
    setRedInterfaces([{ ip: '', mac: '' }]);
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
    if (!form.id_categoria)     errs.id_categoria     = 'Requerido';
    if (!form.id_unidad_medida && !forcePieza) errs.id_unidad_medida = 'Requerido';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Enviar formulario ──────────────────────────────────────────────────────
  const executeSave = () => {
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
            if (hayDatosTI) upsertTI({ id_bien: bienCreado.id_bien, ...tiData });
            // Guardar cuentas PC (1:N)
            cuentasList.forEach(c => {
              const data = { cuenta_windows: c.cuenta_windows||null, correo: c.correo||null, tipo_user: c.tipo_user||null };
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
          if (garantiaForm.show) {
            const handleFinish = async () => {
              await queryClient.cancelQueries({ queryKey: ['bienes'] });
              closeForm();
              onClose();
              if (refetch) await refetch();
              showToast('Bien registrado correctamente.', 'success');
            };
            createGarantia({
              id_bien: bienCreado.id_bien,
              fecha_inicio: garantiaForm.fecha_inicio || null,
              fecha_fin: garantiaForm.fecha_fin || null,
              id_proveedor: garantiaForm.id_proveedor ? parseInt(garantiaForm.id_proveedor) : null,
              estado_garantia: 'VIGENTE'
            }, { onSuccess: handleFinish });
          } else {
             const handleFinish = async () => {
               await queryClient.cancelQueries({ queryKey: ['bienes'] });
               closeForm();
               onClose();
               if (refetch) await refetch();
               showToast('Bien registrado correctamente.', 'success');
             };
             handleFinish();
          }
        },
      });
    } else {
      if (idRol === 3) {
        // Rol estándar solo actualiza TI y Cuentas PC
        if (showTI && modalForm.id_bien) {
          const tiData = parseTI();
          const hayDatosTI = Object.values(tiData).some((v) => v !== null && v !== '');
          if (hayDatosTI) upsertTI({ id_bien: modalForm.id_bien, ...tiData });
          cuentasList.forEach(c => {
            const data = { cuenta_windows: c.cuenta_windows||null, correo: c.correo||null, tipo_user: c.tipo_user||null };
            if (c.id_cuenta && !c._new) {
              updateCuentaPC({ id_cuenta: c.id_cuenta, data });
            } else {
              createCuentaPC({ id_bien: modalForm.id_bien, data });
            }
          });
        }
        setTimeout(async () => {
          await queryClient.cancelQueries({ queryKey: ['bienes'] });
          closeForm(); 
          onClose(); 
          if (refetch) await refetch(); 
          showToast('Especificaciones TI actualizadas.', 'success'); 
        }, 300);
        return;
      }

      updateBien({ id_bien: modalForm.id_bien, ...vars }, {
        onSuccess: () => {
          if (showTI && modalForm.id_bien) {
            const tiData = parseTI();
            const hayDatosTI = Object.values(tiData).some((v) => v !== null && v !== '');
            if (hayDatosTI) upsertTI({ id_bien: modalForm.id_bien, ...tiData });
            // Sync cuentas PC 1:N
            cuentasList.forEach(c => {
              const data = { cuenta_windows: c.cuenta_windows||null, correo: c.correo||null, tipo_user: c.tipo_user||null };
              if (c.id_cuenta && !c._new) {
                updateCuentaPC({ id_cuenta: c.id_cuenta, data });
              } else {
                createCuentaPC({ id_bien: modalForm.id_bien, data });
              }
            });
          }
          if (garantiaForm.show) {
            const handleFinish = async () => {
              await queryClient.cancelQueries({ queryKey: ['bienes'] });
              closeForm();
              onClose();
              if (refetch) await refetch();
              showToast('Bien actualizado correctamente.', 'success');
            };
            if (garantiaForm.id_garantia) {
              updateGarantia({
                id_garantia: garantiaForm.id_garantia,
                fecha_inicio: garantiaForm.fecha_inicio || null,
                fecha_fin: garantiaForm.fecha_fin || null,
                id_proveedor: garantiaForm.id_proveedor ? parseInt(garantiaForm.id_proveedor) : null,
                estado_garantia: 'VIGENTE'
              }, { onSuccess: handleFinish });
            } else {
              createGarantia({
                id_bien: modalForm.id_bien,
                fecha_inicio: garantiaForm.fecha_inicio || null,
                fecha_fin: garantiaForm.fecha_fin || null,
                id_proveedor: garantiaForm.id_proveedor ? parseInt(garantiaForm.id_proveedor) : null,
                estado_garantia: 'VIGENTE'
              }, { onSuccess: handleFinish });
            }
          } else {
             const handleFinish = async () => {
               await queryClient.cancelQueries({ queryKey: ['bienes'] });
               closeForm();
               onClose();
               if (refetch) await refetch();
               showToast('Bien actualizado correctamente.', 'success');
             };
             handleFinish();
          }
        },
      });
    }
  };

  const parseTI = () => ({
    nombre_host:       tiForm.nombre_host || null,
    cpu_info:          tiForm.cpu_info || null,
    ram_gb:            tiForm.ram_gb ? Number(tiForm.ram_gb) : null,
    almacenamiento_gb: tiForm.almacenamiento_gb ? Number(tiForm.almacenamiento_gb) : null,
    dir_ip:            redInterfaces.map(r => r.ip).filter(Boolean).join(' / ') || null,
    dir_mac:           null,
    mac_address:       redInterfaces.map(r => r.mac).filter(Boolean).join(' / ') || null,
    modelo_so:         tiForm.modelo_so || null,
    version_office:    tiForm.version_office || null,
    puerto_red:        tiForm.puerto_red || null,
    switch_red:        tiForm.switch_red || null,
    last_scan:         tiForm.last_scan || null,
    windows_serial:    tiForm.windows_serial || null,
  });


  useEffect(() => {
    if (isOpen) {
        if (mode === 'create') {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            openCreate();
        } else if (asset) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            openEdit(asset);
        }
    }
  }, [isOpen, mode, asset, openCreate, openEdit]);

  if (!isOpen) return null;
  
  const originalCloseForm = closeForm;
  const handleClose = () => {
      originalCloseForm();
      onClose();
      if (refetch) refetch();
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    
    let hasNoInv = false;
    let ipConflict = null;

    if ((deviceMode === 'PC' || deviceMode === 'LAPTOP') && (!form.num_inv || form.num_inv.trim() === '')) {
      hasNoInv = true;
    }

    const finalIpStr = redInterfaces.map(r => r.ip).filter(Boolean).join(' / ');
    if (showTI && finalIpStr && finalIpStr.trim() !== '') {
       const ipsToCheck = redInterfaces.map(r => r.ip.replace(/\s/g, '')).filter(Boolean);
       const currentId = modalForm !== 'create' ? modalForm.id_bien : null;
       let conflictIp = null;
       let conflictDups = [];
       try {
           for (const cleanIp of ipsToCheck) {
             const { checkDuplicateIP } = await gqlClient.request(CHECK_DUPLICATE_IP_QUERY, { dir_ip: cleanIp, id_bien_exclude: currentId });
             if (checkDuplicateIP && checkDuplicateIP.length > 0) {
                 conflictIp = cleanIp;
                 conflictDups = checkDuplicateIP;
                 break;
             }
           }
           if (conflictIp) {
               ipConflict = { ip: conflictIp, duplicates: conflictDups };
           }
       } catch (e) {
           console.error("Error al checar IP duplicada:", e);
       }
    }

    if (hasNoInv || ipConflict) {
        setInconveniencesWarning({ hasNoInv, ipConflict });
        return;
    }

    executeSave();
  };

  return (
    <>
      {inconveniencesWarning && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[10010] flex items-center justify-center bg-gray-900/60 p-4 fade-in" onClick={() => {}}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-orange-50 shrink-0">
              <div className="flex items-center gap-2 text-orange-700 font-bold">
                <AlertTriangle size={18} /> Inconvenientes Detectados
              </div>
            </div>
            <div className="p-6 overflow-y-auto">
              <p className="text-sm text-gray-700 mb-4">
                El equipo presenta los siguientes inconvenientes. ¿Deseas guardarlo de todas formas?
              </p>
              
              <ul className="list-disc pl-5 mb-4 text-sm text-red-600 font-semibold space-y-1">
                 {inconveniencesWarning.hasNoInv && <li>Falta Número de Inventario (requerido para PC/Laptop)</li>}
                 {inconveniencesWarning.ipConflict && <li>Dirección IP Repetida</li>}
              </ul>

              {inconveniencesWarning.ipConflict && (
                  <div className="mb-6">
                      <p className="text-sm text-gray-700 mb-2">
                        La dirección IP <span className="font-mono font-bold">{inconveniencesWarning.ipConflict.ip}</span> ya está asignada a {inconveniencesWarning.ipConflict.duplicates.length} equipo(s):
                      </p>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {inconveniencesWarning.ipConflict.duplicates.map(d => (
                          <div key={d.id_bien} className="bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs flex flex-col gap-0.5">
                            <p className="font-semibold text-gray-800">{d.modelo?.descrip_disp || 'Equipo'}</p>
                            <p className="text-gray-500 font-mono">S/N: {d.num_serie || 'N/D'} | INV: {d.num_inv || 'N/D'}</p>
                            {d.ubicacion?.nombre && <p className="text-gray-500 text-[10px]">Ubicación: {d.ubicacion.nombre}</p>}
                          </div>
                        ))}
                      </div>
                  </div>
              )}

              <div className="flex flex-col gap-3">
                {inconveniencesWarning.ipConflict && (
                    <button
                      onClick={async () => {
                        try {
                          await gqlClient.request(CLEAR_IP_FROM_OTHER_BIENES_MUTATION, { dir_ip: inconveniencesWarning.ipConflict.ip, id_bien_exclude: modalForm !== 'create' ? modalForm.id_bien : null });
                          setInconveniencesWarning(null);
                          executeSave();
                        } catch (e) {
                          showToast('Error al quitar IP', 'error');
                        }
                      }}
                      className="w-full py-2.5 text-sm font-semibold text-white rounded-xl transition-all shadow hover:opacity-90 flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}
                    >
                      <Wifi size={16} /> Quitar IP a los demás equipos y Guardar
                    </button>
                )}
                
                <button
                  onClick={() => {
                    setInconveniencesWarning(null);
                    executeSave();
                  }}
                  className="w-full py-2.5 text-sm font-semibold border-2 border-red-200 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                >
                  Guardar con inconvenientes
                </button>
              </div>
              <div className="mt-4 text-center">
                <button onClick={() => setInconveniencesWarning(null)} className="text-xs text-gray-400 hover:text-gray-600 underline">
                  Cancelar Guardado
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      {modalForm && (
        <Modal
          onClose={handleClose}
          title={modalForm === 'create' ? 'Registrar Nuevo Bien' : 'Editar Bien'}
          subtitle={modalForm === 'create' ? 'Dar de alta un nuevo activo en el inventario' : 'Modificar la información del activo'}
          wide
          footer={
            <div className="flex justify-end gap-3">
              <button onClick={handleClose}
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
            <div className="space-y-4 text-sm">

              {/* — Campos de solo lectura (solo al editar) — */}
              {modalForm !== 'create' && (
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <ReadonlyField label="ID Bien" value={modalForm.id_bien} mono />
                    <ReadonlyField label="Clave Presupuestal" value={fmt(modalForm.clavePresupuestal)} mono />
                  </div>
                </div>
              )}

              {/* ── Pestañas Formulario ── */}
              <div className="flex gap-1 border-b border-gray-200">
                {[
                  { key: 'general', label: 'General' },
                  { key: 'tecnico', label: 'Técnico / Garantía', badge: showTI || deviceMode === 'OTHER' || deviceMode === 'PC' || deviceMode === 'LAPTOP' || deviceMode === 'MONITOR' },
                ].filter(t => Number(idRol) !== 3 || t.key !== 'general').map(t => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setFormTab(t.key)}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border-b-2 -mb-px ${
                      formTab === t.key
                        ? 'border-green-600 text-green-700 bg-green-50/50'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t.label}
                    {t.badge && formTab !== t.key && (
                      <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                    )}
                  </button>
                ))}
              </div>

              {/* ── Tab: General ── */}
              {formTab === 'general' && (
              <fieldset disabled={idRol === 3} className="grid grid-cols-1 sm:grid-cols-2 gap-4 fade-in">
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Número de Inventario
{modalForm !== 'create' && modalForm?.inconvenientes?.includes('Sin número de inventario') && (<span className="ml-2 inline-flex items-center gap-1 text-red-600 text-[10px]" title="Este equipo requiere número de inventario"><AlertTriangle size={12} className="animate-pulse" /> Faltante</span>)}
</label>
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
                    <option value="INACTIVO">Inactivo</option>
                    <option value="DAÑADO">Dañado</option>
                    <option value="DEVOLUCIÓN">Devolución</option>
                    <option value="OTRO">Otro</option>
                    <option value="P_BAJA">Pre-Baja</option>
                    <option value="PRESTAMO">Préstamo</option>
                    <option value="SINIESTRADO">Siniestrado</option>
                    <option value="SUSTITUIDO">Sustituido</option>
                    <option value="TRASPASO OOAD">Traspaso OOAD</option>
                    <option value="TRASPASO_FORANEO">Traspaso Foráneo</option>
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Segmento de Red <span className="ml-2 text-[10px] text-blue-500 font-normal">(Auto-asignado por IP)</span>
                  </label>
                  <SearchableSelect
                    value={form.id_segmento ? String(form.id_segmento) : ''}
                    onChange={(val) => {
                      setForm((f) => ({ ...f, id_segmento: val }));
                    }}
                    options={(catalogos?.segmentos ?? []).map(u => ({ value: String(u.id_segmento), label: u.nombre || u.clave }))}
                    placeholder="Sin segmento"
                    disabled={true}
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
              </fieldset>
              )}

              {/* ── Tab: Técnico ── */}
              {formTab === 'tecnico' && (
              <div className="space-y-4 fade-in">

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
                        { key: 'nombre_host',        label: 'Nombre de Host',       placeholder: 'PC-ADMIN', form: 'ti' },
                        { key: 'cpu_info',           label: 'CPU',                  placeholder: 'Intel Core i5-12400', form: 'ti' },
                        { key: 'ram_gb',             label: 'RAM (GB)',              placeholder: '8', type: 'number', form: 'ti' },
                        { key: 'almacenamiento_gb',  label: 'Almacenamiento (GB)',   placeholder: '256', type: 'number', form: 'ti' },
                        { key: 'modelo_so',          label: 'Sistema Operativo',     placeholder: 'Windows 11 Pro', form: 'ti' },
                        { key: 'version_office',     label: 'Versión de Office',     placeholder: 'Office 2021', form: 'ti' },
                        { key: 'windows_serial',     label: 'Serial de Windows',     placeholder: 'XXXXX-XXXXX-XXXXX', form: 'ti' },
                        { key: 'puerto_red',         label: 'Puerto de Red',         placeholder: 'Pto. 12', form: 'ti' },
                        { key: 'switch_red',         label: 'Switch (IP/Nombre)',    placeholder: '10.28.X.X', form: 'ti' },
                        { key: 'last_scan',          label: 'Último Escaneo',        placeholder: '', type: 'datetime-local', form: 'ti' },
                      ].map(({ key, label, placeholder, type = 'text' }) => (
                        <div key={key}>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>
                          <input
                            type={type}
                            value={tiForm[key] ?? ''}
                            onChange={(e) => setTiForm((f) => ({ ...f, [key]: e.target.value }))}
                            placeholder={placeholder}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {showTI && (
                    <div className="border-t border-blue-100 p-4 bg-white">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
                          DIRECCIÓN IPV4 Y MAC ADDRESS
                        </p>
                        <button
                          type="button"
                          onClick={() => setRedInterfaces([...redInterfaces, { ip: '', mac: '' }])}
                          className="flex items-center gap-1 text-xs text-blue-600 font-semibold hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          <Plus size={13}/> Agregar
                        </button>
                      </div>
                      <div className="space-y-3">
                        {redInterfaces.map((net, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={net.ip}
                              onChange={(e) => {
                                let v = e.target.value.replace(/[^0-9.]/g, '').replace(/\.+/g, '.');
                                let parts = v.split('.');
                                for(let i=0; i<parts.length; i++) {
                                  if(parts[i].length > 3) {
                                     parts.splice(i+1, 0, parts[i].slice(3));
                                     parts[i] = parts[i].slice(0,3);
                                  }
                                }
                                parts = parts.map(p => (p && parseInt(p, 10) > 255) ? '255' : p);
                                const formattedIp = parts.slice(0,4).join('.');
                                setRedInterfaces(prev => prev.map((item, i) => i === idx ? { ...item, ip: formattedIp } : item))
                              }}
                              placeholder="10.73.226.242"
                              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 font-mono tracking-widest text-center"
                            />
                            <input
                              type="text"
                              value={net.mac}
                              onChange={(e) => {
                                const v = e.target.value.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
                                const formattedMac = v.match(/.{1,2}/g)?.join(':').slice(0, 17) || '';
                                setRedInterfaces(prev => prev.map((item, i) => i === idx ? { ...item, mac: formattedMac } : item))
                              }}
                              placeholder="4C:5F:70:73:63:97"
                              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 font-mono tracking-widest text-center"
                            />
                            {redInterfaces.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setRedInterfaces(prev => prev.filter((_, i) => i !== idx))}
                                className="w-10 h-10 flex items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50 shrink-0"
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* — Cuentas PC (1:N) — */}
                  {showTI && (
                    <div className="border-t border-blue-100 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
                          <User size={13}/> Cuentas de Usuario PC
                        </p>
                        <button
                          type="button"
                          onClick={() => setCuentasList(prev => [...prev, { _new: true, _editing: true, cuenta_windows: '', correo: '', tipo_user: '' }])}
                          className="flex items-center gap-1 text-xs text-blue-600 font-semibold hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          <Plus size={13}/> Agregar cuenta
                        </button>
                      </div>
                      {cuentasList.length === 0 && (
                        <p className="text-xs text-gray-400 italic text-center py-3 bg-gray-50 rounded-lg border border-dashed border-gray-200">Sin cuentas — agrega una con el botón</p>
                      )}
                      <div className="space-y-3">
                        {cuentasList.map((c, idx) => (
                          <div key={c.id_cuenta ?? `new-${idx}`} className="rounded-lg border border-blue-100 overflow-hidden">
                            {/* Header de cuenta */}
                            <div className="flex items-center justify-between px-3 py-2 bg-blue-50">
                              <span className="text-xs font-semibold text-blue-700">
                                {c.cuenta_windows || `Cuenta ${idx + 1}`}
                              </span>
                              <div className="flex gap-1">
                                <button type="button"
                                  onClick={() => setCuentasList(prev => prev.map((x, i) => i === idx ? { ...x, _editing: !x._editing } : x))}
                                  className="text-[10px] px-2 py-0.5 rounded bg-white border border-blue-200 text-blue-600 hover:bg-blue-100 font-semibold"
                                >{c._editing ? 'Cerrar' : 'Editar'}</button>
                                <button type="button"
                                  onClick={() => {
                                    if (c.id_cuenta && !c._new) { deleteCuentaPC({ id_cuenta: c.id_cuenta }); }
                                    setCuentasList(prev => prev.filter((_, i) => i !== idx));
                                  }}
                                  className="text-[10px] px-2 py-0.5 rounded bg-white border border-red-200 text-red-500 hover:bg-red-50 font-semibold"
                                >Eliminar</button>
                              </div>
                            </div>
                            {/* Campos editables */}
                            {c._editing && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-white">
                                {[
                                  { key: 'cuenta_windows', label: 'Windows', placeholder: 'usuario.local' },
                                  { key: 'correo',         label: 'Correo',  placeholder: 'usuario@imss.gob.mx', type: 'email' },
                                  { key: 'tipo_user',      label: 'Tipo',    placeholder: 'Estándar' },
                                ].map(({ key, label, placeholder, type = 'text' }) => (
                                  <div key={key}>
                                    <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">{label}</label>
                                    <input
                                      type={type}
                                      value={c[key] ?? ''}
                                      onChange={e => setCuentasList(prev => prev.map((x, i) => i === idx ? { ...x, [key]: e.target.value } : x))}
                                      placeholder={placeholder}
                                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* Vista compacta cuando cerrado */}
                            {!c._editing && (
                              <div className="px-3 py-2 bg-white grid grid-cols-2 gap-1">
                                {c.cuenta_windows && <span className="text-[10px] text-gray-600"><span className="font-semibold">Win:</span> {c.cuenta_windows}</span>}
                                {c.correo && <span className="text-[10px] text-gray-600"><span className="font-semibold">Correo:</span> {c.correo}</span>}
                                {c.tipo_user && <span className="text-[10px] text-gray-600"><span className="font-semibold">Tipo:</span> {c.tipo_user}</span>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
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
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha Fin</label>
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
                      <div className="flex gap-2">
                        <select
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                          value={garantiaForm.id_proveedor}
                          onChange={e => setGarantiaForm(p => ({ ...p, id_proveedor: e.target.value }))}
                        >
                          <option value="">-- Ninguno --</option>
                          {proveedores.map(p => (
                            <option key={p.id_proveedor} value={p.id_proveedor}>{p.nombre_proveedor}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowAddProveedorModal(true)}
                          title="Agregar nuevo proveedor"
                          className="px-3 py-2 border border-gray-200 text-gray-500 flex items-center justify-center rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0 bg-white"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      {showAddProveedorModal && (
                        <ProveedorModal
                          onClose={() => setShowAddProveedorModal(false)}
                          onSuccess={(newId) => setGarantiaForm(p => ({ ...p, id_proveedor: String(newId) }))}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          </div>
        )}
      </Modal>
      )}

      {showCatalogModal && (
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


    </>
  );
}
