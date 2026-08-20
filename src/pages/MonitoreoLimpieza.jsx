import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, RefreshCw, Loader2, AlertTriangle, FileText,
  ChevronLeft, ChevronRight, ArrowUp, ArrowDown, MonitorSmartphone, FilterX, Wifi, WifiOff,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { getMonitoreoImpresiones, GET_MONITOREO_RESUMEN_UNIDADES, UPDATE_MONITOREO_LIMPIEZA, GET_MONITOREO_FILTROS } from '../api/monitoreo.queries';
import { useAuthStore } from '../store/auth.store';
import { gqlClient } from '../api/client';
import { GET_CATALOGOS_BIENES_QUERY } from '../api/inventario.queries';
import MultiSearchableSelect from '../components/MultiSearchableSelect';

const HighlightText = ({ text, highlight }) => {
  if (!highlight || !text || (Array.isArray(highlight) && highlight.length === 0)) return <>{text}</>;
  
  const strText = String(text);
  
  const regexPattern = Array.isArray(highlight) 
    ? highlight.map(h => String(h).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
    : String(highlight).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
  if (!regexPattern) return <>{text}</>;

  const parts = strText.split(new RegExp(`(${regexPattern})`, 'gi'));
  
  const matchesHighlight = (part) => {
    if (Array.isArray(highlight)) {
      return highlight.some(h => String(h).toLowerCase() === part.toLowerCase());
    }
    return String(highlight).toLowerCase() === part.toLowerCase();
  };

  return (
    <>
      {parts.map((part, i) =>
        matchesHighlight(part)
          ? <span key={i} className="bg-yellow-200 text-yellow-900 font-bold dark:text-yellow-950">{part}</span>
          : part
      )}
    </>
  );
};

// ── Export helpers ────────────────────────────────────────────────────────────
async function fetchAllMonitoreo(filters) {
  let all = [];
  let page = 1;
  const PAGE = 500;
  while (true) {
    const res = await getMonitoreoImpresiones(
      { ...filters },
      { first: PAGE, page }
    );
    const nodes = (res.edges || []).map(e => e.node);
    all = all.concat(nodes);
    if (!res.pageInfo?.hasNextPage || nodes.length < PAGE) break;
    page++;
  }
  return all;
}

function formatSingleDate(fecha) {
  if (!fecha) return '';
  const [y, m, d] = fecha.split('T')[0].split('-'); 
  return `${d}/${m}/${y}`;
}

function buildMonitoreoWorkbook(rows, filters) {
  const COLOR_VERDE = '006341';
  const COLOR_VERDE_M = '107c41';
  const COLOR_TEXT = '374151';
  const COLOR_GRIS = 'F3F4F6';
  const COLOR_WHITE = 'FFFFFF';

  const today = new Date();
  
  let filtrosTexto = [];
  if (filters?.search) filtrosTexto.push(`Búsqueda: "${filters.search}"`);
  if (filters?.version) filtrosTexto.push(`Versión: "${filters.version}"`);
  if (filters?.ubicacion) filtrosTexto.push(`Ubicación: "${filters.ubicacion}"`);
  if (filters?.unidades?.length > 0) filtrosTexto.push(`Unidades: ${filters.unidades.join(', ')}`);
  if (filters?.fechaInicio || filters?.fechaFin) {
    filtrosTexto.push(`Fecha: ${filters.fechaInicio || 'Inicio'} a ${filters.fechaFin || 'Hoy'}`);
  }
  const textoFiltrosAplicados = filtrosTexto.length > 0 
    ? `Filtros aplicados ─ ${filtrosTexto.join(' | ')}` 
    : `Filtros aplicados ─ Ninguno (Todo el historial)`;

  const headers = ['NÚM. SERIE', 'DIRECCIÓN IP', 'UNIDAD', 'UBICACIÓN', 'FECHA INICIO', 'FECHA FIN', 'TOTAL IMPRESIONES'];

  const wsData = [
    ['SISTEMA INTEGRAL DE INFRAESTRUCTURA TECNOLOGICA — IMSS Delegación Nayarit'],
    [`Reporte de: Monitoreo de Limpieza e Impresiones — ${textoFiltrosAplicados}`],
    [`Fecha de exportación: ${today.toLocaleString('es-MX')}`],
    [`Total de registros: ${rows.length}`],
    [],
    headers
  ];

  rows.forEach(r => {
    wsData.push([
      r.num_serie || '',
      r.dir_ip || '',
      r.descripcion || '',
      r.nombre_ubicacion || '',
      formatSingleDate(r.fecha_min),
      formatSingleDate(r.fecha_max) || formatSingleDate(r.fecha_min),
      r.total_impresiones != null ? r.total_impresiones : 0,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 30 }, { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 18 }];

  for (let i = 0; i < 4; i++) {
    const addr = XLSX.utils.encode_cell({ r: i, c: 0 });
    if (ws[addr]) {
      ws[addr].s = { font: { bold: true, sz: 11, color: { rgb: i === 0 ? COLOR_VERDE : COLOR_TEXT } } };
    }
  }

  headers.forEach((_, c) => {
    const addr = XLSX.utils.encode_cell({ r: 5, c });
    if (!ws[addr]) ws[addr] = { v: headers[c] };
    ws[addr].s = {
      font: { bold: true, sz: 10, color: { rgb: COLOR_WHITE } },
      fill: { fgColor: { rgb: COLOR_VERDE } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: { bottom: { style: 'medium', color: { rgb: COLOR_VERDE_M } }, right: { style: 'thin', color: { rgb: COLOR_VERDE_M } } },
    };
  });

  rows.forEach((_, ri) => {
    const r = ri + 6;
    const isEven = ri % 2 === 0;
    headers.forEach((__, c) => {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) ws[addr] = { v: '' };
      ws[addr].s = {
        font: { sz: 9, color: { rgb: COLOR_TEXT } },
        fill: { fgColor: { rgb: isEven ? COLOR_WHITE : COLOR_GRIS } },
        alignment: { horizontal: c === 6 ? 'center' : 'left', vertical: 'center' },
        border: { right: { style: 'hair', color: { rgb: 'E5E7EB' } }, bottom: { style: 'hair', color: { rgb: 'E5E7EB' } } },
      };
    });
  });

  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 5, c: 0 }, e: { r: Math.max(5, rows.length + 5), c: headers.length - 1 } }) };
  ws['!freeze'] = { xSplit: 0, ySplit: 6 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Monitoreo');
  return wb;
}

