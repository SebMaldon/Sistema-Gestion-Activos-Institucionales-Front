import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import {
  Loader2, X, BarChart2, CheckCircle, AlertCircle, Shield, Package,
  AlertTriangle, Monitor, Cpu, Hash, MapPin, Search, ChevronRight,
  Printer, Smartphone, Network, ArrowLeft, Phone
} from 'lucide-react';
import { gqlClient } from '../api/client';
import { GET_BIENES_REPORTE_QUERY } from '../api/inventario.queries';

// ── Fetch de todos los bienes filtrados ─────────────
async function fetchAllBienesForReport(serverFilter) {
  let all = [];
  let after = undefined;
  let hasNext = true;
  while (hasNext) {
    const data = await gqlClient.request(GET_BIENES_REPORTE_QUERY, {
      filter: serverFilter,
      pagination: { first: 1000, after },
    });
    const edges = data.bienes.edges ?? [];
    const pageInfo = data.bienes.pageInfo ?? {};
    all = all.concat(edges.map(({ node }) => ({
      id_bien: node.id_bien,
      estatusOperativo: node.estatus_operativo,
      modelo: node.modelo,
      garantias: node.garantias,
      numInv: node.num_inv,
      inconvenientes: node.inconvenientes,
      notas: node.notas,
      esCapitalizable: node.categoria?.es_capitalizable,
      unidad: node.unidad,
      ubicacion: node.ubicacion
    })));
    hasNext = pageInfo.hasNextPage && !!pageInfo.endCursor;
    after = pageInfo.endCursor;
  }
  return all;
}

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

// ── Componentes de UI ────────────────────────────────────────────────
function StatCard({ label, value, color = '#006341', bg = '#F0FDF4', icon: Icon }) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-xl border bg-white shadow-sm" style={{ borderColor: color + '30', backgroundColor: bg }}>
      {Icon && (
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + '18' }}>
          <Icon size={16} style={{ color }} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">{label}</p>
        <p className="text-lg font-bold leading-tight" style={{ color }}>{value}</p>
      </div>
    </div>
  );
}

