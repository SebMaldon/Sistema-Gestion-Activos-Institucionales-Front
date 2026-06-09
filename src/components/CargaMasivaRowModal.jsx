import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { GET_CATALOGOS_BIENES_QUERY, GET_BIENES_MONITOR, CREATE_CAT_MODELO_MUTATION } from '../api/inventario.queries';
import { Loader2, X, Save, Package, ChevronDown, Cpu, Plus, Check, Monitor } from 'lucide-react';
import { useApp } from '../context/AppContext';

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

export function CargaMasivaRowModal({ row, onSave, onClose }) {
  const { showToast } = useApp();
  const [activeTab, setActiveTab] = useState('generales');

  const queryClient = useQueryClient();
  const { data: catalogs, isLoading } = useQuery({
    queryKey: ['catalogos-bienes-bulk'],
    queryFn: () => gqlClient.request(GET_CATALOGOS_BIENES_QUERY),
    staleTime: 60000,
  });

  const { data: monitoresData } = useQuery({
    queryKey: ['bienes-monitores'],
    queryFn: () => gqlClient.request(GET_BIENES_MONITOR),
    staleTime: 60000,
  });

  const [isAddingModelo, setIsAddingModelo] = useState(!!row.invalidModelo);
  const [newModelo, setNewModelo] = useState({ 
    clave_modelo: row.clave_modelo || '', 
    descrip_disp: row.tmp_descrip || '', 
    clave_marca: row.tmp_marca || '', 
    tipo_disp: row.tmp_tipo || '' 
  });

  const { mutate: createModelo, isPending: isCreatingModelo } = useMutation({
    mutationFn: (vars) => gqlClient.request(CREATE_CAT_MODELO_MUTATION, vars),
    onSuccess: (data) => {
      showToast('Modelo creado exitosamente', 'success');
      queryClient.invalidateQueries({ queryKey: ['catalogos-bienes-bulk'] });
      setFormData(f => ({ ...f, clave_modelo: data.createCatModelo.clave_modelo }));
      setIsAddingModelo(false);
    },
    onError: (err) => showToast(err?.response?.errors?.[0]?.message || 'Error al crear modelo', 'error')
  });

  const [formData, setFormData] = useState({
    num_serie: row.num_serie || '',
    num_inv: row.num_inv || '',
    cantidad: row.cantidad || 1,
    estatus_operativo: row.estatus_operativo || 'ALTA',
    id_categoria: row.id_categoria || '',
    id_unidad_medida: row.id_unidad_medida || '',
    clave_unidad_ref: row.clave_unidad_ref || '',
    id_ubicacion: row.id_ubicacion || '',
    clave_modelo: row.clave_modelo || '',
    id_usuario_resguardo: row.id_usuario_resguardo || '',
    fecha_adquisicion: row.fecha_adquisicion || '',
    id_monitor: row.id_monitor || '',
    serie_monitor_asignado: row.serie_monitor_asignado || ''
  });

  const [specsData, setSpecsData] = useState({
    cpu_info: row.especificacionTI?.cpu_info || '',
    ram_gb: row.especificacionTI?.ram_gb || '',
    almacenamiento_gb: row.especificacionTI?.almacenamiento_gb || '',
    mac_address: row.especificacionTI?.mac_address || '',
    dir_ip: row.especificacionTI?.dir_ip || '',
    dir_mac: row.especificacionTI?.dir_mac || '',
    puerto_red: row.especificacionTI?.puerto_red || '',
    switch_red: row.especificacionTI?.switch_red || '',
    modelo_so: row.especificacionTI?.modelo_so || '',
    nombre_host: row.especificacionTI?.nombre_host || '',
    version_office: row.especificacionTI?.version_office || '',
    windows_serial: row.especificacionTI?.windows_serial || '',
  });

  const optsUsuarios = useMemo(() =>
    (catalogs?.usuarios?.edges?.map(e => e.node) || []).map(u => ({
      value: u.id_usuario,
      label: `${u.nombre_completo}${u.matricula ? ` (${u.matricula})` : ''}`
    })), [catalogs]);

  const optsUbicaciones = useMemo(() =>
    (catalogs?.ubicaciones || [])
      .filter(u => String(u.id_unidad) === String(formData.clave_unidad_ref))
      .map(u => ({ value: u.id_ubicacion, label: u.nombre_ubicacion })),
    [catalogs, formData.clave_unidad_ref]);

  const optsModelos = useMemo(() =>
    (catalogs?.catModelos || []).map(m => ({
      value: m.clave_modelo,
      label: `${m.clave_modelo} - ${m.descrip_disp || ''}`
    })), [catalogs]);

  const optsMonitores = useMemo(() =>
    (monitoresData?.bienesMonitor || []).map(m => ({
      value: m.id_bien,
      label: `${m.num_serie || m.num_inv || 'Sin Serie'} - ${m.modelo?.descrip_disp || ''}`
    })), [monitoresData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.id_categoria) return showToast('Categoría es requerida', 'warning');
    if (!formData.id_unidad_medida) return showToast('Unidad de Medida es requerida', 'warning');
    
    // Parse specs if any exists
    let especificacionTI = null;
    const hasAnySpec = Object.values(specsData).some(val => val !== null && val !== '');
    if (hasAnySpec) {
      especificacionTI = {
        ...specsData,
        ram_gb: specsData.ram_gb ? parseInt(specsData.ram_gb) : null,
        almacenamiento_gb: specsData.almacenamiento_gb ? parseInt(specsData.almacenamiento_gb) : null,
      };
    }

    const updatedRow = {
      ...row,
      ...formData,
      invalidModelo: formData.clave_modelo ? false : row.invalidModelo,
      cantidad: parseFloat(formData.cantidad),
      id_categoria: parseInt(formData.id_categoria),
      id_unidad_medida: parseInt(formData.id_unidad_medida),
      id_ubicacion: formData.id_ubicacion ? parseInt(formData.id_ubicacion) : null,
      id_usuario_resguardo: formData.id_usuario_resguardo ? parseInt(formData.id_usuario_resguardo) : null,
      especificacionTI
    };

    onSave(updatedRow);
  };

  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1.5';
  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white';
  const selectCls = inputCls;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/70 fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <Package size={18} className="text-blue-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Editar Fila (Carga Masiva)</h2>
              <p className="text-xs text-gray-500">Serie: {formData.num_serie || 'Sin serie'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-700 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* TABS */}
        <div className="px-6 pt-3 flex gap-1 border-b border-gray-100 shrink-0">
          <button type="button" onClick={() => setActiveTab('generales')}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border-b-2 -mb-px ${activeTab === 'generales' ? 'border-green-600 text-green-700 bg-green-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            Datos Generales
          </button>
          <button type="button" onClick={() => setActiveTab('specs')}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${activeTab === 'specs' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <Cpu size={13} /> Especificaciones TI
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="animate-spin text-green-600" size={28} />
            </div>
          ) : (
            <form id="edit-bulk-row-form" onSubmit={handleSubmit}>
              
              {/* ── TAB: Datos Generales ── */}
              {activeTab === 'generales' && (
                <div className="space-y-5 fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className={labelCls}>Número de Serie</label>
                      <input type="text" value={formData.num_serie} onChange={e => setFormData({ ...formData, num_serie: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Número de Inventario</label>
                      <input type="text" value={formData.num_inv} onChange={e => setFormData({ ...formData, num_inv: e.target.value })} className={inputCls} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className={labelCls}>Cantidad <span className="text-red-500">*</span></label>
                      <input required type="number" min="1" value={formData.cantidad} onChange={e => setFormData({ ...formData, cantidad: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Estatus Operativo <span className="text-red-500">*</span></label>
                      <select value={formData.estatus_operativo} onChange={e => setFormData({ ...formData, estatus_operativo: e.target.value })} className={selectCls}>
                        <option value="ALTA">ALTA</option>
                        <option value="BAJA">BAJA</option>
                        <option value="DAÑADO">DAÑADO</option>
                        <option value="DEVOLUCIÓN">DEVOLUCIÓN</option>
                        <option value="OTRO">OTRO</option>
                        <option value="P_BAJA">PRE-BAJA</option>
                        <option value="PRESTAMO">PRÉSTAMO</option>
                        <option value="SINIESTRADO">SINIESTRADO</option>
                        <option value="SUSTITUIDO">SUSTITUIDO</option>
                        <option value="TRASPASO OOAD">TRASPASO OOAD</option>
                        <option value="TRASPASO_FORANEO">TRASPASO FORÁNEO</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className={labelCls}>Categoría <span className="text-red-500">*</span></label>
                      <select required value={formData.id_categoria} onChange={e => setFormData({ ...formData, id_categoria: e.target.value })} className={selectCls}>
                        <option value="">-- Seleccionar --</option>
                        {catalogs?.catCategoriasActivo?.map(c => (
                          <option key={c.id_categoria} value={c.id_categoria}>{c.nombre_categoria}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Unidad de Medida <span className="text-red-500">*</span></label>
                      <select required value={formData.id_unidad_medida} onChange={e => setFormData({ ...formData, id_unidad_medida: e.target.value })} className={selectCls}>
                        <option value="">-- Seleccionar --</option>
                        {catalogs?.catUnidadesMedida?.map(u => (
                          <option key={u.id_unidad_medida} value={u.id_unidad_medida}>{u.nombre_unidad} ({u.abreviatura})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="bg-gray-50/50 p-4 border border-gray-100 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Modelo del Bien
                        {row.invalidModelo && <span className="ml-2 text-red-500 normal-case font-normal">(Modelo no registrado)</span>}
                      </label>
                      <button type="button" onClick={() => setIsAddingModelo(!isAddingModelo)} className="text-xs text-green-600 font-semibold hover:text-green-700 flex items-center gap-1">
                        {isAddingModelo ? 'Seleccionar existente' : <><Plus size={12}/> Crear nuevo</>}
                      </button>
                    </div>

                    {isAddingModelo ? (
                      <div className="space-y-4 fade-in bg-white p-4 rounded border border-green-100 shadow-sm">
                        {row.invalidModelo && (
                          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs font-semibold mb-2">
                            El modelo especificado en el Excel no existe. Por favor, revisa o completa la información para darlo de alta en el catálogo.
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={labelCls}>Clave de Modelo <span className="text-red-500">*</span></label>
                            <input type="text" value={newModelo.clave_modelo} onChange={e => setNewModelo({ ...newModelo, clave_modelo: e.target.value.toUpperCase() })} className={inputCls} placeholder="Ej. LATITUDE-5420" />
                          </div>
                          <div>
                            <label className={labelCls}>Descripción</label>
                            <input type="text" value={newModelo.descrip_disp} onChange={e => setNewModelo({ ...newModelo, descrip_disp: e.target.value })} className={inputCls} placeholder="Ej. Laptop 14 pulgadas" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={labelCls}>Marca</label>
                            <select value={newModelo.clave_marca} onChange={e => setNewModelo({ ...newModelo, clave_marca: e.target.value })} className={selectCls}>
                              <option value="">-- Opcional --</option>
                              {catalogs?.marcas?.map(m => <option key={m.clave_marca} value={m.clave_marca}>{m.marca}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className={labelCls}>Tipo de Dispositivo</label>
                            <select value={newModelo.tipo_disp} onChange={e => setNewModelo({ ...newModelo, tipo_disp: e.target.value })} className={selectCls}>
                              <option value="">-- Opcional --</option>
                              {catalogs?.tiposDispositivo?.map(t => <option key={t.tipo_disp} value={t.tipo_disp}>{t.nombre_tipo}</option>)}
                            </select>
                          </div>
                        </div>
                        <button type="button" onClick={() => {
                          if (!newModelo.clave_modelo.trim()) return showToast('La clave de modelo es obligatoria', 'warning');
                          createModelo({
                            clave_modelo: newModelo.clave_modelo.trim(),
                            descrip_disp: newModelo.descrip_disp.trim() || null,
                            clave_marca: newModelo.clave_marca ? parseInt(newModelo.clave_marca) : null,
                            tipo_disp: newModelo.tipo_disp ? parseInt(newModelo.tipo_disp) : null
                          });
                        }} disabled={isCreatingModelo} className="w-full py-2 bg-green-600 text-white rounded font-semibold text-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                          {isCreatingModelo ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar y Seleccionar
                        </button>
                      </div>
                    ) : (
                      <SearchableSelect
                        options={optsModelos}
                        value={formData.clave_modelo}
                        onChange={val => setFormData({ ...formData, clave_modelo: val })}
                        placeholder="Buscar modelo existente..."
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className={labelCls}>Unidad Base</label>
                      <select value={formData.clave_unidad_ref} onChange={e => setFormData({ ...formData, clave_unidad_ref: e.target.value, id_ubicacion: '' })} className={selectCls}>
                        <option value="">-- Seleccionar --</option>
                        {catalogs?.unidades?.map(u => (
                          <option key={u.clave} value={u.clave}>{u.descripcion}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Ubicación</label>
                      <SearchableSelect
                        options={optsUbicaciones}
                        value={formData.id_ubicacion}
                        onChange={val => setFormData({ ...formData, id_ubicacion: val })}
                        placeholder="Buscar ubicación..."
                        disabled={!formData.clave_unidad_ref}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Usuario de Resguardo</label>
                    <SearchableSelect
                      options={optsUsuarios}
                      value={formData.id_usuario_resguardo}
                      onChange={val => setFormData({ ...formData, id_usuario_resguardo: val })}
                      placeholder="Buscar por nombre o matrícula..."
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Monitor Asignado (Solo si es Computadora)</label>
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-400">
                        <Monitor size={16} />
                      </div>
                      <div className="flex-1">
                        <SearchableSelect
                          options={optsMonitores}
                          value={formData.id_monitor}
                          onChange={val => setFormData({ ...formData, id_monitor: val })}
                          placeholder="Buscar monitor por serie o modelo..."
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Fecha de Adquisición</label>
                    <input type="date" value={formData.fecha_adquisicion} onChange={e => setFormData({ ...formData, fecha_adquisicion: e.target.value })} className={inputCls} />
                  </div>
                </div>
              )}

              {/* ── TAB: Especificaciones TI ── */}
              {activeTab === 'specs' && (
                <div className="space-y-5 fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className={labelCls}>Sistema Operativo</label>
                      <input type="text" value={specsData.modelo_so} placeholder="Win 10, Mac OS..."
                        onChange={e => setSpecsData({ ...specsData, modelo_so: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>CPU / Procesador</label>
                      <input type="text" value={specsData.cpu_info} placeholder="Core i5 10ma gen, Ryzen 5..."
                        onChange={e => setSpecsData({ ...specsData, cpu_info: e.target.value })} className={inputCls} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
                    <div>
                      <label className={labelCls}>RAM (GB)</label>
                      <input type="number" value={specsData.ram_gb} placeholder="8"
                        onChange={e => setSpecsData({ ...specsData, ram_gb: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Almacenamiento (GB)</label>
                      <input type="number" value={specsData.almacenamiento_gb} placeholder="512"
                        onChange={e => setSpecsData({ ...specsData, almacenamiento_gb: e.target.value })} className={inputCls} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
                    <div>
                      <label className={labelCls}>Nombre de Host</label>
                      <input type="text" value={specsData.nombre_host} placeholder="Ej. PC-ADMIN"
                        onChange={e => setSpecsData({ ...specsData, nombre_host: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Versión de Office</label>
                      <input type="text" value={specsData.version_office} placeholder="Ej. Office 2021"
                        onChange={e => setSpecsData({ ...specsData, version_office: e.target.value })} className={inputCls} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
                    <div>
                      <label className={labelCls}>Serial de Windows</label>
                      <input type="text" value={specsData.windows_serial} placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
                        onChange={e => setSpecsData({ ...specsData, windows_serial: e.target.value })} className={inputCls} />
                    </div>
                  </div>

                  <div className="pt-3 mt-4 border-t border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Red y Conectividad</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className={labelCls}>Dirección IP</label>
                        <input type="text" value={specsData.dir_ip} placeholder="192.168.0.X"
                          className={`${inputCls} font-mono`}
                          onChange={e => setSpecsData({ ...specsData, dir_ip: e.target.value })} />
                      </div>
                      <div>
                        <label className={labelCls}>MAC Address</label>
                        <input type="text" value={specsData.mac_address} placeholder="XX:XX:XX:XX:XX:XX"
                          className={`${inputCls} font-mono uppercase`}
                          onChange={e => setSpecsData({ ...specsData, mac_address: e.target.value })} />
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

                  <div className="mt-6 border-t pt-4">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Monitor Asignado</h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className={labelCls}>Serie Monitor Asignado (Opcional)</label>
                        <input
                          type="text"
                          className={inputCls}
                          value={formData.serie_monitor_asignado}
                          onChange={e => setFormData({ ...formData, serie_monitor_asignado: e.target.value })}
                          placeholder="Ej. S/N MONITOR"
                        />
                        <p className="text-[10px] text-gray-500 mt-1">Si el monitor no existe, asegúrate de cargarlo también en el Excel antes que el CPU.</p>
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
          <button type="button" onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
            Cancelar
          </button>
          <button type="submit" form="edit-bulk-row-form"
            className="px-6 py-2 text-sm font-semibold text-white rounded-lg transition-colors flex items-center gap-2"
            style={{ backgroundColor: '#006341' }}>
            <Save size={16} /> Guardar Fila
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
