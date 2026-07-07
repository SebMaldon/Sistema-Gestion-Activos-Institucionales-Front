import React, { useState, useCallback, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { useApp } from '../context/AppContext';
import { useAuthStore } from '../store/auth.store';
import { useLocation } from 'react-router-dom';
import {
 GET_GARANTIAS,
 GET_PROVEEDORES,
 CREATE_GARANTIA,
 UPDATE_GARANTIA,
 DELETE_GARANTIA,
 GET_BIEN_BY_TERMINO,
 CREATE_REPORTE_GARANTIA,
} from '../api/garantias.queries';
import { GET_MARCAS_TIPOS_QUERY } from '../api/inventario.queries';
import { useUsuariosActivos } from '../hooks/useIncidencias';
import {
 ShieldCheck, Plus, Search, Edit, Trash2, X, RefreshCw, AlertCircle, Info, CalendarClock, Box, Loader2, Wifi, Tag, Hash, ChevronRight, Building, Phone, Mail, User, MapPin, BarChart2, ArrowUpDown, ChevronUp, ChevronDown, Filter, ChevronLeft, FileText, Download, FileSpreadsheet, CheckCircle2
} from 'lucide-react';
import { formatDate } from '../lib/utils';
import ProveedorModal from '../components/ProveedorModal';
import ReportesSeccion from '../components/ReportesSeccion';
import MultiSelect from '../components/MultiSelect';
import * as XLSX from 'xlsx-js-style';

const highlightText = (text, query) => {
  if (!text || !query) return text;
  const str = String(text);
  const q = String(query).trim();
  if (!q) return text;

  const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQ})`, 'gi');
  const parts = str.split(regex);

  if (parts.length === 1) return text;

  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} className="bg-yellow-300 dark:bg-yellow-500/50 text-gray-950 dark:text-gray-100 rounded px-0.5 font-bold shadow-sm">
        {part}
      </mark>
    ) : part
  );
};

// ─── Componentes reusables de vista ──────────────────────────────────────────

function EstatusBadge({ estatus }) {
 const map = {
 'VIGENTE': { bg: 'bg-green-100 dark:bg-green-900/40', color: 'text-green-800 dark:text-green-300', border: 'border-green-200 dark:border-green-800/50', label: 'Vigente' },
 'VENCIDA': { bg: 'bg-red-100 dark:bg-red-900/40', color: 'text-red-800 dark:text-red-300', border: 'border-red-200 dark:border-red-800/50', label: 'Vencida' },
 'DESCONOCIDO': { bg: 'bg-slate-100 dark:bg-slate-800/50', color: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700/50', label: 'Desconocido' },
 };
 const s = map[estatus] ?? { bg: 'bg-gray-100 dark:gray-800/50', color: 'text-gray-800 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700/50', label: estatus };
 return (
 <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.color} ${s.border || ''}`}>
 {s.label}
 </span>
 );
}

