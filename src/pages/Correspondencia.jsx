import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search, Plus, RefreshCw, Loader2, AlertTriangle, FileText,
  ArrowDownCircle, ArrowUpCircle, CheckCircle, ChevronLeft, ChevronRight
} from 'lucide-react';
import { getMesaCorrespondencias } from '../api/correspondencia.queries';
import FormCorrespondenciaModal from '../components/FormCorrespondenciaModal';
import { parseServerDate } from '../lib/utils';
import { useAuthStore } from '../store/auth.store';

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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedDesc, setExpandedDesc] = useState({});

  const toggleDesc = (folio) => {
    setExpandedDesc(prev => ({ ...prev, [folio]: !prev[folio] }));
  };

  // Estado de filtros
  const [filters, setFilters] = useState({ Tipo: '', NoOficio: '', Folio: '', PalabraClave: '' });
  const [activeFilters, setActiveFilters] = useState({});

  // Paginación por cursor
  const PAGE_SIZE = 30;
  const [cursor, setCursor] = useState(null);
  const [history, setHistory] = useState([]);
  const [pageInput, setPageInput] = useState('');
  const currentPage = history.length + 1;

  const { data: correspondenciasData, isLoading, isError, refetch } = useQuery({
    queryKey: ['mesaCorrespondencias', activeFilters, cursor],
    queryFn: () => getMesaCorrespondencias(
      Object.keys(activeFilters).length > 0 ? activeFilters : undefined,
      { first: PAGE_SIZE, after: cursor }
    ),
  });

  const correspondencias = correspondenciasData?.edges?.map(e => e.node) || [];
  const pageInfo = correspondenciasData?.pageInfo;
  const totalPages = pageInfo?.totalCount ? Math.max(1, Math.ceil(pageInfo.totalCount / PAGE_SIZE)) : 1;

  // Handlers de paginación
  const handleNextPage = () => {
    if (pageInfo?.hasNextPage) {
      setHistory(prev => [...prev, cursor]);
      setCursor(pageInfo.endCursor);
    }
  };

  const handlePrevPage = () => {
    if (history.length > 0) {
      const newHistory = [...history];
      const prevCursor = newHistory.pop();
      setHistory(newHistory);
      setCursor(prevCursor);
    } else {
      setCursor(null);
    }
  };

  // Ir a página específica usando el historial de cursores almacenados
  // history[i] = cursor que se usó para llegar a la página i+1
  // Sólo se puede saltar a páginas ya visitadas (1 ... currentPage)
  const handleJumpToPage = (e) => {
    e.preventDefault();
    const p = parseInt(pageInput, 10);
    if (isNaN(p) || p < 1 || p > currentPage) {
      setPageInput('');
      return;
    }
    if (p === currentPage) { setPageInput(''); return; }
    // history[0] = cursor para página 1 (siempre null)
    // history[p-1] = cursor para página p
    const targetCursor = p === 1 ? null : history[p - 1];
    setHistory(history.slice(0, p - 1));
    setCursor(targetCursor ?? null);
    setPageInput('');
  };

  // Reset paginación al cambiar filtros
  useEffect(() => {
    setCursor(null);
    setHistory([]);
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
      setActiveFilters(newFilters);
    }, 400);
    return () => clearTimeout(timer);
  }, [filters]);

  const formatDate = (dateStr) => {
    const d = parseServerDate(dateStr);
    return d ? d.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '—';
  };

  return (
    <div className="p-4 sm:p-6 fade-in relative flex flex-col
      min-h-[calc(100dvh-70px)] overflow-y-auto
      sm:h-[calc(100vh-70px)] sm:overflow-hidden sm:min-h-0">

      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 flex-shrink-0 pb-4 mb-4 border-b border-gray-100
        flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4
        -mx-4 px-4 sm:mx-0 sm:px-0 bg-white/90 backdrop-blur-md">
        <div className="flex flex-col items-start w-full sm:w-auto">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Control de Correspondencia</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">Gestión de oficios enviados y recibidos</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Actualizar"
          >
            <RefreshCw size={18} />
          </button>
          {isMaestroAdmin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-[#00472e] hover:bg-[#003824] text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm shadow-sm"
            >
              <Plus size={16} /><span>Nuevo Registro</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Filtros ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 bg-white p-3 rounded-2xl shadow-sm border border-gray-100 mb-4 flex-shrink-0">

        {/* Tabs tipo */}
        <div className="flex bg-gray-100 p-1 rounded-xl w-full">
          {[
            { label: 'Todos', value: '' },
            { label: 'Enviadas', value: '1' },
            { label: 'Recibidas', value: '2' },
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => setFilters(prev => ({ ...prev, Tipo: tab.value }))}
              className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                filters.Tipo === tab.value ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Búsqueda — apilada en móvil, en fila en desktop */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              name="PalabraClave"
              value={filters.PalabraClave}
              onChange={handleFilterChange}
              placeholder="Buscar por descripción o remitente..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-600 focus:bg-white outline-none transition-all"
            />
          </div>
          <input
            type="text"
            name="NoOficio"
            value={filters.NoOficio}
            onChange={handleFilterChange}
            placeholder="No. Oficio..."
            className="w-full sm:w-32 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-600 focus:bg-white outline-none transition-all"
          />
          <input
            type="number"
            name="Folio"
            value={filters.Folio}
            onChange={handleFilterChange}
            placeholder="Folio..."
            className="w-full sm:w-24 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-600 focus:bg-white outline-none transition-all"
          />
        </div>
      </div>

      {/* ─── Wrapper tabla: scroll interno en desktop ────────────── */}
      <div className="sm:flex-1 sm:min-h-0 sm:flex sm:flex-col sm:overflow-hidden">
        <div className="flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden
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
                  <col style={{ width: '2.5rem' }} />
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
                </colgroup>
                <thead className="bg-gray-100 text-gray-600 uppercase tracking-wider font-bold shadow-sm">
                  <tr>
                    <th className="px-3 py-2.5 text-center w-10"></th>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {correspondencias.map(corr => (
                    <tr key={corr.Folio} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-3 py-2.5 text-center">
                        <CheckCircle size={16} className="text-green-500 inline-block" />
                      </td>
                      <td className="px-3 py-2.5 font-bold text-gray-800">{corr.Folio}</td>
                      <td className="px-3 py-2.5 text-blue-600 font-semibold">
                        <HighlightText text={corr.NoOficio || '—'} highlight={activeFilters.NoOficio || activeFilters.PalabraClave} />
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{formatDate(corr.FechaRecepcion)}</td>
                      <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{formatDate(corr.FechaOficio)}</td>
                      <td className="px-3 py-2.5 text-gray-800 font-medium">
                        <HighlightText text={corr.Remitente || '—'} highlight={activeFilters.PalabraClave} />
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 align-top leading-snug">
                        {corr.unidad?.descripcion || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 align-top leading-snug">
                        {corr.ubicacion?.nombre_ubicacion || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 align-top">
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
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-md whitespace-nowrap">
                            <ArrowUpCircle size={11} /> Env.
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded-md whitespace-nowrap">
                            <ArrowDownCircle size={11} /> Rec.
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center font-semibold text-gray-700">
                        {corr.archivo_ref?.Archivo || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ─── Paginación ─────────────────────────────────────────── */}
          <div className="p-3 border-t border-gray-100 flex flex-col gap-2 bg-gray-50 flex-shrink-0">
            {/* Info total */}
            <div className="flex items-center justify-between text-xs">
              {pageInfo?.totalCount !== undefined && (
                <span className="font-semibold text-gray-700">
                  Total: {pageInfo.totalCount} registros.
                </span>
              )}
              <span className="font-bold text-gray-400 uppercase tracking-wider">
                Pág. {currentPage}/{totalPages}
              </span>
            </div>

            {/* Botones de paginación */}
            <div className="flex items-center gap-2 justify-center">
              <button
                onClick={handlePrevPage}
                disabled={history.length === 0}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors flex-shrink-0"
                title="Página anterior"
              >
                <ChevronLeft size={15} />
              </button>

              {/* Páginas: anterior, actual, siguiente */}
              {currentPage > 2 && (
                <span className="w-8 h-8 flex items-center justify-center text-xs text-gray-400">1</span>
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
              {pageInfo?.hasNextPage && (
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
                <span className="w-8 h-8 flex items-center justify-center text-xs text-gray-400">
                  {totalPages}
                </span>
              )}

              <button
                onClick={handleNextPage}
                disabled={!pageInfo?.hasNextPage}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors flex-shrink-0"
                title="Página siguiente"
              >
                <ChevronRight size={15} />
              </button>

              {/* Ir a página — solo páginas ya visitadas (1..currentPage) */}
              <form onSubmit={handleJumpToPage} className="flex items-center gap-1 ml-1 border-l border-gray-200 pl-2">
                <input
                  type="number"
                  min="1"
                  max={currentPage}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  placeholder="Ir a..."
                  title={`Ingresa un número entre 1 y ${currentPage} (páginas visitadas)`}
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

        </div>
      </div>

      <FormCorrespondenciaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
