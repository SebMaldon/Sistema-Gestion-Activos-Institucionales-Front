import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import ReactDOM from 'react-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { GET_SALIDAS_ANTIGUAS } from '../api/salidas.queries';
import {
  Search, RefreshCw, ChevronLeft, ChevronRight, User,
  Calendar, MapPin, Phone, FileText, X, Loader2, Package, Eye, FileDown
} from 'lucide-react';
import { formatDate } from '../lib/utils';
import { useApp } from '../context/AppContext';
import * as XLSX from 'xlsx-js-style';

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
        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5 bg-gray-50 dark:bg-gray-900">
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

function ArticulosTableCell({ salida, search, onOpenModal }) {
  const [hoverPos, setHoverPos] = useState(null);
  const cellRef = useRef(null);
  const hoverTimerRef = useRef(null);
  const closeTimerRef = useRef(null);
  const goods = salida.articulos || [];

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
        <span className="text-gray-400 italic text-xs">Sin artículos registrados</span>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60">
              <Package size={12} /> {goods.length} {goods.length === 1 ? 'artículo' : 'artículos'}
            </span>
          </div>
          <div className="space-y-1">
            {goods.slice(0, 2).map((b, idx) => (
              <div key={idx} className="text-xs text-gray-700 dark:text-gray-300 line-clamp-1 flex items-start gap-1" title={b.descripcion}>
                <span className="text-teal-600 dark:text-teal-400 font-bold flex-shrink-0">•</span>
                <span className="truncate">
                  {b.cantidad && <span className="font-mono font-semibold text-gray-500 dark:text-gray-400 mr-1">[{b.cantidad}]</span>}
                  <HighlightText text={b.descripcion || 'Artículo sin descripción'} highlight={search} />
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
              <span>Ver tabla de artículos</span>
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
                Artículos de Salida Antigua #{salida.id} ({goods.length})
              </span>
            </div>
            <span className="text-[10px] bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 px-1.5 py-0.5 rounded font-medium">
              Histórico (Consulta)
            </span>
          </div>
          <div className="overflow-y-auto max-h-[230px] custom-scrollbar pr-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-700 sticky top-0 z-10">
                  <th className="py-1.5 px-2 w-16">Cant.</th>
                  <th className="py-1.5 px-2">Descripción</th>
                  <th className="py-1.5 px-2 w-28">Naturaleza</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                {goods.map((b, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                    <td className="py-1.5 px-2 font-mono font-medium text-teal-700 dark:text-teal-400">
                      <HighlightText text={String(b.cantidad ?? 1)} highlight={search} />
                    </td>
                    <td className="py-1.5 px-2">
                      <div className="font-medium text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                        <HighlightText text={b.descripcion || 'Sin descripción'} highlight={search} />
                      </div>
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

const HistorialSalidasAntiguas = forwardRef(({ onStatusChange }, ref) => {
  const { showToast } = useApp();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [viewingArticulosSalida, setViewingArticulosSalida] = useState(null);
  const [modalSearch, setModalSearch] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [pageInput, setPageInput] = useState('');

  const PAGE_SIZE = 20;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['salidasAntiguas', debouncedSearch, currentPage, startDate, endDate],
    queryFn: () => {
      const filter = {};
      if (debouncedSearch) filter.search = debouncedSearch;
      if (startDate) filter.fecha_desde = startDate;
      if (endDate) filter.fecha_hasta = endDate;

      return gqlClient.request(GET_SALIDAS_ANTIGUAS, {
        filter,
        pagination: { first: PAGE_SIZE, page: currentPage }
      });
    },
    placeholderData: keepPreviousData,
  });

  const registros = data?.salidasAntiguas?.edges?.map(e => e.node) || [];
  const pageInfo = data?.salidasAntiguas?.pageInfo;
  const totalItems = pageInfo?.totalCount || 0;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const filter = {};
      if (debouncedSearch) filter.search = debouncedSearch;
      if (startDate) filter.fecha_desde = startDate;
      if (endDate) filter.fecha_hasta = endDate;

      const res = await gqlClient.request(GET_SALIDAS_ANTIGUAS, {
        filter,
        pagination: { first: 10000, page: 1 }
      });

      const items = res?.salidasAntiguas?.edges?.map(e => e.node) || [];
      if (items.length === 0) {
        showToast('No hay datos para exportar', 'warning');
        return;
      }

      let filtrosTexto = [];
      if (startDate || endDate) {
        const fDesde = startDate ? formatDate(startDate) : 'Inicio';
        const fHasta = endDate ? formatDate(endDate) : 'Presente';
        filtrosTexto.push(`Del ${fDesde} al ${fHasta}`);
      }
      if (debouncedSearch) {
        filtrosTexto.push(`Búsqueda: "${debouncedSearch}"`);
      }
      const textoFiltrosAplicados = filtrosTexto.length > 0
        ? `Filtros aplicados ─ ${filtrosTexto.join(', ')}`
        : `Filtros aplicados ─ Ninguno (Todos los registros)`;

      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const isFiltered = filtrosTexto.length > 0;
      const fileName = `Salidas_Antiguas_${isFiltered ? 'Filtradas' : 'Completas'}_${dateStr}.xlsx`;

      const dataToExport = items.map(salida => {
        const listadoArticulos = (salida.articulos || []).map((art, idx) => {
          const cant = art.cantidad ? `[${art.cantidad}] ` : '';
          const desc = art.descripcion || 'Sin descripción';
          const nat = art.naturaleza ? ` (${art.naturaleza})` : '';
          return `${idx + 1}. ${cant}${desc}${nat}`;
        }).join('\r\n');

        return {
          'Folio': salida.id || '',
          'Fecha': salida.fecha ? formatDate(salida.fecha) : '',
          'Solicitante': salida.solicitante || '',
          'Matrícula Solicitante': salida.m_solicitante || '',
          'Puesto Solicitante': salida.p_solicitante || '',
          'Responsable': salida.responsable || '',
          'Matrícula Responsable': salida.m_responsable || '',
          'Puesto Responsable': salida.p_responsable || '',
          'Adscripción': salida.adscripcion || '',
          'Procedencia': salida.procedencia || '',
          'Para Su': salida.para_su || '',
          'Unidad Bien': salida.unidad_bien || '',
          'Área': salida.area || '',
          'Devolución': salida.devolucion || '',
          'Fecha Devolución': salida.fecha_devolucion ? formatDate(salida.fecha_devolucion) : '',
          'Estado Físico': salida.estado_fisico || '',
          'Listado de Bienes / Artículos': listadoArticulos
        };
      });

      const colWidths = [
        { wch: 10 }, { wch: 15 }, { wch: 25 }, { wch: 18 },
        { wch: 22 }, { wch: 25 }, { wch: 18 }, { wch: 22 },
        { wch: 25 }, { wch: 22 }, { wch: 25 }, { wch: 20 },
        { wch: 20 }, { wch: 15 }, { wch: 16 }, { wch: 16 },
        { wch: 65 }
      ];

      const headerRows = [
        ['SISTEMA INTEGRAL DE INFRAESTRUCTURA TECNOLOGICA — IMSS Delegación Nayarit'],
        [`Reporte de: Historial de Salidas Antiguas — ${textoFiltrosAplicados}`],
        [`Fecha de exportación: ${today.toLocaleString('es-MX')}`],
        [`Total de registros: ${items.length}`],
        [] // Separator
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(headerRows);
      XLSX.utils.sheet_add_json(worksheet, dataToExport, { origin: 'A6' });
      worksheet['!cols'] = colWidths;

      const range = XLSX.utils.decode_range(worksheet['!ref']);
      range.s.r = 5;
      worksheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

      for (const key in worksheet) {
        if (key[0] === '!') continue;
        const cell = worksheet[key];
        const rowNum = parseInt(key.replace(/^[A-Z]+/, ''), 10);

        if (rowNum <= 4) {
          cell.s = { font: { bold: true }, alignment: { vertical: 'top' } };
        } else if (rowNum === 6) {
          cell.s = { font: { bold: true }, alignment: { wrapText: true, vertical: 'top' } };
        } else {
          cell.s = { alignment: { wrapText: true, vertical: 'top' } };
        }
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Salidas Antiguas');
      XLSX.writeFile(workbook, fileName);
      showToast('Exportación completada', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al exportar a Excel', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  useImperativeHandle(ref, () => ({
    refetch: () => refetch(),
    handleExportExcel: () => handleExportExcel()
  }));

  useEffect(() => {
    onStatusChange?.({ isLoading, isExporting });
  }, [isLoading, isExporting, onStatusChange]);

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Search & Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row gap-3 relative z-20">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar en salidas antiguas por ID, solicitante, responsable, adscripción, descripción..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 bg-transparent text-gray-900 dark:text-gray-100"
          />
        </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={14} className="text-gray-400" />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-teal-500 text-xs bg-transparent text-gray-800 dark:text-gray-200" />
            <span className="text-gray-400">-</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-teal-500 text-xs bg-transparent text-gray-800 dark:text-gray-200" />
          </div>
        </div>

      {/* Table */}
      <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm flex flex-col min-h-0 overflow-hidden relative">
        <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar relative">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID / Fecha</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Solicitante</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Adscripción / Procedencia</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Responsable</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Para Su / Unidad</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Artículos / Descripción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    <Loader2 size={24} className="animate-spin mx-auto text-teal-500 mb-2" />
                    Cargando historial de salidas antiguas...
                  </td>
                </tr>
              ) : registros.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="bg-gray-50 dark:bg-gray-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FileText size={24} className="text-gray-400" />
                    </div>
                    <p className="font-semibold text-gray-700 dark:text-gray-300">No hay registros de salidas antiguas</p>
                    <p className="text-sm mt-1">No se encontraron registros que coincidan con los filtros.</p>
                  </td>
                </tr>
              ) : (
                registros.map((salida) => (
                  <tr
                    key={salida.id}
                    onClick={() => {
                      setModalSearch('');
                      setViewingArticulosSalida(salida);
                    }}
                    title="Haz clic en cualquier parte de la fila para ver el detalle completo y todos sus artículos"
                    className="hover:bg-teal-50/50 dark:hover:bg-teal-900/20 transition-colors group cursor-pointer"
                  >
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="h-8 min-w-[2.5rem] px-2 rounded-lg bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold border border-teal-100 dark:border-teal-800/50">
                          #<HighlightText text={String(salida.id)} highlight={debouncedSearch} />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Calendar size={12} /> {salida.fecha ? formatDate(salida.fecha) : 'Sin fecha'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="font-medium text-gray-800 dark:text-gray-200 text-sm">
                        <HighlightText text={salida.solicitante || 'No especificado'} highlight={debouncedSearch} />
                      </div>
                      {salida.telefono && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                          <Phone size={10} /> {salida.telefono}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle text-sm text-gray-700 dark:text-gray-300 max-w-[220px]">
                      <div className="font-medium truncate" title={salida.adscripcion}>
                        {salida.adscripcion ? <HighlightText text={salida.adscripcion} highlight={debouncedSearch} /> : <span className="text-gray-400 italic">Sin adscripción</span>}
                      </div>
                      {salida.procedencia && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5 truncate" title={salida.procedencia}>
                          <MapPin size={10} /> <HighlightText text={salida.procedencia} highlight={debouncedSearch} />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                        <User size={14} className="text-gray-400 flex-shrink-0" />
                        <span className="truncate max-w-[160px]" title={salida.responsable}>
                          <HighlightText text={salida.responsable || 'No especificado'} highlight={debouncedSearch} />
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle text-sm text-gray-700 dark:text-gray-300 max-w-[180px]">
                      <div className="font-medium text-gray-800 dark:text-gray-200 truncate" title={salida.para_su}>
                        <HighlightText text={salida.para_su || '-'} highlight={debouncedSearch} />
                      </div>
                      {salida.unidad_bien && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5" title={salida.unidad_bien}>
                          <HighlightText text={salida.unidad_bien} highlight={debouncedSearch} />
                        </div>
                      )}
                    </td>
                    <ArticulosTableCell salida={salida} search={debouncedSearch} onOpenModal={(s) => {
                      setModalSearch('');
                      setViewingArticulosSalida(s);
                    }} />
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-2 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 flex-shrink-0">
          <div className="flex items-center justify-between text-xs">
            {totalItems > 0 && (
              <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                Total: {totalItems} salidas antiguas.
                {isFetching && !isLoading && (
                  <span className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 font-normal">
                    <Loader2 size={12} className="animate-spin" /> Cargando...
                  </span>
                )}
              </span>
            )}
            <span className="font-bold text-gray-400 uppercase tracking-wider">
              Pág. {currentPage}/{totalPages}
            </span>
          </div>

          <div className="flex items-center gap-1 flex-wrap justify-center">
            <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1 || isLoading || isFetching}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 disabled:opacity-50 transition-colors flex-shrink-0">
              <ChevronLeft size={15} />
            </button>

            <div className="flex items-center justify-center gap-1 sm:gap-2 w-full sm:w-[260px] order-last sm:order-none mt-2 sm:mt-0">
              {(() => {
                const pages = [];
                if (currentPage > 2) pages.push(1);
                if (currentPage > 3) pages.push('...-left');
                if (currentPage > 1) pages.push(currentPage - 1);
                pages.push(currentPage);
                if (currentPage < totalPages) pages.push(currentPage + 1);
                if (currentPage < totalPages - 2) pages.push('...-right');
                if (currentPage < totalPages - 1) pages.push(totalPages);
                return pages.map((p, idx) => {
                  if (typeof p === 'string') {
                    return <span key={p} className="px-1 text-gray-400 text-xs">...</span>;
                  }
                  return (
                    <button key={`page-${p}-${idx}`} onClick={() => setCurrentPage(p)} disabled={isLoading || isFetching}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors flex-shrink-0 ${
                        currentPage === p ? 'bg-[#006341] text-white shadow-sm' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 text-gray-600 dark:text-gray-400'
                      }`}>
                      {p}
                    </button>
                  );
                });
              })()}
            </div>

            <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages || isLoading || isFetching || totalPages === 0}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 disabled:opacity-50 transition-colors flex-shrink-0">
              <ChevronRight size={15} />
            </button>

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
                disabled={isLoading || isFetching}
                className="w-14 px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-[#006341] focus:ring-1 focus:ring-[#006341] bg-white dark:bg-gray-800 text-center text-gray-800 dark:text-gray-200"
              />
              <button type="submit" disabled={!pageInput || isLoading || isFetching} className="px-2 py-1.5 bg-[#006341]/10 text-[#006341] font-semibold text-xs rounded-lg hover:bg-[#006341]/20 disabled:opacity-50 transition-colors">
                Ir
              </button>
            </form>
          </div>
        </div>
      </div>

      {viewingArticulosSalida && (
        <Modal
          title={`Detalle y Artículos de Salida Antigua #${viewingArticulosSalida.id}`}
          onClose={() => setViewingArticulosSalida(null)}
        >
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-gray-400 block">Solicitante:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{viewingArticulosSalida.solicitante || 'N/A'}</span>
                {(viewingArticulosSalida.p_solicitante || viewingArticulosSalida.m_solicitante) && (
                  <span className="text-[11px] text-gray-500 block">
                    {[viewingArticulosSalida.p_solicitante, viewingArticulosSalida.m_solicitante].filter(Boolean).join(' / ')}
                  </span>
                )}
              </div>
              <div>
                <span className="text-gray-400 block">Fecha Salida:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{viewingArticulosSalida.fecha ? formatDate(viewingArticulosSalida.fecha) : 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Responsable:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{viewingArticulosSalida.responsable || 'N/A'}</span>
                {(viewingArticulosSalida.p_responsable || viewingArticulosSalida.m_responsable) && (
                  <span className="text-[11px] text-gray-500 block">
                    {[viewingArticulosSalida.p_responsable, viewingArticulosSalida.m_responsable].filter(Boolean).join(' / ')}
                  </span>
                )}
              </div>
              <div>
                <span className="text-gray-400 block">Adscripción:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{viewingArticulosSalida.adscripcion || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Identificación:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{viewingArticulosSalida.identificacion || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Teléfono:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{viewingArticulosSalida.telefono || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Procedencia:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{viewingArticulosSalida.procedencia || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Unidad Bien / Para Su:</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{[viewingArticulosSalida.unidad_bien, viewingArticulosSalida.para_su].filter(Boolean).join(' / ') || 'N/A'}</span>
              </div>
              {(viewingArticulosSalida.devolucion || viewingArticulosSalida.fecha_devolucion) && (
                <div>
                  <span className="text-gray-400 block">Devolución:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {viewingArticulosSalida.devolucion || 'N/A'} {viewingArticulosSalida.fecha_devolucion ? `(${viewingArticulosSalida.fecha_devolucion})` : ''}
                  </span>
                </div>
              )}
              {viewingArticulosSalida.area && (
                <div>
                  <span className="text-gray-400 block">Área:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{viewingArticulosSalida.area}</span>
                </div>
              )}
              {viewingArticulosSalida.estado_fisico && (
                <div className="sm:col-span-3 md:col-span-4">
                  <span className="text-gray-400 block">Estado Físico / Notas:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{viewingArticulosSalida.estado_fisico}</span>
                </div>
              )}
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Filtrar artículos por descripción o naturaleza..."
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
              />
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm max-h-[50vh] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50 dark:bg-gray-900/80 sticky top-0 border-b border-gray-100 dark:border-gray-700 font-semibold text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3 w-24">Cantidad</th>
                    <th className="py-2.5 px-3">Descripción del Artículo</th>
                    <th className="py-2.5 px-3 w-32">Naturaleza</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                  {(() => {
                    const filtered = (viewingArticulosSalida.articulos || []).filter(b => {
                      if (!modalSearch) return true;
                      const term = modalSearch.toLowerCase();
                      const desc = (b.descripcion || '').toLowerCase();
                      const nat = (b.naturaleza || '').toLowerCase();
                      return desc.includes(term) || nat.includes(term);
                    });

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan="4" className="py-8 text-center text-gray-400 italic">
                            No se encontraron artículos con el criterio de búsqueda.
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
                            <HighlightText text={String(b.cantidad ?? 1)} highlight={activeHighlight} />
                          </td>
                          <td className="py-2.5 px-3 font-medium text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                            <HighlightText text={b.descripcion || 'Sin descripción'} highlight={activeHighlight} />
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
                onClick={() => setViewingArticulosSalida(null)}
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
});

export default HistorialSalidasAntiguas;