function BarRow({ label, count, total, color = '#006341' }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-start justify-between text-xs gap-3">
        <span className="text-gray-700 font-medium leading-tight">{label}</span>
        <span className="font-bold text-gray-900 shrink-0 mt-0.5">{count} <span className="text-gray-400 font-normal text-[10px]">({pct}%)</span></span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function DevicePill({ icon: Icon, count, label, colorCls }) {
  if (count === 0) return null;
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold ${colorCls}`}>
      <Icon size={13} />
      <span>{count} {label}</span>
    </div>
  );
}

// ── Componente Principal ──────────────────────────────────────────────
export default function ReportePanel({ serverFilter, activeTab, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bienesList, setBienesList] = useState([]);
  
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
    fetchAllBienesForReport(serverFilter)
      .then(data => { if (!cancelled) { setBienesList(data); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e?.message || 'Error'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [JSON.stringify(serverFilter)]);

  // Agrupación de datos
  const groupedData = useMemo(() => {
    if (!bienesList.length) return [];

    const map = new Map();
    
    bienesList.forEach(b => {
      // Ignorar monitores, teclados, ratones
      const tipo = b.modelo?.tipoDispositivo?.nombre_tipo || '';
      if (isNotBien(tipo)) return;

      const clave = b.unidad?.clave || 'SIN_UNIDAD';
      const descCorta = b.unidad?.desc_corta || 'Sin Unidad Asignada';
      const descripcion = b.unidad?.descripcion || 'Sin Unidad Asignada';

      if (!map.has(clave)) {
        map.set(clave, {
          clave,
          descCorta,
          descripcion,
          bienes: [],
          ubicacionesStats: {},
          pcs: 0, laptops: 0, impresoras: 0, switches: 0, telefonosIP: 0, telefonosNormal: 0, otros: 0
        });
      }
      
      const g = map.get(clave);
      g.bienes.push(b);
      
      const cat = categorizeDevice(tipo);
      g[cat]++;

      const ubicacionNombre = b.ubicacion?.nombre_ubicacion || 'Sin Ubicación';
      if (!g.ubicacionesStats[ubicacionNombre]) {
        g.ubicacionesStats[ubicacionNombre] = { total: 0, tipos: {} };
      }
      g.ubicacionesStats[ubicacionNombre].total++;
      
      let uTipo = b.modelo?.tipoDispositivo?.nombre_tipo || 'Desconocido';
      const uTipoLower = uTipo.toLowerCase();
      if (uTipoLower.includes('teléfono') || uTipoLower.includes('telefono')) {
        uTipo = uTipoLower.includes('ip') ? 'Teléfono IP' : 'Teléfono Analógico/Otros';
      }
      g.ubicacionesStats[ubicacionNombre].tipos[uTipo] = (g.ubicacionesStats[ubicacionNombre].tipos[uTipo] || 0) + 1;
    });

    const arr = Array.from(map.values()).map(g => {
      const total = g.bienes.length;
      const inconvenientes = g.bienes.filter(b => b.inconvenientes && b.inconvenientes.length > 0).length;
      return { ...g, total, inconvenientes };
    });

    // Ordenar por total descendente
    arr.sort((a, b) => b.total - a.total);
    return arr;
  }, [bienesList]);

  // Filtrado de la lista por búsqueda
  const filteredUnidades = useMemo(() => {
    if (!search.trim()) return groupedData;
    const q = search.toLowerCase();
    return groupedData.filter(u => 
      u.descCorta.toLowerCase().includes(q) || 
      u.descripcion.toLowerCase().includes(q) ||
      u.clave.toLowerCase().includes(q)
    );
  }, [groupedData, search]);

  // Detalles calculados de la unidad seleccionada
  const detailStats = useMemo(() => {
    if (!selectedUnidad) return null;
    const { bienes } = selectedUnidad;
    const total = bienes.length;

    // Estatus
    const estatusMap = {
      'ALTA':          { label: 'Alta', color: '#15803D' },
      'BAJA':          { label: 'Baja', color: '#B91C1C' },
      'DAÑADO':        { label: 'Dañado', color: '#D97706' },
      'DEVOLUCIÓN':    { label: 'Devolución', color: '#7E22CE' },
      'OTRO':          { label: 'Otro', color: '#374151' },
      'P_BAJA':        { label: 'Pre-Baja', color: '#C2410C' },
      'PRESTAMO':      { label: 'Préstamo', color: '#1D4ED8' },
      'SINIESTRADO':   { label: 'Siniestrado', color: '#991B1B' },
      'SUSTITUIDO':    { label: 'Sustituido', color: '#4338CA' },
      'TRASPASO OOAD': { label: 'Traspaso OOAD', color: '#0F766E' },
      'TRASPASO_FORANEO': { label: 'Traspaso Foráneo', color: '#0369A1' },
    };
    const byEstatus = {};
    const byTipoDetalle = {};

    bienes.forEach(b => {
      const st = b.estatusOperativo || 'DESCONOCIDO';
      byEstatus[st] = (byEstatus[st] || 0) + 1;

      let tipo = b.modelo?.tipoDispositivo?.nombre_tipo || 'Desconocido';
      const tipoLower = tipo.toLowerCase();
      if (tipoLower.includes('teléfono') || tipoLower.includes('telefono')) {
        tipo = tipoLower.includes('ip') ? 'Teléfono IP' : 'Teléfono Analógico/Otros';
      }

      if (!byTipoDetalle[tipo]) {
        byTipoDetalle[tipo] = { total: 0, estatus: {} };
      }
      byTipoDetalle[tipo].total++;
      byTipoDetalle[tipo].estatus[st] = (byTipoDetalle[tipo].estatus[st] || 0) + 1;
    });

    // Garantías
    const conGarantia = bienes.filter(b => b.garantias?.length > 0);
    const garantiaVigente = conGarantia.filter(b => {
      const fin = b.garantias[0]?.fecha_fin;
      if (!fin) return false;
      return new Date(isNaN(Number(fin)) ? fin : Number(fin)) > new Date();
    }).length;
    const garantiaVencida = conGarantia.length - garantiaVigente;
    const sinGarantia = total - conGarantia.length;

    // Advertencias (notas recientes)
    const conAdv = bienes.filter(b =>
      b.notas?.some(n => {
        const d = new Date(isNaN(Number(n.fecha_creacion)) ? n.fecha_creacion : Number(n.fecha_creacion));
        return (new Date() - d) < 86400000 * 30; // 30 días
      })
    ).length;

    return { total, byEstatus, estatusMap, byTipoDetalle, garantiaVigente, garantiaVencida, sinGarantia, conAdv };
  }, [selectedUnidad]);

  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 fade-in" 
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)' }}
      onMouseDown={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden zoom-in h-[85vh] border border-teal-800/10"
        onMouseDown={e => e.stopPropagation()}
      >
        
        {/* Header - Mismo estilo que Registrar Nuevo Bien */}
        <div className="px-6 py-4 flex items-center justify-between shrink-0 text-white relative overflow-hidden"
             style={{ background: 'linear-gradient(135deg, #006341 0%, #004d32 100%)' }}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          
          <div className="flex items-center gap-3 relative z-10">
            {view === 'detalle' && (
              <button 
                onClick={() => { setView('lista'); setSelectedUnidad(null); setSearchUbicacion(''); setUbicacionTipoFilter([]); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors mr-1"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <p className="text-lg font-bold leading-tight flex items-center gap-2">
                {view === 'lista' ? 'Reporte por Unidad Física' : `Detalle de ${selectedUnidad.descCorta}`}
              </p>
              <p className="text-xs text-green-100/80">
                {activeTab === 'Capitalizable' ? 'Bienes Capitalizables' : 'Bienes No Capitalizables'}
              </p>
            </div>
          </div>
          
          <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors relative z-10">
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden flex flex-col bg-gray-50/50 relative">
          
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-20">
              <Loader2 size={36} className="animate-spin text-teal-600 mb-4" />
              <p className="text-sm font-bold text-gray-700">Calculando reporte de unidades...</p>
            </div>
          )}

          {error && (
            <div className="p-6 m-6 bg-red-50 border border-red-200 rounded-xl text-center text-red-600 font-medium">
              Error: {error}
            </div>
          )}

          {/* VISTA 1: LISTA DE UNIDADES */}
          {!loading && !error && view === 'lista' && (
            <div className="flex-1 flex flex-col p-5 sm:p-6 overflow-hidden h-full">
              
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-5 shrink-0">
                <div className="flex items-center gap-2 px-4 py-2 bg-teal-50 border border-teal-100 rounded-xl text-teal-800 w-full sm:w-auto">
                  <BarChart2 size={16} />
                  <span className="text-sm font-bold">{groupedData.length} Unidades analizadas</span>
                </div>
                
                <div className="relative w-full sm:w-72">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar unidad..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-white shadow-sm"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3 pb-4">
                {filteredUnidades.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Package size={48} className="mx-auto mb-3 opacity-20" />
                    <p className="font-semibold text-gray-500">No se encontraron unidades</p>
                  </div>
                ) : (
                  filteredUnidades.map(u => (
                    <div 
                      key={u.clave} 
                      onClick={() => { setSelectedUnidad(u); setView('detalle'); }}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-gray-200 rounded-2xl hover:border-teal-400 hover:shadow-md cursor-pointer transition-all gap-4"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <h3 className="font-bold text-gray-900 text-sm sm:text-base">{u.descripcion}</h3>
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-mono">{u.clave}</span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <DevicePill icon={Cpu} count={u.pcs} label="PCs" colorCls="bg-blue-50 text-blue-700 border border-blue-100" />
                          <DevicePill icon={Monitor} count={u.laptops} label="Laptops" colorCls="bg-indigo-50 text-indigo-700 border border-indigo-100" />
                          <DevicePill icon={Printer} count={u.impresoras} label="Impresoras" colorCls="bg-purple-50 text-purple-700 border border-purple-100" />
                          <DevicePill icon={Network} count={u.switches} label="Switches" colorCls="bg-cyan-50 text-cyan-700 border border-cyan-100" />
                          <DevicePill icon={Smartphone} count={u.telefonosIP} label="Tel. IP" colorCls="bg-emerald-50 text-emerald-700 border border-emerald-100" />
                          <DevicePill icon={Phone} count={u.telefonosNormal} label="Tel. Analógico" colorCls="bg-orange-50 text-orange-700 border border-orange-100" />
                        </div>
                      </div>

                      <div className="flex items-center gap-6 shrink-0">
                        {u.inconvenientes > 0 && (
                          <div className="flex items-center gap-1.5 text-red-600 bg-red-50 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-100">
                            <AlertTriangle size={14} />
                            {u.inconvenientes} Inconvenientes
                          </div>
                        )}
                        <div className="text-right flex flex-col items-end">
                          <p className="text-2xl font-black text-teal-800 leading-none">{u.total}</p>
                          <p className="text-[10px] font-bold text-teal-600/70 uppercase tracking-widest mt-1">Dispositivos</p>
                        </div>
                        <ChevronRight size={20} className="text-gray-300 group-hover:text-teal-500 transition-colors hidden sm:block" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* VISTA 2: DETALLE DE LA UNIDAD */}
          {!loading && !error && view === 'detalle' && selectedUnidad && detailStats && (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 bg-white fade-in space-y-6 pb-8">
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl text-center flex flex-col justify-center shadow-sm relative overflow-hidden"
                     style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
                  <p className="text-4xl font-black text-white relative z-10">{detailStats.total}</p>
                  <p className="text-[10px] text-green-200 mt-1 font-bold uppercase tracking-widest relative z-10">Total de Equipos</p>
                </div>
                <StatCard label="Con Inconvenientes" value={selectedUnidad.inconvenientes} color={selectedUnidad.inconvenientes > 0 ? "#B91C1C" : "#15803D"} bg={selectedUnidad.inconvenientes > 0 ? "#FEE2E2" : "#DCFCE7"} icon={AlertTriangle} />
                <StatCard label="Garantía Vigente" value={detailStats.garantiaVigente} color="#15803D" bg="#DCFCE7" icon={Shield} />
                <StatCard label="Alertas Recientes" value={detailStats.conAdv} color="#A16207" bg="#FEF9C3" icon={AlertCircle} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Panel Izquierdo: Estatus y Desglose principal */}
                <div className="space-y-6">
                  {/* Desglose por Dispositivo Dinámico */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b border-gray-100 pb-2">
                      <Cpu size={14} className="text-teal-600" /> Dispositivos y sus Estatus
                    </h4>
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                      {Object.entries(detailStats.byTipoDetalle)
                        .sort((a, b) => b[1].total - a[1].total)
                        .map(([tipo, data]) => (
                          <div key={tipo} className="bg-gray-50/80 border border-gray-200 rounded-xl p-3 shadow-sm">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-bold text-gray-800 text-sm">{tipo}</span>
                              <span className="text-[10px] font-black text-teal-800 bg-teal-100/50 px-2 py-0.5 rounded-md border border-teal-200">{data.total} total</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(data.estatus)
                                .sort((a, b) => b[1] - a[1])
                                .map(([st, count]) => {
                                  const meta = detailStats.estatusMap[st] ?? { label: st, color: '#6B7280' };
                                  return (
                                    <span key={st} className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border" style={{ color: meta.color, borderColor: meta.color + '40', backgroundColor: meta.color + '10' }}>
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
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b border-gray-100 pb-2">
                      <CheckCircle size={14} className="text-teal-600" /> Estatus Operativo
                    </h4>
                    <div className="space-y-3 p-4 bg-gray-50/50 rounded-xl border border-gray-100 shadow-inner">
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
                    <div className="flex flex-col gap-2 mb-3 border-b border-gray-100 pb-2">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                        <MapPin size={14} className="text-teal-600" /> Distribución por Ubicación
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
                                className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${isSelected ? 'bg-teal-600 text-white border-teal-700 font-bold shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
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
                          className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-teal-500 bg-white"
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
                          <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                            {filteredUbicaciones.map(([ubicacion, stats]) => (
                              <div key={ubicacion} className="p-3 bg-gray-50/80 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex justify-between items-center mb-2">
                                  <p className="text-sm font-bold text-gray-800">{ubicacion}</p>
                                  <span className="text-[10px] font-black text-teal-700 bg-teal-100/50 px-2 py-0.5 rounded-md border border-teal-200">{stats.total} total</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {Object.entries(stats.tipos)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([t, count]) => {
                                      const isHighlighted = ubicacionTipoFilter.length === 0 || ubicacionTipoFilter.includes(t);
                                      return (
                                        <span key={t} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${isHighlighted ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-gray-100 text-gray-400 border-gray-200 opacity-60'}`}>
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
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b border-gray-100 pb-2">
                      <Shield size={14} className="text-teal-600" /> Resumen de Garantías
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <StatCard label="Vigentes" value={detailStats.garantiaVigente} color="#15803D" bg="#DCFCE7" />
                      <StatCard label="Vencidas" value={detailStats.garantiaVencida} color="#B91C1C" bg="#FEE2E2" />
                      <div className="col-span-2">
                        <BarRow label="Proporción con Garantía Vigente" count={detailStats.garantiaVigente} total={detailStats.total} color="#15803D" />
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
