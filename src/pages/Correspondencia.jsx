import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, Mail, RefreshCw, Loader2, AlertTriangle, FileText, Calendar, Building2, CheckCircle, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
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
        part.toLowerCase() === highlight.toLowerCase() ? 
          <span key={i} className="bg-yellow-200 text-yellow-900 font-bold">{part}</span> : 
          part
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
  
  // Filters State
  const [filters, setFilters] = useState({
    Tipo: '',
    NoOficio: '',
    Folio: '',
    PalabraClave: ''
  });
  const [activeFilters, setActiveFilters] = useState({});

  const { data: correspondencias = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['mesaCorrespondencias', activeFilters],
    queryFn: () => getMesaCorrespondencias(Object.keys(activeFilters).length > 0 ? activeFilters : undefined),
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
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
    <div className="p-4 sm:p-6 fade-in relative flex flex-col h-[calc(100dvh-70px)] sm:h-[calc(100vh-70px)] overflow-hidden">
      
      {/* Header */}
      <div className="sticky top-0 z-40 flex-shrink-0 pb-4 mb-4 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 -mx-4 px-4 sm:mx-0 sm:px-0 bg-white/90 backdrop-blur-md">
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
              className="flex items-center gap-2 bg-[#00472e] hover:bg-[#003824] text-white px-5 py-2.5 rounded-lg font-medium transition-colors text-sm shadow-sm"
            >
              <Plus size={18} /><span>Nuevo Registro</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs / Filters Top Row */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-center bg-white p-3 rounded-2xl shadow-sm border border-gray-100 mb-4 shrink-0">
        
        {/* Tabs de Tipo */}
        <div className="flex bg-gray-100 p-1 rounded-xl w-full xl:w-auto">
          <button 
            onClick={() => setFilters(prev => ({ ...prev, Tipo: '' }))} 
            className={`flex-1 xl:flex-none px-6 py-2 text-sm font-semibold rounded-lg transition-all ${filters.Tipo === '' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Todos
          </button>
          <button 
            onClick={() => setFilters(prev => ({ ...prev, Tipo: '1' }))} 
            className={`flex-1 xl:flex-none px-6 py-2 text-sm font-semibold rounded-lg transition-all ${filters.Tipo === '1' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Enviadas
          </button>
          <button 
            onClick={() => setFilters(prev => ({ ...prev, Tipo: '2' }))} 
            className={`flex-1 xl:flex-none px-6 py-2 text-sm font-semibold rounded-lg transition-all ${filters.Tipo === '2' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Recibidas
          </button>
        </div>

        {/* Búsqueda general */}
        <div className="flex-1 flex gap-3 w-full xl:max-w-2xl">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
            className="w-32 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-600 focus:bg-white outline-none transition-all hidden sm:block"
          />
          <input
            type="number"
            name="Folio"
            value={filters.Folio}
            onChange={handleFilterChange}
            placeholder="Folio..."
            className="w-24 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-600 focus:bg-white outline-none transition-all hidden sm:block"
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 overflow-hidden">

        {/* Tabla de Resultados */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-w-0">
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <Loader2 size={36} className="animate-spin text-blue-500" />
                  <p className="text-sm font-medium">Cargando oficios...</p>
                </div>
              </div>
            ) : isError ? (
              <div className="flex items-center justify-center h-full text-red-500 flex-col gap-2">
                <AlertTriangle size={32} />
                <p>Error al cargar la correspondencia</p>
              </div>
            ) : correspondencias.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400 flex-col gap-2">
                <FileText size={32} className="opacity-50" />
                <p>No se encontraron registros</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs table-fixed">
                <colgroup>
                  <col style={{width: '2.5rem'}} />
                  <col style={{width: '3.5rem'}} />
                  <col style={{width: '5rem'}} />
                  <col style={{width: '7.5rem'}} />
                  <col style={{width: '7.5rem'}} />
                  <col style={{width: '8rem'}} />
                  <col style={{width: '8rem'}} />
                  <col style={{width: '8rem'}} />
                  <col />
                  <col style={{width: '4.5rem'}} />
                  <col style={{width: '7rem'}} />
                </colgroup>
                <thead className="bg-gray-100 text-gray-600 sticky top-0 z-10 uppercase tracking-wider font-bold shadow-sm">
                  <tr>
                    <th className="px-4 py-3 text-center w-12"></th>
                    <th className="px-4 py-3">Folio</th>
                    <th className="px-4 py-3">NoOficio</th>
                    <th className="px-4 py-3">FechaRecepcion</th>
                    <th className="px-4 py-3">FechaOficio</th>
                    <th className="px-4 py-3">Remitente</th>
                    <th className="px-4 py-3">Unidad</th>
                    <th className="px-4 py-3">Ubicación</th>
                    <th className="px-4 py-3 w-64">Descripcion</th>
                    <th className="px-4 py-3 text-center">Tipo</th>
                    <th className="px-4 py-3 text-center">Archivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {correspondencias.map(corr => (
                    <tr key={corr.Folio} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-4 py-3 text-center">
                        <CheckCircle size={18} className="text-green-500 inline-block" />
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-800">{corr.Folio}</td>
                      <td className="px-4 py-3 text-blue-600 font-semibold">
                        <HighlightText text={corr.NoOficio || '—'} highlight={activeFilters.NoOficio || activeFilters.PalabraClave} />
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(corr.FechaRecepcion)}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(corr.FechaOficio)}</td>
                      <td className="px-4 py-3 text-gray-800 font-medium">
                        <HighlightText text={corr.Remitente || '—'} highlight={activeFilters.PalabraClave} />
                      </td>
                      <td className="px-4 py-3 text-gray-600 align-top leading-snug">
                        {corr.unidad?.descripcion || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 align-top leading-snug">
                        {corr.ubicacion?.nombre_ubicacion || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 align-top">
                        <div className={`break-words whitespace-pre-wrap ${expandedDesc[corr.Folio] ? '' : 'line-clamp-3'}`}>
                          <HighlightText text={corr.Descripcion} highlight={activeFilters.PalabraClave} />
                        </div>
                        {corr.Descripcion && corr.Descripcion.length > 80 && (
                          <button onClick={() => toggleDesc(corr.Folio)} className="text-blue-500 hover:underline text-[10px] mt-1 font-semibold block">
                            {expandedDesc[corr.Folio] ? 'Ver menos' : 'Ver más'}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {corr.Tipo === 1 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-md">
                            <ArrowUpCircle size={12} /> Env.
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-purple-600 bg-purple-100 px-2 py-1 rounded-md">
                            <ArrowDownCircle size={12} /> Rec.
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-700">
                        {corr.archivo_ref?.Archivo || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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