function Modal({ onClose, title, subtitle, children, wide = false, extraWide = false, small = false }) {
  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70 pointer-events-none" />
      <div className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100vh-4rem)] ${small ? 'max-w-sm' : extraWide ? 'max-w-5xl' : wide ? 'max-w-4xl' : 'max-w-2xl'}`}>
        {/* Header */}
        <div className="bg-[#00472e] dark:bg-[#002618] px-5 sm:px-6 py-4 flex items-center justify-between text-white flex-shrink-0">
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
      </div>
    </div>,
    document.body
  );
}

// ─── Modal Detalles Garantía ───────────────────────────────────────────

function GarantiaDetalleModal({ garantia, proveedores = [], onClose }) {
  const proveedorFull = proveedores.find(p => String(p.id_proveedor) === String(garantia.id_proveedor)) || garantia.proveedorObj;

  return (
 <Modal onClose={onClose} title="Detalles de Garantía" subtitle={`Garantía del bien S/N: ${garantia.bien?.num_serie || 'N/A'}`} extraWide>
 <div className="space-y-6">
 <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-700 ">
 <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">Información General</h4>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
 <div>
 <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold">Estado</p>
 <div className="mt-1"><EstatusBadge estatus={garantia.estado_garantia} /></div>
 </div>
 <div className="col-span-2 md:col-span-1">
 <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold">Proveedor</p>
 <p className="font-medium text-gray-800 dark:text-gray-200 mt-1">{proveedorFull?.nombre_proveedor || 'Sin proveedor'}</p>
 {proveedorFull?.contactos?.length > 0 && (
 <div className="mt-1 space-y-1">
 {proveedorFull.contactos.map(c => (
 <p key={c.id_contacto} className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
 <span className="font-semibold">{c.tipo_contacto}:</span> {c.contacto}
 </p>
 ))}
 </div>
 )}
 </div>
 <div>
 <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold">Fecha Inicio</p>
 <p className="font-medium text-gray-800 dark:text-gray-200 mt-1">{garantia.fecha_inicio ? formatDate(garantia.fecha_inicio) : 'N/A'}</p>
 </div>
 <div>
 <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold">Fecha Fin</p>
 <p className="font-medium text-gray-800 dark:text-gray-200 mt-1">{garantia.fecha_fin ? formatDate(garantia.fecha_fin) : 'N/A'}</p>
 </div>
 <div className="col-span-full mt-2">
 <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold">Bien Asociado</p>
 <div className="font-medium text-gray-800 dark:text-gray-200 text-sm mt-1">
 Serie: {garantia.bien?.num_serie || 'N/A'} | Inv: {garantia.bien?.num_inv || 'N/A'}
 <br />
 <span className="text-gray-500 dark:text-gray-400 ">
 {garantia.bien?.modelo?.marca?.marca} - {garantia.bien?.modelo?.descrip_disp}
 </span>
 <br />
 {garantia.bien?.modelo?.tipoDispositivo?.nombre_tipo && (
 <div className="mt-1.5 mb-1">
 <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 dark:text-blue-300 text-xs font-semibold border border-blue-100 dark:border-blue-800/50">
 <Box size={12} />
 {garantia.bien.modelo.tipoDispositivo.nombre_tipo}
 </span>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 
  <div>
    <ReportesSeccion garantia={garantia} readOnly={false} />
  </div>
 </div>
 </Modal>
 );
}

// ─── Modal Crear / Editar Garantía ────────────────────────────────────────────

function GarantiaModal({ garantia, onClose, proveedores = [] }) {
 const qc = useQueryClient();
 const { showToast } = useApp();
 const isEdit = !!garantia;

 const [form, setForm] = useState({
 id_bien: garantia?.id_bien ?? '',
 fecha_inicio: garantia?.fecha_inicio ? new Date(garantia.fecha_inicio).toISOString().split('T')[0] : '',
 fecha_fin: garantia?.fecha_fin ? new Date(garantia.fecha_fin).toISOString().split('T')[0] : '',
 id_proveedor: garantia?.id_proveedor ? parseInt(garantia.id_proveedor) : '',
 estado_garantia: garantia?.estado_garantia ?? 'VIGENTE',
 });

 const [activeTab, setActiveTab] = useState('DATOS');
 const [searchValue, setSearchValue] = useState('');
 const [selectedBien, setSelectedBien] = useState(garantia?.bien ?? null);
 const [existingGarantia, setExistingGarantia] = useState(null);
 const [isSearching, setIsSearching] = useState(false);
 const [showAddProveedorModal, setShowAddProveedorModal] = useState(false);
 const [multipleMatches, setMultipleMatches] = useState([]);
 
 const isEditMode = isEdit || !!existingGarantia;
 const currentGarantia = garantia || existingGarantia;

 const createMut = useMutation({
 mutationFn: (vars) => gqlClient.request(CREATE_GARANTIA, vars),
 onSuccess: () => {
 qc.invalidateQueries({ queryKey: ['garantias'] });
 showToast('Garantía creada exitosamente', 'success');
 onClose();
 },
 onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al crear garantía', 'error'),
 });

 const updateMut = useMutation({
 mutationFn: (vars) => gqlClient.request(UPDATE_GARANTIA, vars),
 onSuccess: () => {
 qc.invalidateQueries({ queryKey: ['garantias'] });
 showToast('Garantía actualizada', 'success');
 onClose();
 },
 onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al actualizar', 'error'),
 });

 const isLoading = createMut.isPending || updateMut.isPending;

 const handleChange = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSelectBien = (foundBien) => {
    setSelectedBien(foundBien);
    setMultipleMatches([]);
    
    const vigente = foundBien.garantias?.find(g => g.estado_garantia === 'VIGENTE') || foundBien.garantias?.[0];
    
    if (vigente) {
      setExistingGarantia({
        ...vigente,
        bien: foundBien
      });
      setForm({
        id_bien: foundBien.id_bien,
        fecha_inicio: vigente.fecha_inicio ? new Date(vigente.fecha_inicio).toISOString().split('T')[0] : '',
        fecha_fin: vigente.fecha_fin ? new Date(vigente.fecha_fin).toISOString().split('T')[0] : '',
        id_proveedor: vigente.proveedorObj?.id_proveedor || '',
        estado_garantia: vigente.estado_garantia
      });
      showToast(`Este equipo ya tiene una garantía registrada. Cambiando a modo edición...`, 'info');
    } else {
      setExistingGarantia(null);
      setForm(p => ({ ...p, id_bien: foundBien.id_bien, fecha_inicio: '', fecha_fin: '', id_proveedor: '', estado_garantia: 'VIGENTE' }));
      showToast('Bien encontrado', 'success');
    }
  };

  const handleSearchBien = async () => {
    if (!searchValue) return;
    setIsSearching(true);
    setMultipleMatches([]);
    try {
      const res = await gqlClient.request(GET_BIEN_BY_TERMINO, { termino: searchValue.trim() });
      const foundBienes = res.bienByTermino || [];

      if (foundBienes.length === 1) {
        handleSelectBien(foundBienes[0]);
      } else if (foundBienes.length > 1) {
        setMultipleMatches(foundBienes);
      } else {
        showToast('No se encontró ningún bien con ese número de serie, inventario o IP', 'error');
        setSelectedBien(null);
        setExistingGarantia(null);
        setForm(p => ({ ...p, id_bien: '' }));
      }
    } catch (err) {
      showToast('Error al buscar el bien', 'error');
    } finally {
      setIsSearching(false);
    }
  };

 const handleAutoCalc = (years) => {
 if (!form.fecha_inicio) {
 showToast('Selecciona primero la Fecha de Inicio', 'warning');
 return;
 }
 const d = new Date(form.fecha_inicio);
 d.setFullYear(d.getFullYear() + years);
 setForm(p => ({ ...p, fecha_fin: d.toISOString().split('T')[0] }));
 };

 const handleSubmit = (e) => {
 e.preventDefault();
 if (!form.id_bien) {
 showToast('El bien es obligatorio', 'warning');
 return;
 }

 if (form.fecha_inicio && form.fecha_fin) {
 const partsI = form.fecha_inicio.split('-');
 const startLocal = new Date(partsI[0], partsI[1] - 1, partsI[2]);
 const partsF = form.fecha_fin.split('-');
 const endLocal = new Date(partsF[0], partsF[1] - 1, partsF[2]);

 if (startLocal > endLocal) {
 showToast('La fecha de inicio no puede ser posterior a la fecha de fin', 'warning');
 return;
 }
 }

 let nuevoEstado = 'VIGENTE';
 if (form.fecha_fin) {
   const partsF = form.fecha_fin.split('-');
   const endLocal = new Date(partsF[0], partsF[1] - 1, partsF[2]);
   const today = new Date();
   today.setHours(0, 0, 0, 0);
   if (endLocal < today) {
     nuevoEstado = 'VENCIDA';
   }
 }

 if (isEditMode) {
    updateMut.mutate({
      id_garantia: currentGarantia.id_garantia,
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin: form.fecha_fin || null,
      id_proveedor: form.id_proveedor ? parseInt(form.id_proveedor) : null,
      estado_garantia: nuevoEstado,
    });
 } else {
 createMut.mutate({
 id_bien: form.id_bien,
 fecha_inicio: form.fecha_inicio || null,
 fecha_fin: form.fecha_fin || null,
 id_proveedor: form.id_proveedor ? parseInt(form.id_proveedor) : null,
 estado_garantia: nuevoEstado,
 });
 }
 };

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent';
 const labelCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1';

 return (
 <>
 <Modal onClose={onClose} title={isEdit ? 'Editar Garantía' : 'Registrar Garantía'} subtitle="Dar de alta una nueva garantía o póliza" extraWide>
 <div className="flex flex-col gap-5">
 
        {isEditMode && (
          <div className="flex border-b border-gray-200 dark:border-gray-700 ">
            <button 
              type="button"
              className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'DATOS' ? 'border-[#006341] text-[#006341]' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 '}`}
              onClick={() => setActiveTab('DATOS')}
            >
              Datos de Garantía
            </button>
            <button 
              type="button"
              className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'REPORTES' ? 'border-[#006341] text-[#006341]' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 '}`}
              onClick={() => setActiveTab('REPORTES')}
            >
              Bitácora de Seguimiento
            </button>
          </div>
        )}

 <div className={activeTab === 'DATOS' ? 'block space-y-5' : 'hidden'}>
 {/* Buscador de Bien (Sólo activo en creación) */}
 {!isEdit && (
 <div className="mb-5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
 <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center mb-3">
 <Box size={16} className="mr-2" />
 Asociar al Bien
 </h3>
 <div className="flex gap-2 w-full">
 <input
 type="text"
 placeholder="Buscar por No. Serie, Inventario o IP..."
 className={`${inputCls} flex-1 text-base py-3`}
 value={searchValue}
 onChange={e => setSearchValue(e.target.value)}
 onKeyDown={e => {
 if (e.key === 'Enter') {
 e.preventDefault();
 handleSearchBien();
 }
 }}
 />
 <button
 type="button"
 className="bg-green-600 text-white px-5 rounded-lg hover:bg-green-700 flex items-center justify-center transition-colors shadow-sm disabled:opacity-60 flex-shrink-0"
 onClick={handleSearchBien}
 disabled={isSearching || !searchValue}
 >
 <Search size={20} />
 </button>
 </div>
 </div>
 )}

          {selectedBien && !isEditMode && (
            <div className="mt-4 p-3 bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800/50 rounded-xl flex items-start gap-3 shadow-sm">
              <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg mt-0.5 border border-green-100 dark:border-green-800/50">
                <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                  {selectedBien.modelo?.marca?.marca} {selectedBien.modelo?.descrip_disp}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                  <span>S/N: <span className="text-gray-700 dark:text-gray-300">{selectedBien.num_serie || 'N/D'}</span></span>
                  <span>Inv: <span className="text-gray-700 dark:text-gray-300">{selectedBien.num_inv || 'N/D'}</span></span>
                  {selectedBien.especificacionTI?.dir_ip && (
                    <span className="text-blue-600 dark:text-blue-400">IP: {selectedBien.especificacionTI.dir_ip}</span>
                  )}
                </div>
              </div>
            </div>
          )}

  {isEditMode && selectedBien && (
    <div className="mb-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-xl flex items-start gap-3 shadow-sm">
      <div className="bg-gray-50 dark:bg-gray-900 p-2 rounded-lg mt-0.5 border border-gray-100 dark:border-gray-800">
        <Box size={16} className="text-gray-500 dark:text-gray-400" />
      </div>
      <div className="flex-1">
        <p className="font-bold text-gray-800 dark:text-gray-200 text-sm">
          {selectedBien.modelo?.marca?.marca} {selectedBien.modelo?.descrip_disp}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
          <span>S/N: <span className="text-gray-700 dark:text-gray-300">{selectedBien.num_serie || 'N/D'}</span></span>
          <span>Inv: <span className="text-gray-700 dark:text-gray-300">{selectedBien.num_inv || 'N/D'}</span></span>
        </div>
      </div>
    </div>
  )}

 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className={labelCls}>Fecha Inicio</label>
 <input type="date" className={inputCls} value={form.fecha_inicio} max={form.fecha_fin} onChange={e => handleChange('fecha_inicio', e.target.value)} />
 </div>
 <div>
 <label className={labelCls}>Fecha Fin</label>
 <input type="date" className={inputCls} value={form.fecha_fin} min={form.fecha_inicio} onChange={e => handleChange('fecha_fin', e.target.value)} />
 
 {/* Atajos de cálculo automático */}
 <div className="flex gap-2 mt-2">
 <button type="button" onClick={() => handleAutoCalc(1)} className="text-[10px] px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 dark:text-green-300 border border-green-200 dark:border-green-800/50 dark:border-green-800/50 rounded hover:bg-green-100 transition-colors">+1 Año</button>
 <button type="button" onClick={() => handleAutoCalc(2)} className="text-[10px] px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 dark:text-green-300 border border-green-200 dark:border-green-800/50 dark:border-green-800/50 rounded hover:bg-green-100 transition-colors">+2 Años</button>
 <button type="button" onClick={() => handleAutoCalc(3)} className="text-[10px] px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 dark:text-green-300 border border-green-200 dark:border-green-800/50 dark:border-green-800/50 rounded hover:bg-green-100 transition-colors">+3 Años</button>
 </div>
 </div>
 </div>
 <div>
 <label className={labelCls}>Proveedor</label>
 <div className="flex gap-2">
 <select
 className={`${inputCls} flex-1`}
 value={form.id_proveedor}
 onChange={e => handleChange('id_proveedor', e.target.value)}
 >
 <option value="" className="bg-white dark:bg-gray-800">-- Sin proveedor --</option>
 {proveedores.map(p => (
 <option key={p.id_proveedor} value={p.id_proveedor} className="bg-white dark:bg-gray-800">{p.nombre_proveedor}</option>
 ))}
 </select>
 <button
 type="button"
 onClick={() => setShowAddProveedorModal(true)}
 title="Agregar nuevo proveedor"
 className="px-3 py-2 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 flex items-center justify-center rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 transition-colors flex-shrink-0 bg-white dark:bg-gray-800 "
 >
 <Plus size={15} />
 </button>
 </div>
 {showAddProveedorModal && (
 <ProveedorModal
 onClose={() => setShowAddProveedorModal(false)}
 onSuccess={(newId) => handleChange('id_proveedor', newId)}
 />
 )}
 </div>
 
 <div className="flex gap-3 pt-4">
 <button type="button" onClick={onClose}
 className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 transition-colors">
 Cancelar
 </button>
 <button type="submit" disabled={isLoading || (!selectedBien && !isEdit)}
 className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-60"
 style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
 {isLoading ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Generar Garantía'}
 </button>
 </div>
 </form>
 </div>

 {isEditMode && (
 <div className={activeTab === 'REPORTES' ? 'block' : 'hidden'}>
 <ReportesSeccion garantia={currentGarantia} readOnly={false} />
 </div>
 )}
 </div>
 </Modal>

 {multipleMatches.length > 0 && (
 <Modal 
 onClose={() => setMultipleMatches([])} 
 title={`Múltiples coincidencias (${multipleMatches.length})`} 
 subtitle="Se encontraron varios bienes con el mismo identificador. Selecciona el que deseas consultar:" 
 >
 <div className="space-y-4">
 {multipleMatches.map(b => (
 <div 
 key={b.id_bien} 
 onClick={() => { 
 handleSelectBien(b);
 }} 
 className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl hover:border-green-500 hover:shadow-md cursor-pointer transition-all flex flex-col gap-3 group"
 >
 <div className="flex justify-between items-start">
 <div>
 <p className="font-bold text-gray-900 dark:text-gray-100 text-base">{b.modelo?.marca?.marca} {b.modelo?.descrip_disp || 'Dispositivo sin modelo'}</p>
 {b.modelo?.tipoDispositivo?.nombre_tipo && (
 <div className="mt-1.5">
 <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700/50">
 <Box size={12} />
 {b.modelo.tipoDispositivo.nombre_tipo}
 </span>
 </div>
 )}
 </div>
 <ChevronRight className="text-gray-300 group-hover:text-green-500 transition-colors" size={20} />
 </div>
 
 <div className="flex items-center gap-6 mt-1 text-sm text-gray-600 dark:text-gray-400 ">
 <div className="flex items-center gap-1.5">
 <Hash size={14} className="text-gray-400" />
 <span className="text-gray-500 dark:text-gray-400 ">S/N:</span> 
 <span className="font-bold text-gray-800 dark:text-gray-200 ">{b.num_serie || 'N/D'}</span>
 </div>
 <div className="flex items-center gap-1.5">
 <Tag size={14} className="text-gray-400" />
 <span className="text-gray-500 dark:text-gray-400 ">Inv:</span> 
 <span className="font-bold text-gray-800 dark:text-gray-200 ">{b.num_inv || 'N/D'}</span>
 </div>
 </div>

 {b.especificacionTI?.dir_ip && (
 <div className="mt-1">
 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 dark:text-blue-300 text-xs font-semibold rounded-lg border border-blue-100 dark:border-blue-800/50">
 <Wifi size={13} /> IP: {b.especificacionTI.dir_ip}
 </span>
 </div>
 )}
 </div>
 ))}
 </div>
 <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 text-center">
 <button 
 type="button" 
 onClick={() => setMultipleMatches([])} 
 className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 font-semibold text-sm transition-colors"
 >
 Cancelar búsqueda
 </button>
 </div>
 </Modal>
 )}
 </>
 );
}

// ─── Modal Confirmar Eliminación ──────────────────────────────────────────────

