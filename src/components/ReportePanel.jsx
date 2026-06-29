import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import {
  Loader2, X, BarChart2, CheckCircle, AlertCircle, Shield, Package,
  AlertTriangle, Monitor, Cpu, Hash, MapPin, Search, ChevronRight,
  Printer, Smartphone, Network, ArrowLeft, Phone
} from 'lucide-react';
import { gqlClient } from '../api/client';
import { GET_REPORTE_UNIDADES_QUERY } from '../api/inventario.queries';

// ── Helpers de Detección de Dispositivo ──────────────────────────────
function categorizeDevice(tipo) {
  const t = (tipo || '').toLowerCase();
  if (t.includes('pc') || t.includes('escritorio') || t.includes('desktop') || t.includes('cómputo') || t.includes('computo')) return 'pcs';
  if (t.includes('laptop') || t.includes('notebook') || t.includes('portátil') || t.includes('portatil')) return 'laptops';
  if (t.includes('impresora') || t.includes('multifuncional')) return 'impresoras';
  if (t.includes('switch')) return 'switches';
  if (t.includes('teléfono') || t.includes('telefono')) {
    if (t.includes('ip')) return 'telefonosIP';
    return 'telefonosNormal';
  }
  return 'otros';
}

function isNotBien(tipo) {
  if (!tipo) return false;
  const t = tipo.toLowerCase();
  return t.includes('monitor') || t.includes('mouse') || t.includes('ratón') || t.includes('raton') || t.includes('teclado');
}

