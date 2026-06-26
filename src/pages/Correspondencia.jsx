import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
 Search, Plus, RefreshCw, Loader2, AlertTriangle, FileText,
 ArrowDownCircle, ArrowUpCircle, CheckCircle, ChevronLeft, ChevronRight,
 Edit, Trash2, X
} from 'lucide-react';
import ReactDOM from 'react-dom';
import { getMesaCorrespondencias, eliminarMesaCorrespondencia } from '../api/correspondencia.queries';
import FormCorrespondenciaModal from '../components/FormCorrespondenciaModal';
import { parseServerDate } from '../lib/utils';
import { useAuthStore } from '../store/auth.store';
import { useApp } from '../context/AppContext';

const HighlightText = ({ text, highlight }) => {
 if (!highlight || !text) return <>{text}</>;
 const strText = String(text);
 const parts = strText.split(new RegExp(`(${highlight})`, 'gi'));
 return (
 <>
 {parts.map((part, i) =>
 part.toLowerCase() === highlight.toLowerCase()
 ? <span key={i} className="bg-yellow-200 text-yellow-900 font-bold">{part}</span>
 : part
 )}
 </>
 );
};

export default function Correspondencia() {
 const usuario = useAuthStore((s) => s.usuario);
 const isMaestroAdmin = usuario?.id_rol === 1 || usuario?.id_rol === 2;
 const canDelete = usuario?.id_rol === 1;
 const queryClient = useQueryClient();
 const { showToast } = useApp();

 const [isModalOpen, setIsModalOpen] = useState(false);
 const [initialData, setInitialData] = useState(null);
 const [expandedDesc, setExpandedDesc] = useState({});

 const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
 const [recordToDelete, setRecordToDelete] = useState(null);

 const toggleDesc = (folio) => {
 setExpandedDesc(prev => ({ ...prev, [folio]: !prev[folio] }));
 };

 // Estado de filtros
 const [filters, setFilters] = useState({ Tipo: '', NoOficio: '', Folio: '', PalabraClave: '' });
 const [activeFilters, setActiveFilters] = useState({});
 const [dateFilterType, setDateFilterType] = useState('NONE');
 const [startDate, setStartDate] = useState('');
 const [endDate, setEndDate] = useState('');

 // Paginación por cursor
 const PAGE_SIZE = 30;
 const [currentPage, setCurrentPage] = useState(1);
 const setCursor = () => {};
 
 const cursor = null;
 const history = { length: currentPage - 1 };
 const [pageInput, setPageInput] = useState('');
 

 const { data: correspondenciasData, isLoading, isError, refetch } = useQuery({
 queryKey: ['mesaCorrespondencias', activeFilters, currentPage],
 queryFn: () => getMesaCorrespondencias(
 Object.keys(activeFilters).length > 0 ? activeFilters : undefined,
 { first: PAGE_SIZE, page: currentPage }
 ),
 });

 const correspondencias = correspondenciasData?.edges?.map(e => e.node) || [];
 const pageInfo = correspondenciasData?.pageInfo;
 const totalPages = pageInfo?.totalCount ? Math.max(1, Math.ceil(pageInfo.totalCount / PAGE_SIZE)) : 1;

 const deleteMutation = useMutation({
 mutationFn: eliminarMesaCorrespondencia,
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['mesaCorrespondencias'] });
 showToast('Registro eliminado exitosamente', 'success');
 },
 onError: (err) => {
 showToast(err.message || 'Error al eliminar', 'error');
 }
 });

 const handleDelete = (corr) => {
 setRecordToDelete(corr);
 setIsDeleteModalOpen(true);
 };

 const handleConfirmDelete = () => {
 if (recordToDelete) {
 deleteMutation.mutate(recordToDelete.Folio);
 setIsDeleteModalOpen(false);
 setRecordToDelete(null);
 }
 };

 const handleEdit = (corr) => {
 setInitialData(corr);
 setIsModalOpen(true);
 };

 // Handlers de paginación
 const handleNextPage = () => { if (currentPage < (typeof totalPages !== 'undefined' ? totalPages : 9999)) setCurrentPage(p => p + 1); };

 const handlePrevPage = () => { setCurrentPage(p => Math.max(1, p - 1)); };

 // Ir a página específica usando el historial de cursores almacenados
 // history[i] = cursor que se usó para llegar a la página i+1
 // Sólo se puede saltar a páginas ya visitadas (1 ... currentPage)
 const handleJumpToPage = (e) => { e.preventDefault(); const p = parseInt(pageInput); if (!isNaN(p) && p >= 1 && p <= (typeof totalPages !== 'undefined' ? totalPages : 9999)) { setCurrentPage(p); } setPageInput(''); };

 // Reset paginación al cambiar filtros
 useEffect(() => {
 setCursor(null);
 setCurrentPage(1);
 }, [activeFilters]);

 const handleFilterChange = (e) => {
 const { name, value } = e.target;
 setFilters(prev => ({ ...prev, [name]: value }));
 };

 useEffect(() => {
 const timer = setTimeout(() => {
 const newFilters = {};
 if (filters.Tipo) newFilters.Tipo = parseInt(filters.Tipo);
 if (filters.NoOficio) newFilters.NoOficio = filters.NoOficio;
 if (filters.Folio) newFilters.Folio = parseInt(filters.Folio);
 if (filters.PalabraClave) newFilters.PalabraClave = filters.PalabraClave;
 if (dateFilterType !== 'NONE' && (startDate || endDate)) {
   newFilters.DateFilterType = dateFilterType;
   if (startDate) newFilters.StartDate = startDate;
   if (endDate) newFilters.EndDate = endDate;
 }
 setActiveFilters(newFilters);
 }, 400);
 return () => clearTimeout(timer);
 }, [filters, dateFilterType, startDate, endDate]);

 const formatDate = (dateStr) => {
 const d = parseServerDate(dateStr);
 return d ? d.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—';
 };

 return (
 <div className="p-4 sm:p-6 fade-in relative flex flex-col
 min-h-[calc(100dvh-70px)] overflow-y-auto
 sm:h-[calc(100vh-70px)] sm:overflow-hidden sm:min-h-0">

 {/* ─── Header ─────────────────────────────────────────────── */}
 <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
 <div className="flex flex-col items-start w-full sm:w-auto">
 <div className="flex items-center gap-3 w-full sm:w-auto">
 <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 ">Control de Correspondencia</h1>
 </div>
 <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestión de oficios enviados y recibidos</p>
 </div>

 <div className="flex items-center gap-3">
 <button
 onClick={() => refetch()}
 className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
 title="Actualizar"
 >
 <RefreshCw size={18} />
 </button>
 {isMaestroAdmin && (
 <button
 onClick={() => { setInitialData(null); setIsModalOpen(true); }}
 className="flex items-center gap-2 bg-[#00472e] dark:bg-[#002618] hover:bg-[#003824] text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm shadow-sm"
 >
 <Plus size={16} /><span>Nuevo Registro</span>
 </button>
 )}
 </div>
 </div>

 {/* ─── Filtros ─────────────────────────────────────────────── */}
 <div className="flex flex-col gap-3 bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 mb-4 flex-shrink-0">

 {/* Tabs tipo */}
 <div className="flex bg-gray-100 dark:bg-gray-900/50 p-1 rounded-xl w-full">
 {[
 { label: 'Todos', value: '' },
 { label: 'Enviadas', value: '1' },
 { label: 'Recibidas', value: '2' },
 ].map(tab => (
 <button
 key={tab.value}
 onClick={() => setFilters(prev => ({ ...prev, Tipo: tab.value }))}
 className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
 filters.Tipo === tab.value ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100 ' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
 }`}
 >
 {tab.label}
 </button>
 ))}
 </div>

 {/* Búsqueda y Filtros de Fecha */}
  <div className="flex flex-col sm:flex-row gap-2 flex-wrap items-center">
  <div className="relative flex-1 min-w-[200px] w-full sm:w-auto">
  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
  <input
  type="text"
  name="PalabraClave"
  value={filters.PalabraClave}
  onChange={handleFilterChange}
  placeholder="Buscar por descripción o remitente..."
  className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-green-600 focus:bg-white dark:bg-gray-800 outline-none transition-all"
  />
  </div>
  <div className="flex gap-2 w-full sm:w-auto">
  <input
  type="text"
  name="NoOficio"
  value={filters.NoOficio}
  onChange={handleFilterChange}
  placeholder="No. Oficio..."
  className="flex-1 sm:flex-none w-full sm:w-28 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-green-600 focus:bg-white dark:bg-gray-800 outline-none transition-all"
  />
  <input
  type="number"
  name="Folio"
  value={filters.Folio}
  onChange={handleFilterChange}
  placeholder="Folio..."
  className="w-24 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-green-600 focus:bg-white dark:bg-gray-800 outline-none transition-all"
  />
  </div>

  <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
  <select
  value={dateFilterType}
  onChange={(e) => setDateFilterType(e.target.value)}
  className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-green-600 focus:bg-white dark:bg-gray-800 outline-none transition-all font-medium text-gray-700 dark:text-gray-300 cursor-pointer w-full sm:w-auto"
  >
  <option value="NONE">Sin filtro de fecha</option>
  <option value="RECEPCION">Fecha Recepción</option>
  <option value="OFICIO">Fecha Oficio</option>
  </select>
  
  {dateFilterType !== 'NONE' && (
  <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
  <input 
  type="date" 
  value={startDate} 
  onChange={e => setStartDate(e.target.value)} 
  className="flex-1 sm:flex-none px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-green-600 focus:bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none transition-all" 
  />
  <span className="text-gray-400 text-xs font-medium">a</span>
  <input 
  type="date" 
  value={endDate} 
  onChange={e => setEndDate(e.target.value)} 
  className="flex-1 sm:flex-none px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-green-600 focus:bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 outline-none transition-all" 
  />
  </div>
  )}
  </div>
  </div>
  </div>

 {/* ─── Wrapper tabla: scroll interno en desktop ────────────── */}
 <div className="sm:flex-1 sm:min-h-0 sm:flex sm:flex-col sm:overflow-hidden">
 <div className="flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden
 mb-8 sm:mb-0 sm:flex-1 sm:min-h-0 sm:flex sm:flex-col">

 {/* Área de la tabla */}
 <div className="w-full overflow-x-auto sm:flex-1 sm:min-h-0 sm:overflow-y-auto">
 {isLoading ? (
 <div className="flex items-center justify-center py-16 min-h-[200px]">
 <div className="flex flex-col items-center gap-3 text-gray-400">
 <Loader2 size={36} className="animate-spin text-blue-500" />
 <p className="text-sm font-medium">Cargando oficios...</p>
 </div>
 </div>
 ) : isError ? (
 <div className="flex items-center justify-center py-16 text-red-500 flex-col gap-2">
 <AlertTriangle size={32} />
 <p className="text-sm">Error al cargar la correspondencia</p>
 </div>
 ) : correspondencias.length === 0 ? (
 <div className="flex items-center justify-center py-16 text-gray-400 flex-col gap-2">
 <FileText size={32} className="opacity-50" />
 <p className="text-sm">No se encontraron registros</p>
 </div>
 ) : (
 <table className="w-full text-left text-xs table-fixed" style={{ minWidth: '1000px' }}>
 <colgroup>
 <col style={{ width: '3.5rem' }} />
 <col style={{ width: '5rem' }} />
 <col style={{ width: '7.5rem' }} />
 <col style={{ width: '7.5rem' }} />
 <col style={{ width: '8rem' }} />
 <col style={{ width: '8rem' }} />
 <col style={{ width: '8rem' }} />
 <col style={{ minWidth: '200px' }} />
 <col style={{ width: '4.5rem' }} />
 <col style={{ width: '7rem' }} />
 {isMaestroAdmin && <col style={{ width: '6rem' }} />}
 </colgroup>
 <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 uppercase tracking-wider font-bold shadow-sm">
 <tr>
 <th className="px-3 py-2.5 whitespace-nowrap">Folio</th>
 <th className="px-3 py-2.5 whitespace-nowrap">NoOficio</th>
 <th className="px-3 py-2.5 whitespace-nowrap">F. Recepción</th>
 <th className="px-3 py-2.5 whitespace-nowrap">F. Oficio</th>
 <th className="px-3 py-2.5 whitespace-nowrap">Remitente</th>
 <th className="px-3 py-2.5 whitespace-nowrap">Unidad</th>
 <th className="px-3 py-2.5 whitespace-nowrap">Ubicación</th>
 <th className="px-3 py-2.5">Descripción</th>
 <th className="px-3 py-2.5 text-center whitespace-nowrap">Tipo</th>
 <th className="px-3 py-2.5 text-center whitespace-nowrap">Archivo</th>
 {isMaestroAdmin && <th className="px-3 py-2.5 text-center whitespace-nowrap">Acciones</th>}
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
 {correspondencias.map(corr => (
 <tr key={corr.Folio} className="hover:bg-gray-50 dark:hover:bg-gray-800/50/80 dark:hover:bg-gray-700/80 transition-colors group">
 <td className="px-3 py-2.5 font-bold text-gray-800 dark:text-gray-200 ">{corr.Folio}</td>
 <td className="px-3 py-2.5 text-blue-600 dark:text-blue-400 font-semibold">
 <HighlightText text={corr.NoOficio || '—'} highlight={activeFilters.NoOficio || activeFilters.PalabraClave} />
 </td>
 <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDate(corr.FechaRecepcion)}</td>
 <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDate(corr.FechaOficio)}</td>
 <td className="px-3 py-2.5 text-gray-800 dark:text-gray-200 font-medium">
 <HighlightText text={corr.Remitente || '—'} highlight={activeFilters.PalabraClave} />
 </td>
 <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 align-top leading-snug">
 {corr.unidad?.descripcion || '—'}
 </td>
 <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 align-top leading-snug">
 {corr.ubicacion?.nombre_ubicacion || '—'}
 </td>
 <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 align-top">
 {expandedDesc[corr.Folio] ? (
 // Expandido: altura máxima con scroll interno, sin preservar saltos de línea crudos
 <div className="max-h-40 overflow-y-auto break-words whitespace-normal leading-relaxed text-xs pr-1">
 <HighlightText text={corr.Descripcion} highlight={activeFilters.PalabraClave} />
 </div>
 ) : (
 // Colapsado: 3 líneas máximo
 <div className="line-clamp-3 break-words whitespace-normal">
 <HighlightText text={corr.Descripcion} highlight={activeFilters.PalabraClave} />
 </div>
 )}
 {corr.Descripcion && corr.Descripcion.length > 80 && (
 <button
 onClick={() => toggleDesc(corr.Folio)}
 className="text-blue-500 hover:underline text-[10px] mt-1 font-semibold block"
 >
 {expandedDesc[corr.Folio] ? 'Ver menos' : 'Ver más'}
 </button>
 )}
 </td>
 <td className="px-3 py-2.5 text-center">
 {corr.Tipo === 1 ? (
 <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20 px-2 py-1 rounded-md whitespace-nowrap">
 <ArrowUpCircle size={11} /> Env.
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/20 px-2 py-1 rounded-md whitespace-nowrap">
 <ArrowDownCircle size={11} /> Rec.
 </span>
 )}
 </td>
 <td className="px-3 py-2.5 text-center font-semibold text-gray-700 dark:text-gray-300 ">
 {corr.archivo_ref?.Archivo || '—'}
 </td>
 {isMaestroAdmin && (
 <td className="px-3 py-2.5 text-center whitespace-nowrap">
 <div className="flex items-center justify-center gap-2">
 <button onClick={() => handleEdit(corr)} className="text-blue-500 hover:text-blue-700 dark:text-blue-400 transition-colors" title="Editar">
 <Edit size={16} />
 </button>
 {canDelete && (
 <button onClick={() => handleDelete(corr)} className="text-red-500 hover:text-red-700 dark:text-red-400 transition-colors" title="Eliminar" disabled={deleteMutation.isPending}>
 <Trash2 size={16} />
 </button>
 )}
 </div>
 </td>
 )}
 </tr>
 ))}
 </tbody>
 </table>
 )}
 </div>

 {/* ─── Paginación ─────────────────────────────────────────── */}
 <div className="p-3 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-2 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
 {/* Info total */}
 <div className="flex items-center justify-between text-xs">
 {pageInfo?.totalCount !== undefined && (
 <span className="font-semibold text-gray-700 dark:text-gray-300 ">
 Total: {pageInfo.totalCount} registros.
 </span>
 )}
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
 {currentPage < (typeof totalPages !== undefined ? totalPages : 9999) && (
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
 disabled={currentPage >= (typeof totalPages !== 'undefined' ? totalPages : 1)}
 className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors flex-shrink-0"
 title="Página siguiente"
 >
 <ChevronRight size={15} />
 </button>

 {/* Ir a página — solo páginas ya visitadas (1..currentPage) */}
 <form onSubmit={handleJumpToPage} className="flex items-center gap-1 ml-1 border-l border-gray-200 dark:border-gray-700 pl-2">
 <input
 type="number"
 min="1"
 max={totalPages || 1}
 value={pageInput}
 onChange={(e) => setPageInput(e.target.value)}
 placeholder="Ir a..."
 title={`Ingresa un número de página válido`}
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

 </div>
 </div>

 <FormCorrespondenciaModal
 isOpen={isModalOpen}
 onClose={() => setIsModalOpen(false)}
 initialData={initialData}
 />
 {isDeleteModalOpen && recordToDelete && (
 <Modal onClose={() => setIsDeleteModalOpen(false)} title="Eliminar Registro" subtitle="Esta acción no se puede deshacer" small>
 <div className="flex flex-col gap-4 text-center">
 <div className="w-14 h-14 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto text-red-600 dark:text-red-400 mb-1">
 <AlertTriangle size={28} />
 </div>
 <p className="text-sm text-gray-600 dark:text-gray-400 ">
 ¿Estás seguro de que deseas eliminar permanentemente la correspondencia con Folio <strong className="text-gray-900 dark:text-gray-100 ">{recordToDelete.Folio}</strong>?
 </p>
 <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg text-left text-xs space-y-1 border border-gray-100 dark:border-gray-800 ">
 <p><span className="text-gray-400">No. Oficio:</span> <span className="font-mono text-gray-700 dark:text-gray-300 ">{recordToDelete.NoOficio || 'S/N'}</span></p>
 <p><span className="text-gray-400">Remitente:</span> <span className="font-mono text-gray-700 dark:text-gray-300 ">{recordToDelete.Remitente || 'N/D'}</span></p>
 <p><span className="text-gray-400">Descripción:</span> <span className="text-gray-700 dark:text-gray-300 line-clamp-2">{recordToDelete.Descripcion || 'N/D'}</span></p>
 </div>
 <div className="flex gap-3 mt-2">
 <button
 onClick={() => setIsDeleteModalOpen(false)}
 className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 transition-colors"
 >
 Cancelar
 </button>
 <button
 onClick={handleConfirmDelete}
 disabled={deleteMutation.isPending}
 className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
 >
 {deleteMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
 {deleteMutation.isPending ? 'Eliminando...' : 'Sí, eliminar'}
 </button>
 </div>
 </div>
 </Modal>
 )}
 </div>
 );
}

// ─── Sub-componentes ───────────────────────────────────────────────────────────

function Modal({ onClose, title, subtitle, children, footer, wide = false, small = false }) {
 return ReactDOM.createPortal(
 <div
 className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
 onMouseDown={(e) => {
 if (e.target === e.currentTarget) onClose();
 }}
 >
 <div className="absolute inset-0 bg-black/50 dark:bg-black/70 fade-in pointer-events-none" />
 <div className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100vh-4rem)] ${small ? 'max-w-sm' : wide ? 'max-w-3xl' : 'max-w-lg'
 } fade-in`}>
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
 {/* Footer sticky (opcional) */}
 {footer && (
 <div className="px-5 sm:px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex-shrink-0 mt-auto">
 {footer}
 </div>
 )}
 </div>
 </div>,
 document.body
 );
}