function ConfirmEliminarModal({ garantia, onClose }) {
 const qc = useQueryClient();
 const { showToast } = useApp();

 const deleteMut = useMutation({
 mutationFn: (vars) => gqlClient.request(DELETE_GARANTIA, vars),
 onSuccess: () => {
 qc.invalidateQueries({ queryKey: ['garantias'] });
 showToast('Garantía eliminada exitosamente', 'success');
 onClose();
 },
 onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al eliminar', 'error'),
 });

 return (
 <Modal onClose={onClose} title="Eliminar Registro de Garantía" subtitle="Esta acción es permanente">
 <div className="space-y-4">
 <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 dark:border-red-800/50 rounded-xl p-4 flex flex-col items-center text-center">
 <AlertCircle size={40} className="text-red-500 mb-3" />
 <h3 className="text-red-800 dark:text-red-300 font-bold mb-1">¿Estás seguro de eliminar esta garantía?</h3>
 <p className="text-sm text-red-600 dark:text-red-400 mb-2">
 Esta acción es permanente y puede afectar el seguimiento del historial para el Bien.
 </p>
 <p className="font-semibold text-gray-800 dark:text-gray-200 text-xs bg-white dark:bg-gray-800 px-3 py-1 rounded inline-block border border-red-100 dark:border-red-800/50 shadow-sm mt-2">
 ID Bien Asociado: {garantia?.bien?.num_serie || garantia?.bien?.num_inv || garantia?.id_bien}
 </p>
 </div>
 <div className="flex gap-3 mt-4">
 <button type="button" onClick={onClose} disabled={deleteMut.isPending}
 className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 transition-colors">
 Cancelar
 </button>
 <button type="button" disabled={deleteMut.isPending} onClick={() => deleteMut.mutate({ id_garantia: garantia.id_garantia })}
 className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors shadow-lg">
 {deleteMut.isPending ? 'Eliminando...' : 'Sí, Eliminar Registro'}
 </button>
 </div>
 </div>
 </Modal>
 );
}

// ─── Modal Generar Reporte Rápido ────────────────────────────────────────────

