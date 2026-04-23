import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, Loader2, Building2, AlertTriangle, CheckCircle2, Eye } from 'lucide-react';
import { useUnidades, useCreateUnidad, useUpdateUnidad, useDeleteUnidad } from '../hooks/useUnidades';
import UnidadModal from '../components/UnidadModal';
import ConfirmModal from '../components/ConfirmModal';
import DetalleUnidadModal from '../components/DetalleUnidadModal';

export default function Unidades() {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [unidadToEdit, setUnidadToEdit] = useState(null);
  
  // Detail state
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [unidadToShow, setUnidadToShow] = useState(null);

  // Deletion state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [unidadToDelete, setUnidadToDelete] = useState(null);

  // Pagination State
  const [after, setAfter] = useState(null);
  const [history, setHistory] = useState([]); // To track previous cursors for "Back"

  // Queries & Mutations
  const { data, isLoading, error } = useUnidades({ 
    search, 
    pagination: { first: 10, after } 
  });
  
  const unidades = data?.edges?.map(e => e.node) || [];
  const pageInfo = data?.pageInfo || {};

  const createUnidad = useCreateUnidad();
  const updateUnidad = useUpdateUnidad();
  const deleteUnidad = useDeleteUnidad();

  // Handlers
  const handleOpenCreate = () => {
    setUnidadToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (unidad) => {
    setUnidadToEdit(unidad);
    setIsModalOpen(true);
  };

  const handleOpenDetail = (unidad) => {
    setUnidadToShow(unidad);
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
    setAfter(null); // Reset pagination on search
    setHistory([]);
  };

  const handleDeleteClick = (unidad) => {
    setUnidadToDelete(unidad);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!unidadToDelete) return;
    try {
      await deleteUnidad.mutateAsync({ id_unidad: Number(unidadToDelete.id_unidad) });
      setIsDeleteModalOpen(false);
      setUnidadToDelete(null);
    } catch (err) {
      alert('Error al eliminar la unidad.');
    }
  };

  const handleSubmit = async (formData) => {
    try {
      if (unidadToEdit) {
        await updateUnidad.mutateAsync({ 
          id_unidad: Number(unidadToEdit.id_unidad),
          ...formData 
        });
      } else {
        await createUnidad.mutateAsync(formData);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Error al guardar la unidad.');
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
            <h1 className="text-2xl font-bold text-gray-900">Catálogo de Unidades</h1>
          </div>
          <p className="text-sm text-gray-500">Administra las unidades operativas y sus configuraciones de red.</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 active:scale-95"
        >
          <Plus size={20} />
          Nueva Unidad
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
              placeholder="Buscar por nombre, referencia o IP..."
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
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">No. Referencia</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Dirección IP</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Encargado</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Estatus</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={32} className="text-blue-500 animate-spin" />
                      <p className="text-sm font-medium text-gray-400">Cargando unidades...</p>
                    </div>
                  </td>
                </tr>
              ) : unidades.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <AlertTriangle size={32} className="text-gray-300" />
                      <p className="text-sm font-medium text-gray-400">No se encontraron unidades</p>
                    </div>
                  </td>
                </tr>
              ) : (
                unidades.map((u) => (
                  <tr key={u.id_unidad} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4 text-sm font-mono text-gray-400">#{u.id_unidad}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                        {u.no_ref}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-gray-800">{u.nombre || '—'}</p>
                      {u.clave && <p className="text-[10px] text-gray-400 uppercase tracking-tighter">Clave: {u.clave}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                        {u.ip}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {u.encargado || <span className="text-gray-300">No asignado</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {u.estatus === 1 ? (
                        <div className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-lg text-[10px] font-bold uppercase">
                          <CheckCircle2 size={12} /> Activa
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 text-gray-400 bg-gray-50 px-2 py-1 rounded-lg text-[10px] font-bold uppercase">
                          Inactiva
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 transition-opacity">
                        <button
                          onClick={() => handleOpenDetail(u)}
                          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Ver Detalles"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(u)}
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
              Total: <span className="text-gray-900 font-bold">{pageInfo.totalCount || 0}</span> unidades registradas.
            </p>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
              Página {history.length + 1} de {Math.ceil((pageInfo.totalCount || 0) / 10)}
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
      <UnidadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        unidadToEdit={unidadToEdit}
        onSubmit={handleSubmit}
      />

      <DetalleUnidadModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        unidad={unidadToShow}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Unidad"
        message={`¿Estás seguro de eliminar la unidad "${unidadToDelete?.nombre || unidadToDelete?.no_ref}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        isLoading={deleteUnidad.isLoading}
      />
    </div>
  );
}