export default function MonitoreoLimpieza() {
  const usuario = useAuthStore((s) => s.usuario);
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ search: '', version: [], ubicacion: [], unidades: [], fechaInicio: '', fechaFin: '', retrasoMayorA3Dias: false });
  const [activeFilters, setActiveFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: '', direction: '' });
  const [pendingToggles, setPendingToggles] = useState({});
  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const rows = await fetchAllMonitoreo(activeFilters);
      const wb = buildMonitoreoWorkbook(rows, activeFilters);
      const fecha = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Monitoreo_${fecha}.xlsx`);
    } catch (e) {
      console.error('Error exportando:', e);
      alert('Error al generar el archivo.');
    } finally {
      setExporting(false);
    }
  };

  const { mutate: updateToggle } = useMutation({
    mutationFn: (vars) => gqlClient.request(UPDATE_MONITOREO_LIMPIEZA, vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['monitoreoImpresiones'] }),
  });

  const handleToggle = (noserie, field, currentVal) => {
    const newVal = currentVal === 1 ? 0 : 1;
    setPendingToggles(p => ({ ...p, [`${noserie}_${field}`]: newVal }));
    updateToggle({ noserie, [field]: newVal }, {
      onSettled: () => setPendingToggles(p => { const n = { ...p }; delete n[`${noserie}_${field}`]; return n; }),
    });
  };

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

  const { data: filtrosDbData } = useQuery({
    queryKey: ['monitoreoFiltros', filters.unidades],
    queryFn: async () => {
      const vars = {
        unidades: filters.unidades && filters.unidades.length > 0 ? filters.unidades : undefined
      };
      const res = await gqlClient.request(GET_MONITOREO_FILTROS, vars);
      return res.monitoreoFiltros;
    },
    staleTime: 5 * 60 * 1000,
  });

  const unidadesOpciones = (catData?.unidades || []).map(u => {
    const resumen = (resumenData || []).find(r => r.clave === u.clave);
    const total = resumen ? resumen.total_impresiones : null;
    return {
      value: u.clave,
      label: `${u.descripcion}${total != null ? ` (${total} impresiones)` : ''}`,
      extra: total != null ? (
        <span className="text-gray-400 font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
          {total.toLocaleString()}
        </span>
      ) : null
    };
  });

  const versionesOpciones = (filtrosDbData?.versiones || []).map(v => ({ value: v, label: v }));
  const ubicacionesOpciones = (filtrosDbData?.ubicaciones || []).map(u => ({ value: u, label: u }));

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
      if (filters.version && filters.version.length > 0) newFilters.version = filters.version;
      if (filters.ubicacion && filters.ubicacion.length > 0) newFilters.ubicacion = filters.ubicacion;
      if (filters.unidades && filters.unidades.length > 0) newFilters.unidades = filters.unidades;
      if (filters.fechaInicio) newFilters.fechaInicio = filters.fechaInicio;
      if (filters.fechaFin) newFilters.fechaFin = filters.fechaFin;
      if (filters.retrasoMayorA3Dias) newFilters.retrasoMayorA3Dias = true;
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
    setFilters({ search: '', version: [], ubicacion: [], unidades: [], fechaInicio: '', fechaFin: '', retrasoMayorA3Dias: false });
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
            onClick={handleExportExcel}
            disabled={exporting || isLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-[#006341] hover:bg-[#004d32] rounded-xl shadow-sm transition-colors disabled:opacity-50"
            title="Exportar a Excel"
          >
            {exporting
              ? <Loader2 size={18} className="animate-spin" />
              : <FileSpreadsheet size={18} />}
            Exportar Excel
          </button>
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
            <div className="flex-1 min-w-[150px] sm:flex-none sm:w-40">
              <MultiSearchableSelect
                placeholder="Versión..."
                value={filters.version}
                onChange={(val) => setFilters(prev => ({ ...prev, version: val }))}
                options={versionesOpciones}
              />
            </div>
            <div className="flex-1 min-w-[200px] sm:flex-none sm:w-56">
              <MultiSearchableSelect
                placeholder="Ubicación..."
                value={filters.ubicacion}
                onChange={(val) => setFilters(prev => ({ ...prev, ubicacion: val }))}
                options={ubicacionesOpciones}
                disabled={!filters.unidades || filters.unidades.length === 0}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div 
                className="flex flex-1 items-center gap-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-3 pr-2 py-1.5 focus-within:ring-2 focus-within:ring-green-600 focus-within:bg-white dark:focus-within:bg-gray-800 transition-all cursor-pointer"
                onClick={() => { const el = document.getElementById('fechaInicioInput'); if (el && el.showPicker) el.showPicker(); }}
              >
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Desde</span>
                <input
                  id="fechaInicioInput"
                  type="date"
                  name="fechaInicio"
                  value={filters.fechaInicio}
                  min={filtrosDbData?.fechaMinGlobal || undefined}
                  max={filters.fechaFin || filtrosDbData?.fechaMaxGlobal || undefined}
                  onKeyDown={(e) => e.preventDefault()}
                  onClick={(e) => e.target.showPicker && e.target.showPicker()}
                  onChange={(e) => {
                    let val = e.target.value;
                    const max = filters.fechaFin || filtrosDbData?.fechaMaxGlobal;
                    const min = filtrosDbData?.fechaMinGlobal;
                    if (val && max && val > max) val = max;
                    if (val && min && val < min) val = min;
                    setFilters(prev => ({ ...prev, fechaInicio: val }));
                  }}
                  className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
                />
              </div>
              <div 
                className="flex flex-1 items-center gap-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pl-3 pr-2 py-1.5 focus-within:ring-2 focus-within:ring-green-600 focus-within:bg-white dark:focus-within:bg-gray-800 transition-all cursor-pointer"
                onClick={() => { const el = document.getElementById('fechaFinInput'); if (el && el.showPicker) el.showPicker(); }}
              >
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Hasta</span>
                <input
                  id="fechaFinInput"
                  type="date"
                  name="fechaFin"
                  value={filters.fechaFin}
                  min={filters.fechaInicio || filtrosDbData?.fechaMinGlobal || undefined}
                  max={filtrosDbData?.fechaMaxGlobal || undefined}
                  onKeyDown={(e) => e.preventDefault()}
                  onClick={(e) => e.target.showPicker && e.target.showPicker()}
                  onChange={(e) => {
                    let val = e.target.value;
                    const min = filters.fechaInicio || filtrosDbData?.fechaMinGlobal;
                    const max = filtrosDbData?.fechaMaxGlobal;
                    if (val && max && val > max) val = max;
                    if (val && min && val < min) val = min;
                    setFilters(prev => ({ ...prev, fechaFin: val }));
                  }}
                  className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl transition-all">
              <input
                type="checkbox"
                name="retrasoMayorA3Dias"
                checked={filters.retrasoMayorA3Dias}
                onChange={(e) => setFilters(prev => ({ ...prev, retrasoMayorA3Dias: e.target.checked }))}
                className="rounded border-gray-300 text-red-600 focus:ring-red-600"
              />
              <span className="font-medium">Retraso &gt; 3 días</span>
            </label>
            {Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : (typeof v === 'boolean' ? v : v !== '')) && (
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
              <table className="w-full text-left text-xs table-fixed" style={{ minWidth: '1050px' }}>
                <colgroup>
                  <col style={{ width: '12rem' }} />
                  <col style={{ width: '10rem' }} />
                  <col style={{ minWidth: '150px' }} />
                  <col style={{ minWidth: '150px' }} />
                  <col style={{ width: '8rem' }} />
                  <col style={{ width: '12rem' }} />
                  <col style={{ width: '8rem' }} />
                  <col style={{ width: '6rem' }} />
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
                      Rango de Fecha <SortIcon columnKey="fecha" />
                    </th>
                    <th className="px-3 py-2.5 text-center whitespace-nowrap">Limpieza Lógica</th>
                    <th className="px-3 py-2.5 text-center whitespace-nowrap">WiFi</th>
                    <th className="px-3 py-2.5 text-center whitespace-nowrap cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" onClick={() => handleSort('total_impresiones')}>
                      Total Impresiones <SortIcon columnKey="total_impresiones" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {monitoreoData.map((item, idx) => {
                    let isDelayed = false;
                    if (item.fecha_max) {
                      const today = new Date();
                      today.setHours(0,0,0,0);
                      const [y, m, d] = item.fecha_max.split('T')[0].split('-');
                      const maxDateObj = new Date(y, m - 1, d);
                      const diffDays = (today - maxDateObj) / (1000 * 60 * 60 * 24);
                      isDelayed = diffDays > 3;
                    }

                    const rowClass = isDelayed 
                      ? "bg-red-50 dark:bg-red-900/10 border-l-[3px] border-l-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors group"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/50/80 dark:hover:bg-gray-700/80 transition-colors group";

                    return (
                      <tr key={idx} className={rowClass}>
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
                        <td className="px-3 py-2.5 whitespace-nowrap text-[11px] font-medium tracking-wide">
                          {item.fecha_min ? (() => {
                            const formatDate = (isoStr) => {
                              const [year, month, day] = isoStr.split('T')[0].split('-');
                              return `${day}/${month}/${year}`;
                            };
                            const minD = formatDate(item.fecha_min);
                            const maxD = item.fecha_max ? formatDate(item.fecha_max) : minD;
                            
                            const textClass = isDelayed ? "text-red-600 dark:text-red-400 font-bold" : "text-gray-600 dark:text-gray-400";

                            return <span className={textClass}>{minD === maxD ? minD : `${minD} - ${maxD}`}</span>;
                          })() : '—'}
                        </td>
                      {/* Toggle Limpieza Lógica */}
                      <td className="px-3 py-2.5 text-center">
                        {(() => {
                          const key = `${item.num_serie}_limpieza_logica`;
                          const val = key in pendingToggles ? pendingToggles[key] : item.limpieza_logica;
                          const on = val === 1;
                          return (
                            <button
                              onClick={() => handleToggle(item.num_serie, 'limpieza_logica', val)}
                              title={on ? 'Limpieza lógica realizada' : 'Sin limpieza lógica'}
                              className={`relative inline-flex items-center w-9 h-5 rounded-full transition-colors focus:outline-none ${
                                on ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                              }`}
                            >
                              <span className={`inline-block w-3.5 h-3.5 bg-white rounded-full shadow transform transition-transform ${
                                on ? 'translate-x-4' : 'translate-x-0.5'
                              }`} />
                            </button>
                          );
                        })()}
                      </td>
                      {/* Toggle WiFi */}
                      <td className="px-3 py-2.5 text-center">
                        {(() => {
                          const key = `${item.num_serie}_wifi`;
                          const val = key in pendingToggles ? pendingToggles[key] : item.wifi;
                          const on = val === 1;
                          return (
                            <button
                              onClick={() => handleToggle(item.num_serie, 'wifi', val)}
                              title={on ? 'WiFi activo' : 'Sin WiFi'}
                              className={`relative inline-flex items-center w-9 h-5 rounded-full transition-colors focus:outline-none ${
                                on ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                              }`}
                            >
                              <span className={`inline-block w-3.5 h-3.5 bg-white rounded-full shadow transform transition-transform ${
                                on ? 'translate-x-4' : 'translate-x-0.5'
                              }`} />
                            </button>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold text-gray-700 dark:text-gray-300">
                        {item.total_impresiones != null ? item.total_impresiones.toLocaleString() : '0'}
                      </td>
                    </tr>
                  );
                })}
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
