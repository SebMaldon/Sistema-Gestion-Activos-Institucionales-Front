import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, Loader2, Building2, AlertTriangle, Eye, MapPin, User, Filter, X } from 'lucide-react';
import { useUnidades, useCreateUnidad, useUpdateUnidad, useDeleteUnidad, useCatTipoUnidades, useCatDistinctFiltros } from '../hooks/useUnidades';
import { useApp } from '../context/AppContext';
import UnidadModal from '../components/UnidadModal';
import ConfirmModal from '../components/ConfirmModal';
import DetalleUnidadModal from '../components/DetalleUnidadModal';
import MultiSelect from '../components/MultiSelect';

// Esta pagina muestra las UNIDADES FISICAS (tabla: unidades)
export default function Unidades() {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [unidadToEdit, setUnidadToEdit] = useState(null);
  const { showToast } = useApp();

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [unidadToShow, setUnidadToShow] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [unidadToDelete, setUnidadToDelete] = useState(null);

  const [after, setAfter] = useState(null);
  const [history, setHistory] = useState([]);

  // Advanced filters state
  const [showFilters, setShowFilters] = useState(false);
  const [selectedZona, setSelectedZona] = useState([]);
  const [selectedTipo, setSelectedTipo] = useState([]);
  const [selectedRegimen, setSelectedRegimen] = useState([]);
  const [selectedNivel, setSelectedNivel] = useState([]);
  const [selectedCiudad, setSelectedCiudad] = useState([]);
  const [selectedMunicipio, setSelectedMunicipio] = useState([]);
  const [selectedVelocidad, setSelectedVelocidad] = useState([]);
  const [selectedProveedor, setSelectedProveedor] = useState([]);
  const [selectedMonitorear, setSelectedMonitorear] = useState('');

  const { data, isLoading } = useUnidades({
    search,
    clave_zona: selectedZona.length > 0 ? selectedZona : undefined,
    tipo_unidad: selectedTipo.length > 0 ? selectedTipo.map(t => parseInt(t)) : undefined,
    regimen: selectedRegimen.length > 0 ? selectedRegimen.map(r => parseInt(r)) : undefined,
    nivel: selectedNivel.length > 0 ? selectedNivel.map(n => parseInt(n)) : undefined,
    ciudad: selectedCiudad.length > 0 ? selectedCiudad : undefined,
    municipio: selectedMunicipio.length > 0 ? selectedMunicipio : undefined,
    segmento_velocidad: selectedVelocidad.length > 0 ? selectedVelocidad : undefined,
    segmento_proveedor: selectedProveedor.length > 0 ? selectedProveedor : undefined,
    segmento_monitorear: selectedMonitorear !== '' ? parseInt(selectedMonitorear) : undefined,
    pagination: { first: 10, after }
  });
  const edges = data?.edges || [];
  const pageInfo = data?.pageInfo || {};
  const totalCount = pageInfo.totalCount || 0;
  const totalPages = Math.ceil(totalCount / 10);

  const createUnidad = useCreateUnidad();
  const updateUnidad = useUpdateUnidad();
  const deleteUnidad = useDeleteUnidad();
  const { data: catTipos } = useCatTipoUnidades();
  const { data: distinctFiltros } = useCatDistinctFiltros();

  const handleOpenCreate = () => { setUnidadToEdit(null); setIsModalOpen(true); };
  const handleOpenEdit = (u) => { setUnidadToEdit(u); setIsModalOpen(true); };
  const handleOpenDetail = (u) => { setUnidadToShow(u); setIsDetailOpen(true); };

  const handleNextPage = () => {
    if (pageInfo.hasNextPage) { setHistory([...history, after]); setAfter(pageInfo.endCursor); }
  };
  const handlePrevPage = () => {
    if (history.length > 0) { const prev = history[history.length - 1]; setHistory(history.slice(0, -1)); setAfter(prev); }
  };
  const handleSearch = (val) => { setSearch(val); setAfter(null); setHistory([]); };
  const handleZonaChange = (val) => { setSelectedZona(val); setAfter(null); setHistory([]); };
  const handleTipoChange = (val) => { setSelectedTipo(val); setAfter(null); setHistory([]); };
  const handleRegimenChange = (val) => { setSelectedRegimen(val); setAfter(null); setHistory([]); };
  const handleNivelChange = (val) => { setSelectedNivel(val); setAfter(null); setHistory([]); };
  const handleCiudadChange = (val) => { setSelectedCiudad(val); setAfter(null); setHistory([]); };
  const handleMunicipioChange = (val) => { setSelectedMunicipio(val); setAfter(null); setHistory([]); };
  const handleVelocidadChange = (val) => { setSelectedVelocidad(val); setAfter(null); setHistory([]); };
  const handleProveedorChange = (val) => { setSelectedProveedor(val); setAfter(null); setHistory([]); };
  const handleMonitorearChange = (val) => { setSelectedMonitorear(val); setAfter(null); setHistory([]); };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedZona([]);
    setSelectedTipo([]);
    setSelectedRegimen([]);
    setSelectedNivel([]);
    setSelectedCiudad([]);
    setSelectedMunicipio([]);
    setSelectedVelocidad([]);
    setSelectedProveedor([]);
    setSelectedMonitorear('');
    setAfter(null);
    setHistory([]);
  };
  const handleDeleteClick = (u) => { setUnidadToDelete(u); setIsDeleteModalOpen(true); };

  const handleConfirmDelete = async () => {
    if (!unidadToDelete) return;
    try {
      await deleteUnidad.mutateAsync({ clave: unidadToDelete.clave });
      setIsDeleteModalOpen(false);
      setUnidadToDelete(null);
      showToast('Unidad eliminada correctamente', 'success');
    } catch (err) {
      showToast(err.response?.errors?.[0]?.message || 'Error al eliminar la unidad.', 'error');
    }
  };

  const handleSubmit = async (formData) => {
    try {
      if (unidadToEdit) {
        await updateUnidad.mutateAsync(formData);
      } else {
        await createUnidad.mutateAsync(formData);
      }
      setIsModalOpen(false);
      showToast(`Unidad ${unidadToEdit ? 'actualizada' : 'creada'} correctamente`, 'success');
    } catch (err) {
      showToast(err.response?.errors?.[0]?.message || err.message || 'Error al guardar.', 'error');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl"><Building2 size={24} /></div>
            <h1 className="text-2xl font-bold text-gray-900">Catálogo de Unidades</h1>
          </div>
          <p className="text-sm text-gray-500">Gestión de unidades físicas, delegaciones y sus datos de ubicación.</p>
        </div>
        <button onClick={handleOpenCreate} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 active:scale-95">
          <Plus size={20} /> Nueva Unidad
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[calc(100vh-220px)]">
        <div className="p-4 border-b border-gray-50 bg-gray-50/30 flex-shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="Buscar por descripción, clave, ciudad, IP o encargado..."
                value={search} onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm" />
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border transition-all ${
                showFilters || selectedZona || selectedTipo || selectedRegimen || selectedNivel || selectedCiudad || selectedMunicipio || selectedVelocidad || selectedProveedor || selectedMonitorear !== ''
                  ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter size={16} />
              <span>Filtros avanzados {
                (selectedZona || selectedTipo || selectedRegimen || selectedNivel || selectedCiudad || selectedMunicipio || selectedVelocidad || selectedProveedor || selectedMonitorear !== '')
                  ? '(Activos)' : ''
              }</span>
            </button>
          </div>

          {showFilters && (
            <div className="mt-3 p-5 bg-gray-50/50 border border-gray-200/80 rounded-2xl shadow-inner animate-in fade-in slide-in-from-top-1 duration-250">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Grupo 1: Datos de la Unidad */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider border-b border-blue-100 pb-1 flex items-center gap-1.5">
                    <Building2 size={13} />
                    Filtros de Unidad
                  </h3>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Tipo de Unidad</label>
                    <MultiSelect
                      selectedValues={selectedTipo}
                      onChange={handleTipoChange}
                      options={catTipos?.map(t => ({ value: String(t.id_tipo), label: t.tipo_unidad })) || []}
                      placeholder="Todos los Tipos"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Régimen</label>
                    <MultiSelect
                      selectedValues={selectedRegimen}
                      onChange={handleRegimenChange}
                      options={distinctFiltros?.regimenes?.map(r => ({ value: String(r), label: `Régimen ${r}` })) || []}
                      placeholder="Todos los Regímenes"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Nivel de Atención</label>
                    <MultiSelect
                      selectedValues={selectedNivel}
                      onChange={handleNivelChange}
                      options={distinctFiltros?.niveles?.map(n => ({ value: String(n), label: `Nivel ${n}` })) || []}
                      placeholder="Todos los Niveles"
                    />
                  </div>
                </div>

                {/* Grupo 2: Datos Geográficos */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider border-b border-blue-100 pb-1 flex items-center gap-1.5">
                    <MapPin size={13} />
                    Ubicación y Zonas
                  </h3>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Clave de Zona</label>
                    <MultiSelect
                      selectedValues={selectedZona}
                      onChange={handleZonaChange}
                      options={[
                        { value: "1", label: "Zona 1" },
                        { value: "2", label: "Zona 2" },
                        { value: "3", label: "Zona 3" },
                        { value: "4", label: "Zona 4" },
                        { value: "5", label: "Zona 5" },
                        { value: "6", label: "Zona 6" },
                        { value: "7", label: "Zona 7" },
                        { value: "8", label: "Zona 8" },
                        { value: "9", label: "Zona 9" },
                        { value: "-1", label: "Zona -1" }
                      ]}
                      placeholder="Todas las Zonas"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Municipio</label>
                    <MultiSelect
                      selectedValues={selectedMunicipio}
                      onChange={handleMunicipioChange}
                      options={distinctFiltros?.municipios?.map(m => ({ value: m, label: m })) || []}
                      placeholder="Todos los Municipios"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Ciudad</label>
                    <MultiSelect
                      selectedValues={selectedCiudad}
                      onChange={handleCiudadChange}
                      options={distinctFiltros?.ciudades?.map(c => ({ value: c, label: c })) || []}
                      placeholder="Todas las Ciudades"
                    />
                  </div>
                </div>

                {/* Grupo 3: Datos de Enlace / Red */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider border-b border-blue-100 pb-1 flex items-center gap-1.5">
                    <User size={13} />
                    Enlaces y Segmentos
                  </h3>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Proveedor de Internet</label>
                    <MultiSelect
                      selectedValues={selectedProveedor}
                      onChange={handleProveedorChange}
                      options={distinctFiltros?.proveedores?.map(p => ({ value: p, label: p })) || []}
                      placeholder="Todos los Proveedores"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Velocidad de Enlace</label>
                    <MultiSelect
                      selectedValues={selectedVelocidad}
                      onChange={handleVelocidadChange}
                      options={distinctFiltros?.velocidades?.map(v => ({ value: v, label: v })) || []}
                      placeholder="Todas las Velocidades"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Monitoreo Activo</label>
                    <select
                      value={selectedMonitorear}
                      onChange={(e) => handleMonitorearChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                      <option value="">Todos</option>
                      <option value="1">Sí (Monitorear)</option>
                      <option value="0">No (No Monitorear)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Botón de limpiar filtros en la parte inferior */}
              <div className="mt-4 pt-3 border-t border-gray-200/80 flex items-center justify-between">
                <span className="text-[11px] text-gray-400 font-medium">
                  {edges.length > 0 ? `Mostrando ${edges.length} resultados en esta página` : 'Sin resultados con estos filtros'}
                </span>
                <button
                  onClick={handleClearFilters}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                >
                  <X size={14} className="text-gray-400" />
                  Limpiar Todos los Filtros
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto scrollbar-hide relative">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Unidad / Clave</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Ubicación</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Encargado</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Clasificación</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan="5" className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 size={32} className="text-blue-500 animate-spin" />
                    <p className="text-sm font-medium text-gray-400">Cargando unidades...</p>
                  </div>
                </td></tr>
              ) : edges.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <AlertTriangle size={32} className="text-gray-300" />
                    <p className="text-sm font-medium text-gray-400">No se encontraron unidades</p>
                  </div>
                </td></tr>
              ) : (
                edges.map(({ node }) => (
                  <tr key={node.clave} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-800 break-words" title={node.descripcion}>{node.descripcion || 'Sin descripción'}</p>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">{node.clave}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-[200px]">
                      <div className="flex items-center gap-2 text-gray-600 font-medium">
                        <MapPin size={14} className="text-red-400 flex-shrink-0" />
                        <span className="text-sm break-words">{node.ciudad ? `${node.ciudad}, ${node.municipio || ''}` : 'No definida'}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5 break-words line-clamp-2">{node.direccion}</p>
                    </td>
                    <td className="px-6 py-4 max-w-[220px]">
                      <div className="flex items-center gap-2 text-gray-700 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <User size={12} className="text-blue-600" />
                        </div>
                        <span className="text-sm font-bold break-all flex-1 min-w-0">
                          {node.unidadesACargo?.find(u => u.id_rol_empleado === 1)?.usuario?.nombre_completo || node.encargado || 'No asignado'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="px-2 py-0.5 bg-gray-100 text-[10px] font-black text-gray-500 rounded-md w-fit uppercase line-clamp-1">
                          Tipo: {node.tipoUnidadInfo?.tipo_unidad || catTipos?.find(t => t.id_tipo === node.tipo_unidad)?.tipo_unidad || node.tipo_unidad || 'SIN TIPO'}
                        </span>
                        <span className="px-2 py-0.5 bg-blue-50 text-[10px] font-black text-blue-600 rounded-md w-fit uppercase">
                          Zona: {node.clave_zona}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleOpenDetail(node)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" title="Ver Detalles"><Eye size={18} /></button>
                        <button onClick={() => handleOpenEdit(node)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" title="Editar"><Edit2 size={18} /></button>
                        <button onClick={() => handleDeleteClick(node)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex flex-col gap-0.5">
            <p className="text-xs text-gray-500 font-medium">Total: <span className="text-gray-900 font-bold">{totalCount}</span> unidades registradas.</p>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Página {history.length + 1} de {totalPages || 1}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrevPage} disabled={history.length === 0} className="px-4 py-1.5 text-xs font-semibold bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm">Anterior</button>
            <button onClick={handleNextPage} disabled={!pageInfo.hasNextPage} className="px-4 py-1.5 text-xs font-semibold bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm">Siguiente</button>
          </div>
        </div>
      </div>

      <UnidadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} unidadToEdit={unidadToEdit} onSubmit={handleSubmit} isLoading={createUnidad.isLoading || updateUnidad.isLoading} />
      <DetalleUnidadModal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} unidad={unidadToShow} />
      <ConfirmModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleConfirmDelete}
        title="Eliminar Unidad" message={`¿Estás seguro de eliminar la unidad "${unidadToDelete?.descripcion || unidadToDelete?.clave}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar" isLoading={deleteUnidad.isLoading} />
    </div>
  );
}
