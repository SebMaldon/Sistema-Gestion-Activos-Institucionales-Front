import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { useApp } from '../context/AppContext';
import { useAuthStore } from '../store/auth.store';
import {
  GET_GARANTIAS,
  CREATE_GARANTIA,
  UPDATE_GARANTIA,
  DELETE_GARANTIA,
  GET_BIEN_BY_SERIE,
  GET_BIEN_BY_INV,
} from '../api/garantias.queries';
import {
  ShieldCheck, Plus, Search, Edit, Trash2, X, RefreshCw, AlertCircle, Info, CalendarClock, Box
} from 'lucide-react';

// ─── Componentes reusables de vista ──────────────────────────────────────────

function ModalOverlay({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }) {
  return (
    <div className="flex items-center justify-between p-5 border-b border-gray-100">
      <h2 className="font-bold text-gray-900 text-lg">{title}</h2>
      <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
        <X size={18} />
      </button>
    </div>
  );
}

// ─── Modal Crear / Editar Garantía ────────────────────────────────────────────

function GarantiaModal({ garantia, onClose, uniqueProveedores = [] }) {
  const qc = useQueryClient();
  const { showToast } = useApp();
  const isEdit = !!garantia;

  const [form, setForm] = useState({
    id_bien: garantia?.id_bien ?? '',
    fecha_inicio: garantia?.fecha_inicio ? new Date(garantia.fecha_inicio).toISOString().split('T')[0] : '',
    fecha_fin: garantia?.fecha_fin ? new Date(garantia.fecha_fin).toISOString().split('T')[0] : '',
    proveedor: garantia?.proveedor ?? '',
    estado_garantia: garantia?.estado_garantia ?? 'VIGENTE',
  });

  const [searchValue, setSearchValue] = useState('');
  const [selectedBien, setSelectedBien] = useState(garantia?.bien ?? null);
  const [isSearching, setIsSearching] = useState(false);

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
    try {
      const [resSerie, resInv] = await Promise.allSettled([
        gqlClient.request(GET_BIEN_BY_SERIE, { num_serie: searchValue }),
        gqlClient.request(GET_BIEN_BY_INV, { num_inv: searchValue })
      ]);

      const bienSerie = resSerie.status === 'fulfilled' ? resSerie.value.bienByNumSerie : null;
      const bienInv = resInv.status === 'fulfilled' ? resInv.value.bienByNumInv : null;

      const foundBien = bienSerie || bienInv;

      if (foundBien) {
        setSelectedBien(foundBien);
        setForm(p => ({ ...p, id_bien: foundBien.id_bien }));
        showToast('Bien encontrado', 'success');
      } else {
        showToast('No se encontró ningún bien con ese número de serie o inventario', 'error');
        setSelectedBien(null);
        setForm(p => ({ ...p, id_bien: '' }));
      }
    } catch (err) {
      showToast('Error al buscar el bien', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.id_bien || !form.fecha_fin) {
      showToast('El bien y la fecha de fin son obligatorios', 'warning');
      return;
    }
    if (isEdit) {
      updateMut.mutate({
        id_garantia: garantia.id_garantia,
        fecha_inicio: form.fecha_inicio || null,
        fecha_fin: form.fecha_fin,
        proveedor: form.proveedor || null,
        estado_garantia: form.estado_garantia,
      });
    } else {
      createMut.mutate({
        id_bien: form.id_bien,
        fecha_inicio: form.fecha_inicio || null,
        fecha_fin: form.fecha_fin,
        proveedor: form.proveedor || null,
        estado_garantia: form.estado_garantia,
      });
    }
  };

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader title={isEdit ? 'Editar Garantía' : 'Nueva Garantía'} onClose={onClose} />
      <div className="p-5 max-h-[80vh] overflow-y-auto">
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
                placeholder="Buscar por No. Serie o Inventario..."
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
                    {selectedBien.modelo?.marca?.marca} - {selectedBien.modelo?.descrip_disp}
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
              <label className={labelCls}>Fecha Fin *</label>
              <input type="date" className={inputCls} value={form.fecha_fin} onChange={e => handleChange('fecha_fin', e.target.value)} required />
            </div>
          </div>
          <div>
            <label className={labelCls}>Proveedor</label>
            <input list="proveedores-list" className={inputCls} value={form.proveedor} onChange={e => handleChange('proveedor', e.target.value)} placeholder="Ej: HP Corporativo S.A." />
            <datalist id="proveedores-list">
              {uniqueProveedores.map((prov, i) => (
                <option key={i} value={prov} />
              ))}
            </datalist>
          </div>
          <div>
            <label className={labelCls}>Estado de la Garantía</label>
            <select className={inputCls} value={form.estado_garantia} onChange={e => handleChange('estado_garantia', e.target.value)}>
              <option value="VIGENTE">Vigente</option>
              <option value="VENCIDA">Vencida</option>
              <option value="ANULADA">Anulada</option>
            </select>
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
    </ModalOverlay>
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
    <ModalOverlay onClose={onClose}>
      <ModalHeader title="Eliminar Registro de Garantía" onClose={onClose} />
      <div className="p-5 space-y-4">
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
    </ModalOverlay>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Garantias() {
  const usuario = useAuthStore(s => s.usuario);
  const idRol = usuario?.id_rol ?? 3;
  const isMaestro = idRol === 1;
  const isAdministrador = idRol === 2;

  const [searchFilter, setSearchFilter] = useState('');
  const [modalCrear, setModalCrear] = useState(false);
  const [modalEditar, setModalEditar] = useState(null);
  const [modalEliminar, setModalEliminar] = useState(null);
  
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['garantias'],
    queryFn: () => gqlClient.request(GET_GARANTIAS),
    select: d => d.garantias ?? [],
  });
  
  const garantias = data || [];
  
  const uniqueProveedores = [...new Set(garantias.map(g => g.proveedor).filter(Boolean))];

  const filteredGarantias = garantias.filter(g => {
    if (!searchFilter) return true;
    const term = searchFilter.toLowerCase();
    const proveedorMatch = g.proveedor?.toLowerCase().includes(term);
    const serieMatch = g.bien?.num_serie?.toLowerCase().includes(term);
    const invMatch = g.bien?.num_inv?.toLowerCase().includes(term);
    return proveedorMatch || serieMatch || invMatch;
  });

  const getEstatusStyle = (estatus) => {
    if (estatus === 'VIGENTE') return 'bg-green-100 text-green-800 border border-green-200';
    if (estatus === 'VENCIDA') return 'bg-red-100 text-red-800 border border-red-200';
    return 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 fade-in min-h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center">
            <ShieldCheck className="text-green-600 mr-3" size={28} />
            Control de Garantías
          </h1>
          <p className="text-sm text-gray-500 mt-1 pl-10">Administración de pólizas y resguardos de proveedores</p>
        </div>
        
        {/* Administrador y Maestro pueden crear */}
        {(isMaestro || isAdministrador) && (
          <button
            onClick={() => setModalCrear(true)}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all shadow-md group"
            style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
            <Plus size={18} className="transition-transform group-hover:scale-110" /> Agregar Garantía
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total de Garantías</p>
                  <h3 className="text-2xl font-black mt-1 text-gray-900">{garantias.length}</h3>
              </div>
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl">
                 <ShieldCheck />
              </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Vigentes</p>
                  <h3 className="text-2xl font-black mt-1 text-emerald-900">
                    {garantias.filter(g => g.estado_garantia === 'VIGENTE').length}
                  </h3>
              </div>
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-xl">
                 <CalendarClock />
              </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                  <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">Vencidas / Anuladas</p>
                  <h3 className="text-2xl font-black mt-1 text-red-900">
                    {garantias.filter(g => g.estado_garantia !== 'VIGENTE').length}
                  </h3>
              </div>
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center text-xl">
                 <AlertCircle />
              </div>
          </div>
      </div>

      {/* Control Actions & Search */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
                type="text"
                placeholder="Buscar por equipo, proveedor o número de serie..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all shadow-inner"
            />
        </div>
        <button onClick={() => refetch()} className="p-3 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-green-700 transition-colors bg-white shadow-sm flex-shrink-0" title="Refrescar">
            <RefreshCw size={18} />
        </button>
      </div>

      {/* Table Data */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-green-700">
            <RefreshCw className="animate-spin mb-4" size={32} />
            <p className="text-sm font-semibold animate-pulse">Consultando el historial de garantías...</p>
          </div>
        ) : filteredGarantias.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100 shadow-sm">
                <Box size={32} className="text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">No se encontraron registros de garantías.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-bold tracking-wider text-xs uppercase">Equipo Asociado</th>
                  <th className="px-6 py-4 font-bold tracking-wider text-xs uppercase">Periodo de Cobertura</th>
                  <th className="px-6 py-4 font-bold tracking-wider text-xs uppercase">Proveedor</th>
                  <th className="px-6 py-4 font-bold tracking-wider text-xs uppercase">Estado</th>
                  {(isMaestro || isAdministrador) && (
                      <th className="px-6 py-4 font-bold tracking-wider text-xs uppercase text-right">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 focus-within:ring-2 focus-within:ring-green-500">
                {filteredGarantias.map(garantia => (
                  <tr key={garantia.id_garantia} className="hover:bg-green-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900 group-hover:text-green-800 transition-colors">
                        {garantia.bien ? (garantia.bien.modelo?.marca?.marca + " " + garantia.bien.modelo?.descrip_disp) : 'Bien Extraviado/No Asignado'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 bg-gray-100 px-2 py-0.5 rounded-md inline-block">
                        <strong>S/N: </strong> {garantia.bien?.num_serie || 'N/A'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-xs text-gray-600 gap-1">
                          <span className="flex items-center"><span className="w-12 text-gray-400 font-semibold">Inicio:</span> 
                            {garantia.fecha_inicio ? new Date(garantia.fecha_inicio).toLocaleDateString() : 'N/D'}
                          </span>
                          <span className="flex items-center"><span className="w-12 text-gray-400 font-semibold">Fin:</span> 
                            <span className="font-semibold text-gray-800">{new Date(garantia.fecha_fin).toLocaleDateString()}</span>
                          </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-700">
                        {garantia.proveedor || '--'}
                    </td>
                    <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${getEstatusStyle(garantia.estado_garantia)} shadow-sm`}>
                            {garantia.estado_garantia}
                        </span>
                    </td>
                    {(isMaestro || isAdministrador) && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setModalEditar(garantia)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                              title="Editar"
                            >
                              <Edit size={14} />
                            </button>
                            {/* Sólo el Maestro puede eliminar */}
                            {isMaestro && (
                                <button
                                    onClick={() => setModalEliminar(garantia)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm"
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
      </div>

      {modalCrear && <GarantiaModal onClose={() => setModalCrear(false)} uniqueProveedores={uniqueProveedores} />}
      {modalEditar && <GarantiaModal garantia={modalEditar} onClose={() => setModalEditar(null)} uniqueProveedores={uniqueProveedores} />}
      {modalEliminar && <ConfirmEliminarModal garantia={modalEliminar} onClose={() => setModalEliminar(null)} />}
    </div>
  );
}