function normalizeString(str) {
  if (!str) return '';
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// ── Componentes de UI Institucionales ────────────────────────────────
function StatCard({ label, value, variant = 'green', icon: Icon }) {
  const colorMap = {
    green: { bg: "bg-green-100 dark:bg-green-900/30 text-[#00472e] dark:text-green-400", text: "text-gray-900 dark:text-gray-100" },
    red: { bg: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400", text: "text-red-600 dark:text-red-400" },
    yellow: { bg: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400", text: "text-gray-900 dark:text-gray-100" },
    blue: { bg: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400", text: "text-gray-900 dark:text-gray-100" }
  }[variant] || { bg: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400", text: "text-gray-900 dark:text-gray-100" };

  return (
    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm min-w-0">
      {Icon && (
        <div className={`p-2.5 rounded-lg shrink-0 ${colorMap.bg}`}>
          <Icon size={18} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">{label}</p>
        <p className={`text-xl font-bold leading-tight mt-0.5 ${colorMap.text}`}>{value}</p>
      </div>
    </div>
  );
}

function formatPct(count, total) {
  if (!total || count === 0) return "0%";
  const raw = (count / total) * 100;
  if (raw >= 100) return "100%";
  if (Number.isInteger(raw)) return `${raw}%`;
  if (raw >= 10) return `${Number(raw.toFixed(1))}%`;
  if (raw >= 1) return `${Number(raw.toFixed(1))}%`;
  if (raw >= 0.01) return `${Number(raw.toFixed(2))}%`;
  return "< 0.01%";
}

function BarRow({ label, count, total, color = '#00472e' }) {
  const rawPct = total > 0 ? (count / total) * 100 : 0;
  const displayPct = formatPct(count, total);
  const barWidth = count > 0 ? Math.max(rawPct, 1.5) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-start justify-between text-xs gap-3">
        <span className="text-gray-700 dark:text-gray-300 font-medium leading-tight">{label}</span>
        <span className="font-semibold text-gray-900 dark:text-gray-100 shrink-0 mt-0.5">{count} <span className="text-gray-400 font-normal text-[10px]">({displayPct})</span></span>
      </div>
      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${barWidth}%`, backgroundColor: color === '#10B981' || color === '#15803D' ? '#00472e' : color }}
        />
      </div>
    </div>
  );
}

function DevicePill({ icon: Icon, count, label, color = 'blue' }) {
  if (count === 0) return null;
  const colorMap = {
    blue: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/40",
    indigo: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/40",
    purple: "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800/40",
    teal: "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-100 dark:border-teal-800/40",
    emerald: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/40",
    amber: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-800/40",
  }[color] || "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700";

  return (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${colorMap}`}>
      <Icon size={13} className="opacity-75" />
      <span>{count} {label}</span>
    </div>
  );
}

// ── Componente Principal ──────────────────────────────────────────────
export default function ReportePanel({ serverFilter, activeTab, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupedData, setGroupedData] = useState([]);
  
  // Vistas: 'lista' | 'detalle'
  const [view, setView] = useState('lista');
  const [selectedUnidad, setSelectedUnidad] = useState(null);
  const [search, setSearch] = useState('');
  const [searchUbicacion, setSearchUbicacion] = useState('');
  const [ubicacionTipoFilter, setUbicacionTipoFilter] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    gqlClient.request(GET_REPORTE_UNIDADES_QUERY, { filter: serverFilter })
      .then(data => {
        if (!cancelled) {
          const parsed = (data.reportePorUnidades || []).map(u => ({
            ...u,
            ubicacionesStats: JSON.parse(u.ubicacionesStatsJson),
            detailStats: JSON.parse(u.detailStatsJson)
          }));
          setGroupedData(parsed);
          setLoading(false);
        }
      })
      .catch(e => { if (!cancelled) { setError(e?.message || 'Error'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [JSON.stringify(serverFilter)]);

  // Filtrado de la lista por búsqueda
  const filteredUnidades = useMemo(() => {
    if (!search.trim()) return groupedData;
    const q = normalizeString(search);
    return groupedData.filter(u => 
      normalizeString(u.descCorta).includes(q) || 
      normalizeString(u.descripcion).includes(q) ||
      normalizeString(u.clave).includes(q)
    );
  }, [groupedData, search]);

  // Detalles calculados de la unidad seleccionada
  const detailStats = useMemo(() => {
    if (!selectedUnidad) return null;
    const estatusMap = {
      'ACTIVO': { label: 'Activo', color: '#00472e', badgeCls: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800/50' },
      'INACTIVO': { label: 'Inactivo', color: '#DC2626', badgeCls: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800/50' },
      'DAÑADO': { label: 'Dañado', color: '#D97706', badgeCls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50' },
      'DEVOLUCIÓN': { label: 'Devolución', color: '#7C3AED', badgeCls: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50' },
      'OTRO': { label: 'Otro', color: '#4B5563', badgeCls: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700' },
      'BAJA': { label: 'Baja', color: '#475569', badgeCls: 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border border-slate-400 dark:border-slate-600' },
      'P_BAJA': { label: 'Pre-Baja', color: '#EA580C', badgeCls: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800/50' },
      'PRESTAMO': { label: 'Préstamo', color: '#2563EB', badgeCls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50' },
      'SINIESTRADO': { label: 'Siniestrado', color: '#E11D48', badgeCls: 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50' },
      'SUSTITUIDO': { label: 'Sustituido', color: '#4F46E5', badgeCls: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50' },
      'TRASPASO OOAD': { label: 'Traspaso OOAD', color: '#0D9488', badgeCls: 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800/50' },
      'TRASPASO_FORANEO': { label: 'Traspaso Foráneo', color: '#0284C7', badgeCls: 'bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800/50' },
    };
    return {
      ...selectedUnidad.detailStats,
      estatusMap
    };
  }, [selectedUnidad]);

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70 transition-opacity pointer-events-none" />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl min-h-[550px] max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Header institucional Verde IMSS */}
        <div className="bg-[#00472e] dark:bg-[#002618] px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {view === 'detalle' && (
              <button 
                onClick={() => { setView('lista'); setSelectedUnidad(null); setSearchUbicacion(''); setUbicacionTipoFilter([]); }}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors mr-1 shrink-0"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="min-w-0">
              <h2 className="text-lg font-bold truncate leading-tight">
                {view === 'lista' ? 'Reporte por Unidad Física' : `Detalle de ${selectedUnidad.descCorta}`}
              </h2>
              <p className="text-xs text-green-200 mt-0.5">
                {activeTab === 'Capitalizable' ? 'Bienes Capitalizables' : activeTab === 'No Capitalizable' ? 'Bienes No Capitalizables' : 'Todos los Bienes'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors shrink-0 ml-4">
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-900 relative">
          
          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 min-h-[450px]">
              <div className="p-4 rounded-full bg-green-50 dark:bg-green-900/20 mb-4 border border-green-100 dark:border-green-800/40 shadow-inner">
                <Loader2 size={40} className="animate-spin text-[#00472e] dark:text-green-400" />
              </div>
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">Generando Reporte Institucional</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 max-w-md text-center leading-relaxed">
                Consultando el inventario físico institucional, aglutinando y clasificando dispositivos informáticos por delegación, unidad médica y área administrativa...
              </p>
            </div>
          )}

          {error && (
            <div className="p-6 m-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-center text-red-600 dark:text-red-400 font-medium">
              Error: {error}
            </div>
          )}

          {/* VISTA 1: LISTA DE UNIDADES */}
          {!loading && !error && view === 'lista' && (
            <div className="flex-1 flex flex-col p-5 sm:p-6 overflow-hidden h-full">
              
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-5 shrink-0">
                <div className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 shadow-sm w-full sm:w-auto text-xs font-semibold">
                  <BarChart2 size={16} className="text-[#00472e] dark:text-green-400" />
                  <span>{groupedData.length} Unidades analizadas</span>
                </div>
                
                <div className="relative w-full sm:w-72">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar unidad..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm outline-none focus:border-[#00472e] dark:focus:border-green-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm placeholder-gray-400"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3 pb-4">
                {filteredUnidades.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Package size={48} className="mx-auto mb-3 opacity-20" />
                    <p className="font-semibold text-gray-500 dark:text-gray-400">No se encontraron unidades</p>
                  </div>
                ) : (
                  filteredUnidades.map(u => (
                    <div 
                      key={u.clave} 
                      onClick={() => { setSelectedUnidad(u); setView('detalle'); setSearchUbicacion(''); setUbicacionTipoFilter([]); }}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-300 dark:hover:border-gray-600 shadow-sm cursor-pointer transition-all gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm sm:text-base group-hover:text-[#00472e] dark:group-hover:text-green-400 transition-colors">{u.descripcion}</h3>
                          <span className="text-[10px] bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded font-mono font-bold">{u.clave}</span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-1.5">
                          <DevicePill icon={Cpu} count={u.pcs} label="PCs" color="blue" />
                          <DevicePill icon={Monitor} count={u.laptops} label="Laptops" color="indigo" />
                          <DevicePill icon={Printer} count={u.impresoras} label="Impresoras" color="purple" />
                          <DevicePill icon={Network} count={u.switches} label="Switches" color="teal" />
                          <DevicePill icon={Smartphone} count={u.telefonosIP} label="Tel. IP" color="emerald" />
                          <DevicePill icon={Phone} count={u.telefonosNormal} label="Tel. Analógico" color="amber" />
                        </div>
                      </div>

                      <div className="flex items-center gap-6 shrink-0">
                        {u.inconvenientes > 0 && (
                          <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-100 dark:border-red-800/30">
                            <AlertTriangle size={15} />
                            {u.inconvenientes} Inconvenientes
                          </div>
                        )}
                        <div className="text-right flex flex-col items-end">
                          <p className="text-2xl font-bold text-[#00472e] dark:text-green-400 leading-none">{u.total}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">Dispositivos</p>
                        </div>
                        <ChevronRight size={20} className="text-gray-300 dark:text-gray-600 group-hover:text-[#00472e] dark:group-hover:text-green-400 transition-colors hidden sm:block" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* VISTA 2: DETALLE DE LA UNIDAD */}
          {!loading && !error && view === 'detalle' && selectedUnidad && detailStats && (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 bg-gray-50 dark:bg-gray-900 fade-in space-y-6 pb-8">
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="col-span-2 sm:col-span-1 p-4 rounded-xl text-center flex flex-col justify-center shadow-sm bg-[#00472e] dark:bg-[#002618] text-white">
                  <p className="text-4xl font-bold">{detailStats.total}</p>
                  <p className="text-[10px] text-green-200 mt-1 font-bold uppercase tracking-widest">Total de Equipos</p>
                </div>
                <StatCard label="Con Inconvenientes" value={selectedUnidad.inconvenientes} variant={selectedUnidad.inconvenientes > 0 ? "red" : "green"} icon={AlertTriangle} />
                <StatCard label="Garantía Vigente" value={detailStats.garantiaVigente} variant="green" icon={Shield} />
                <StatCard label="Alertas Recientes" value={detailStats.conAdv} variant="yellow" icon={AlertCircle} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Panel Izquierdo: Estatus y Desglose principal */}
                <div className="space-y-6">
                  {/* Desglose por Dispositivo */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-gray-200 dark:border-gray-800 pb-2">
                      <Cpu size={14} className="text-[#00472e] dark:text-green-400" /> Dispositivos y sus Estatus
                    </h4>
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                      {Object.entries(detailStats.byTipoDetalle)
                        .sort((a, b) => b[1].total - a[1].total)
                        .map(([tipo, data]) => (
                          <div key={tipo} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3.5 shadow-sm">
                            <div className="flex justify-between items-center mb-2.5">
                              <span className="font-bold text-gray-800 dark:text-gray-100 text-sm">{tipo}</span>
                              <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{data.total} total</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {Object.entries(data.estatus)
                                .sort((a, b) => b[1] - a[1])
                                .map(([st, count]) => {
                                  const meta = detailStats.estatusMap[st] ?? { label: st, badgeCls: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700' };
                                  return (
                                    <span key={st} className={`text-[10px] font-semibold px-2 py-0.5 rounded ${meta.badgeCls}`}>
                                      {meta.label}: {count}
                                    </span>
                                  );
                                })}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Estatus Operativo */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-gray-200 dark:border-gray-800 pb-2">
                      <CheckCircle size={14} className="text-[#00472e] dark:text-green-400" /> Estatus Operativo
                    </h4>
                    <div className="space-y-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                      {Object.entries(detailStats.byEstatus)
                        .sort((a, b) => b[1] - a[1])
                        .map(([key, count]) => {
                          const meta = detailStats.estatusMap[key] ?? { label: key, color: '#6B7280' };
                          return <BarRow key={key} label={meta.label} count={count} total={detailStats.total} color={meta.color} />;
                        })}
                    </div>
                  </div>
                </div>

                {/* Panel Derecho: Ubicaciones detalladas y Garantías */}
                <div className="space-y-6">
                  
                  {/* Distribución por Ubicación */}
                  <div>
                    <div className="flex flex-col gap-2 mb-3 border-b border-gray-200 dark:border-gray-800 pb-2">
                      <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin size={14} className="text-[#00472e] dark:text-green-400" /> Distribución por Ubicación
                      </h4>
                      
                      {/* Filter by Type */}
                      {detailStats && Object.keys(detailStats.byTipoDetalle).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1 max-h-24 overflow-y-auto pr-1 custom-scrollbar">
                          {Object.keys(detailStats.byTipoDetalle).sort().map(t => {
                            const isSelected = ubicacionTipoFilter.includes(t);
                            return (
                              <button 
                                key={t}
                                onClick={() => setUbicacionTipoFilter(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                                className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer ${isSelected ? 'bg-[#00472e] dark:bg-[#002618] text-white border-[#00472e]' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                              >
                                {t}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <div className="relative mt-1">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                          type="text" 
                          placeholder="Buscar ubicación por nombre..." 
                          value={searchUbicacion}
                          onChange={(e) => setSearchUbicacion(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs outline-none focus:border-[#00472e] dark:focus:border-green-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400"
                        />
                      </div>
                    </div>
                    
                    {(() => {
                      const filteredUbicaciones = Object.entries(selectedUnidad.ubicacionesStats)
                        .filter(([ubicacion, stats]) => {
                          if (searchUbicacion && !normalizeString(ubicacion).includes(normalizeString(searchUbicacion))) {
                            return false;
                          }
                          if (ubicacionTipoFilter.length > 0) {
                            const hasMatch = ubicacionTipoFilter.some(t => stats.tipos[t] > 0);
                            if (!hasMatch) return false;
                          }
                          return true;
                        })
                        .sort((a, b) => b[1].total - a[1].total);

                      return Object.keys(selectedUnidad.ubicacionesStats).length > 0 ? (
                        filteredUbicaciones.length > 0 ? (
                          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                            {filteredUbicaciones.map(([ubicacion, stats]) => (
                              <div key={ubicacion} className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                <div className="flex justify-between items-center mb-2">
                                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{ubicacion}</p>
                                  <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{stats.total} total</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {Object.entries(stats.tipos)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([t, count]) => {
                                      const isHighlighted = ubicacionTipoFilter.length === 0 || ubicacionTipoFilter.includes(t);
                                      return (
                                        <span key={t} className={`text-[10px] font-medium px-1.5 py-0.5 rounded border transition-opacity ${isHighlighted ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 opacity-40'}`}>
                                          {t}: {count}
                                        </span>
                                      );
                                    })}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400 italic">No hay resultados para los filtros seleccionados.</p>
                        )
                      ) : (
                        <p className="text-sm text-gray-400 italic">No hay ubicaciones registradas</p>
                      );
                    })()}
                  </div>

                  {/* Garantías Resumen */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-gray-200 dark:border-gray-800 pb-2">
                      <Shield size={14} className="text-[#00472e] dark:text-green-400" /> Resumen de Garantías
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <StatCard label="Vigentes" value={detailStats.garantiaVigente} variant="green" icon={Shield} />
                      <StatCard label="Vencidas" value={detailStats.garantiaVencida} variant="red" icon={Shield} />
                      <div className="col-span-2 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <BarRow label="Proporción con Garantía Vigente" count={detailStats.garantiaVigente} total={detailStats.total} color="#00472e" />
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
