import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, Loader2, Building2, AlertTriangle, Eye, Home, MapPin, User, ChevronRight } from 'lucide-react';
import { useInmuebles, useCreateInmueble, useUpdateInmueble, useDeleteInmueble } from '../hooks/useInmuebles';
import InmuebleModal from '../components/InmuebleModal';
import ConfirmModal from '../components/ConfirmModal';
import DetalleInmuebleModal from '../components/DetalleInmuebleModal';

export default function Inmuebles() {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inmuebleToEdit, setInmuebleToEdit] = useState(null);
  
  // Detail state
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [inmuebleToShow, setInmuebleToShow] = useState(null);

  // Deletion state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [inmuebleToDelete, setInmuebleToDelete] = useState(null);

  // Pagination State
  const [after, setAfter] = useState(null);
  const [history, setHistory] = useState([]);

  // Queries & Mutations
  const { data, isLoading } = useInmuebles({ 
    search, 
    pagination: { first: 10, after } 
  });
  
  const edges = data?.edges || [];
  const pageInfo = data?.pageInfo || {};
  const totalCount = pageInfo.totalCount || 0;
  const currentPage = history.length + 1;
  const totalPages = Math.ceil(totalCount / 10);

  const createInmueble = useCreateInmueble();
  const updateInmueble = useUpdateInmueble();
  const deleteInmueble = useDeleteInmueble();

  // Handlers
  const handleOpenCreate = () => {
    setInmuebleToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (inmueble) => {
    setInmuebleToEdit(inmueble);
    setIsModalOpen(true);
  };

  const handleOpenDetail = (inmueble) => {
    setInmuebleToShow(inmueble);
    setIsDetailOpen(true);
  };

  const handleNextPage = () => {
    if (pageInfo.hasNextPage) {
      setHistory([...history, after]);
      setAfter(pageInfo.endCursor);
    }
  };

  const handlePrevPage = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory(history.slice(0, -1));
      setAfter(prev);
    }
  };

  const handleSearch = (val) => {
    setSearch(val);
    setAfter(null);
    setHistory([]);
  };

  const handleDeleteClick = (inmueble) => {
    setInmuebleToDelete(inmueble);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!inmuebleToDelete) return;
    try {
      await deleteInmueble.mutateAsync({ clave: inmuebleToDelete.clave });
      setIsDeleteModalOpen(false);
      setInmuebleToDelete(null);
    } catch (err) {
      alert('Error al eliminar el inmueble.');
    }
  };

  const handleSubmit = async (formData) => {
    try {
      if (inmuebleToEdit) {
        await updateInmueble.mutateAsync(formData);
      } else {
        await createInmueble.mutateAsync(formData);
      }
      setIsModalOpen(false);
    } catch (err) {
      alert('Error al guardar el inmueble: ' + (err.response?.errors?.[0]?.message || err.message));
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Building2 size={24} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Catálogo de Inmuebles</h1>
          </div>
          <p className="text-sm text-gray-500">Gestión del inventario de inmuebles y delegaciones (Legacy).</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 active:scale-95"
        >
          <Plus size={20} />
          Nuevo Inmueble
        </button>
      </div>

      {/* Filters & Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[calc(100vh-220px)]">
        
        {/* Search Bar */}
        <div className="p-4 border-b border-gray-50 bg-gray-50/30 flex-shrink-0">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por descripción, clave o ciudad..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Table Content with Internal Scroll */}
        <div className="flex-1 overflow-auto scrollbar-hide relative">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Inmueble / Clave</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Ubicación</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Encargado</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Clasificación</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={32} className="text-blue-500 animate-spin" />
                      <p className="text-sm font-medium text-gray-400">Cargando inmuebles...</p>
                    </div>
                  </td>
                </tr>
              ) : edges.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <AlertTriangle size={32} className="text-gray-300" />
                      <p className="text-sm font-medium text-gray-400">No se encontraron inmuebles</p>
                    </div>
                  </td>
                </tr>
              ) : (
                edges.map(({ node }) => (
                  <tr key={node.clave} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                          <Home size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800 line-clamp-1">{node.descripcion || 'Sin descripción'}</p>
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">{node.clave}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-600 font-medium">
                        <MapPin size={14} className="text-red-400" />
                        <span className="text-sm">{node.ciudad ? `${node.ciudad}, ${node.municipio || ''}` : 'No definida'}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{node.direccion}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-700">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                          <User size={12} className="text-blue-600" />
                        </div>
                        <span className="text-sm font-bold">{node.encargado || 'No asignado'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="px-2 py-0.5 bg-gray-100 text-[10px] font-black text-gray-500 rounded-md w-fit uppercase line-clamp-1">
                          {node.tipoUnidadInfo?.tipo_unidad || `Tipo: ${node.tipo_unidad}`}
                        </span>
                        <span className="px-2 py-0.5 bg-blue-50 text-[10px] font-black text-blue-600 rounded-md w-fit uppercase">Zona: {node.clave_zona}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 transition-opacity">
                        <button
                          onClick={() => handleOpenDetail(node)}
                          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Ver Detalles"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(node)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(node)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / Pagination Controls */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex flex-col gap-0.5">
            <p className="text-xs text-gray-500 font-medium">
              Total: <span className="text-gray-900 font-bold">{totalCount}</span> inmuebles registrados.
            </p>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
              Página {currentPage} de {totalPages || 1}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={history.length === 0}
              className="px-4 py-1.5 text-xs font-semibold bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
            >
              Anterior
            </button>
            <button
              onClick={handleNextPage}
              disabled={!pageInfo.hasNextPage}
              className="px-4 py-1.5 text-xs font-semibold bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* Modal Integration */}
      <InmuebleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        inmuebleToEdit={inmuebleToEdit}
        onSubmit={handleSubmit}
      />

      <DetalleInmuebleModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        inmueble={inmuebleToShow}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Inmueble"
        message={`¿Estás seguro de que deseas eliminar el inmueble "${inmuebleToDelete?.descripcion}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        confirmColor="bg-red-600 hover:bg-red-700"
      />
    </div>
  );
}
