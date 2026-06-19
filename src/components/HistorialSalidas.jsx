import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { GET_REGISTRO_SALIDAS, ACTUALIZAR_SALIDA } from '../api/salidas.queries';
import { useApp } from '../context/AppContext';
import {
  Search, RefreshCw, Edit2, FileDown, ChevronLeft, ChevronRight, Hash, User,
  Calendar, MapPin, Phone, Briefcase, FileText, Check, X, Loader2
} from 'lucide-react';
import { formatDate } from '../lib/utils';
import { buildPDFBytes } from '../utils/pdfSalidas';

import SalidasForm from './SalidasForm';

function Modal({ onClose, title, children }) {
  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50 pointer-events-none" />
      <div className="relative bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100vh-4rem)] max-w-[90vw] lg:max-w-6xl">
        <div className="bg-teal-700 px-5 sm:px-6 py-4 flex items-center justify-between text-white flex-shrink-0">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5 bg-gray-50/50">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function HistorialSalidas() {
  const { showToast } = useApp();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [editingSalida, setEditingSalida] = useState(null);
  const [isGeneratingPdfId, setIsGeneratingPdfId] = useState(null);
  const [pageInput, setPageInput] = useState('');

  const PAGE_SIZE = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Handle pagination changes
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['registroSalidas', debouncedSearch, currentPage, startDate, endDate],
    queryFn: () => {
      const filter = {};
      if (debouncedSearch) filter.search = debouncedSearch;
      if (startDate) filter.fecha_inicio = startDate;
      if (endDate) filter.fecha_fin = endDate;
      
      return gqlClient.request(GET_REGISTRO_SALIDAS, {
        filter,
        pagination: { first: PAGE_SIZE, page: currentPage }
      });
    },
  });

  const registros = data?.registroSalidas?.edges?.map(e => e.node) || [];
  const pageInfo = data?.registroSalidas?.pageInfo;
  const totalItems = pageInfo?.totalCount || 0;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;

  const handleRegenerarPdf = async (salida) => {
    setIsGeneratingPdfId(salida.id_salida);
    try {
      // transform salida back into "form" state expected by buildPDFBytes
      const form = {
        fechaSalidaDia: salida.fecha_salida,
        solicitante: salida.solicitante,
        matricula: salida.matricula,
        adscripcion: salida.adscripcion,
        empresa: salida.empresa,
        identificacion: salida.identificacion,
        telefono: salida.telefono,
        motivo: salida.motivo,
        origenBienes: salida.origen_bienes,
        responsable: salida.responsable,
        devolucion: salida.sujeto_devolucion ? 'SI' : 'NO',
        fechaDevolucion: salida.fecha_devolucion,
        observaciones: salida.observaciones,
      };

      const bytes = await buildPDFBytes(salida.folio, form, salida.bienes);
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      window.open(url, '_blank');
      showToast('PDF regenerado exitosamente', 'success');
      setTimeout(() => URL.revokeObjectURL(url), 60000); // cleanup
    } catch (err) {
      console.error(err);
      showToast(`Error al regenerar PDF: ${err.message}`, 'error');
    } finally {
      setIsGeneratingPdfId(null);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Search & Filters */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-3 relative z-20">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por folio, solicitante, motivo, num serie, num inv, modelo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
           <div className="flex items-center gap-2 text-sm">
             <Calendar size={14} className="text-gray-400" />
             <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} 
               className="border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-teal-500 text-xs" />
             <span className="text-gray-400">-</span>
             <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} 
               className="border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-teal-500 text-xs" />
           </div>
          <button
            onClick={() => refetch()}
            title="Refrescar"
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors ml-2"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col min-h-0 overflow-hidden relative">
        <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar relative">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Folio / Fecha</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Solicitante</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Motivo</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Responsable</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Bienes</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center w-28">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                    <Loader2 size={24} className="animate-spin mx-auto text-teal-500 mb-2" />
                    Cargando historial de salidas...
                  </td>
                </tr>
              ) : registros.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center text-gray-500">
                    <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FileText size={24} className="text-gray-400" />
                    </div>
                    <p className="font-semibold text-gray-700">No hay registros de salidas</p>
                    <p className="text-sm mt-1">Genera un nuevo formato para empezar a llevar el historial.</p>
                  </td>
                </tr>
              ) : (
                registros.map((salida) => (
                  <tr key={salida.id_salida} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="h-8 min-w-[2rem] px-2 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 font-bold border border-teal-100">
                          #{salida.folio}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar size={12} /> {formatDate(salida.fecha_salida)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="font-medium text-gray-800 text-sm">{salida.solicitante}</div>
                      {salida.adscripcion && (
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin size={10} /> {salida.adscripcion}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle text-sm text-gray-700 max-w-[200px] truncate" title={salida.motivo}>
                      {salida.motivo || <span className="text-gray-400 italic">No especificado</span>}
                      {salida.sujeto_devolucion && (
                        <span className="block mt-1 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-md inline-block">
                          Devolución: {formatDate(salida.fecha_devolucion)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-1.5 text-sm text-gray-700">
                        <User size={14} className="text-gray-400" />
                        <span className="truncate max-w-[150px]" title={salida.responsable}>{salida.responsable}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle text-center">
                      <span className="inline-flex items-center justify-center px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-semibold border border-gray-200">
                        {salida.bienes?.length || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle text-center">
                      <div className="flex items-center justify-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleRegenerarPdf(salida)}
                          disabled={isGeneratingPdfId === salida.id_salida}
                          title="Regenerar PDF"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-teal-600 hover:bg-teal-50 transition-colors disabled:opacity-50 border border-transparent hover:border-teal-200"
                        >
                          {isGeneratingPdfId === salida.id_salida ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                        </button>
                        <button
                          onClick={() => setEditingSalida(salida)}
                          title="Editar Registro"
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-200"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-3 border-t border-gray-100 flex flex-col gap-2 bg-gray-50 text-gray-600 flex-shrink-0">
          {/* Info total */}
          <div className="flex items-center justify-between text-xs">
            {totalItems > 0 && (
              <span className="font-semibold text-gray-700">Total: {totalItems} salidas registradas.</span>
            )}
            <span className="font-bold text-gray-400 uppercase tracking-wider">
              Pág. {currentPage}/{totalPages}
            </span>
          </div>

          {/* Controles de paginación */}
          <div className="flex items-center gap-1 flex-wrap justify-center">
            {/* Flecha Anterior */}
            <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1 || isLoading}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors flex-shrink-0">
              <ChevronLeft size={15} />
            </button>

            <div className="flex items-center justify-center gap-1 sm:gap-2 w-full sm:w-[260px] order-last sm:order-none mt-2 sm:mt-0">
              {/* Página actual y páginas cercanas — más compacto en móvil */}
              {(() => {
                const pages = [];
                // Siempre mostrar página 1
                if (currentPage > 2) pages.push(1);
                // Separador
                if (currentPage > 3) pages.push('...-left');
                // Página anterior (si existe)
                if (currentPage > 1) pages.push(currentPage - 1);
                // Página actual
                pages.push(currentPage);
                // Página siguiente (si existe)
                if (currentPage < totalPages) pages.push(currentPage + 1);
                // Separador
                if (currentPage < totalPages - 2) pages.push('...-right');
                // Última página
                if (currentPage < totalPages - 1) pages.push(totalPages);
                return pages.map((p, idx) => {
                  if (typeof p === 'string') {
                    return <span key={p} className="px-1 text-gray-400 text-xs">...</span>;
                  }
                  return (
                    <button key={`page-${p}-${idx}`} onClick={() => setCurrentPage(p)} disabled={isLoading}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors flex-shrink-0 ${
                        currentPage === p ? 'bg-[#006341] text-white shadow-sm' : 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-600'
                      }`}>
                      {p}
                    </button>
                  );
                });
              })()}
            </div>

            {/* Flecha Siguiente */}
            <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages || isLoading || totalPages === 0}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors flex-shrink-0">
              <ChevronRight size={15} />
            </button>

            {/* Ir a página */}
            <form onSubmit={(e) => {
              e.preventDefault();
              const p = parseInt(pageInput, 10);
              if (!isNaN(p) && p >= 1 && p <= totalPages) {
                setCurrentPage(p);
                setPageInput('');
              }
            }} className="flex items-center gap-1 ml-1 border-l border-gray-200 pl-2">
              <input
                type="number"
                min="1"
                max={totalPages}
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                placeholder="Ir a..."
                disabled={isLoading}
                className="w-14 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#006341] focus:ring-1 focus:ring-[#006341] bg-white text-center"
              />
              <button type="submit" disabled={!pageInput || isLoading} className="px-2 py-1.5 bg-[#006341]/10 text-[#006341] font-semibold text-xs rounded-lg hover:bg-[#006341]/20 disabled:opacity-50 transition-colors">
                Ir
              </button>
            </form>
          </div>
        </div>
      </div>

      {editingSalida && (
        <Modal 
          title={`Editando Salida #${editingSalida.folio}`} 
          onClose={() => setEditingSalida(null)}
        >
          <SalidasForm 
            isEditMode={true} 
            initialData={editingSalida} 
            onClose={() => setEditingSalida(null)} 
            onSuccessCallback={() => {
              setEditingSalida(null);
              refetch();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
