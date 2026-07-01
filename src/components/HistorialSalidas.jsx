import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { GET_REGISTRO_SALIDAS, ACTUALIZAR_SALIDA } from '../api/salidas.queries';
import { useApp } from '../context/AppContext';
import {
 Search, RefreshCw, Edit2, FileDown, ChevronLeft, ChevronRight, Hash, User,
 Calendar, MapPin, Phone, Briefcase, FileText, Check, X, Loader2, Package, Eye
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
 <div className="absolute inset-0 bg-black/50 dark:bg-black/70 pointer-events-none" />
 <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100vh-4rem)] max-w-[90vw] lg:max-w-6xl">
 <div className="bg-teal-700 px-5 sm:px-6 py-4 flex items-center justify-between text-white flex-shrink-0">
 <h3 className="text-xl font-bold">{title}</h3>
 <button onClick={onClose}
 className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors">
 <X size={20} />
 </button>
 </div>
 <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5 bg-gray-50 dark:bg-gray-900 ">
 {children}
 </div>
 </div>
 </div>,
 document.body
 );
}

const HighlightText = ({ text, highlight }) => {
  if (!highlight || !text) return <>{text}</>;
  const strText = String(text);
  const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = strText.split(new RegExp(`(${escapedHighlight})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase()
          ? <span key={i} className="bg-yellow-200 dark:bg-yellow-500/40 text-yellow-900 dark:text-yellow-100 font-bold">{part}</span>
          : part
      )}
    </>
  );
};

const getBienDesc = (b) => {
  if (b.descripcion && b.descripcion.trim() !== '') {
    return b.descripcion;
  }
  if (b.bienRef) {
    const modelo = b.bienRef.modelo?.descrip_disp || '';
    const serie = b.bienRef.num_serie ? ` - S/N: ${b.bienRef.num_serie}` : '';
    const inv = b.bienRef.num_inv ? ` - INV: ${b.bienRef.num_inv}` : '';
    return `${modelo}${serie}${inv}` || 'Bien sin descripción detallada';
  }
  return 'Bien sin descripción';
};

function BienesTableCell({ salida, search, onOpenModal }) {
  const [hoverPos, setHoverPos] = useState(null);
  const cellRef = useRef(null);
  const hoverTimerRef = useRef(null);
  const closeTimerRef = useRef(null);
  const goods = salida.bienes || [];

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (!cellRef.current || goods.length === 0) return;
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    if (hoverPos) return;

    hoverTimerRef.current = setTimeout(() => {
      if (!cellRef.current) return;
      const rect = cellRef.current.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      let left = rect.left;
      if (left + 500 > windowWidth) {
        left = Math.max(10, windowWidth - 510);
      }
      let top = rect.bottom;
      if (top + 280 > windowHeight && rect.top > 280) {
        top = Math.max(10, rect.top - 280);
      }
      setHoverPos({ top, left });
    }, 150);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setHoverPos(null);
    }, 350);
  };

  const handlePopoverMouseEnter = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  };

  const handlePopoverMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      setHoverPos(null);
    }, 250);
  };

  return (
    <td
      ref={cellRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="px-4 py-3 align-top max-w-[300px]"
    >
      {goods.length === 0 ? (
        <span className="text-gray-400 italic text-xs">Sin bienes</span>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60">
              <Package size={12} /> {goods.length} {goods.length === 1 ? 'bien' : 'bienes'}
            </span>
          </div>
          <div className="space-y-1">
            {goods.slice(0, 2).map((b, idx) => (
              <div key={idx} className="text-xs text-gray-700 dark:text-gray-300 line-clamp-1 flex items-start gap-1" title={getBienDesc(b)}>
                <span className="text-teal-600 dark:text-teal-400 font-bold flex-shrink-0">•</span>
                <span className="truncate">
                  {b.cantidad_o_id && <span className="font-mono font-semibold text-gray-500 dark:text-gray-400 mr-1">[<HighlightText text={b.cantidad_o_id} highlight={search} />]</span>}
                  <HighlightText text={getBienDesc(b)} highlight={search} />
                </span>
              </div>
            ))}
          </div>
          {goods.length > 2 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
                if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
                setHoverPos(null);
                onOpenModal(salida);
              }}
              className="text-left text-xs text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 font-semibold flex items-center gap-1 transition-colors group/btn pt-0.5"
            >
              <Eye size={12} className="group-hover/btn:scale-110 transition-transform" />
              <span>Ver {goods.length - 2} más en tabla...</span>
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
                if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
                setHoverPos(null);
                onOpenModal(salida);
              }}
              className="text-left text-[11px] text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 flex items-center gap-1 transition-colors pt-0.5 opacity-80 hover:opacity-100"
            >
              <Eye size={11} />
              <span>Ver tabla de bienes</span>
            </button>
          )}
        </div>
      )}

      {hoverPos && ReactDOM.createPortal(
        <div
          style={{ top: hoverPos.top, left: hoverPos.left }}
          onMouseEnter={handlePopoverMouseEnter}
          onMouseLeave={handlePopoverMouseLeave}
          className="fixed z-[99999] w-[490px] max-h-[300px] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3.5 pointer-events-auto flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 dark:border-gray-700/80">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400">
                <Package size={14} />
              </span>
              <span className="font-bold text-xs text-gray-800 dark:text-gray-200">
                Bienes de Salida #{salida.folio} ({goods.length})
              </span>
            </div>
            <span className="text-[10px] bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 px-1.5 py-0.5 rounded font-medium">
              Interactiva (Scrollable)
            </span>
          </div>
          <div className="overflow-y-auto max-h-[230px] custom-scrollbar pr-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-700 sticky top-0 z-10">
                  <th className="py-1.5 px-2 w-16">Cant.</th>
                  <th className="py-1.5 px-2">Descripción / Bien</th>
                  <th className="py-1.5 px-2 w-28">Naturaleza</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                {goods.map((b, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                    <td className="py-1.5 px-2 font-mono font-medium text-teal-700 dark:text-teal-400">
                      <HighlightText text={b.cantidad_o_id || '1'} highlight={search} />
                    </td>
                    <td className="py-1.5 px-2">
                      <div className="font-medium text-gray-800 dark:text-gray-200 line-clamp-2">
                        <HighlightText text={getBienDesc(b)} highlight={search} />
                      </div>
                      {b.bienRef && (
                        <div className="text-[10px] text-gray-400 flex items-center gap-2 mt-0.5 font-mono">
                          {b.bienRef.num_serie && <span>S/N: <HighlightText text={b.bienRef.num_serie} highlight={search} /></span>}
                          {b.bienRef.num_inv && <span>INV: <HighlightText text={b.bienRef.num_inv} highlight={search} /></span>}
                        </div>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-[11px] text-gray-500 dark:text-gray-400">
                      <HighlightText text={b.naturaleza || '-'} highlight={search} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>,
        document.body
      )}
    </td>
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
 const [viewingBienesSalida, setViewingBienesSalida] = useState(null);
 const [modalSearch, setModalSearch] = useState('');
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
 if (startDate) filter.fecha_desde = startDate;
 if (endDate) filter.fecha_hasta = endDate;
 
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
 <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row gap-3 relative z-20">
 <div className="relative flex-1">
 <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
 <input
 type="text"
 placeholder="Buscar por folio, solicitante, descripción del bien, motivo..."
 value={search}
 onChange={e => setSearch(e.target.value)}
 className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
 />
 </div>
 <div className="flex items-center gap-2 flex-wrap">
 <div className="flex items-center gap-2 text-sm">
 <Calendar size={14} className="text-gray-400" />
 <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} 
 className="border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-teal-500 text-xs" />
 <span className="text-gray-400">-</span>
 <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} 
 className="border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-teal-500 text-xs" />
 </div>
 <button
 onClick={() => refetch()}
 title="Refrescar"
 className="w-9 h-9 rounded-xl flex items-center justify-center border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 transition-colors ml-2"
 >
 <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
 </button>
 </div>
 </div>

 {/* Table */}
 <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm flex flex-col min-h-0 overflow-hidden relative">
 <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar relative">
 <table className="w-full text-left border-collapse min-w-[800px]">
 <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
 <tr>
 <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Folio / Fecha</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Solicitante</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Motivo</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Responsable</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bienes / Descripción</th>
 <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center w-28">Acciones</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
 {isLoading ? (
 <tr>
 <td colSpan="6" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 ">
 <Loader2 size={24} className="animate-spin mx-auto text-teal-500 mb-2" />
 Cargando historial de salidas...
 </td>
 </tr>
 ) : registros.length === 0 ? (
 <tr>
 <td colSpan="6" className="px-4 py-12 text-center text-gray-500 dark:text-gray-400 ">
 <div className="bg-gray-50 dark:bg-gray-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
 <FileText size={24} className="text-gray-400" />
 </div>
 <p className="font-semibold text-gray-700 dark:text-gray-300 ">No hay registros de salidas</p>
 <p className="text-sm mt-1">Genera un nuevo formato para empezar a llevar el historial.</p>
 </td>
 </tr>
 ) : (
 registros.map((salida) => (
 <tr key={salida.id_salida} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 transition-colors group">
 <td className="px-4 py-3 align-middle">
 <div className="flex items-center gap-3">
 <div className="h-8 min-w-[2rem] px-2 rounded-lg bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold border border-teal-100 dark:border-teal-800/50">
 #<HighlightText text={salida.folio} highlight={debouncedSearch} />
 </div>
 <div>
 <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
 <Calendar size={12} /> {formatDate(salida.fecha_salida)}
 </p>
 </div>
 </div>
 </td>
 <td className="px-4 py-3 align-middle">
 <div className="font-medium text-gray-800 dark:text-gray-200 text-sm">
   <HighlightText text={salida.solicitante} highlight={debouncedSearch} />
 </div>
 {salida.adscripcion && (
 <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
 <MapPin size={10} /> <HighlightText text={salida.adscripcion} highlight={debouncedSearch} />
 </div>
 )}
 </td>
 <td className="px-4 py-3 align-middle text-sm text-gray-700 dark:text-gray-300 max-w-[200px] truncate" title={salida.motivo}>
 {salida.motivo ? <HighlightText text={salida.motivo} highlight={debouncedSearch} /> : <span className="text-gray-400 italic">No especificado</span>}
 {salida.sujeto_devolucion && (
 <span className="block mt-1 text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 dark:border-amber-800/50 px-1.5 py-0.5 rounded-md inline-block">
 Devolución: {formatDate(salida.fecha_devolucion)}
 </span>
 )}
 </td>
 <td className="px-4 py-3 align-middle">
 <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 ">
 <User size={14} className="text-gray-400" />
 <span className="truncate max-w-[150px]" title={salida.responsable}>
   <HighlightText text={salida.responsable} highlight={debouncedSearch} />
 </span>
 </div>
 </td>
 <BienesTableCell salida={salida} search={debouncedSearch} onOpenModal={(s) => {
 setModalSearch('');
 setViewingBienesSalida(s);
 }} />
 <td className="px-4 py-3 align-middle text-center">
 <div className="flex items-center justify-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
 <button
 onClick={() => handleRegenerarPdf(salida)}
 disabled={isGeneratingPdfId === salida.id_salida}
 title="Regenerar PDF"
 className="w-8 h-8 flex items-center justify-center rounded-lg text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors disabled:opacity-50 border border-transparent hover:border-teal-200 dark:border-teal-800/50"
 >
 {isGeneratingPdfId === salida.id_salida ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
 </button>
 <button
 onClick={() => setEditingSalida(salida)}
 title="Editar Registro"
 className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800/50"
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
 <div className="p-3 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-2 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 flex-shrink-0">
 {/* Info total */}
 <div className="flex items-center justify-between text-xs">
 {totalItems > 0 && (
 <span className="font-semibold text-gray-700 dark:text-gray-300 ">Total: {totalItems} salidas registradas.</span>
 )}
 <span className="font-bold text-gray-400 uppercase tracking-wider">
 Pág. {currentPage}/{totalPages}
 </span>
 </div>

 {/* Controles de paginación */}
 <div className="flex items-center gap-1 flex-wrap justify-center">
 {/* Flecha Anterior */}
 <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1 || isLoading}
 className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors flex-shrink-0">
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
 currentPage === p ? 'bg-[#006341] text-white shadow-sm' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 '
 }`}>
 {p}
 </button>
 );
 });
 })()}
 </div>

 {/* Flecha Siguiente */}
 <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages || isLoading || totalPages === 0}
 className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors flex-shrink-0">
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
 }} className="flex items-center gap-1 ml-1 border-l border-gray-200 dark:border-gray-700 pl-2">
 <input
 type="number"
 min="1"
 max={totalPages}
 value={pageInput}
 onChange={(e) => setPageInput(e.target.value)}
 placeholder="Ir a..."
 disabled={isLoading}
 className="w-14 px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-[#006341] focus:ring-1 focus:ring-[#006341] bg-white dark:bg-gray-800 text-center"
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

 {viewingBienesSalida && (
 <Modal
 title={`Bienes de la Salida #${viewingBienesSalida.folio}`}
 onClose={() => setViewingBienesSalida(null)}
 >
 <div className="space-y-4">
 {/* Resumen superior */}
 <div className="bg-white dark:bg-gray-800 rounded-xl p-3.5 border border-gray-100 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
 <div>
 <span className="text-gray-400 block">Solicitante:</span>
 <span className="font-semibold text-gray-800 dark:text-gray-200">{viewingBienesSalida.solicitante}</span>
 </div>
 <div>
 <span className="text-gray-400 block">Fecha Salida:</span>
 <span className="font-semibold text-gray-800 dark:text-gray-200">{formatDate(viewingBienesSalida.fecha_salida)}</span>
 </div>
 <div>
 <span className="text-gray-400 block">Responsable:</span>
 <span className="font-semibold text-gray-800 dark:text-gray-200">{viewingBienesSalida.responsable}</span>
 </div>
 <div>
 <span className="text-gray-400 block">Motivo:</span>
 <span className="font-semibold text-gray-800 dark:text-gray-200 truncate block" title={viewingBienesSalida.motivo}>{viewingBienesSalida.motivo || 'N/A'}</span>
 </div>
 </div>

 {/* Buscador dentro del modal */}
 <div className="relative">
 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
 <input
 type="text"
 placeholder="Filtrar bienes en esta salida por descripción, S/N o INV..."
 value={modalSearch}
 onChange={(e) => setModalSearch(e.target.value)}
 className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white dark:bg-gray-800"
 />
 </div>

 {/* Tabla completa de bienes */}
 <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm max-h-[50vh] overflow-y-auto custom-scrollbar">
 <table className="w-full text-left text-xs border-collapse">
 <thead className="bg-gray-50 dark:bg-gray-900/80 sticky top-0 border-b border-gray-100 dark:border-gray-700 font-semibold text-gray-500 dark:text-gray-400">
 <tr>
 <th className="py-2.5 px-3 w-10 text-center">#</th>
 <th className="py-2.5 px-3 w-28">Cant. / ID</th>
 <th className="py-2.5 px-3">Descripción / Bien</th>
 <th className="py-2.5 px-3 w-32">No. Serie</th>
 <th className="py-2.5 px-3 w-32">No. Inventario</th>
 <th className="py-2.5 px-3 w-28">Naturaleza</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
 {(() => {
 const filtered = (viewingBienesSalida.bienes || []).filter(b => {
 if (!modalSearch) return true;
 const term = modalSearch.toLowerCase();
 const desc = getBienDesc(b).toLowerCase();
 const sn = (b.bienRef?.num_serie || '').toLowerCase();
 const inv = (b.bienRef?.num_inv || '').toLowerCase();
 const id = (b.cantidad_o_id || '').toLowerCase();
 return desc.includes(term) || sn.includes(term) || inv.includes(term) || id.includes(term);
 });

 if (filtered.length === 0) {
 return (
 <tr>
 <td colSpan="6" className="py-8 text-center text-gray-400 italic">
 No se encontraron bienes con el criterio de búsqueda.
 </td>
 </tr>
 );
 }

 return filtered.map((b, idx) => {
    const activeHighlight = modalSearch || debouncedSearch;
    return (
      <tr key={idx} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/60">
        <td className="py-2.5 px-3 text-center text-gray-400 font-mono">{idx + 1}</td>
        <td className="py-2.5 px-3 font-mono font-bold text-teal-700 dark:text-teal-400">
          <HighlightText text={b.cantidad_o_id || '1'} highlight={activeHighlight} />
        </td>
        <td className="py-2.5 px-3 font-medium text-gray-800 dark:text-gray-200">
          <HighlightText text={getBienDesc(b)} highlight={activeHighlight} />
        </td>
        <td className="py-2.5 px-3 font-mono text-gray-600 dark:text-gray-300">
          {b.bienRef?.num_serie ? <HighlightText text={b.bienRef.num_serie} highlight={activeHighlight} /> : <span className="text-gray-400">-</span>}
        </td>
        <td className="py-2.5 px-3 font-mono text-gray-600 dark:text-gray-300">
          {b.bienRef?.num_inv ? <HighlightText text={b.bienRef.num_inv} highlight={activeHighlight} /> : <span className="text-gray-400">-</span>}
        </td>
        <td className="py-2.5 px-3 text-gray-500 dark:text-gray-400">
          <HighlightText text={b.naturaleza || '-'} highlight={activeHighlight} />
        </td>
      </tr>
    );
  });
 })()}
 </tbody>
 </table>
 </div>

 <div className="flex justify-end pt-2">
 <button
 onClick={() => setViewingBienesSalida(null)}
 className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold transition-colors"
 >
 Cerrar
 </button>
 </div>
 </div>
 </Modal>
 )}
 </div>
 );
}
