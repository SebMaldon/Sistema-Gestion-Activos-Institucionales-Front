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
} from '../api/garantias.queries';
import {
  ShieldCheck, Plus, Search, Edit, Trash2, X, RefreshCw, AlertCircle, Info, CalendarClock, Box, Loader2, Wifi, Tag, Hash, ChevronRight, Building, Phone, Mail, User, MapPin, BarChart2, ArrowUpDown, ChevronUp, ChevronDown, Filter, ChevronLeft, FileText, Download
} from 'lucide-react';
import { formatDate } from '../lib/utils';
import ProveedorModal from '../components/ProveedorModal';
import ReportesSeccion from '../components/ReportesSeccion';
import MultiSelect from '../components/MultiSelect';
import * as XLSX from 'xlsx';

// ─── Componentes reusables de vista ──────────────────────────────────────────

function EstatusBadge({ estatus }) {
  const map = {
    'VIGENTE': { bg: '#dcfce7', color: '#15803d', label: 'Vigente' },
    'VENCIDA': { bg: '#fee2e2', color: '#b91c1c', label: 'Vencida' },
    'DESCONOCIDO': { bg: '#f1f5f9', color: '#64748b', label: 'Desconocido' },
  };
  const s = map[estatus] ?? { bg: '#f3f4f6', color: '#374151', label: estatus };
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function Modal({ onClose, title, subtitle, children, wide = false, small = false }) {
  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50 pointer-events-none" />
      <div className={`relative bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100vh-4rem)] ${small ? 'max-w-sm' : wide ? 'max-w-3xl' : 'max-w-lg'}`}>
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
      </div>
    </div>,
    document.body
  );
}

// ─── Modal Detalles Garantía ───────────────────────────────────────────