function GenerarReporteModal({ onClose }) {
  const qc = useQueryClient();
  const { showToast } = useApp();

  const [searchValue, setSearchValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [multipleMatches, setMultipleMatches] = useState([]);
  const [selectedBien, setSelectedBien] = useState(null);
  const [garantiaActiva, setGarantiaActiva] = useState(null);

  const [form, setForm] = useState({
    estatus: 'Enviado a proveedor',
    descripcion_falla: '',
    resolucion: ''
  });

  const createMut = useMutation({
    mutationFn: (vars) => gqlClient.request(CREATE_REPORTE_GARANTIA, vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['garantias'] });
      if (garantiaActiva) {
        qc.invalidateQueries({ queryKey: ['reportesGarantia', parseInt(garantiaActiva.id_garantia)] });
      }
      showToast('Reporte registrado exitosamente', 'success');
      onClose();
    },
    onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al registrar reporte', 'error')
  });

  const handleSearch = async () => {
    if (!searchValue) return;
    setIsSearching(true);
    setMultipleMatches([]);
    setSelectedBien(null);
    setGarantiaActiva(null);
    try {
      const res = await gqlClient.request(GET_BIEN_BY_TERMINO, { termino: searchValue.trim() });
      const foundBienes = res.bienByTermino || [];

      if (foundBienes.length === 1) {
        handleSelectBien(foundBienes[0]);
      } else if (foundBienes.length > 1) {
        setMultipleMatches(foundBienes);
      } else {
        showToast('No se encontró ningún bien con ese número de serie, inventario o IP', 'error');
      }
    } catch (error) {
      showToast('Error al buscar el bien', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectBien = (b) => {
    setSelectedBien(b);
    setMultipleMatches([]);
    
    const garantiaVigente = b.garantias?.find(g => g.estado_garantia === 'VIGENTE') || b.garantias?.[0];
    
    if (garantiaVigente) {
      setGarantiaActiva({
        ...garantiaVigente,
        id_bien: b.id_bien,
        bien: { num_serie: b.num_serie }
      });
      showToast('Garantía encontrada', 'success');
    } else {
      showToast('Este equipo NO tiene una garantía registrada.', 'error');
    }
  };

  const labelCls = "block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5";

  return (
    <>
    <Modal onClose={onClose} title="Generar Nuevo Reporte / Nota" subtitle="Asigna un reporte buscando el equipo" extraWide>
      <div className="space-y-6">
        
        {/* Buscador de Bien */}
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <label className={labelCls}>Buscar equipo (S/N, Inv, IP)</label>
          <div className="flex gap-2 relative">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-400" />
              </div>
              <input
                type="text"
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Ingresa número de serie, inventario o IP..."
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-[#006341] focus:ring-1 focus:ring-[#006341] bg-white dark:bg-gray-800 text-sm shadow-sm transition-all"
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              disabled={!searchValue || isSearching}
              className="px-5 bg-[#006341] hover:bg-[#004d32] text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 flex items-center gap-2 shadow-sm"
            >
              {isSearching ? <Loader2 size={16} className="animate-spin" /> : 'Buscar'}
            </button>
          </div>

          {/* Selección de múltiples coincidencias */}
          {multipleMatches.length > 0 && (
            <div className="mt-4 border border-blue-200 dark:border-blue-800/50 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-blue-50 dark:bg-blue-900/30 p-3 border-b border-blue-100 dark:border-blue-800/50 flex justify-between items-center">
                <span className="font-bold text-blue-800 dark:blue-300 text-sm">
                  Se encontraron {multipleMatches.length} equipos con esta IP. Selecciona el correcto:
                </span>
                <button 
                  type="button"
                  onClick={() => { setMultipleMatches([]); setSearchValue(''); }}
                  className="text-blue-500 hover:text-blue-700 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700 max-h-[250px] overflow-y-auto">
                {multipleMatches.map(b => (
                  <div 
                    key={b.id_bien} 
                    onClick={() => handleSelectBien(b)} 
                    className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors flex flex-col gap-1.5 group"
                  >
                    <div className="flex justify-between items-center">
                      <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                        {b.modelo?.marca?.marca} {b.modelo?.descrip_disp}
                      </p>
                      <ChevronRight className="text-gray-300 group-hover:text-blue-500 transition-colors" size={16} />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                      <span>S/N: <span className="text-gray-700 dark:text-gray-300">{b.num_serie || 'N/D'}</span></span>
                      <span>Inv: <span className="text-gray-700 dark:text-gray-300">{b.num_inv || 'N/D'}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Información del bien seleccionado */}
          {selectedBien && (
            <div className="mt-4 p-3 bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800/50 rounded-lg flex items-start gap-3">
              <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg mt-0.5 border border-green-100 dark:border-green-800/50">
                <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                  {selectedBien.modelo?.marca?.marca} {selectedBien.modelo?.descrip_disp}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                  <span>S/N: <span className="text-gray-700 dark:text-gray-300">{selectedBien.num_serie || 'N/D'}</span></span>
                  <span>Inv: <span className="text-gray-700 dark:text-gray-300">{selectedBien.num_inv || 'N/D'}</span></span>
                  {selectedBien.especificacionTI?.dir_ip && (
                    <span className="text-blue-600 dark:text-blue-400">IP: {selectedBien.especificacionTI.dir_ip}</span>
                  )}
                </div>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setSelectedBien(null);
                  setGarantiaActiva(null);
                  setSearchValue('');
                }}
                className="text-gray-400 hover:text-red-500 transition-colors"
                title="Limpiar selección"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Mensaje de error si no tiene garantía */}
          {selectedBien && !garantiaActiva && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs font-semibold rounded border border-red-200 dark:border-red-800/50 flex items-center gap-2">
              <AlertCircle size={14} />
              Este equipo no tiene ninguna garantía registrada en el sistema.
            </div>
          )}

          {/* Badge de garantía activa */}
          {selectedBien && garantiaActiva && (
             <div className={`mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border ${
               garantiaActiva.estado_garantia === 'VENCIDA' 
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400' 
                : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-400'
             }`}>
               Garantía encontrada: {garantiaActiva.estado_garantia}
             </div>
          )}
        </div>

        {/* Historial de Reportes */}
        {garantiaActiva && (
          <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-4">
            <ReportesSeccion garantia={garantiaActiva} readOnly={false} />
          </div>
        )}
      </div>
    </Modal>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Garantias() {
 const qc = useQueryClient();
 const { showToast } = useApp();
 const usuario = useAuthStore(s => s.usuario);
 const location = useLocation();
 const idRol = usuario?.id_rol ?? 3;
 const isMaestro = idRol === 1;
 const isAdministrador = idRol === 2;

 const [activeTab, setActiveTab] = useState('GARANTIAS');
  const [modalEditar, setModalEditar] = useState(null);
  const [modalEliminar, setModalEliminar] = useState(null);
  const [modalProveedor, setModalProveedor] = useState(false);
  const [modalGenerarReporte, setModalGenerarReporte] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
 const [showPorVencer, setShowPorVencer] = useState(location.state?.filterPorVencer || false);
 const [dateFilterType, setDateFilterType] = useState('NONE');
 const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [proveedorFilters, setProveedorFilters] = useState([]);
  const [tipoDispositivoFilters, setTipoDispositivoFilters] = useState([]);
  const [ultimoEstatusFilters, setUltimoEstatusFilters] = useState([]);
 
 const [showStats, setShowStats] = useState(false);
 const [showFiltersMobile, setShowFiltersMobile] = useState(false);
 const [sortConfig, setSortConfig] = useState({ key: 'bien', direction: 'asc' });

 const [modalCrear, setModalCrear] = useState(false);
 const [modalDetalles, setModalDetalles] = useState(null);
 
 const [modalEditarProveedor, setModalEditarProveedor] = useState(null);
 const [modalEliminarProveedor, setModalEliminarProveedor] = useState(null);

 const [pageInput, setPageInput] = useState('');
 const [pageInputReportes, setPageInputReportes] = useState('');

 const deleteProveedorMut = useMutation({
 mutationFn: (vars) => gqlClient.request(DELETE_PROVEEDOR, vars),
 onSuccess: (_, vars) => {
 qc.setQueryData(['proveedores'], old => {
 if (!old || !old.proveedores) return { proveedores: [] };
 return {
 ...old,
 proveedores: old.proveedores.filter(p => p.id_proveedor !== vars.id_proveedor)
 };
 });
 showToast('Proveedor eliminado exitosamente', 'success');
 setModalEliminarProveedor(null);
 },
 onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al eliminar proveedor', 'error'),
 });

 const [currentPage, setCurrentPage] = useState(1);
 const [currentPageReportes, setCurrentPageReportes] = useState(1);
 const PAGE_SIZE = 15;

 useEffect(() => {
 if (location.state?.filterPorVencer) {
 setShowPorVencer(true);
 window.history.replaceState({}, document.title);
 }
 }, [location.state]);
 
 const { data, isLoading, refetch } = useQuery({
 queryKey: ['garantias'],
 queryFn: () => gqlClient.request(GET_GARANTIAS),
 select: d => d.garantias ?? [],
 });

 const { data: proveedoresData } = useQuery({
 queryKey: ['proveedores'],
 queryFn: () => gqlClient.request(GET_PROVEEDORES),
 });

 const { data: catData } = useQuery({
    queryKey: ['marcas-tipos'],
    queryFn: () => gqlClient.request(GET_MARCAS_TIPOS_QUERY),
    staleTime: 5 * 60 * 1000
  });
  const tiposDispositivo = catData?.tiposDispositivo ?? [];
  const { data: usuarios = [] } = useUsuariosActivos();

  const proveedores = proveedoresData?.proveedores || [];

 const proveedorOptions = useMemo(() => {
 return proveedores.map(p => ({
 value: p.id_proveedor,
 label: p.nombre_proveedor
 }));
 }, [proveedores]);

 const garantias = useMemo(() => {
 return (data || []).map(g => {
 let estado = g.estado_garantia;
 if (g.fecha_fin) {
 const parts = g.fecha_fin.split('-');
 let finLocal = new Date(g.fecha_fin);
 if (parts.length >= 3) {
 finLocal = new Date(parts[0], parts[1] - 1, parts[2].substring(0,2));
 }
 const hoy = new Date();
 hoy.setHours(0,0,0,0);
 if (finLocal < hoy) {
 estado = 'VENCIDA';
 }
 }
 return { ...g, estado_garantia: estado };
 });
 }, [data]);

 const tipoDispositivoOptions = useMemo(() => {
 const types = new Set();
 garantias.forEach(g => {
 const type = g.bien?.modelo?.tipoDispositivo?.nombre_tipo;
 if (type) types.add(type);
 });
 return Array.from(types)
 .map(t => ({ value: t, label: t }))
 .sort((a, b) => a.label.localeCompare(b.label));
 }, [garantias]);

  const ultimoEstatusOptions = useMemo(() => {
    const baseList = [
      'Enviado a proveedor',
      'En revisión',
      'En reparación',
      'Esperando piezas',
      'Listo para recoger',
      'Resuelto / Entregado',
      'Rechazado'
    ];
    const statuses = new Set(baseList);
    garantias.forEach(g => {
      if (g.reportes && g.reportes.length > 0) {
        const est = g.reportes[0]?.estatus;
        if (est) statuses.add(est);
      }
    });
    return Array.from(statuses)
      .map(s => ({ value: s, label: s }))
      .sort((a, b) => {
        const idxA = baseList.indexOf(a.label);
        const idxB = baseList.indexOf(b.label);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.label.localeCompare(b.label);
      });
  }, [garantias]);

 const filteredGarantias = useMemo(() => {
 return garantias.filter(g => {
 // Status Filter
 if (statusFilter === 'VIGENTE' && g.estado_garantia !== 'VIGENTE') return false;
 if (statusFilter === 'VENCIDA' && (g.estado_garantia === 'VIGENTE' || g.estado_garantia === 'DESCONOCIDO')) return false;
 if (statusFilter === 'DESCONOCIDO' && g.estado_garantia !== 'DESCONOCIDO') return false;

 // Por Vencer Filter
 if (showPorVencer) {
 if (!g.fecha_fin || g.estado_garantia !== 'VIGENTE') return false;
 const d = new Date(g.fecha_fin);
 const now = new Date();
 const diffTime = d.getTime() - now.getTime();
 const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
 if (diffDays < 0 || diffDays > 62) return false; // 2 meses aprox
 }

 // Date Filter
 if (dateFilterType !== 'NONE') {
 let targetDate = null;
 const dateStr = dateFilterType === 'INICIO' ? g.fecha_inicio : g.fecha_fin;
 if (dateStr) {
 const parts = dateStr.split('-');
 if (parts.length >= 3) {
 targetDate = new Date(parts[0], parts[1] - 1, parts[2].substring(0,2));
 }
 }

 if (!targetDate) return false;

 if (startDate) {
 const partsS = startDate.split('-');
 const s = new Date(partsS[0], partsS[1] - 1, partsS[2]);
 if (targetDate < s) return false;
 }

 if (endDate) {
 const partsE = endDate.split('-');
 const e = new Date(partsE[0], partsE[1] - 1, partsE[2], 23, 59, 59);
 if (targetDate > e) return false;
 }
 }

 if (proveedorFilters.length > 0) {
 const gProv = String(g.id_proveedor);
 if (!proveedorFilters.some(id => String(id) === gProv)) return false;
 }
 
 if (tipoDispositivoFilters.length > 0) {
 const deviceType = String(g.bien?.modelo?.tipoDispositivo?.nombre_tipo || '');
 if (!tipoDispositivoFilters.some(t => String(t) === deviceType)) return false;
 }

 if (!searchFilter) return true;
 const term = searchFilter.toLowerCase();
 const proveedorMatch = g.proveedorObj?.nombre_proveedor?.toLowerCase().includes(term);
 const serieMatch = g.bien?.num_serie?.toLowerCase().includes(term);
 const invMatch = g.bien?.num_inv?.toLowerCase().includes(term);
 const equipoMatch = g.bien ? (`${g.bien.modelo?.marca?.marca || ''} ${g.bien.modelo?.descrip_disp || ''} ${g.bien.especificacionTI?.nombre_host || ''}`).toLowerCase().includes(term) : false;
 return proveedorMatch || serieMatch || invMatch || equipoMatch;
 });
 }, [garantias, statusFilter, showPorVencer, dateFilterType, startDate, endDate, proveedorFilters, tipoDispositivoFilters, searchFilter]);

 const sortedGarantias = useMemo(() => {
 return [...filteredGarantias].sort((a, b) => {
 if (!sortConfig.key) return 0;
 
 let aValue = '';
 let bValue = '';

 switch (sortConfig.key) {
 case 'bien':
 aValue = a.bien ? `${a.bien.modelo?.marca?.marca} ${a.bien.modelo?.descrip_disp}` : '';
 bValue = b.bien ? `${b.bien.modelo?.marca?.marca} ${b.bien.modelo?.descrip_disp}` : '';
 break;
 case 'periodo':
 aValue = a.fecha_fin || '';
 bValue = b.fecha_fin || '';
 break;
 case 'proveedor':
 aValue = a.proveedorObj?.nombre_proveedor || '';
 bValue = b.proveedorObj?.nombre_proveedor || '';
 break;
 case 'estado':
 aValue = a.estado_garantia || '';
 bValue = b.estado_garantia || '';
 break;
 default:
 break;
 }

 if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
 if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
 return 0;
 });
 }, [filteredGarantias, sortConfig]);

  const garantiasConReportes = useMemo(() => {
    return sortedGarantias.filter(g => {
      if (!g.reportes || g.reportes.length === 0) return false;
      if (activeTab === 'REPORTES' && ultimoEstatusFilters.length > 0) {
        const est = g.reportes[0]?.estatus;
        if (!ultimoEstatusFilters.includes(est)) return false;
      }
      return true;
    });
  }, [sortedGarantias, activeTab, ultimoEstatusFilters]);

 const totalPagesReportes = Math.ceil(garantiasConReportes.length / PAGE_SIZE) || 1;
 useEffect(() => {
 if (currentPageReportes > totalPagesReportes) {
 setCurrentPageReportes(1);
 }
 }, [garantiasConReportes.length, currentPageReportes, totalPagesReportes]);

 const handleNextPageReportes = () => setCurrentPageReportes(p => Math.min(totalPagesReportes, p + 1));
 const handlePrevPageReportes = () => setCurrentPageReportes(p => Math.max(1, p - 1));

 const handleJumpToPageReportes = (e) => {
 e.preventDefault();
 const p = parseInt(pageInputReportes, 10);
 if (isNaN(p) || p < 1 || p > totalPagesReportes) {
 setPageInputReportes('');
 return;
 }
 setCurrentPageReportes(p);
 setPageInputReportes('');
 };

 const paginatedReportes = garantiasConReportes.slice((currentPageReportes - 1) * PAGE_SIZE, currentPageReportes * PAGE_SIZE);


  const handleExportarExcel = () => {
    let dataToExport = [];
    let sheetName = '';
    let fileName = '';
    let colWidths = [];

    const getBitacoraGroups = (g) => {
      if (!g.reportes || g.reportes.length === 0) {
        return [{
          key: 'Sin bitácora',
          reportes: [],
          estatus: 'Sin Reportes',
          piezaNueva: 'N/A'
        }];
      }
      const groupMap = new Map();
      const sinReporte = [];
      g.reportes.forEach(rep => {
        const key = rep.numero_reporte?.trim();
        if (!key) {
          sinReporte.push(rep);
        } else {
          if (!groupMap.has(key)) {
            groupMap.set(key, { 
              key, 
              reportes: [], 
              estatus: rep.estatus || 'Sin Estatus', 
              piezaNueva: rep.serie_pieza_nueva || 'N/A' 
            });
          }
          groupMap.get(key).reportes.push(rep);
        }
      });
      const result = Array.from(groupMap.values());
      if (sinReporte.length > 0) {
        result.push({
          key: 'Sin número de reporte',
          reportes: sinReporte,
          estatus: sinReporte[0]?.estatus || 'Sin Estatus',
          piezaNueva: sinReporte[0]?.serie_pieza_nueva || 'N/A'
        });
      }
      return result;
    };

    const getNombreTipo = (r) => {
      if (r.tipoDispositivoObj?.nombre_tipo) return r.tipoDispositivoObj.nombre_tipo;
      if (r.tipo_dispositivo) {
        const match = tiposDispositivo.find(t => String(t.tipo_disp) === String(r.tipo_dispositivo) || t.nombre_tipo?.toLowerCase() === String(r.tipo_dispositivo).toLowerCase());
        if (match?.nombre_tipo) return match.nombre_tipo;
      }
      return r.tipo_dispositivo || '';
    };

    const getNombreUsuarioReporta = (r) => {
      if (r.usuarioReportaObj) {
        const nom = r.usuarioReportaObj.nombre_completo || 'Usuario';
        const mat = r.usuarioReportaObj.matricula || 'Sin matrícula';
        return `${nom} (${mat})`;
      }
      if (r.usuario_reporta) {
        const match = usuarios.find(u => String(u.id_usuario) === String(r.usuario_reporta) || String(u.matricula) === String(r.usuario_reporta) || u.nombre_completo?.toLowerCase() === String(r.usuario_reporta).toLowerCase());
        if (match) {
          const nom = match.nombre_completo || 'Usuario';
          const mat = match.matricula || 'Sin matrícula';
          return `${nom} (${mat})`;
        }
        return `${r.usuario_reporta} (Sin matrícula)`;
      }
      return '';
    };

    const formatLista = (arr) => {
      if (!arr || arr.length === 0) return 'N/A';
      if (arr.length === 1) return arr[0];
      return arr.map(item => `• ${item}`).join('\n');
    };

    if (activeTab === 'GARANTIAS') {
      filteredGarantias.forEach(g => {
        const bitacoraGroups = getBitacoraGroups(g);
        const unidadStr = g.bien?.unidad?.descripcion || g.bien?.unidad?.desc_corta || g.bien?.unidad?.clave || 'Sin unidad';

        bitacoraGroups.forEach(group => {
          const dispArr = group.reportes.length > 0
            ? [...new Set(group.reportes.map(r => getNombreTipo(r)).filter(Boolean))]
            : [g.bien?.modelo?.tipoDispositivo?.nombre_tipo || 'Desconocido'];
          const dispositivos = formatLista(dispArr);

          const userArr = group.reportes.length > 0
            ? [...new Set(group.reportes.map(r => getNombreUsuarioReporta(r)).filter(Boolean))]
            : [];
          const usuariosReporta = formatLista(userArr);

          dataToExport.push({
            'No. Reporte': group.key,
            'Tipo de dispositivo(s)': dispositivos,
            'Unidad': unidadStr,
            'Usuario(s) que Reporta(n)': usuariosReporta,
            'Descripción Equipo': g.bien ? `${g.bien.modelo?.marca?.marca} ${g.bien.modelo?.descrip_disp}` : 'N/A',
            'Número de Serie': g.bien?.num_serie || 'N/A',
            'Proveedor': g.proveedorObj?.nombre_proveedor || 'N/A',
            'Estado Garantía': g.estado_garantia,
            'Inicio Garantía': formatDate(g.fecha_inicio),
            'Fin Garantía': formatDate(g.fecha_fin),
          });
        });
      });

      colWidths = [
        { wch: 22 }, { wch: 25 }, { wch: 30 }, { wch: 35 }, { wch: 35 }, 
        { wch: 22 }, { wch: 28 }, { wch: 18 }, { wch: 15 }, { wch: 15 }
      ];
      sheetName = 'Control de Garantías';
      fileName = 'Control_Garantias.xlsx';

    } else if (activeTab === 'REPORTES') {
      garantiasConReportes.forEach(g => {
        const bitacoraGroups = getBitacoraGroups(g);
        const unidadStr = g.bien?.unidad?.descripcion || g.bien?.unidad?.desc_corta || g.bien?.unidad?.clave || 'Sin unidad';

        bitacoraGroups.forEach(group => {
          const reportesFormateados = group.reportes.length > 0
            ? group.reportes.map((r, i) => {
                let autor = 'Usuario desconocido';
                if (r.usuarioRegistra) {
                  autor = `${r.usuarioRegistra.nombre_completo} (${r.usuarioRegistra.matricula || 'Sin matrícula'})`;
                }
                const tipoStr = getNombreTipo(r);
                const reportoStr = getNombreUsuarioReporta(r);
                
                let lineas = [
                  `${i + 1}. [${r.fecha_reporte ? formatDate(r.fecha_reporte) : 'S/F'}] — Estatus: ${r.estatus || 'Sin Estatus'}`,
                  `   • Registró: ${autor}`
                ];
                if (reportoStr) lineas.push(`   • Reportó: ${reportoStr}`);
                if (tipoStr) lineas.push(`   • Equipo: ${tipoStr}`);
                if (r.serie_pieza_nueva) lineas.push(`   • Pieza Nueva: ${r.serie_pieza_nueva}`);
                lineas.push(`   • Falla: ${r.descripcion_falla || 'Sin descripción'}`);
                if (r.resolucion) lineas.push(`   • Resolución: ${r.resolucion}`);
                
                return lineas.join('\n');
              }).join('\n\n')
            : 'Sin Reportes';

          const dispArr = group.reportes.length > 0
            ? [...new Set(group.reportes.map(r => getNombreTipo(r)).filter(Boolean))]
            : [g.bien?.modelo?.tipoDispositivo?.nombre_tipo || 'Desconocido'];
          const dispositivos = formatLista(dispArr);

          const userArr = group.reportes.length > 0
            ? [...new Set(group.reportes.map(r => getNombreUsuarioReporta(r)).filter(Boolean))]
            : [];
          const usuariosReporta = formatLista(userArr);

          const atencionArr = group.reportes.length > 0
            ? [...new Set(group.reportes.map(r => r.fecha_atencion ? formatDate(r.fecha_atencion) : null).filter(Boolean))]
            : [];
          const fechasAtencion = formatLista(atencionArr);

          dataToExport.push({
            'No. Reporte': group.key,
            'Tipo de dispositivo(s)': dispositivos,
            'Unidad': unidadStr,
            'Usuario(s) que Reporta(n)': usuariosReporta,
            'Descripción Equipo': g.bien ? `${g.bien.modelo?.marca?.marca} ${g.bien.modelo?.descrip_disp}` : 'N/A',
            'Número de Serie': g.bien?.num_serie || 'N/A',
            'Proveedor': g.proveedorObj?.nombre_proveedor || 'N/A',
            'Estado Garantía': g.estado_garantia,
            'Último Estatus': group.estatus,
            'No. de Serie de Última Pieza Nueva': group.piezaNueva,
            'Fecha de Atención': fechasAtencion,
            'Inicio Garantía': formatDate(g.fecha_inicio),
            'Fin Garantía': formatDate(g.fecha_fin),
            'Reportes / Bitácora': reportesFormateados
          });
        });
      });

      colWidths = [
        { wch: 22 }, { wch: 25 }, { wch: 30 }, { wch: 35 }, { wch: 35 }, 
        { wch: 22 }, { wch: 28 }, { wch: 18 }, { wch: 22 }, { wch: 30 }, 
        { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 65 }
      ];
      sheetName = 'Reportes de Garantía';
      fileName = 'Reportes_Garantias.xlsx';
 } else {
 return; // No hay exportación para PROVEEDORES u otros tabs en este momento
 }

 const isFiltered = searchFilter || statusFilter !== 'ALL' || (proveedorFilters && proveedorFilters.length > 0) || (tipoDispositivoFilters && tipoDispositivoFilters.length > 0) || (activeTab === 'REPORTES' && ultimoEstatusFilters && ultimoEstatusFilters.length > 0) || showPorVencer || (dateFilterType !== 'NONE' && (startDate || endDate));
 const today = new Date();
 const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
 const baseName = activeTab === 'GARANTIAS' ? 'Garantias' : 'Reportes_Garantias';
 fileName = `${baseName}_${isFiltered ? 'Filtradas' : 'Completas'}_${dateStr}.xlsx`;

 let filtrosTexto = [];
 if (statusFilter !== 'ALL') filtrosTexto.push(`Estatus: ${statusFilter}`);
 if (searchFilter) filtrosTexto.push(`Búsqueda: "${searchFilter}"`);
 if (showPorVencer) filtrosTexto.push(`Filtro: Por Vencer`);
 if (proveedorFilters && proveedorFilters.length > 0) {
 const nombresProveedores = proveedorFilters.map(id => {
 const p = proveedorOptions.find(opt => opt.value === id);
 return p ? p.label : id;
 }).join(', ');
 filtrosTexto.push(`Proveedores: ${nombresProveedores}`);
 }
 if (tipoDispositivoFilters && tipoDispositivoFilters.length > 0) {
    filtrosTexto.push(`Dispositivos: ${tipoDispositivoFilters.join(', ')}`);
  }
  if (activeTab === 'REPORTES' && ultimoEstatusFilters && ultimoEstatusFilters.length > 0) {
    filtrosTexto.push(`Estatus: ${ultimoEstatusFilters.join(', ')}`);
  }
  if (dateFilterType !== 'NONE' && (startDate || endDate)) {
 const tipoFecha = dateFilterType === 'INICIO' ? 'Inicio' : 'Vencimiento';
 filtrosTexto.push(`Fecha de ${tipoFecha}: ${startDate || 'Siempre'} a ${endDate || 'Siempre'}`);
 }

 const textoFiltrosAplicados = filtrosTexto.length > 0 
 ? `Filtros aplicados ─ ${filtrosTexto.join(', ')}` 
 : `Filtros aplicados ─ Ninguno (Todos los registros)`;

 const headerRows = [
 ['SISTEMA INTEGRAL DE INFRAESTRUCTURA TECNOLOGICA — IMSS Delegación Nayarit'],
 [`Reporte de: ${activeTab === 'GARANTIAS' ? 'Control de Garantías' : 'Reportes de Garantías'} — ${textoFiltrosAplicados}`],
 [`Fecha de exportación: ${today.toLocaleString('es-MX')}`],
 [`Total de registros: ${dataToExport.length}`],
 [] // Separador
 ];

 const worksheet = XLSX.utils.aoa_to_sheet(headerRows);
 XLSX.utils.sheet_add_json(worksheet, dataToExport, { origin: 'A6' });
 worksheet['!cols'] = colWidths;

 const range = XLSX.utils.decode_range(worksheet['!ref']);
 range.s.r = 5; // Start autofilter at row 6
 worksheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

 // Aplicar estilos a todas las celdas
 for (const key in worksheet) {
 if (key[0] === '!') continue;
 const cell = worksheet[key];
 const rowNum = parseInt(key.replace(/^[A-Z]+/, ''), 10);
 
 if (rowNum <= 4) {
 cell.s = { font: { bold: true }, alignment: { vertical: 'top' } };
 } else if (rowNum === 6) {
 cell.s = { font: { bold: true }, alignment: { wrapText: true, vertical: 'top' } };
 } else {
 cell.s = { alignment: { wrapText: true, vertical: 'top' } };
 }
 }

 const workbook = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
 XLSX.writeFile(workbook, fileName);
 showToast('Exportación completada', 'success');
 };

 const totalPages = Math.ceil(sortedGarantias.length / PAGE_SIZE) || 1;
 useEffect(() => {
 if (currentPage > totalPages) {
 setCurrentPage(1);
 }
 }, [sortedGarantias.length, currentPage, totalPages]);

 const handleNextPage = () => setCurrentPage(p => Math.min(totalPages, p + 1));
 const handlePrevPage = () => setCurrentPage(p => Math.max(1, p - 1));

 const handleJumpToPage = (e) => {
 e.preventDefault();
 const p = parseInt(pageInput, 10);
 if (isNaN(p) || p < 1 || p > totalPages) {
 setPageInput('');
 return;
 }
 setCurrentPage(p);
 setPageInput('');
 };

 const paginatedGarantias = sortedGarantias.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

 const handleSort = (key) => {
 let direction = 'asc';
 if (sortConfig.key === key && sortConfig.direction === 'asc') {
 direction = 'desc';
 }
 setSortConfig({ key, direction });
 };

 const renderSortIcon = (columnKey) => {
 if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="text-gray-300 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />;
 return sortConfig.direction === 'asc' 
 ? <ChevronUp size={14} className="text-green-600 dark:text-green-400 ml-1" />
 : <ChevronDown size={14} className="text-green-600 dark:text-green-400 ml-1" />;
 };

 return (
 <div className={`p-4 sm:p-5 flex flex-col gap-4 fade-in ${
 activeTab === 'GARANTIAS' || activeTab === 'REPORTES'
 ? 'min-h-[calc(100dvh-70px)] overflow-y-auto sm:h-[calc(100vh-70px)] sm:overflow-hidden sm:min-h-0'
 : 'h-[calc(100dvh-70px)] sm:h-[calc(100vh-70px)] overflow-hidden sm:min-h-0'
 }`}>
 {/* Header */}
 <div className="flex items-center justify-between flex-wrap gap-3">
 <div>
 <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
 <ShieldCheck className="text-green-600 dark:text-green-400 mr-2" size={24} />
 Control de Garantías y Proveedores
 </h1>
 <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 pl-8">Administración de pólizas y resguardos de proveedores</p>
 </div>
 
 <div className="flex items-center gap-2">
 <button
 onClick={() => refetch()}
 title="Refrescar"
 className="w-9 h-9 rounded-xl flex items-center justify-center border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 transition-colors"
 >
 <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
 </button>

 {(activeTab === 'REPORTES' || activeTab === 'GARANTIAS') && (
 <button
 onClick={handleExportarExcel}
 className="flex items-center justify-center gap-2 p-2 sm:px-4 sm:py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all shadow-sm"
 style={{ background: 'linear-gradient(135deg, #107c41, #185c37)' }}
 title="Exportar listado actual a Excel"
 >
 <FileSpreadsheet size={16} />
 <span className="hidden sm:inline">Exportar a Excel</span>
 </button>
 )}

 {(isMaestro || isAdministrador) && activeTab === 'REPORTES' && (
   <button
     onClick={() => setModalGenerarReporte(true)}
     className="flex items-center justify-center gap-2 p-2 sm:px-4 sm:py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all shadow-sm"
     style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
     <Plus size={18} />
     <span className="hidden sm:inline">Generar Reporte</span>
   </button>
 )}

 {/* Administrador y Maestro pueden crear */}
 {(isMaestro || isAdministrador) && activeTab === 'GARANTIAS' && (
 <button
 onClick={() => setModalCrear(true)}
 className="flex items-center justify-center gap-2 p-2 sm:px-4 sm:py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all shadow-sm"
 style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
 <Plus size={18} />
 <span className="hidden sm:inline">Agregar Garantía</span>
 </button>
 )}
 {(isMaestro || isAdministrador) && activeTab === 'PROVEEDORES' && (
 <button
 onClick={() => setModalProveedor(true)}
 className="flex items-center justify-center gap-2 p-2 sm:px-4 sm:py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all shadow-sm"
 style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
 <Building size={16} />
 <span className="hidden sm:inline">Nuevo Proveedor</span>
 </button>
 )}
 </div>
 </div>

 {/* Tabs */}
 <div className="flex space-x-1 sm:space-x-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto whitespace-nowrap scrollbar-hide pb-1">
 <button
 onClick={() => setActiveTab('GARANTIAS')}
 className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex-shrink-0 ${activeTab === 'GARANTIAS' ? 'border-green-600 text-green-600 dark:text-green-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 hover:border-gray-300 '}`}
 >
 Control de Garantías
 </button>
 <button
 onClick={() => setActiveTab('PROVEEDORES')}
 className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex-shrink-0 ${activeTab === 'PROVEEDORES' ? 'border-green-600 text-green-600 dark:text-green-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 hover:border-gray-300 '}`}
 >
 Directorio de Proveedores
 </button>
 <button
 onClick={() => setActiveTab('REPORTES')}
 className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex-shrink-0 ${activeTab === 'REPORTES' ? 'border-green-600 text-green-600 dark:text-green-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 hover:border-gray-300 '}`}
 >
 Reportes de Garantías
 </button>
 </div>

 {/* Stats Cards */}
 {activeTab === 'GARANTIAS' && showStats && (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 fade-in">
 <div 
 onClick={() => setStatusFilter('ALL')}
 className={`rounded-2xl p-5 border shadow-sm flex items-center justify-between cursor-pointer transition-all ${statusFilter === 'ALL' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50 dark:border-blue-800/50 ring-2 ring-blue-500/20' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-800 hover:border-blue-200'}`}
 >
 <div>
 <p className={`text-xs font-semibold uppercase tracking-wide ${statusFilter === 'ALL' ? 'text-blue-700 dark:text-blue-400 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 '}`}>Total de Garantías</p>
 <h3 className={`text-2xl font-black mt-1 ${statusFilter === 'ALL' ? 'text-blue-900 dark:text-blue-300' : 'text-gray-900 dark:text-gray-100 '}`}>{garantias.length}</h3>
 </div>
 <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-colors ${statusFilter === 'ALL' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 dark:text-blue-300' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'}`}>
 <ShieldCheck />
 </div>
 </div>
 <div 
 onClick={() => setStatusFilter(statusFilter === 'VIGENTE' ? 'ALL' : 'VIGENTE')}
 className={`rounded-2xl p-5 border shadow-sm flex items-center justify-between cursor-pointer transition-all ${statusFilter === 'VIGENTE' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 ring-2 ring-emerald-500/20' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-800 hover:border-emerald-200'}`}
 >
 <div>
 <p className={`text-xs font-semibold uppercase tracking-wide ${statusFilter === 'VIGENTE' ? 'text-emerald-700' : 'text-emerald-600 dark:text-emerald-400'}`}>Vigentes</p>
 <h3 className={`text-2xl font-black mt-1 text-emerald-900`}>
 {garantias.filter(g => g.estado_garantia === 'VIGENTE').length}
 </h3>
 </div>
 <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-colors ${statusFilter === 'VIGENTE' ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'}`}>
 <CalendarClock />
 </div>
 </div>
 <div 
 onClick={() => setStatusFilter(statusFilter === 'VENCIDA' ? 'ALL' : 'VENCIDA')}
 className={`rounded-2xl p-5 border shadow-sm flex items-center justify-between cursor-pointer transition-all ${statusFilter === 'VENCIDA' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 dark:border-red-800/50 ring-2 ring-red-500/20' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-800 hover:border-red-200'}`}
 >
 <div>
 <p className={`text-xs font-semibold uppercase tracking-wide ${statusFilter === 'VENCIDA' ? 'text-red-700 dark:text-red-400 dark:text-red-300' : 'text-red-500'}`}>Vencidas / Anuladas</p>
 <h3 className={`text-2xl font-black mt-1 text-red-900`}>
 {garantias.filter(g => g.estado_garantia !== 'VIGENTE' && g.estado_garantia !== 'DESCONOCIDO').length}
 </h3>
 </div>
 <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-colors ${statusFilter === 'VENCIDA' ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 dark:text-red-300' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
 <AlertCircle />
 </div>
 </div>
 <div 
 onClick={() => setStatusFilter(statusFilter === 'DESCONOCIDO' ? 'ALL' : 'DESCONOCIDO')}
 className={`rounded-2xl p-5 border shadow-sm flex items-center justify-between cursor-pointer transition-all ${statusFilter === 'DESCONOCIDO' ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-300 dark:border-slate-600/50 ring-2 ring-slate-500/20' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-800 hover:border-slate-300 dark:border-slate-600/50'}`}
 >
 <div>
 <p className={`text-xs font-semibold uppercase tracking-wide ${statusFilter === 'DESCONOCIDO' ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500'}`}>Desconocidas</p>
 <h3 className={`text-2xl font-black mt-1 text-slate-900 dark:text-slate-100`}>
 {garantias.filter(g => g.estado_garantia === 'DESCONOCIDO').length}
 </h3>
 </div>
 <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-colors ${statusFilter === 'DESCONOCIDO' ? 'bg-slate-200 text-slate-700 dark:text-slate-300' : 'bg-slate-50 dark:bg-slate-900/20 text-slate-600 dark:text-slate-400'}`}>
 <Box />
 </div>
 </div>
 </div>
 )}

 {/* Control Actions & Search */}
 {(activeTab === 'GARANTIAS' || activeTab === 'REPORTES') && (
 <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 sm:p-4 border border-gray-100 dark:border-gray-800 shadow-sm relative z-20 mt-2">
 <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
 <div className="flex gap-2 w-full sm:w-auto sm:flex-1">
 <div className="relative flex-1">
 <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
 <input
 type="text"
 placeholder="Buscar por equipo, host, serie, inventario o proveedor..."
 value={searchFilter}
 onChange={e => setSearchFilter(e.target.value)}
 className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
 />
 </div>
 {/* Filter Toggle Mobile */}
 <button 
 onClick={() => setShowFiltersMobile(!showFiltersMobile)}
 className={`sm:hidden flex items-center justify-center p-2 border rounded-lg transition-colors ${showFiltersMobile ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50 dark:border-green-800/50 text-green-600 dark:text-green-400' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 '}`}
 title="Mostrar filtros avanzados"
 >
 <Filter size={16} />
 </button>
 </div>
 
 <div className="flex gap-2">
 {activeTab === 'GARANTIAS' && (
 <button
 onClick={() => setShowStats(!showStats)}
 className={`flex items-center justify-center flex-1 sm:flex-none gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border transition-all whitespace-nowrap ${showStats ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50 dark:border-blue-800/50 text-blue-700 dark:text-blue-400 dark:text-blue-300' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 '}`}
 title="Mostrar u ocultar panel de estadísticas"
 >
 <BarChart2 size={14} className={showStats ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400 "} />
 <span className="inline">{showStats ? 'Ocultar Resumen' : 'Ver Resumen'}</span>
 </button>
 )}

 {activeTab === 'GARANTIAS' && (
 <button
 onClick={() => setShowPorVencer(!showPorVencer)}
 className={`flex items-center justify-center flex-1 sm:flex-none gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border transition-all whitespace-nowrap ${showPorVencer ? 'bg-amber-100 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50 dark:border-amber-800/50 text-amber-800 shadow-sm' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 '}`}
 title="Filtrar garantías por vencer (próximos 2 meses)"
 >
 <AlertCircle size={14} className={showPorVencer ? "text-amber-600 dark:text-amber-400" : "text-amber-500"} />
 <span className="inline">{showPorVencer ? 'Por Vencer (Activos)' : 'Por Vencer'}</span>
 </button>
 )}
 </div>
 </div>
 
 {/* Filtros avanzados (Fecha y Proveedor) */}
 <div className={`${showFiltersMobile ? 'flex' : 'hidden'} sm:flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex-wrap`}>
    
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto flex-wrap">
      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
        <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-wide uppercase flex items-center gap-1"><Filter size={12} className="text-gray-400" /> Proveedor:</span>
        <div className="w-full sm:w-[180px]">
          <MultiSelect
            options={proveedorOptions}
            selectedValues={proveedorFilters}
            onChange={setProveedorFilters}
            placeholder="Todos"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
        <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-wide uppercase flex items-center gap-1"><Filter size={12} className="text-gray-400" /> Dispositivo:</span>
        <div className="w-full sm:w-[170px]">
          <MultiSelect
            options={tipoDispositivoOptions}
            selectedValues={tipoDispositivoFilters}
            onChange={setTipoDispositivoFilters}
            placeholder="Todos"
          />
        </div>
      </div>

      {activeTab === 'REPORTES' && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-wide uppercase flex items-center gap-1"><Filter size={12} className="text-gray-400" /> Estatus:</span>
          <div className="w-full sm:w-[190px]">
            <MultiSelect
              options={ultimoEstatusOptions}
              selectedValues={ultimoEstatusFilters}
              onChange={setUltimoEstatusFilters}
              placeholder="Todos"
            />
          </div>
        </div>
      )}
    </div>

 <div className="hidden sm:block w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>

 <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto mt-1 sm:mt-0">
 <select
 value={dateFilterType}
 onChange={(e) => setDateFilterType(e.target.value)}
 className="border border-gray-300 dark:border-gray-600 sm:border-2 sm:border-blue-500 rounded-lg px-3 py-1.5 text-sm focus:outline-none bg-white dark:bg-gray-800 font-medium text-gray-700 dark:text-gray-300 appearance-none pr-8 cursor-pointer w-full sm:w-auto"
 style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%233b82f6\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")', backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.2em 1.2em' }}
 >
 <option value="NONE">Sin filtro de fecha</option>
 <option value="INICIO">Fecha de Inicio</option>
 <option value="FIN">Fecha de Vencimiento</option>
 </select>
 
 {dateFilterType !== 'NONE' && (
 <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
 <input 
 type="date" 
 value={startDate} 
 onChange={e => setStartDate(e.target.value)} 
 className="flex-1 sm:flex-none border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-800 " 
 />
 <span className="text-gray-400 text-xs font-medium">a</span>
 <input 
 type="date" 
 value={endDate} 
 onChange={e => setEndDate(e.target.value)} 
 className="flex-1 sm:flex-none border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-800 " 
 />
 </div>
 )}
 </div>
 </div>
 </div>
 )}

 {/* Table Data Garantias */}
 {activeTab === 'GARANTIAS' && (
 <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col mt-4 mb-8 sm:mb-0 sm:flex-1 sm:min-h-0">
 {isLoading ? (
 <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
 <Loader2 size={22} className="animate-spin" />
 <span className="text-sm">Consultando el historial de garantías...</span>
 </div>
 ) : filteredGarantias.length === 0 ? (
 <div className="text-center py-14 text-gray-400 text-sm">
 <Box size={32} className="mx-auto mb-2 opacity-30" />
 No se encontraron registros de garantías con los filtros aplicados.
 </div>
 ) : (
 <div className="w-full overflow-x-auto sm:flex-1 sm:min-h-0 sm:overflow-y-auto relative">
 <table className="w-full text-sm text-left whitespace-nowrap" style={{ minWidth: '700px' }}>
 <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-sm">
 <tr>
 <th 
 className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group select-none"
 onClick={() => handleSort('bien')}
 >
 <div className="flex items-center">Equipo Asociado {renderSortIcon('bien')}</div>
 </th>
 <th 
 className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group select-none"
 onClick={() => handleSort('periodo')}
 >
 <div className="flex items-center">Periodo de Cobertura {renderSortIcon('periodo')}</div>
 </th>
 <th 
 className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group select-none"
 onClick={() => handleSort('proveedor')}
 >
 <div className="flex items-center">Proveedor {renderSortIcon('proveedor')}</div>
 </th>
 <th 
 className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group select-none"
 onClick={() => handleSort('estado')}
 >
 <div className="flex items-center">Estado {renderSortIcon('estado')}</div>
 </th>
 {(isMaestro || isAdministrador) && (
 <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Acciones</th>
 )}
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
 {paginatedGarantias.map(garantia => (
 <tr 
 key={garantia.id_garantia} 
 className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50/80 dark:hover:bg-gray-700/80 transition-colors cursor-pointer"
 onClick={(e) => {
 if (!e.target.closest('button')) {
 setModalDetalles(garantia);
 }
 }}
 >
 <td className="px-4 py-3.5 relative">
 <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
 {highlightText(garantia.bien ? (garantia.bien.modelo?.marca?.marca + " " + garantia.bien.modelo?.descrip_disp) : 'Bien Extraviado/No Asignado', searchFilter)}
 </p>
 <div className="flex items-center flex-wrap gap-1.5 mt-1">
 {garantia.bien?.modelo?.tipoDispositivo?.nombre_tipo && (
 <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 text-[11px] font-semibold border border-slate-200 dark:border-slate-700/50">
 <Box size={10} />
 {garantia.bien.modelo.tipoDispositivo.nombre_tipo}
 </span>
 )}
 <span className="font-mono text-[11px] bg-gray-50 dark:bg-gray-900 px-1.5 py-0.5 rounded border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 inline-flex items-center">
 <span className="mr-1 text-gray-400">S/N:</span>
 <span className="font-semibold text-gray-700 dark:text-gray-300 ">{highlightText(garantia.bien?.num_serie || 'N/A', searchFilter)}</span>
 </span>
 </div>
 </td>
 <td className="px-4 py-3.5">
 <div className="flex flex-col text-xs text-gray-600 dark:text-gray-400 gap-1">
 <span className="flex items-center"><span className="w-12 text-gray-400 font-semibold">Inicio:</span> 
 {formatDate(garantia.fecha_inicio)}
 </span>
 <span className="flex items-center"><span className="w-12 text-gray-400 font-semibold">Fin:</span> 
 <span className="font-semibold text-gray-800 dark:text-gray-200 ">{formatDate(garantia.fecha_fin)}</span>
 </span>
 </div>
 </td>
 <td className="px-4 py-3.5 text-xs text-gray-600 dark:text-gray-400 ">
 {highlightText(garantia.proveedorObj?.nombre_proveedor || '--', searchFilter)}
 </td>
 <td className="px-4 py-3.5">
 <EstatusBadge estatus={garantia.estado_garantia} />
 </td>
 {(isMaestro || isAdministrador) && (
 <td className="px-4 py-3.5">
 <div className="flex items-center gap-1.5">
 <button
 onClick={() => setModalEditar(garantia)}
 className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition-colors"
 title="Editar"
 >
 <Edit size={14} />
 </button>
 {/* Sólo el Maestro puede eliminar */}
 {isMaestro && (
 <button
 onClick={() => setModalEliminar(garantia)}
 className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 transition-colors"
 title="Eliminar permanentemente"
 >
 <Trash2 size={14} />
 </button>
 )}
 </div>
 </td>
 )}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}

 {/* Paginación */}
 {!isLoading && filteredGarantias.length > 0 && (
 <div className="p-3 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-2 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
 {/* Info total */}
 <div className="flex items-center justify-between text-xs">
 <span className="font-semibold text-gray-700 dark:text-gray-300 ">
 Total: {filteredGarantias.length} registros.
 </span>
 <span className="font-bold text-gray-400 uppercase tracking-wider">
 Pág. {currentPage}/{totalPages}
 </span>
 </div>

 {/* Botones de paginación */}
 <div className="flex items-center gap-2 justify-center flex-wrap">
 <button
 onClick={handlePrevPage}
 disabled={currentPage === 1}
 className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors flex-shrink-0"
 title="Página anterior"
 >
 <ChevronLeft size={15} />
 </button>

 <div className="flex items-center justify-center gap-1 sm:gap-2 w-full sm:w-[260px] order-last sm:order-none mt-2 sm:mt-0">
 {/* Páginas: anterior, actual, siguiente */}
 {currentPage > 2 && (
 <button
 onClick={() => setCurrentPage(1)}
 className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 flex-shrink-0"
 >
 1
 </button>
 )}
 {currentPage > 3 && (
 <span className="px-1 text-gray-400 text-xs">...</span>
 )}
 {currentPage > 1 && (
 <button
 onClick={handlePrevPage}
 className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 flex-shrink-0"
 >
 {currentPage - 1}
 </button>
 )}
 <button
 className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-[#006341] text-white shadow-sm flex-shrink-0"
 >
 {currentPage}
 </button>
 {currentPage < totalPages && (
 <button
 onClick={handleNextPage}
 className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 flex-shrink-0"
 >
 {currentPage + 1}
 </button>
 )}
 {currentPage < totalPages - 2 && (
 <span className="px-1 text-gray-400 text-xs">...</span>
 )}
 {currentPage < totalPages - 1 && totalPages > 1 && (
 <button
 onClick={() => setCurrentPage(totalPages)}
 className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 flex-shrink-0"
 >
 {totalPages}
 </button>
 )}
 </div>

 <button
 onClick={handleNextPage}
 disabled={currentPage === totalPages}
 className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors flex-shrink-0"
 title="Página siguiente"
 >
 <ChevronRight size={15} />
 </button>

 {/* Ir a página */}
 <form onSubmit={handleJumpToPage} className="flex items-center gap-1 ml-1 border-l border-gray-200 dark:border-gray-700 pl-2">
 <input
 type="number"
 min="1"
 max={totalPages}
 value={pageInput}
 onChange={(e) => setPageInput(e.target.value)}
 placeholder="Ir a..."
 title={`Ingresa un número entre 1 y ${totalPages}`}
 className="w-14 px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-[#006341] focus:ring-1 focus:ring-[#006341] bg-white dark:bg-gray-800 text-center"
 />
 <button
 type="submit"
 disabled={!pageInput}
 className="px-2 py-1.5 bg-[#006341]/10 text-[#006341] font-semibold text-xs rounded-lg hover:bg-[#006341]/20 disabled:opacity-50 transition-colors"
 >
 Ir
 </button>
 </form>
 </div>
 </div>
 )}
 </div>
 )}

 {/* Table Data Reportes */}
 {activeTab === 'REPORTES' && (
 <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col mt-4 mb-8 sm:mb-0 sm:flex-1 sm:min-h-0">
 {isLoading ? (
 <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
 <Loader2 size={22} className="animate-spin" />
 <span className="text-sm">Consultando el historial de reportes...</span>
 </div>
 ) : garantiasConReportes.length === 0 ? (
 <div className="text-center py-14 text-gray-400 text-sm">
 <Box size={32} className="mx-auto mb-2 opacity-30" />
 No se encontraron garantías con reportes registrados con los filtros aplicados.
 </div>
 ) : (
 <div className="w-full overflow-x-auto sm:flex-1 sm:min-h-0 sm:overflow-y-auto relative">
 <table className="w-full text-sm text-left whitespace-nowrap" style={{ minWidth: '700px' }}>
 <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50/80 dark:bg-gray-900/20 sticky top-0 z-10 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 ">
 <tr>
 <th className="px-5 py-4 font-bold tracking-wider">Equipo / Bien</th>
 <th className="px-5 py-4 font-bold tracking-wider">Proveedor</th>
 <th className="px-5 py-4 font-bold tracking-wider">Último Estatus</th>
 <th className="px-5 py-4 font-bold tracking-wider">No. Reporte (Ult.)</th>
 <th className="px-5 py-4 font-bold tracking-wider">Fecha Reporte (Ult.)</th>
 <th className="px-5 py-4 font-bold tracking-wider">Falla Reportada (Ult.)</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
 {paginatedReportes.map(garantia => {
 const ultimoReporte = garantia.reportes && garantia.reportes.length > 0 ? garantia.reportes[0] : null;

 return (
 <tr 
 key={garantia.id_garantia} 
 className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group cursor-pointer"
 onClick={() => setModalDetalles(garantia)}
 title="Haz clic para ver los detalles de la garantía"
 >
 <td className="px-5 py-4">
 <div className="flex flex-col">
 <span className="font-bold text-gray-900 dark:text-gray-100 ">
 {highlightText(garantia.bien ? `${garantia.bien.modelo?.marca?.marca} ${garantia.bien.modelo?.descrip_disp}` : 'Equipo no especificado', searchFilter)}
 </span>
 <div className="flex items-center flex-wrap gap-1.5 mt-1">
 {garantia.bien?.modelo?.tipoDispositivo?.nombre_tipo && (
 <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-[11px] font-semibold border border-slate-200 dark:border-slate-700/50">
 <Box size={10} />
 {garantia.bien.modelo.tipoDispositivo.nombre_tipo}
 </span>
 )}
 <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">SN: {highlightText(garantia.bien?.num_serie || 'N/A', searchFilter)}</span>
 </div>
 </div>
 </td>
 <td className="px-5 py-4">
 <div className="flex items-center gap-2">
 <Building size={14} className="text-gray-400" />
 <span className="font-medium text-gray-700 dark:text-gray-300 ">{garantia.proveedorObj?.nombre_proveedor ? highlightText(garantia.proveedorObj.nombre_proveedor, searchFilter) : <span className="text-gray-400 italic">No asignado</span>}</span>
 </div>
 </td>
 <td className="px-5 py-4">
 {ultimoReporte ? (
 <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border
 ${ultimoReporte.estatus === 'EN TRAMITE' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 dark:text-amber-300 border-amber-200 dark:border-amber-800/50 dark:border-amber-800/50' : 
 ultimoReporte.estatus === 'RESOLUCION' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 dark:text-blue-300 border-blue-200 dark:border-blue-800/50 dark:border-blue-800/50' : 
 ultimoReporte.estatus === 'CERRADO' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 border-emerald-200' : 
 'bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 '}
 `}>
 <span className={`w-1.5 h-1.5 rounded-full ${ultimoReporte.estatus === 'EN TRAMITE' ? 'bg-amber-500' : ultimoReporte.estatus === 'RESOLUCION' ? 'bg-blue-500' : ultimoReporte.estatus === 'CERRADO' ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
 {ultimoReporte.estatus}
 </span>
 ) : (
 <span className="text-gray-400 text-xs italic">Sin datos</span>
 )}
 </td>
 <td className="px-5 py-4">
 {ultimoReporte && ultimoReporte.numero_reporte ? (
 <span className="font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">
 {highlightText(ultimoReporte.numero_reporte, searchFilter)}
 </span>
 ) : (
 <span className="text-gray-400 text-xs italic">N/A</span>
 )}
 </td>
 <td className="px-5 py-4">
 {ultimoReporte ? (
 <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 ">
 <CalendarClock size={14} className="text-gray-400" />
 <span className="font-medium">{formatDate(ultimoReporte.fecha_reporte)}</span>
 </div>
 ) : (
 <span className="text-gray-400 text-xs">N/A</span>
 )}
 </td>
 <td className="px-5 py-4">
 {ultimoReporte ? (
 <span className="text-gray-600 dark:text-gray-400 truncate max-w-[200px] inline-block" title={ultimoReporte.descripcion_falla}>
 {ultimoReporte.descripcion_falla}
 </span>
 ) : (
 <span className="text-gray-400 text-xs">N/A</span>
 )}
 </td>
 </tr>
 )})}
 </tbody>
 </table>
 </div>
 )}

 {/* Paginación Reportes */}
 {!isLoading && garantiasConReportes.length > 0 && (
 <div className="p-3 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-2 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
 {/* Info total */}
 <div className="flex items-center justify-between text-xs">
 <span className="font-semibold text-gray-700 dark:text-gray-300 ">
 Total: {garantiasConReportes.length} registros.
 </span>
 <span className="font-bold text-gray-400 uppercase tracking-wider">
 Pág. {currentPageReportes}/{totalPagesReportes}
 </span>
 </div>

 {/* Botones de paginación */}
 <div className="flex items-center gap-2 justify-center flex-wrap">
 <button
 onClick={handlePrevPageReportes}
 disabled={currentPageReportes === 1}
 className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors flex-shrink-0"
 title="Página anterior"
 >
 <ChevronLeft size={15} />
 </button>

 <div className="flex items-center justify-center gap-1 sm:gap-2 w-full sm:w-[260px] order-last sm:order-none mt-2 sm:mt-0">
 {/* Páginas: anterior, actual, siguiente */}
 {currentPageReportes > 2 && (
 <button
 onClick={() => setCurrentPageReportes(1)}
 className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 flex-shrink-0"
 >
 1
 </button>
 )}
 {currentPageReportes > 3 && (
 <span className="px-1 text-gray-400 text-xs">...</span>
 )}
 {currentPageReportes > 1 && (
 <button
 onClick={handlePrevPageReportes}
 className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 flex-shrink-0"
 >
 {currentPageReportes - 1}
 </button>
 )}
 <button
 className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-[#006341] text-white shadow-sm flex-shrink-0"
 >
 {currentPageReportes}
 </button>
 {currentPageReportes < totalPagesReportes && (
 <button
 onClick={handleNextPageReportes}
 className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 flex-shrink-0"
 >
 {currentPageReportes + 1}
 </button>
 )}
 {currentPageReportes < totalPagesReportes - 2 && (
 <span className="px-1 text-gray-400 text-xs">...</span>
 )}
 {currentPageReportes < totalPagesReportes - 1 && totalPagesReportes > 1 && (
 <button
 onClick={() => setCurrentPageReportes(totalPagesReportes)}
 className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 flex-shrink-0"
 >
 {totalPagesReportes}
 </button>
 )}
 </div>

 <button
 onClick={handleNextPageReportes}
 disabled={currentPageReportes === totalPagesReportes}
 className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors flex-shrink-0"
 title="Página siguiente"
 >
 <ChevronRight size={15} />
 </button>

 {/* Ir a página */}
 <form onSubmit={handleJumpToPageReportes} className="flex items-center gap-1 ml-1 border-l border-gray-200 dark:border-gray-700 pl-2">
 <input
 type="number"
 min="1"
 max={totalPagesReportes}
 value={pageInputReportes}
 onChange={(e) => setPageInputReportes(e.target.value)}
 placeholder="Ir a..."
 title={`Ingresa un número entre 1 y ${totalPagesReportes}`}
 className="w-14 px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-[#006341] focus:ring-1 focus:ring-[#006341] bg-white dark:bg-gray-800 text-center"
 />
 <button
 type="submit"
 disabled={!pageInputReportes}
 className="px-2 py-1.5 bg-[#006341]/10 text-[#006341] font-semibold text-xs rounded-lg hover:bg-[#006341]/20 disabled:opacity-50 transition-colors"
 >
 Ir
 </button>
 </form>
 </div>
 </div>
 )}
 </div>
 )}

 {activeTab === 'PROVEEDORES' && (
 <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col p-4">
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto content-start">
 {proveedores.map(prov => (
 <div key={prov.id_proveedor} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col hover:shadow-md transition-shadow">
 <div className="flex justify-between items-start mb-3">
 <div className="flex items-center gap-2">
 <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 dark:text-green-300 flex items-center justify-center">
 <Building size={20} />
 </div>
 <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base leading-tight">{prov.nombre_proveedor}</h3>
 </div>
 {(isMaestro || isAdministrador) && (
 <div className="flex gap-1">
 <button 
 onClick={() => setModalEditarProveedor(prov)}
 className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
 title="Editar Proveedor"
 >
 <Edit size={16} />
 </button>
 {isMaestro && (
 <button 
 onClick={() => setModalEliminarProveedor(prov)}
 className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
 title="Eliminar Proveedor"
 >
 <Trash2 size={16} />
 </button>
 )}
 </div>
 )}
 </div>

 <div className="space-y-2 mt-2">
 {prov.contactos && prov.contactos.length > 0 ? (
 prov.contactos.map((c, idx) => (
 <div key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400 ">
 {c.tipo_contacto === 'Teléfono' && <Phone size={14} className="mt-0.5 text-gray-400 shrink-0" />}
 {c.tipo_contacto === 'Correo' && <Mail size={14} className="mt-0.5 text-gray-400 shrink-0" />}
 {c.tipo_contacto === 'Dirección' && <MapPin size={14} className="mt-0.5 text-gray-400 shrink-0" />}
 {(c.tipo_contacto === 'Nombre de Contacto' || c.tipo_contacto === 'Otro') && <User size={14} className="mt-0.5 text-gray-400 shrink-0" />}
 <span className="break-all"><strong className="text-gray-500 dark:text-gray-400 font-medium">{c.tipo_contacto}:</strong> {c.contacto}</span>
 </div>
 ))
 ) : (
 <p className="text-xs text-gray-400 italic">Sin contactos registrados.</p>
 )}
 </div>
 </div>
 ))}
 {proveedores.length === 0 && (
 <div className="col-span-full py-10 text-center text-gray-400">
 <Building size={32} className="mx-auto mb-2 opacity-30" />
 No hay proveedores registrados.
 </div>
 )}
 </div>
 </div>
 )}

 {modalCrear && <GarantiaModal onClose={() => setModalCrear(false)} proveedores={proveedores} />}
 {modalEditar && <GarantiaModal garantia={modalEditar} onClose={() => setModalEditar(null)} proveedores={proveedores} />}
 {modalEliminar && <ConfirmEliminarModal garantia={modalEliminar} onClose={() => setModalEliminar(null)} />}
 {modalDetalles && <GarantiaDetalleModal garantia={filteredGarantias.find(g => g.id_garantia === modalDetalles.id_garantia) || modalDetalles} proveedores={proveedores} onClose={() => setModalDetalles(null)} />}
 
 {modalProveedor && <ProveedorModal onClose={() => setModalProveedor(false)} />}
 {modalEditarProveedor && <ProveedorModal proveedor={modalEditarProveedor} onClose={() => setModalEditarProveedor(null)} />}
 {modalEliminarProveedor && (
 <Modal onClose={() => setModalEliminarProveedor(null)} title="Eliminar Proveedor" subtitle="Esta acción es permanente">
 <div className="space-y-4">
 <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 dark:border-red-800/50 rounded-xl p-4 flex flex-col items-center text-center">
 <AlertCircle size={40} className="text-red-500 mb-3" />
 <h3 className="text-red-800 dark:text-red-300 font-bold mb-1">¿Estás seguro de eliminar este proveedor?</h3>
 <p className="text-sm text-red-600 dark:text-red-400 mb-2">
 Si el proveedor está vinculado a garantías existentes, no podrás eliminarlo.
 </p>
 <p className="font-semibold text-gray-800 dark:text-gray-200 text-xs bg-white dark:bg-gray-800 px-3 py-1 rounded inline-block border border-red-100 dark:border-red-800/50 shadow-sm mt-2">
 Proveedor: {modalEliminarProveedor.nombre_proveedor}
 </p>
 </div>
 <div className="flex gap-3 mt-4">
 <button type="button" onClick={() => setModalEliminarProveedor(null)} disabled={deleteProveedorMut.isPending}
 className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 transition-colors">
 Cancelar
 </button>
 <button type="button" disabled={deleteProveedorMut.isPending} onClick={() => deleteProveedorMut.mutate({ id_proveedor: modalEliminarProveedor.id_proveedor })}
 className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors shadow-lg">
 {deleteProveedorMut.isPending ? 'Eliminando...' : 'Sí, Eliminar Proveedor'}
 </button>
 </div>
 </div>
 </Modal>
 )}
 {modalGenerarReporte && <GenerarReporteModal onClose={() => setModalGenerarReporte(false)} />}
 </div>
 );
}
