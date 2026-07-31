import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search, RefreshCw, Loader2, AlertTriangle, FileText,
  ChevronLeft, ChevronRight, ArrowUp, ArrowDown, MonitorSmartphone, FilterX
} from 'lucide-react';
import { getMonitoreoImpresiones, GET_MONITOREO_RESUMEN_UNIDADES } from '../api/monitoreo.queries';
import { useAuthStore } from '../store/auth.store';
import { gqlClient } from '../api/client';
import { GET_CATALOGOS_BIENES_QUERY } from '../api/inventario.queries';
import MultiSearchableSelect from '../components/MultiSearchableSelect';

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

export default function MonitoreoLimpieza() {
  const usuario = useAuthStore((s) => s.usuario);
  const [filters, setFilters] = useState({ search: '', version: '', ubicacion: '', unidades: [], fechaInicio: '', fechaFin: '' });
  const [activeFilters, setActiveFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: '', direction: '' });

  // Pagination
  const PAGE_SIZE = 30;
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['monitoreoImpresiones', activeFilters, sortConfig, currentPage],
    queryFn: () => getMonitoreoImpresiones(
      { ...activeFilters, sortBy: sortConfig.key || undefined, sortOrder: sortConfig.direction || undefined },
      { first: PAGE_SIZE, page: currentPage }
    ),
  });

  const { data: catData } = useQuery({
    queryKey: ['catalogos-bienes'],
    queryFn: () => gqlClient.request(GET_CATALOGOS_BIENES_QUERY),
    staleTime: 5 * 60 * 1000,
  });

  const { data: resumenData } = useQuery({
    queryKey: ['monitoreoResumenUnidades'],
    queryFn: async () => {
      const res = await gqlClient.request(GET_MONITOREO_RESUMEN_UNIDADES);
      return res.monitoreoResumenUnidades;
    },
    staleTime: 5 * 60 * 1000,
  });

  const unidadesOpciones = (catData?.unidades || []).map(u => {
    const resumen = (resumenData || []).find(r => r.clave === u.clave);
    const total = resumen ? resumen.total_impresiones : null;
    return {
      value: u.clave,
      label: u.descripcion || u.desc_corta || u.clave,
      extra: total != null ? (
        <span className="text-gray-400 font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
          {total.toLocaleString()}
        </span>
      ) : null
    };
  });

  const monitoreoData = data?.edges?.map(e => e.node) || [];
  const pageInfo = data?.pageInfo;
  const totalPages = pageInfo?.totalCount ? Math.max(1, Math.ceil(pageInfo.totalCount / PAGE_SIZE)) : 1;

  // Handlers
  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(p => p + 1); };
  const handlePrevPage = () => { setCurrentPage(p => Math.max(1, p - 1)); };

  const handleJumpToPage = (e) => {
    e.preventDefault();
    const p = parseInt(pageInput);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      setCurrentPage(p);
    }
    setPageInput('');
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilters, sortConfig]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const newFilters = {};
      if (filters.search) newFilters.search = filters.search;
      if (filters.version) newFilters.version = filters.version;
      if (filters.ubicacion) newFilters.ubicacion = filters.ubicacion;
      if (filters.unidades && filters.unidades.length > 0) newFilters.unidades = filters.unidades;
      if (filters.fechaInicio) newFilters.fechaInicio = filters.fechaInicio;
      if (filters.fechaFin) newFilters.fechaFin = filters.fechaFin;
      setActiveFilters(newFilters);
    }, 400);
    return () => clearTimeout(timer);
  }, [filters]);

  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'ASC') return { key, direction: 'DESC' };
        if (prev.direction === 'DESC') return { key: '', direction: '' };
      }
      return { key, direction: 'ASC' };
    });
  };

  const handleReset = () => {
    setFilters({ search: '', version: '', ubicacion: '', unidades: [], fechaInicio: '', fechaFin: '' });
    setSortConfig({ key: '', direction: '' });
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey || !sortConfig.direction) return null;
    return sortConfig.direction === 'ASC' ? <ArrowUp size={14} className="inline ml-1" /> : <ArrowDown size={14} className="inline ml-1" />;
  };

  return (
    <div className="p-4 sm:p-6 fade-in relative flex flex-col
      min-h-[calc(100dvh-70px)] overflow-y-auto
      sm:h-[calc(100vh-70px)] sm:overflow-hidden sm:min-h-0">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
        <div className="flex flex-col items-start w-full sm:w-auto">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <MonitorSmartphone size={28} className="text-[#00472e] dark:text-[#008f5d]" />
              Monitoreo de Equipos e Impresiones
            </h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Consulta de datos de limpieza lógica e impresiones por equipo</p>
        </div>

        <div className="flex items-center gap-3">
          {data?.totalImpresiones != null && (
            <div className="bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-xl border border-green-100 dark:border-green-800/30 mr-2 shadow-sm">
              <p className="text-[10px] text-green-600 dark:text-green-400 font-bold mb-0.5 uppercase tracking-wider">Suma Total</p>
              <p className="text-lg font-bold text-green-700 dark:text-green-300 leading-none">
                {data.totalImpresiones.toLocaleString()}
              </p>
            </div>
          )}
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
            title="Actualizar"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 mb-4 flex-shrink-0">
        <div className="flex flex-col sm:flex-row gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[250px] w-full sm:w-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Buscar por Número de Serie o Dirección IP..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-green-600 focus:bg-white dark:bg-gray-800 outline-none transition-all"
            />
          </div>
          <div className="flex-1 min-w-[250px] w-full sm:w-auto">
            <MultiSearchableSelect
              placeholder="Seleccionar unidades..."
              value={filters.unidades}
              onChange={(val) => setFilters(prev => ({ ...prev, unidades: val }))}
              options={unidadesOpciones}
            />
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <input
              type="text"
              name="version"
              value={filters.version}
              onChange={handleFilterChange}
              placeholder="Versión..."
              className="flex-1 min-w-[120px] sm:flex-none sm:w-32 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-green-600 focus:bg-white dark:bg-gray-800 outline-none transition-all"
            />
            <input
              type="text"
              name="ubicacion"
              value={filters.ubicacion}
              onChange={handleFilterChange}
              placeholder="Ubicación..."
              className="flex-1 min-w-[150px] sm:flex-none sm:w-48 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-green-600 focus:bg-white dark:bg-gray-800 outline-none transition-all"
            />
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="flex flex-1 items-center gap-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-3 pr-2 py-1.5 focus-within:ring-2 focus-within:ring-green-600 focus-within:bg-white dark:focus-within:bg-gray-800 transition-all">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Desde</span>
                <input
                  type="date"
                  name="fechaInicio"
                  value={filters.fechaInicio}
                  max={filters.fechaFin || new Date().toISOString().split('T')[0]}
                  onChange={handleFilterChange}
                  className="bg-transparent border-none outline-none text-sm w-full sm:w-[110px] text-gray-700 dark:text-gray-200 cursor-pointer"
                />
              </div>
              <div className="flex flex-1 items-center gap-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-3 pr-2 py-1.5 focus-within:ring-2 focus-within:ring-green-600 focus-within:bg-white dark:focus-within:bg-gray-800 transition-all">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Hasta</span>
                <input
                  type="date"
                  name="fechaFin"
                  value={filters.fechaFin}
                  min={filters.fechaInicio}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={handleFilterChange}
                  className="bg-transparent border-none outline-none text-sm w-full sm:w-[110px] text-gray-700 dark:text-gray-200 cursor-pointer"
                />
              </div>
            </div>
            {Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : v !== '') && (
              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-900/50 rounded-xl transition-colors w-full sm:w-auto"
                title="Limpiar filtros"
              >
                <FilterX size={16} />
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="sm:flex-1 sm:min-h-0 sm:flex sm:flex-col sm:overflow-hidden">
        <div className="flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden mb-8 sm:mb-0 sm:flex-1 sm:min-h-0 sm:flex sm:flex-col">
          <div className="w-full overflow-x-auto sm:flex-1 sm:min-h-0 sm:overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 min-h-[200px]">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <Loader2 size={36} className="animate-spin text-green-500" />
                  <p className="text-sm font-medium">Cargando datos...</p>
                </div>
              </div>
            ) : isError ? (
              <div className="flex items-center justify-center py-16 text-red-500 flex-col gap-2">
                <AlertTriangle size={32} />
                <p className="text-sm">Error al cargar la información</p>
              </div>
            ) : monitoreoData.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-gray-400 flex-col gap-2">
                <FileText size={32} className="opacity-50" />
                <p className="text-sm">No se encontraron registros</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs table-fixed" style={{ minWidth: '900px' }}>
                <colgroup>
                  <col style={{ width: '12rem' }} />
                  <col style={{ width: '10rem' }} />
                  <col style={{ minWidth: '150px' }} />
                  <col style={{ minWidth: '150px' }} />
                  <col style={{ width: '8rem' }} />
                  <col style={{ width: '8rem' }} />
                  <col style={{ width: '11.5rem' }} />
                </colgroup>
                <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 uppercase tracking-wider font-bold shadow-sm sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2.5 whitespace-nowrap cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" onClick={() => handleSort('num_serie')}>
                      Núm. Serie <SortIcon columnKey="num_serie" />
                    </th>
                    <th className="px-3 py-2.5 whitespace-nowrap cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" onClick={() => handleSort('dir_ip')}>
                      Dirección IP <SortIcon columnKey="dir_ip" />
                    </th>
                    <th className="px-3 py-2.5 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" onClick={() => handleSort('descripcion')}>
                      Unidad <SortIcon columnKey="descripcion" />
                    </th>
                    <th className="px-3 py-2.5 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" onClick={() => handleSort('nombre_ubicacion')}>
                      Ubicación <SortIcon columnKey="nombre_ubicacion" />
                    </th>
                    <th className="px-3 py-2.5 whitespace-nowrap cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" onClick={() => handleSort('version')}>
                      Versión <SortIcon columnKey="version" />
                    </th>
                    <th className="px-3 py-2.5 whitespace-nowrap cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" onClick={() => handleSort('fecha')}>
                      Fecha <SortIcon columnKey="fecha" />
                    </th>
                    <th className="px-3 py-2.5 text-center whitespace-nowrap cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" onClick={() => handleSort('total_impresiones')}>
                      Total Impresiones <SortIcon columnKey="total_impresiones" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {monitoreoData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50/80 dark:hover:bg-gray-700/80 transition-colors group">
                      <td className="px-3 py-2.5 font-bold text-gray-800 dark:text-gray-200">
                        <HighlightText text={item.num_serie || '—'} highlight={activeFilters.search} />
                      </td>
                      <td className="px-3 py-2.5 text-blue-600 dark:text-blue-400 font-semibold font-mono text-sm">
                        <HighlightText text={item.dir_ip || '—'} highlight={activeFilters.search} />
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 align-top leading-snug">
                        {item.descripcion || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 align-top leading-snug">
                        <HighlightText text={item.nombre_ubicacion || '—'} highlight={activeFilters.ubicacion} />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {item.version ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <HighlightText text={item.version} highlight={activeFilters.version} />
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {item.fecha ? (() => {
                          const datePart = item.fecha.split('T')[0];
                          const [year, month, day] = datePart.split('-');
                          return `${day}/${month}/${year}`;
                        })() : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold text-gray-700 dark:text-gray-300">
                        {item.total_impresiones != null ? item.total_impresiones.toLocaleString() : '0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Paginación */}
          <div className="p-3 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-2 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
            <div className="flex items-center justify-between text-xs">
              {pageInfo?.totalCount !== undefined && (
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  Total: {pageInfo.totalCount} registros.
                </span>
              )}
              <span className="font-bold text-gray-400 uppercase tracking-wider">
                Pág. {currentPage}/{totalPages}
              </span>
            </div>

            <div className="flex items-center gap-2 justify-center flex-wrap">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors flex-shrink-0"
              >
                <ChevronLeft size={15} />
              </button>

              <div className="flex items-center justify-center gap-1 sm:gap-2 w-full sm:w-[260px] order-last sm:order-none mt-2 sm:mt-0">
                {currentPage > 2 && (
                  <button onClick={() => setCurrentPage(1)} className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 flex-shrink-0">
                    1
                  </button>
                )}
                {currentPage > 3 && <span className="px-1 text-gray-400 text-xs">...</span>}
                {currentPage > 1 && (
                  <button onClick={handlePrevPage} className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 flex-shrink-0">
                    {currentPage - 1}
                  </button>
                )}
                <button className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-[#006341] text-white shadow-sm flex-shrink-0">
                  {currentPage}
                </button>
                {currentPage < totalPages && (
                  <button onClick={handleNextPage} className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 flex-shrink-0">
                    {currentPage + 1}
                  </button>
                )}
                {currentPage < totalPages - 2 && <span className="px-1 text-gray-400 text-xs">...</span>}
                {currentPage < totalPages - 1 && totalPages > 1 && (
                  <button onClick={() => setCurrentPage(totalPages)} className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 flex-shrink-0">
                    {totalPages}
                  </button>
                )}
              </div>

              <button
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors flex-shrink-0"
              >
                <ChevronRight size={15} />
              </button>

              <form onSubmit={handleJumpToPage} className="flex items-center gap-1 ml-1 border-l border-gray-200 dark:border-gray-700 pl-2">
                <input
                  type="number"
                  min="1"
                  max={totalPages || 1}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  placeholder="Ir a..."
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
    </div>
  );
}
