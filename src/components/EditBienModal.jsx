import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { gql } from 'graphql-request';
import { Loader2, X, Save, Package, ChevronDown, Cpu, Plus, Check } from 'lucide-react';
import { useEditBien, useUpsertSpecsTI } from '../hooks/useEscaner';
import { useApp } from '../context/AppContext';

const GET_CATALOGS_QUERY = gql`
  query GetCatalogs {
    catCategoriasActivo { id_categoria nombre_categoria }
    unidades { id_unidad nombre }
    usuarios(estatus: true, pagination: { first: 20000 }) {
      edges {
        node {
          id_usuario
          nombre_completo
          matricula
        }
      }
    }
    ubicaciones { id_ubicacion nombre_ubicacion id_unidad }
  }
`;

const CREATE_UBICACION = gql`
  mutation CreateUbicacion($id_unidad: Int!, $nombre_ubicacion: String!) {
    createUbicacion(id_unidad: $id_unidad, nombre_ubicacion: $nombre_ubicacion) {
      id_ubicacion
      nombre_ubicacion
      id_unidad
    }
  }
`;

// ─── Combobox con búsqueda ────────────────────────────────────────────────────
function SearchableSelect({ options, value, onChange, placeholder, loading, disabled }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedLabel = options.find(o => String(o.value) === String(value))?.label ?? '';

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options.slice(0, 80);
    return options.filter(o => o.label.toLowerCase().includes(term)).slice(0, 80);
  }, [query, options]);

  const handleSelect = (opt) => {
    onChange(opt.value);
    setQuery('');
    setOpen(false);
  };

  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={open ? query : selectedLabel}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={loading ? 'Cargando...' : placeholder}
          disabled={loading || disabled}
          className="w-full px-3 py-2 pr-8 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none disabled:bg-gray-50 disabled:text-gray-400"
        />
        <ChevronDown
          size={14}
          className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {open && !loading && (
        <div className="absolute z-30 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-52 overflow-y-auto scrollbar-hide">
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-sm text-gray-400 text-center">
              Sin resultados{query ? ` para "${query}"` : ''}
            </div>
          ) : (
            filtered.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt)}
                className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-green-50 hover:text-green-700 ${String(opt.value) === String(value) ? 'bg-green-50 text-green-700 font-semibold' : 'text-gray-700'}`}
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Modal Principal ──────────────────────────────────────────────────────────
export function EditBienModal({ asset, onClose }) {
  const { showToast } = useApp();
  const queryClient = useQueryClient();
  const { mutateAsync: editBien, isLoading: isSavingData } = useEditBien();
  const { mutateAsync: upsertSpecs, isLoading: isSavingSpecs } = useUpsertSpecsTI();
  const isSaving = isSavingData || isSavingSpecs;

  const CATEGORIAS_TI = [1, 3];
  const [activeTab, setActiveTab] = useState('generales');

  // Estado para crear nueva ubicación
  const [isAddingUbicacion, setIsAddingUbicacion] = useState(false);
  const [nuevaUbicacion, setNuevaUbicacion] = useState('');
  const [savingUbicacion, setSavingUbicacion] = useState(false);

  const { data: catalogs, isLoading } = useQuery({
    queryKey: ['catalogsSelect'],
    queryFn: async () => {
      const data = await gqlClient.request(GET_CATALOGS_QUERY);
      return data;
    }
  });

  const [formData, setFormData] = useState({
    num_serie: asset.numSerie || '',
    cantidad: asset.cantidad || 1,
    estatus_operativo: asset.estatus || 'Activo',
    id_categoria: asset.idCategoria || '',
    id_unidad: asset.idUnidad || '',
    id_ubicacion: asset.idUbicacion || '',
    id_usuario_resguardo: asset.idUsuarioResguardo || '',
    fecha_adquisicion: asset.adquisicion || ''
  });

  const [specsData, setSpecsData] = useState({
    nom_pc: '', cpu: '', ram: '', almacenamiento: '',
    mac_wifi: '', ip: '', mac_eth: '', puerto_red: '', switch_red: '', os: ''
  });

  useEffect(() => {
    if (asset) {
      setFormData({
        num_serie: asset.numSerie || '',
        cantidad: asset.cantidad || 1,
        estatus_operativo: asset.estatus || 'Activo',
        id_categoria: asset.idCategoria || '',
        id_unidad: asset.idUnidad || '',
        id_ubicacion: asset.idUbicacion || '',
        id_usuario_resguardo: asset.idUsuarioResguardo || '',
        fecha_adquisicion: asset.adquisicion || ''
      });
      if (asset.specs) {
        setSpecsData({
          nom_pc: asset.specs.nom_pc || '',
          cpu: asset.specs.cpu || '',
          ram: asset.specs.ram || '',
          almacenamiento: asset.specs.almacenamiento || '',
          mac_wifi: asset.specs.mac_wifi || '',
          ip: asset.specs.ip || '',
          mac_eth: asset.specs.mac_eth || '',
          puerto_red: asset.specs.puerto_red || '',
          switch_red: asset.specs.switch_red || '',
          os: asset.specs.os || ''
        });
      }
    }
  }, [asset]);

  const hasTISpecs = asset.specs?.hasSpecs;
  const isTICategory = formData.id_categoria ? CATEGORIAS_TI.includes(Number(formData.id_categoria)) : false;
  const showTITab = hasTISpecs || isTICategory;

  useEffect(() => {
    if (!showTITab && activeTab === 'specs') setActiveTab('generales');
  }, [showTITab, activeTab]);

  // Opciones para SearchableSelects
  const optsUsuarios = useMemo(() =>
    (catalogs?.usuarios?.edges?.map(e => e.node) || []).map(u => ({
      value: u.id_usuario,
      label: `${u.nombre_completo}${u.matricula ? ` (${u.matricula})` : ''}`
    })), [catalogs]);

  const optsUbicaciones = useMemo(() =>
    (catalogs?.ubicaciones || [])
      .filter(u => String(u.id_unidad) === String(formData.id_unidad))
      .map(u => ({ value: u.id_ubicacion, label: u.nombre_ubicacion })),
    [catalogs, formData.id_unidad]);

  // Guardar nueva ubicación inline
  const handleGuardarUbicacion = async () => {
    if (!nuevaUbicacion.trim() || !formData.id_unidad) return;
    setSavingUbicacion(true);
    try {
      const result = await gqlClient.request(CREATE_UBICACION, {
        id_unidad: parseInt(formData.id_unidad, 10),
        nombre_ubicacion: nuevaUbicacion.trim()
      });
      const nueva = result.createUbicacion;
      // Actualizar caché local sin refetch
      queryClient.setQueryData(['catalogsSelect'], (old) => {
        if (!old) return old;
        return {
          ...old,
          ubicaciones: [...(old.ubicaciones || []), nueva]
        };
      });
      setFormData(prev => ({ ...prev, id_ubicacion: String(nueva.id_ubicacion) }));
      setNuevaUbicacion('');
      setIsAddingUbicacion(false);
      showToast(`Ubicación "${nueva.nombre_ubicacion}" creada`, 'success');
    } catch (err) {
      showToast('Error al crear la ubicación', 'error');
    } finally {
      setSavingUbicacion(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await editBien({
        id_bien: asset.id,
        input: {
          num_serie: formData.num_serie,
          cantidad: parseInt(formData.cantidad, 10),
          estatus_operativo: formData.estatus_operativo,
          id_categoria: formData.id_categoria ? parseInt(formData.id_categoria, 10) : undefined,
          id_unidad: formData.id_unidad ? parseInt(formData.id_unidad, 10) : undefined,
          id_ubicacion: formData.id_ubicacion ? parseInt(formData.id_ubicacion, 10) : undefined,
          id_usuario_resguardo: formData.id_usuario_resguardo ? parseInt(formData.id_usuario_resguardo, 10) : undefined,
          fecha_adquisicion: formData.fecha_adquisicion || null
        }
      });

      const hasAnySpec = Object.values(specsData).some(val => val !== null && val !== '');
      if (hasAnySpec || asset.specs?.hasSpecs) {
        await upsertSpecs({ id_bien: asset.id, specs: specsData });
      }

      showToast('Actualización exitosa', 'success');
      onClose();
    } catch (e) {
      console.error(e);
      showToast('Error al actualizar: ' + (e.message || 'Desconocido'), 'error');
    }
  };

  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1.5';
  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white';
  const selectCls = inputCls;

  // Portal: render directamente en document.body para centrado real sobre toda la pantalla
  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/70 fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
              <Package size={18} className="text-green-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Editar Registro</h2>
              <p className="text-xs text-gray-500">Serie: {asset.numSerie} — {asset.equipo}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-700 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* TABS */}
        <div className="px-6 pt-3 flex gap-1 border-b border-gray-100 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('generales')}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border-b-2 -mb-px ${
              activeTab === 'generales'
                ? 'border-green-600 text-green-700 bg-green-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Datos Generales
          </button>
          {showTITab && (
            <button
              type="button"
              onClick={() => setActiveTab('specs')}
              className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
                activeTab === 'specs'
                  ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Cpu size={13} />
              Especificaciones TI
            </button>
          )}
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="animate-spin text-green-600" size={28} />
            </div>
          ) : (
            <form id="edit-bien-form" onSubmit={handleSubmit}>

              {/* ── TAB: Datos Generales ── */}
              {activeTab === 'generales' && (
                <div className="space-y-5 fade-in">

                  {/* Número de Serie + Cantidad */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className={labelCls}>Número de Serie</label>
                      <input required type="text" value={formData.num_serie}
                        onChange={e => setFormData({ ...formData, num_serie: e.target.value })}
                        className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Cantidad</label>
                      <input required type="number" min="1" value={formData.cantidad}
                        onChange={e => setFormData({ ...formData, cantidad: e.target.value })}
                        className={inputCls} />
                    </div>
                  </div>

                  {/* Estatus + Categoría */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className={labelCls}>Estatus</label>
                      <select value={formData.estatus_operativo}
                        onChange={e => setFormData({ ...formData, estatus_operativo: e.target.value })}
                        className={selectCls}>
                        <option value="Activo">Activo</option>
                        <option value="Baja">Baja</option>
                        <option value="En Reparación">En Reparación</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Categoría</label>
                      <select value={formData.id_categoria}
                        onChange={e => setFormData({ ...formData, id_categoria: e.target.value })}
                        className={selectCls}>
                        <option value="">-- Seleccionar --</option>
                        {catalogs?.catCategoriasActivo?.map(c => (
                          <option key={c.id_categoria} value={c.id_categoria}>{c.nombre_categoria}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Unidad Base */}
                  <div>
                    <label className={labelCls}>Unidad Base</label>
                    <select value={formData.id_unidad}
                      onChange={e => setFormData({ ...formData, id_unidad: e.target.value, id_ubicacion: '' })}
                      className={selectCls}>
                      <option value="">-- Seleccionar --</option>
                      {catalogs?.unidades?.map(u => (
                        <option key={u.id_unidad} value={u.id_unidad}>{u.nombre}</option>
                      ))}
                    </select>
                  </div>

                  {/* Ubicación + botón agregar */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`${labelCls} mb-0`}>
                        Ubicación
                        {!formData.id_unidad && (
                          <span className="ml-1 font-normal text-gray-400">(selecciona unidad primero)</span>
                        )}
                      </label>
                      {formData.id_unidad && !isAddingUbicacion && (
                        <button
                          type="button"
                          onClick={() => setIsAddingUbicacion(true)}
                          className="flex items-center gap-1 text-xs text-green-700 hover:text-green-800 font-semibold"
                        >
                          <Plus size={12} /> Nueva ubicación
                        </button>
                      )}
                    </div>

                    {isAddingUbicacion ? (
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={nuevaUbicacion}
                          onChange={e => setNuevaUbicacion(e.target.value)}
                          placeholder="Nombre de la nueva ubicación..."
                          autoFocus
                          className="flex-1 px-3 py-2 text-sm border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleGuardarUbicacion())}
                        />
                        <button
                          type="button"
                          onClick={handleGuardarUbicacion}
                          disabled={savingUbicacion || !nuevaUbicacion.trim()}
                          className="px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                        >
                          {savingUbicacion ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => { setIsAddingUbicacion(false); setNuevaUbicacion(''); }}
                          className="px-3 py-2 text-xs text-red-500 hover:underline"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <SearchableSelect
                        options={optsUbicaciones}
                        value={formData.id_ubicacion}
                        onChange={val => setFormData({ ...formData, id_ubicacion: val })}
                        placeholder="Buscar ubicación..."
                        disabled={!formData.id_unidad}
                      />
                    )}
                  </div>

                  {/* Usuario de Resguardo */}
                  <div>
                    <label className={labelCls}>Usuario de Resguardo</label>
                    <SearchableSelect
                      options={optsUsuarios}
                      value={formData.id_usuario_resguardo}
                      onChange={val => setFormData({ ...formData, id_usuario_resguardo: val })}
                      placeholder="Buscar por nombre o matrícula..."
                      loading={isLoading}
                    />
                  </div>

                  {/* Fecha de Adquisición */}
                  <div>
                    <label className={labelCls}>Fecha de Adquisición</label>
                    <input type="date" value={formData.fecha_adquisicion}
                      onChange={e => setFormData({ ...formData, fecha_adquisicion: e.target.value })}
                      className={inputCls} />
                  </div>

                </div>
              )}

              {/* ── TAB: Especificaciones TI ── */}
              {activeTab === 'specs' && (
                <div className="space-y-5 fade-in">

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className={labelCls}>Nombre del Equipo</label>
                      <input type="text" value={specsData.nom_pc} placeholder="Ej. PC-CAJA-03"
                        onChange={e => setSpecsData({ ...specsData, nom_pc: e.target.value })}
                        className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Sistema Operativo</label>
                      <input type="text" value={specsData.os} placeholder="Win 10, Mac OS..."
                        onChange={e => setSpecsData({ ...specsData, os: e.target.value })}
                        className={inputCls} />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>CPU / Procesador</label>
                    <input type="text" value={specsData.cpu} placeholder="Core i5 10ma gen, Ryzen 5..."
                      onChange={e => setSpecsData({ ...specsData, cpu: e.target.value })}
                      className={inputCls} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className={labelCls}>RAM (GB)</label>
                      <input type="number" value={specsData.ram} placeholder="8"
                        onChange={e => setSpecsData({ ...specsData, ram: e.target.value })}
                        className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Almacenamiento (GB)</label>
                      <input type="number" value={specsData.almacenamiento} placeholder="512"
                        onChange={e => setSpecsData({ ...specsData, almacenamiento: e.target.value })}
                        className={inputCls} />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Red y Conectividad</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className={labelCls}>Dirección IP</label>
                        <input type="text" value={specsData.ip} placeholder="192.168.0.X"
                          className={`${inputCls} font-mono`}
                          onChange={e => setSpecsData({ ...specsData, ip: e.target.value })} />
                      </div>
                      <div>
                        <label className={labelCls}>MAC Ethernet</label>
                        <input type="text" value={specsData.mac_eth} placeholder="XX:XX:XX:XX:XX:XX"
                          className={`${inputCls} font-mono uppercase`}
                          onChange={e => setSpecsData({ ...specsData, mac_eth: e.target.value })} />
                      </div>
                      <div>
                        <label className={labelCls}>MAC WiFi</label>
                        <input type="text" value={specsData.mac_wifi} placeholder="XX:XX:XX:XX:XX:XX"
                          className={`${inputCls} font-mono uppercase`}
                          onChange={e => setSpecsData({ ...specsData, mac_wifi: e.target.value })} />
                      </div>
                      <div>
                        <label className={labelCls}>Switch / Puerto</label>
                        <div className="flex gap-2">
                          <input type="text" value={specsData.switch_red} placeholder="ID Switch"
                            className={`${inputCls} flex-1`}
                            onChange={e => setSpecsData({ ...specsData, switch_red: e.target.value })} />
                          <input type="text" value={specsData.puerto_red} placeholder="Pto."
                            className={`${inputCls} w-20`}
                            onChange={e => setSpecsData({ ...specsData, puerto_red: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

            </form>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 shrink-0">
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
            form="edit-bien-form"
            disabled={isSaving}
            className="px-6 py-2 text-sm font-semibold text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#006341' }}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>,
    document.body   // ← Portal: monta sobre toda la pantalla, no dentro del scroll/layout
  );
}