function GarantiaDetalleModal({ garantia, proveedores = [], onClose }) {
  const proveedorFull = proveedores.find(p => String(p.id_proveedor) === String(garantia.id_proveedor)) || garantia.proveedorObj;

  return (
    <Modal onClose={onClose} title="Detalles de Garantía" subtitle={`Garantía del bien S/N: ${garantia.bien?.num_serie || 'N/A'}`} wide>
      <div className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
          <h4 className="font-bold text-gray-700 mb-3 border-b border-gray-200 pb-2">Información General</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs font-semibold">Estado</p>
              <div className="mt-1"><EstatusBadge estatus={garantia.estado_garantia} /></div>
            </div>
            <div className="col-span-2 md:col-span-1">
              <p className="text-gray-500 text-xs font-semibold">Proveedor</p>
              <p className="font-medium text-gray-800 mt-1">{proveedorFull?.nombre_proveedor || 'Sin proveedor'}</p>
              {proveedorFull?.contactos?.length > 0 && (
                <div className="mt-1 space-y-1">
                  {proveedorFull.contactos.map(c => (
                    <p key={c.id_contacto} className="text-xs text-gray-500 flex items-center gap-1">
                      <span className="font-semibold">{c.tipo_contacto}:</span> {c.contacto}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="text-gray-500 text-xs font-semibold">Fecha Inicio</p>
              <p className="font-medium text-gray-800 mt-1">{garantia.fecha_inicio ? formatDate(garantia.fecha_inicio) : 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs font-semibold">Fecha Fin</p>
              <p className="font-medium text-gray-800 mt-1">{garantia.fecha_fin ? formatDate(garantia.fecha_fin) : 'N/A'}</p>
            </div>
            <div className="col-span-full mt-2">
               <p className="text-gray-500 text-xs font-semibold">Bien Asociado</p>
               <p className="font-medium text-gray-800 text-sm mt-1">
                  Serie: {garantia.bien?.num_serie || 'N/A'} | Inv: {garantia.bien?.num_inv || 'N/A'}
                  <br />
                  <span className="text-gray-500">
                    {garantia.bien?.modelo?.marca?.marca} - {garantia.bien?.modelo?.descrip_disp}
                  </span>
                  <br />
                  {garantia.bien?.modelo?.tipoDispositivo?.nombre_tipo && (
                    <div className="mt-1.5 mb-1">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
                        <Box size={12} />
                        {garantia.bien.modelo.tipoDispositivo.nombre_tipo}
                      </span>
                    </div>
                  )}
               </p>
            </div>
          </div>
        </div>
        
        <div>
          <ReportesSeccion garantia={garantia} readOnly={true} />
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
  const [isSearching, setIsSearching] = useState(false);
  const [showAddProveedorModal, setShowAddProveedorModal] = useState(false);
  const [multipleMatches, setMultipleMatches] = useState([]);

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

  const handleSearchBien = async () => {
    if (!searchValue) return;
    setIsSearching(true);
    setMultipleMatches([]);
    try {
      const res = await gqlClient.request(GET_BIEN_BY_TERMINO, { termino: searchValue.trim() });
      const foundBienes = res.bienByTermino || [];

      if (foundBienes.length === 1) {
        const foundBien = foundBienes[0];
        setSelectedBien(foundBien);
        setForm(p => ({ ...p, id_bien: foundBien.id_bien }));
        showToast('Bien encontrado', 'success');
      } else if (foundBienes.length > 1) {
        setMultipleMatches(foundBienes);
      } else {
        showToast('No se encontró ningún bien con ese número de serie, inventario o IP', 'error');
        setSelectedBien(null);
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

    if (isEdit) {
      updateMut.mutate({
        id_garantia: garantia.id_garantia,
        fecha_inicio: form.fecha_inicio || null,
        fecha_fin: form.fecha_fin || null,
        id_proveedor: form.id_proveedor ? parseInt(form.id_proveedor) : null,
        estado_garantia: 'VIGENTE',
      });
    } else {
      createMut.mutate({
        id_bien: form.id_bien,
        fecha_inicio: form.fecha_inicio || null,
        fecha_fin: form.fecha_fin || null,
        id_proveedor: form.id_proveedor ? parseInt(form.id_proveedor) : null,
        estado_garantia: 'VIGENTE',
      });
    }
  };

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

  return (
    <>
      <Modal onClose={onClose} title={isEdit ? 'Editar Garantía' : 'Registrar Garantía'} subtitle="Dar de alta una nueva garantía o póliza" wide={isEdit}>
        <div className="flex flex-col gap-5">
        
        {isEdit && (
          <div className="flex border-b border-gray-200">
            <button 
              type="button"
              className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'DATOS' ? 'border-[#006341] text-[#006341]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('DATOS')}
            >
              Datos de Garantía
            </button>
            <button 
              type="button"
              className={`px-4 py-2 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'REPORTES' ? 'border-[#006341] text-[#006341]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('REPORTES')}
            >
              Bitácora de Seguimiento
            </button>
          </div>
        )}

        <div className={activeTab === 'DATOS' ? 'block space-y-5' : 'hidden'}>
        {/* Buscador de Bien (Sólo activo en creación) */}
        {!isEdit && (
          <div className="mb-5 bg-gray-50 border border-gray-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-gray-700 flex items-center mb-3">
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
            {selectedBien && (
              <div className="mt-3 bg-green-50 border border-green-200 p-3 rounded-lg flex items-center text-sm">
                <Info size={18} className="text-green-600 mr-2" />
                <div>
                  <p className="font-semibold text-green-900">Bien seleccionado:</p>
                  <p className="text-green-800 text-xs">
                    Serie: {selectedBien.num_serie || 'N/A'} | Inv: {selectedBien.num_inv || 'N/A'} <br/>
                    {selectedBien.modelo?.marca?.marca} - {selectedBien.modelo?.descrip_disp} <br/>
                    {selectedBien.modelo?.tipoDispositivo?.nombre_tipo && (
                      <div className="mt-1.5">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white text-green-700 text-xs font-semibold border border-green-200 shadow-sm">
                          <Box size={12} />
                          {selectedBien.modelo.tipoDispositivo.nombre_tipo}
                        </span>
                      </div>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {isEdit && selectedBien && (
           <div className="mb-5 bg-gray-50 border border-gray-200 p-3 rounded-xl flex items-center text-sm">
            <Box size={18} className="text-gray-500 mr-2 flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-900">Bien Asociado:</p>
              <p className="text-gray-600 text-xs">
                    Serie: {selectedBien.num_serie || 'N/A'} | Inv: {selectedBien.num_inv || 'N/A'}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Fecha Inicio</label>
              <input type="date" className={inputCls} value={form.fecha_inicio} onChange={e => handleChange('fecha_inicio', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Fecha Fin</label>
              <input type="date" className={inputCls} value={form.fecha_fin} onChange={e => handleChange('fecha_fin', e.target.value)} />
              
              {/* Atajos de cálculo automático */}
              <div className="flex gap-2 mt-2">
                 <button type="button" onClick={() => handleAutoCalc(1)} className="text-[10px] px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 transition-colors">+1 Año</button>
                 <button type="button" onClick={() => handleAutoCalc(2)} className="text-[10px] px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 transition-colors">+2 Años</button>
                 <button type="button" onClick={() => handleAutoCalc(3)} className="text-[10px] px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 transition-colors">+3 Años</button>
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
                <option value="">-- Sin proveedor --</option>
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
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
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

        {isEdit && (
           <div className={activeTab === 'REPORTES' ? 'block' : 'hidden'}>
             <ReportesSeccion garantia={garantia} readOnly={false} />
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
                setSelectedBien(b); 
                setForm(p => ({ ...p, id_bien: b.id_bien })); 
                setMultipleMatches([]); 
                showToast('Bien seleccionado', 'success');
              }} 
              className="p-4 bg-white border border-gray-200 rounded-2xl hover:border-green-500 hover:shadow-md cursor-pointer transition-all flex flex-col gap-3 group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-gray-900 text-base">{b.modelo?.marca?.marca} {b.modelo?.descrip_disp || 'Dispositivo sin modelo'}</p>
                  {b.modelo?.tipoDispositivo?.nombre_tipo && (
                    <div className="mt-1.5">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                        <Box size={12} />
                        {b.modelo.tipoDispositivo.nombre_tipo}
                      </span>
                    </div>
                  )}
                </div>
                <ChevronRight className="text-gray-300 group-hover:text-green-500 transition-colors" size={20} />
              </div>
              
              <div className="flex items-center gap-6 mt-1 text-sm text-gray-600">
                 <div className="flex items-center gap-1.5">
                   <Hash size={14} className="text-gray-400" />
                   <span className="text-gray-500">S/N:</span> 
                   <span className="font-bold text-gray-800">{b.num_serie || 'N/D'}</span>
                 </div>
                 <div className="flex items-center gap-1.5">
                   <Tag size={14} className="text-gray-400" />
                   <span className="text-gray-500">Inv:</span> 
                   <span className="font-bold text-gray-800">{b.num_inv || 'N/D'}</span>
                 </div>
              </div>

              {b.especificacionTI?.dir_ip && (
                 <div className="mt-1">
                   <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg border border-blue-100">
                     <Wifi size={13} /> IP: {b.especificacionTI.dir_ip}
                   </span>
                 </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-5 pt-4 border-t border-gray-100 text-center">
          <button 
            type="button" 
            onClick={() => setMultipleMatches([])} 
            className="text-gray-500 hover:text-gray-700 font-semibold text-sm transition-colors"
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
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col items-center text-center">
            <AlertCircle size={40} className="text-red-500 mb-3" />
            <h3 className="text-red-800 font-bold mb-1">¿Estás seguro de eliminar esta garantía?</h3>
            <p className="text-sm text-red-600 mb-2">
                Esta acción es permanente y puede afectar el seguimiento del historial para el Bien.
            </p>
            <p className="font-semibold text-gray-800 text-xs bg-white px-3 py-1 rounded inline-block border border-red-100 shadow-sm mt-2">
                ID Bien Asociado: {garantia?.bien?.num_serie || garantia?.bien?.num_inv || garantia?.id_bien}
            </p>
        </div>
        <div className="flex gap-3 mt-4">
            <button type="button" onClick={onClose} disabled={deleteMut.isPending}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Garantias() {
  const usuario = useAuthStore(s => s.usuario);
  const location = useLocation();
  const idRol = usuario?.id_rol ?? 3;
  const isMaestro = idRol === 1;
  const isAdministrador = idRol === 2;

  const [activeTab, setActiveTab] = useState('GARANTIAS');
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showPorVencer, setShowPorVencer] = useState(location.state?.filterPorVencer || false);
  const [dateFilterType, setDateFilterType] = useState('NONE');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [proveedorFilters, setProveedorFilters] = useState([]);
  const [tipoDispositivoFilters, setTipoDispositivoFilters] = useState([]);
  
  const [showStats, setShowStats] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'bien', direction: 'asc' });

  const [modalCrear, setModalCrear] = useState(false);
  const [modalEditar, setModalEditar] = useState(null);
  const [modalEliminar, setModalEliminar] = useState(null);
  const [modalDetalles, setModalDetalles] = useState(null);
  
  const [modalProveedor, setModalProveedor] = useState(false);
  const [modalEditarProveedor, setModalEditarProveedor] = useState(null);
  const [modalEliminarProveedor, setModalEliminarProveedor] = useState(null);

  const [pageInput, setPageInput] = useState('');

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
    select: d => d.proveedores ?? [],
  });

  const proveedores = proveedoresData || [];

  const proveedorOptions = useMemo(() => {
    return proveedores.map(p => ({
      value: p.id_proveedor,
      label: p.nombre_proveedor
    }));
  }, [proveedores]);

  const garantias = (data || []).map(g => {
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

  const filteredGarantias = garantias.filter(g => {
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
    return proveedorMatch || serieMatch || invMatch;
  });

  const sortedGarantias = [...filteredGarantias].sort((a, b) => {
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

  const garantiasConReportes = useMemo(() => {
    return sortedGarantias.filter(g => g.reportes && g.reportes.length > 0);
  }, [sortedGarantias]);

  const handleExportarExcel = () => {
    const dataToExport = garantiasConReportes.map(g => {
      let ultimoReporte = null;
      if (g.reportes && g.reportes.length > 0) {
        ultimoReporte = g.reportes[0];
      }

      return {
        'ID Garantía': g.id_garantia,
        'Equipo (Tipo)': g.bien ? `${g.bien.modelo?.tipoDispositivo?.nombre_tipo || 'Desconocido'}` : 'N/A',
        'Descripción Equipo': g.bien ? `${g.bien.modelo?.marca?.marca} ${g.bien.modelo?.descrip_disp}` : 'N/A',
        'Número de Serie': g.bien?.num_serie || 'N/A',
        'Proveedor': g.proveedorObj?.nombre_proveedor || 'N/A',
        'Estado Garantía': g.estado_garantia,
        'Inicio Garantía': formatDate(g.fecha_inicio),
        'Fin Garantía': formatDate(g.fecha_fin),
        'Último Estatus Reporte': ultimoReporte ? ultimoReporte.estatus : 'Sin Reportes',
        'Fecha Último Reporte': ultimoReporte ? formatDate(ultimoReporte.fecha_reporte) : 'N/A',
        'Falla Reportada': ultimoReporte ? ultimoReporte.descripcion_falla : 'N/A'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reportes de Garantía');
    XLSX.writeFile(workbook, 'Reportes_Garantias.xlsx');
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
      ? <ChevronUp size={14} className="text-green-600 ml-1" />
      : <ChevronDown size={14} className="text-green-600 ml-1" />;
  };

  return (
    <div className="h-full flex flex-col p-4 sm:p-5 space-y-4 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
            <ShieldCheck className="text-green-600 mr-2" size={24} />
            Control de Garantías y Proveedores
          </h1>
          <p className="text-sm text-gray-500 mt-1 pl-8">Administración de pólizas y resguardos de proveedores</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            title="Refrescar"
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
          {/* Administrador y Maestro pueden crear */}
          {(isMaestro || isAdministrador) && activeTab === 'GARANTIAS' && (
            <button
              onClick={() => setModalCrear(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all shadow-sm"
              style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
              <Plus size={16} />
              <span className="hidden sm:inline">Agregar Garantía</span>
            </button>
          )}
          {(isMaestro || isAdministrador) && activeTab === 'PROVEEDORES' && (
            <button
              onClick={() => setModalProveedor(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all shadow-sm"
              style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
              <Building size={16} />
              <span className="hidden sm:inline">Nuevo Proveedor</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('GARANTIAS')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'GARANTIAS' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          Control de Garantías
        </button>
        <button
          onClick={() => setActiveTab('PROVEEDORES')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'PROVEEDORES' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          Directorio de Proveedores
        </button>
        <button
          onClick={() => setActiveTab('REPORTES')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'REPORTES' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          Reportes de Garantías
        </button>
      </div>

      {/* Stats Cards */}
      {activeTab === 'GARANTIAS' && showStats && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 fade-in">
          <div 
            onClick={() => setStatusFilter('ALL')}
            className={`rounded-2xl p-5 border shadow-sm flex items-center justify-between cursor-pointer transition-all ${statusFilter === 'ALL' ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500/20' : 'bg-white border-gray-100 hover:border-blue-200'}`}
          >
              <div>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${statusFilter === 'ALL' ? 'text-blue-700' : 'text-gray-500'}`}>Total de Garantías</p>
                  <h3 className={`text-2xl font-black mt-1 ${statusFilter === 'ALL' ? 'text-blue-900' : 'text-gray-900'}`}>{garantias.length}</h3>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-colors ${statusFilter === 'ALL' ? 'bg-blue-100 text-blue-700' : 'bg-blue-50 text-blue-600'}`}>
                 <ShieldCheck />
              </div>
          </div>
          <div 
            onClick={() => setStatusFilter(statusFilter === 'VIGENTE' ? 'ALL' : 'VIGENTE')}
            className={`rounded-2xl p-5 border shadow-sm flex items-center justify-between cursor-pointer transition-all ${statusFilter === 'VIGENTE' ? 'bg-emerald-50 border-emerald-200 ring-2 ring-emerald-500/20' : 'bg-white border-gray-100 hover:border-emerald-200'}`}
          >
              <div>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${statusFilter === 'VIGENTE' ? 'text-emerald-700' : 'text-emerald-600'}`}>Vigentes</p>
                  <h3 className={`text-2xl font-black mt-1 text-emerald-900`}>
                    {garantias.filter(g => g.estado_garantia === 'VIGENTE').length}
                  </h3>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-colors ${statusFilter === 'VIGENTE' ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-50 text-emerald-600'}`}>
                 <CalendarClock />
              </div>
          </div>
          <div 
            onClick={() => setStatusFilter(statusFilter === 'VENCIDA' ? 'ALL' : 'VENCIDA')}
            className={`rounded-2xl p-5 border shadow-sm flex items-center justify-between cursor-pointer transition-all ${statusFilter === 'VENCIDA' ? 'bg-red-50 border-red-200 ring-2 ring-red-500/20' : 'bg-white border-gray-100 hover:border-red-200'}`}
          >
              <div>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${statusFilter === 'VENCIDA' ? 'text-red-700' : 'text-red-500'}`}>Vencidas / Anuladas</p>
                  <h3 className={`text-2xl font-black mt-1 text-red-900`}>
                    {garantias.filter(g => g.estado_garantia !== 'VIGENTE' && g.estado_garantia !== 'DESCONOCIDO').length}
                  </h3>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-colors ${statusFilter === 'VENCIDA' ? 'bg-red-100 text-red-700' : 'bg-red-50 text-red-600'}`}>
                 <AlertCircle />
              </div>
          </div>
          <div 
            onClick={() => setStatusFilter(statusFilter === 'DESCONOCIDO' ? 'ALL' : 'DESCONOCIDO')}
            className={`rounded-2xl p-5 border shadow-sm flex items-center justify-between cursor-pointer transition-all ${statusFilter === 'DESCONOCIDO' ? 'bg-slate-100 border-slate-300 ring-2 ring-slate-500/20' : 'bg-white border-gray-100 hover:border-slate-300'}`}
          >
              <div>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${statusFilter === 'DESCONOCIDO' ? 'text-slate-700' : 'text-slate-500'}`}>Desconocidas</p>
                  <h3 className={`text-2xl font-black mt-1 text-slate-900`}>
                    {garantias.filter(g => g.estado_garantia === 'DESCONOCIDO').length}
                  </h3>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-colors ${statusFilter === 'DESCONOCIDO' ? 'bg-slate-200 text-slate-700' : 'bg-slate-50 text-slate-600'}`}>
                 <Box />
              </div>
          </div>
          </div>
      )}

      {/* Control Actions & Search */}
      {(activeTab === 'GARANTIAS' || activeTab === 'REPORTES') && (
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm relative z-20 mt-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por equipo, proveedor o número de serie..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div className="flex gap-2">
            {activeTab === 'GARANTIAS' && (
              <button
                onClick={() => setShowStats(!showStats)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border transition-all whitespace-nowrap ${showStats ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              title="Mostrar u ocultar panel de estadísticas"
            >
              <BarChart2 size={14} className={showStats ? "text-blue-600" : "text-gray-500"} />
              <span className="hidden sm:inline">{showStats ? 'Ocultar Resumen' : 'Ver Resumen'}</span>
            </button>
            )}
            
            {activeTab === 'REPORTES' && (
              <button
                onClick={handleExportarExcel}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border transition-all whitespace-nowrap bg-green-50 border-green-200 text-green-700 hover:bg-green-100 shadow-sm`}
                title="Exportar listado actual a Excel"
              >
                <Download size={14} className="text-green-600" />
                <span className="hidden sm:inline">Exportar a Excel</span>
              </button>
            )}

            {activeTab === 'GARANTIAS' && (
            <button
              onClick={() => setShowPorVencer(!showPorVencer)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border transition-all whitespace-nowrap ${showPorVencer ? 'bg-amber-100 border-amber-200 text-amber-800 shadow-sm' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              title="Filtrar garantías por vencer (próximos 2 meses)"
            >
              <AlertCircle size={14} className={showPorVencer ? "text-amber-600" : "text-amber-500"} />
              <span className="hidden sm:inline">{showPorVencer ? 'Por Vencer (Activo)' : 'Por Vencer'}</span>
            </button>
            )}
          </div>
        </div>
        
        {/* Filtros avanzados (Fecha y Proveedor) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-4 pt-4 border-t border-gray-100">
          
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-gray-400" />
              <span className="text-xs font-bold text-gray-500 tracking-wide uppercase whitespace-nowrap">Proveedor:</span>
              <div className="w-[200px]">
                <MultiSelect
                  options={proveedorOptions}
                  selectedValues={proveedorFilters}
                  onChange={setProveedorFilters}
                  placeholder="Todos los proveedores"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter size={14} className="text-gray-400" />
              <span className="text-xs font-bold text-gray-500 tracking-wide uppercase whitespace-nowrap">Dispositivo:</span>
              <div className="w-[180px]">
                <MultiSelect
                  options={tipoDispositivoOptions}
                  selectedValues={tipoDispositivoFilters}
                  onChange={setTipoDispositivoFilters}
                  placeholder="Todos los tipos"
                />
              </div>
            </div>
          </div>

          <div className="hidden sm:block w-px h-6 bg-gray-200 mx-2"></div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={dateFilterType}
              onChange={(e) => setDateFilterType(e.target.value)}
              className="border-2 border-blue-500 rounded-lg px-3 py-1.5 text-sm focus:outline-none bg-white font-medium text-gray-700 appearance-none pr-8 cursor-pointer"
              style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%233b82f6\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")', backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.2em 1.2em' }}
            >
              <option value="NONE">Sin filtro de fecha</option>
              <option value="INICIO">Fecha de Inicio</option>
              <option value="FIN">Fecha de Vencimiento</option>
            </select>
            
            {dateFilterType !== 'NONE' && (
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)} 
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" 
                />
                <span className="text-gray-400 text-sm font-medium">hasta</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)} 
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" 
                />
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Table Data Garantias */}
      {activeTab === 'GARANTIAS' && (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col mt-4">
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
          <div className="flex-1 overflow-auto relative">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-100 shadow-sm">
                <tr>
                  <th 
                    className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100 transition-colors group select-none"
                    onClick={() => handleSort('bien')}
                  >
                    <div className="flex items-center">Equipo Asociado {renderSortIcon('bien')}</div>
                  </th>
                  <th 
                    className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100 transition-colors group select-none"
                    onClick={() => handleSort('periodo')}
                  >
                    <div className="flex items-center">Periodo de Cobertura {renderSortIcon('periodo')}</div>
                  </th>
                  <th 
                    className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100 transition-colors group select-none"
                    onClick={() => handleSort('proveedor')}
                  >
                    <div className="flex items-center">Proveedor {renderSortIcon('proveedor')}</div>
                  </th>
                  <th 
                    className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100 transition-colors group select-none"
                    onClick={() => handleSort('estado')}
                  >
                    <div className="flex items-center">Estado {renderSortIcon('estado')}</div>
                  </th>
                  {(isMaestro || isAdministrador) && (
                      <th className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedGarantias.map(garantia => (
                  <tr 
                    key={garantia.id_garantia} 
                    className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors cursor-pointer"
                    onClick={(e) => {
                      if (!e.target.closest('button')) {
                        setModalDetalles(garantia);
                      }
                    }}
                  >
                    <td className="px-4 py-3.5 relative">
                      <p className="font-semibold text-gray-900 text-sm">
                        {garantia.bien ? (garantia.bien.modelo?.marca?.marca + " " + garantia.bien.modelo?.descrip_disp) : 'Bien Extraviado/No Asignado'}
                      </p>
                      <div className="flex items-center flex-wrap gap-1.5 mt-1">
                        {garantia.bien?.modelo?.tipoDispositivo?.nombre_tipo && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                            <Box size={10} />
                            {garantia.bien.modelo.tipoDispositivo.nombre_tipo}
                          </span>
                        )}
                        <span className="font-mono text-[11px] bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 text-gray-600 inline-flex items-center">
                          <span className="mr-1 text-gray-400">S/N:</span>
                          <span className="font-semibold text-gray-700">{garantia.bien?.num_serie || 'N/A'}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col text-xs text-gray-600 gap-1">
                          <span className="flex items-center"><span className="w-12 text-gray-400 font-semibold">Inicio:</span> 
                            {formatDate(garantia.fecha_inicio)}
                          </span>
                          <span className="flex items-center"><span className="w-12 text-gray-400 font-semibold">Fin:</span> 
                            <span className="font-semibold text-gray-800">{formatDate(garantia.fecha_fin)}</span>
                          </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-600">
                        {garantia.proveedorObj?.nombre_proveedor || '--'}
                    </td>
                    <td className="px-4 py-3.5">
                        <EstatusBadge estatus={garantia.estado_garantia} />
                    </td>
                    {(isMaestro || isAdministrador) && (
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setModalEditar(garantia)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                              title="Editar"
                            >
                              <Edit size={14} />
                            </button>
                            {/* Sólo el Maestro puede eliminar */}
                            {isMaestro && (
                                <button
                                    onClick={() => setModalEliminar(garantia)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
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
          <div className="p-3 border-t border-gray-100 flex flex-col gap-2 bg-gray-50 flex-shrink-0">
            {/* Info total */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-700">
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
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors flex-shrink-0"
                title="Página anterior"
              >
                <ChevronLeft size={15} />
              </button>

              <div className="flex items-center justify-center gap-1 sm:gap-2 w-full sm:w-[260px] order-last sm:order-none mt-2 sm:mt-0">
                {/* Páginas: anterior, actual, siguiente */}
                {currentPage > 2 && (
                <button
                  onClick={() => setCurrentPage(1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 flex-shrink-0"
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
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 flex-shrink-0"
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
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 flex-shrink-0"
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
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 flex-shrink-0"
                >
                  {totalPages}
                </button>
              )}
              </div>

              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors flex-shrink-0"
                title="Página siguiente"
              >
                <ChevronRight size={15} />
              </button>

              {/* Ir a página */}
              <form onSubmit={handleJumpToPage} className="flex items-center gap-1 ml-1 border-l border-gray-200 pl-2">
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  placeholder="Ir a..."
                  title={`Ingresa un número entre 1 y ${totalPages}`}
                  className="w-14 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#006341] focus:ring-1 focus:ring-[#006341] bg-white text-center"
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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col mt-4">
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
          <div className="flex-1 overflow-auto relative">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 sticky top-0 z-10 backdrop-blur-sm border-b border-gray-200">
                <tr>
                  <th className="px-5 py-4 font-bold tracking-wider">Equipo / Bien</th>
                  <th className="px-5 py-4 font-bold tracking-wider">Proveedor</th>
                  <th className="px-5 py-4 font-bold tracking-wider">Último Estatus</th>
                  <th className="px-5 py-4 font-bold tracking-wider">Fecha Reporte</th>
                  <th className="px-5 py-4 font-bold tracking-wider">Falla Reportada</th>
                  <th className="px-5 py-4 font-bold tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {garantiasConReportes.map(garantia => {
                  const ultimoReporte = garantia.reportes && garantia.reportes.length > 0 ? garantia.reportes[0] : null;

                  return (
                  <tr key={garantia.id_garantia} className="hover:bg-blue-50/50 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">
                          {garantia.bien ? `${garantia.bien.modelo?.marca?.marca} ${garantia.bien.modelo?.descrip_disp}` : 'Equipo no especificado'}
                        </span>
                        <div className="flex items-center flex-wrap gap-1.5 mt-1">
                          {garantia.bien?.modelo?.tipoDispositivo?.nombre_tipo && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-semibold border border-slate-200">
                              <Box size={10} />
                              {garantia.bien.modelo.tipoDispositivo.nombre_tipo}
                            </span>
                          )}
                          <span className="text-xs text-gray-500 font-medium">SN: {garantia.bien?.num_serie || 'N/A'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Building size={14} className="text-gray-400" />
                        <span className="font-medium text-gray-700">{garantia.proveedorObj?.nombre_proveedor || <span className="text-gray-400 italic">No asignado</span>}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {ultimoReporte ? (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border
                          ${ultimoReporte.estatus === 'EN TRAMITE' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                            ultimoReporte.estatus === 'RESOLUCION' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                            ultimoReporte.estatus === 'CERRADO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                            'bg-gray-50 text-gray-700 border-gray-200'}
                        `}>
                          <span className={`w-1.5 h-1.5 rounded-full ${ultimoReporte.estatus === 'EN TRAMITE' ? 'bg-amber-500' : ultimoReporte.estatus === 'RESOLUCION' ? 'bg-blue-500' : ultimoReporte.estatus === 'CERRADO' ? 'bg-emerald-500' : 'bg-gray-500'}`}></span>
                          {ultimoReporte.estatus}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs italic">Sin datos</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {ultimoReporte ? (
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <CalendarClock size={14} className="text-gray-400" />
                          <span className="font-medium">{formatDate(ultimoReporte.fecha_reporte)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">N/A</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {ultimoReporte ? (
                        <span className="text-gray-600 truncate max-w-[200px] inline-block" title={ultimoReporte.descripcion_falla}>
                          {ultimoReporte.descripcion_falla}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">N/A</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setModalDetalles(garantia);
                          }}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver todos los detalles y reportes de la garantía"
                        >
                          <Info size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {activeTab === 'PROVEEDORES' && (
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto content-start">
            {proveedores.map(prov => (
              <div key={prov.id_proveedor} className="border border-gray-200 rounded-xl p-4 flex flex-col hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-green-50 text-green-700 flex items-center justify-center">
                      <Building size={20} />
                    </div>
                    <h3 className="font-bold text-gray-900 text-base leading-tight">{prov.nombre_proveedor}</h3>
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
                      <div key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                        {c.tipo_contacto === 'Teléfono' && <Phone size={14} className="mt-0.5 text-gray-400 shrink-0" />}
                        {c.tipo_contacto === 'Correo' && <Mail size={14} className="mt-0.5 text-gray-400 shrink-0" />}
                        {c.tipo_contacto === 'Dirección' && <MapPin size={14} className="mt-0.5 text-gray-400 shrink-0" />}
                        {(c.tipo_contacto === 'Nombre de Contacto' || c.tipo_contacto === 'Otro') && <User size={14} className="mt-0.5 text-gray-400 shrink-0" />}
                        <span className="break-all"><strong className="text-gray-500 font-medium">{c.tipo_contacto}:</strong> {c.contacto}</span>
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
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col items-center text-center">
                <AlertCircle size={40} className="text-red-500 mb-3" />
                <h3 className="text-red-800 font-bold mb-1">¿Estás seguro de eliminar este proveedor?</h3>
                <p className="text-sm text-red-600 mb-2">
                    Si el proveedor está vinculado a garantías existentes, no podrás eliminarlo.
                </p>
                <p className="font-semibold text-gray-800 text-xs bg-white px-3 py-1 rounded inline-block border border-red-100 shadow-sm mt-2">
                    Proveedor: {modalEliminarProveedor.nombre_proveedor}
                </p>
            </div>
            <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setModalEliminarProveedor(null)} disabled={deleteProveedorMut.isPending}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
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
    </div>
  );
}
