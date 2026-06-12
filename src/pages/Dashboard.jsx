import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  Package, AlertTriangle, ShieldAlert, TrendingUp, Activity,
  CheckCircle, Plus, ArrowRight, QrCode, RefreshCw, Settings, Search, X, ChevronDown,
  LogIn, LogOut, Edit3, Building2
} from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { GET_DASHBOARD_METRICS_QUERY, GET_DASHBOARD_STATS_QUERY } from '../api/inventario.queries';
import { GET_GARANTIAS } from '../api/garantias.queries';
import { GET_BITACORA } from '../api/bitacora.queries';
import AnimatedCounter from '../components/AnimatedCounter';

const LOG_ICONS = {
  'CREACION': { icon: Plus, color: '#16a34a', bg: '#dcfce7' },
  'EDICION': { icon: Edit3, color: '#2563eb', bg: '#dbeafe' },
  'ELIMINACION': { icon: AlertTriangle, color: '#dc2626', bg: '#fee2e2' },
  'TRASPASO': { icon: ArrowRight, color: '#7c3aed', bg: '#ede9fe' },
  'LOGIN': { icon: LogIn, color: '#ca8a04', bg: '#fef9c3' },
};

const getNaturalTitle = (log) => {
  const t = log.tabla_afectada?.toLowerCase() || '';
  const a = (log.accion || '').toUpperCase();
  if (a === 'CREACION') {
    if (t.includes('bienes')) return 'Alta de activo';
    if (t.includes('incidencia')) return 'Reporte de incidencia';
    if (t.includes('garantia')) return 'Registro de garantía';
    if (t.includes('usuario')) return 'Usuario creado';
    if (t.includes('qr')) return 'QR generado';
    return 'Alta de registro';
  }
  if (a === 'EDICION') {
    if (t.includes('bienes')) return 'Actualización de activo';
    if (t.includes('incidencia')) return 'Actualización de incidencia';
    return 'Actualización de registro';
  }
  if (a === 'ELIMINACION') return 'Eliminación de registro';
  if (a === 'TRASPASO') return 'Traspaso autorizado';
  if (a === 'LOGIN') return 'Inicio de sesión';
  return `${log.accion} en ${t}`;
};

const formatDetails = (log) => {
  const id = log.registro_afectado;
  let det = log.detalles_movimiento || '';
  if (det.includes('{') || det.includes('[')) {
    return `Se modificó la información del registro (ID: ${id})`;
  }
  return det || `Registro afectado (ID: ${id})`;
};

function formatBitacoraDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const pad = (n) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Paleta de colores para tipos de dispositivo ─────────────────────────────
const DEVICE_COLORS = [
  '#006341',
  '#c9a227',
  '#2563eb',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
  '#d97706',
  '#059669',
];

// Aclara un color hex para la franja de préstamo (mezcla con blanco al 45%)
function lightenHex(hex, amount = 0.45) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * amount);
  const lg = Math.round(g + (255 - g) * amount);
  const lb = Math.round(b + (255 - b) * amount);
  return `rgb(${lr},${lg},${lb})`;
}

// ─── Barra horizontal segmentada por tipo de dispositivo ─────────────────────
function DeviceTypeBar({ selectedDrilldownUnit, allUnits, metricsRawData }) {
  const unidadData = allUnits?.find(u => u.jefatura === selectedDrilldownUnit);
  const clave = unidadData?.clave;

  const drilldownData = React.useMemo(() => {
    if (!metricsRawData || !selectedDrilldownUnit) return [];
    const typeMap = {};
    
    metricsRawData.forEach(row => {
      // Filtrar por la unidad seleccionada
      if (row.jefatura !== selectedDrilldownUnit) return;

      const isMonitor = String(row.tipo_disp) === '12' || (row.nombre_tipo || '').toUpperCase().includes('MONITOR');
      if (isMonitor) return;

      const t = row.nombre_tipo || 'Otro';
      const st = (row.estatus_operativo || '').toUpperCase();
      const isActive = st === 'ACTIVO' || st === 'PRESTAMO' || st === 'PRÉSTAMO';

      if (!isActive) return;

      if (!typeMap[t]) typeMap[t] = { activo: 0, prestamo: 0 };
      if (st === 'PRÉSTAMO' || st === 'PRESTAMO') {
        typeMap[t].prestamo += row.count;
      } else {
        typeMap[t].activo += row.count;
      }
    });

    return Object.entries(typeMap)
      .map(([tipo, { activo, prestamo }]) => ({
        tipo,
        activo,
        prestamo,
        count: activo + prestamo,
      }))
      .sort((a, b) => b.count - a.count);
  }, [metricsRawData, selectedDrilldownUnit]);

  const total = drilldownData.reduce((s, d) => s + d.count, 0);
  const totalPrestamo = drilldownData.reduce((s, d) => s + (d.prestamo || 0), 0);
  const [hovered, setHovered] = React.useState(null);

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900 line-clamp-1" title={selectedDrilldownUnit}>
            Desglose: {selectedDrilldownUnit || 'Seleccione una unidad'}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Por tipo de dispositivo · {total} equipo{total !== 1 ? 's' : ''} en total</p>
        </div>
        {/* Mini-leyenda de codificación */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-3 rounded-sm bg-gray-800" />
            <span className="text-xs text-gray-500">Activo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-3 rounded-sm" style={{ background: 'repeating-linear-gradient(45deg, #9ca3af 0px, #9ca3af 2px, #e5e7eb 2px, #e5e7eb 6px)' }} />
            <span className="text-xs text-gray-500">Préstamo</span>
          </div>
        </div>
      </div>

      {drilldownData.length > 0 ? (
        <>
          {/* ── Barra única horizontal: cada tipo tiene 2 sub-segmentos ── */}
          <div className="relative w-full h-11 rounded-xl overflow-hidden flex mb-1 shadow-sm" style={{ background: '#f3f4f6' }}>
            {drilldownData.map((item, idx) => {
              const typePct  = total > 0 ? (item.count / total) * 100 : 0;
              const activoPct  = item.count > 0 ? (item.activo  / item.count) * 100 : 0;
              const prestamoPct = item.count > 0 ? (item.prestamo / item.count) * 100 : 0;
              const baseColor = DEVICE_COLORS[idx % DEVICE_COLORS.length];
              const lightColor = lightenHex(baseColor, 0.45);
              const isHov = hovered === idx;

              return (
                <div
                  key={item.tipo}
                  title={`${item.tipo}\nActivos: ${item.activo}  |  Préstamo: ${item.prestamo}`}
                  onMouseEnter={() => setHovered(idx)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    width: `${typePct}%`,
                    minWidth: typePct > 0 ? '4px' : '0',
                    display: 'flex',
                    transition: 'filter 0.15s, width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                    filter: isHov ? 'brightness(1.12) drop-shadow(0 0 3px rgba(0,0,0,0.25))' : 'brightness(1)',
                    position: 'relative',
                  }}
                >
                  {/* Sub-bloque ACTIVO */}
                  {item.activo > 0 && (
                    <div
                      style={{ width: `${activoPct}%`, backgroundColor: baseColor, minWidth: '2px', transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
                      className="flex items-center justify-center overflow-hidden"
                    >
                      {activoPct >= 10 && typePct >= 8 && (
                        <span style={{ color: '#fff', fontSize: 10, fontWeight: 700, userSelect: 'none' }} className="truncate px-0.5">
                          {item.activo}
                        </span>
                      )}
                    </div>
                  )}
                  {/* Sub-bloque PRÉSTAMO (color aclarado + patrón diagonal) */}
                  {item.prestamo > 0 && (
                    <div
                      style={{
                        width: `${prestamoPct}%`,
                        minWidth: '2px',
                        background: `repeating-linear-gradient(45deg, ${baseColor} 0px, ${baseColor} 3px, ${lightColor} 3px, ${lightColor} 9px)`,
                        transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      className="flex items-center justify-center overflow-hidden"
                    >
                      {prestamoPct >= 10 && typePct >= 8 && (
                        <span style={{ color: '#fff', fontSize: 10, fontWeight: 700, userSelect: 'none', textShadow: '0 0 3px rgba(0,0,0,0.5)' }} className="truncate px-0.5">
                          {item.prestamo}
                        </span>
                      )}
                    </div>
                  )}
                  {/* Separador visual entre tipos */}
                  {idx < drilldownData.length - 1 && (
                    <div style={{ width: 2, backgroundColor: '#fff', flexShrink: 0 }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Escala de porcentaje */}
          <div className="flex justify-between mb-5">
            <span className="text-xs text-gray-400">0%</span>
            <span className="text-xs text-gray-400">50%</span>
            <span className="text-xs text-gray-400">100%</span>
          </div>

          {/* ── Leyenda ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {drilldownData.map((item, idx) => {
              const baseColor = DEVICE_COLORS[idx % DEVICE_COLORS.length];
              const pct = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0.0';
              const isHov = hovered === idx;
              return (
                <div
                  key={item.tipo}
                  onMouseEnter={() => setHovered(idx)}
                  onMouseLeave={() => setHovered(null)}
                  className={`rounded-xl px-3 py-2.5 border transition-all cursor-default ${
                    isHov ? 'border-gray-300 shadow-sm' : 'border-gray-100'
                  }`}
                  style={{ backgroundColor: isHov ? `${baseColor}12` : '#fff' }}
                >
                  {/* Nombre + % */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: baseColor }} />
                    <p className="text-xs font-semibold text-gray-800 truncate flex-1">{item.tipo}</p>
                    <span className="text-xs text-gray-400 flex-shrink-0">{pct}%</span>
                  </div>
                  {/* Total prominente */}
                  <p className="text-lg font-bold text-gray-900 leading-none mb-1.5">
                    {item.count}
                    <span className="text-xs font-normal text-gray-400 ml-1">en total</span>
                  </p>
                  {/* Desglose activo / préstamo */}
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: baseColor }} />
                      <span className="text-xs text-gray-600">{item.activo} activos</span>
                    </div>
                    {item.prestamo > 0 ? (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: `repeating-linear-gradient(45deg, ${baseColor} 0px, ${baseColor} 1.5px, #e5e7eb 1.5px, #e5e7eb 4px)` }} />
                        <span className="text-xs text-amber-600 font-medium">{item.prestamo} préstamo</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">sin préstamos</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Resumen total préstamos */}
          {totalPrestamo > 0 && (
            <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-100">
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: 'repeating-linear-gradient(45deg, #d97706 0px, #d97706 2px, #fde68a 2px, #fde68a 6px)' }} />
              <p className="text-xs text-amber-700 font-medium">
                {totalPrestamo} equipo{totalPrestamo !== 1 ? 's' : ''} actualmente en préstamo
                <span className="text-amber-500 font-normal"> · {total > 0 ? ((totalPrestamo / total) * 100).toFixed(1) : 0}% del total de la unidad</span>
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center text-gray-400 h-40 gap-2">
          <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="8" rx="2"/><path d="M7 12h10"/></svg>
          <p className="text-sm">Sin datos para esta unidad</p>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { usuario } = useAuthStore();
  const [scrollYVelocity, setScrollYVelocity] = useState(0);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;
    let velocityTimeout;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const velocity = currentScrollY - lastScrollY;
          // Dampen and limit velocity para un efecto de scroll suave y controlado
          const limitedVelocity = Math.max(-60, Math.min(60, velocity));
          setScrollYVelocity(limitedVelocity);
          lastScrollY = currentScrollY;
          
          clearTimeout(velocityTimeout);
          velocityTimeout = setTimeout(() => {
            setScrollYVelocity(0);
          }, 150);
          
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(velocityTimeout);
    };
  }, []);
  const idRol = usuario?.id_rol ?? 3;
  const isMaestro = idRol === 1;
  const isAdmin = idRol === 2;
  const isPrivileged = isMaestro || isAdmin;

  // --- DATA FETCHING ---
  const { data: statsData, isLoading: loadStats } = useQuery({
    queryKey: ['dashboard_stats'],
    queryFn: () => gqlClient.request(GET_DASHBOARD_STATS_QUERY),
    select: d => d.dashboardStats,
    refetchInterval: 10000,
  });

  const { data: metricsRawData, isLoading: loadMetrics } = useQuery({
    queryKey: ['dashboard_metrics'],
    queryFn: () => gqlClient.request(GET_DASHBOARD_METRICS_QUERY),
    select: d => d.dashboardMetrics,
    refetchInterval: 60000,
  });

  const { data: garantiasData, isLoading: loadGarantias } = useQuery({
    queryKey: ['dashboard_garantias'],
    queryFn: () => gqlClient.request(GET_GARANTIAS),
    select: d => d.garantias,
    enabled: isPrivileged,
    refetchInterval: 15000,
  });

  const { data: bitacoraData, isLoading: loadBitacora } = useQuery({
    queryKey: ['dashboard_bitacora'],
    queryFn: () => gqlClient.request(GET_BITACORA, { first: 10 }),
    select: d => d.bitacora.edges.map(e => e.node),
    enabled: isMaestro,
    refetchInterval: 5000,
  });

  const garantias = garantiasData || [];
  const bitacora = bitacoraData || [];

  // --- METRICS ---
  const totalActivos = statsData?.bienesActivos ?? 0;
  const incidenciasActivas = (statsData?.incidenciasPendientes ?? 0) + (statsData?.incidenciasEnProceso ?? 0);
  const garantiasVencer = statsData?.garantiasPorVencer ?? 0;
  const inactivosCount = statsData?.bienesInactivos ?? 0;
  const totalBienesCount = statsData?.totalBienes ?? 0;
  const tasaDisponibilidad = totalBienesCount === 0 ? "0.00" : ((inactivosCount / totalBienesCount) * 100).toFixed(2);

  // --- CHART LOGIC ---
  const allUnits = useMemo(() => {
    if (!metricsRawData) return [];
    
    const unitMap = {};
    metricsRawData.forEach(row => {
      const isMonitor = String(row.tipo_disp) === '12' || (row.nombre_tipo || '').toUpperCase().includes('MONITOR');
      const st = row.estatus_operativo || '';
      const isActive = st === 'ACTIVO' || st === 'PRESTAMO' || st === 'PRÉSTAMO';
      
      if (!isMonitor && isActive) {
        const u = row.jefatura || 'Sin Unidad';
        if (!unitMap[u]) {
          unitMap[u] = { jefatura: u, clave: row.clave_unidad, equipos: 0 };
        }
        unitMap[u].equipos += row.count;
      }
    });

    return Object.values(unitMap).sort((a, b) => b.equipos - a.equipos);
  }, [metricsRawData]);

  const [selectedUnits, setSelectedUnits] = useState([]);
  const [selectedDrilldownUnit, setSelectedDrilldownUnit] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [configSearch, setConfigSearch] = useState('');

  useEffect(() => {
    if (allUnits.length > 0 && selectedUnits.length === 0) {
      setSelectedUnits(allUnits.slice(0, 6).map(u => u.jefatura));
    }
    if (allUnits.length > 0 && !selectedDrilldownUnit) {
      setSelectedDrilldownUnit(allUnits[0].jefatura);
    }
  }, [allUnits, selectedUnits.length, selectedDrilldownUnit]);

  const toggleUnit = (unit) => {
    setSelectedUnits(prev => {
      if (prev.includes(unit)) {
        if (prev.length <= 3) return prev; // MINIMUM 3
        return prev.filter(u => u !== unit);
      }
      if (prev.length >= 10) return prev; // MAXIMUM 10
      return [...prev, unit];
    });
  };

  const normalizeStr = (str) => {
    return (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  const [metricsSelectedUnit, setMetricsSelectedUnit] = useState(null);
  const [metricsDropdownOpen, setMetricsDropdownOpen] = useState(false);
  const [metricsSearchInput, setMetricsSearchInput] = useState('');

  const getCardMetrics = (tipoCondition) => {
    let activos = 0, prestamo = 0, inactivos = 0;
    
    (metricsRawData || []).forEach(row => {
      // Filtrar por unidad si hay una seleccionada
      if (metricsSelectedUnit && row.jefatura !== metricsSelectedUnit) return;
      
      // Filtrar por tipo
      if (!tipoCondition(row.tipo_disp, row.nombre_tipo)) return;
      
      const st = row.estatus_operativo || '';
      if (st === 'ACTIVO') activos += row.count;
      else if (st === 'PRESTAMO' || st === 'PRÉSTAMO') prestamo += row.count;
      else if (st === 'INACTIVO') inactivos += row.count;
    });

    return { total: activos + prestamo + inactivos, activos, prestamo, inactivos };
  };

  const metricComp = useMemo(() => getCardMetrics((t, n) => {
    const nUp = (n || '').toUpperCase();
    return nUp.includes('PC') || nUp.includes('LAPTOP');
  }), [metricsRawData, metricsSelectedUnit]);

  const metricImpresoras = useMemo(() => getCardMetrics((t, n) => {
    return String(t) === '1' || (n || '').toUpperCase().includes('IMPRESORA');
  }), [metricsRawData, metricsSelectedUnit]);

  const metricSwitches = useMemo(() => getCardMetrics((t, n) => {
    return String(t) === '9' || (n || '').toUpperCase().includes('SWITCH');
  }), [metricsRawData, metricsSelectedUnit]);

  const metricTelIP = useMemo(() => getCardMetrics((t, n) => {
    return String(t) === '25' || (n || '').toUpperCase().includes('IP');
  }), [metricsRawData, metricsSelectedUnit]);

  const metricTelNorm = useMemo(() => getCardMetrics((t, n) => {
    const nUp = (n || '').toUpperCase();
    return String(t) === '26' || (nUp.includes('TEL') && !nUp.includes('IP'));
  }), [metricsRawData, metricsSelectedUnit]);

  const filteredMetricsUnits = useMemo(() => {
    if (!metricsSearchInput.trim()) return allUnits;
    const term = normalizeStr(metricsSearchInput);
    return allUnits.filter(u => normalizeStr(u.jefatura).includes(term));
  }, [allUnits, metricsSearchInput]);

  const filteredAllUnits = useMemo(() => {
    if (!configSearch) return allUnits;
    const term = normalizeStr(configSearch);
    return allUnits.filter(u => normalizeStr(u.jefatura).includes(term));
  }, [allUnits, configSearch]);

  const chartData = useMemo(() => {
    return allUnits.filter(u => selectedUnits.includes(u.jefatura));
  }, [allUnits, selectedUnits]);

  // --- RENDER HELPERS ---
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-lg">
          <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
          <p className="text-lg font-bold" style={{ color: payload[0].payload.fill || '#006341' }}>{payload[0].value} equipos</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 fade-in pb-20">
      <style>{`
        @keyframes slideDownFade {
          0% { opacity: 0; transform: translateY(-15px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down { animation: slideDownFade 0.5s ease-out forwards; }
      `}</style>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Panel Principal</h1>
        <p className="text-gray-500 text-sm mt-1">
          Delegación Nayarit – IMSS &nbsp;|&nbsp; {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Total Activos */}
        <div 
          onClick={() => navigate('/inventario')}
          className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-500 font-medium group-hover:text-gray-700 transition-colors">Total de Bienes Activos</p>
              <p className="text-3xl font-bold mt-1 text-gray-900"><AnimatedCounter value={totalActivos} /></p>
              <p className="text-xs mt-1 text-green-700 font-medium">Activos y Préstamo</p>
            </div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-green-100">
              <Package size={22} className="text-green-700" />
            </div>
          </div>
        </div>

        {/* Card 2: Incidencias Activas */}
        <div 
          onClick={() => navigate('/incidencias')}
          className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-500 font-medium group-hover:text-gray-700 transition-colors">Incidencias Activas</p>
              <p className="text-3xl font-bold mt-1 text-gray-900"><AnimatedCounter value={incidenciasActivas} /></p>
              <p className="text-xs mt-1 text-red-600 font-medium">Activas y En Proceso</p>
            </div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-100">
              <AlertTriangle size={22} className="text-red-600" />
            </div>
          </div>
        </div>

        {/* Card 3: Garantías o Sustituto QR */}
        {isPrivileged ? (
          <div 
            onClick={() => navigate('/garantias', { state: { filterPorVencer: true } })}
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-500 font-medium group-hover:text-gray-700 transition-colors">Garantías por Vencer</p>
                <p className="text-3xl font-bold mt-1 text-gray-900"><AnimatedCounter value={garantiasVencer} /></p>
                <p className="text-xs mt-1 text-amber-600 font-medium">Próximos 2 meses</p>
              </div>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-amber-100">
                <ShieldAlert size={22} className="text-amber-600" />
              </div>
            </div>
          </div>
        ) : (
          <div 
            onClick={() => navigate('/escaner')}
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-500 font-medium group-hover:text-gray-700 transition-colors">Escáner QR</p>
                <p className="text-xl font-bold mt-2 text-gray-900">Lectura Rápida</p>
                <p className="text-xs mt-1 text-cyan-700 font-medium">Ir al escáner</p>
              </div>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-cyan-100">
                <QrCode size={22} className="text-cyan-700" />
              </div>
            </div>
          </div>
        )}

        {/* Card 4: Tasa Disponibilidad o Sustituto */}
        {isPrivileged ? (
          <div 
            onClick={() => navigate('/inventario', { state: { filterStatus: 'INACTIVO' } })}
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-500 font-medium group-hover:text-gray-700 transition-colors">Equipos Inactivos</p>
                <div className="flex flex-col items-start gap-1.5 mt-1">
                  <p className="text-3xl font-bold text-gray-900 leading-none"><AnimatedCounter value={inactivosCount} /></p>
                  <p className="text-[11px] text-blue-700 font-bold bg-blue-50/80 px-2 py-0.5 rounded-md border border-blue-100/50">{tasaDisponibilidad}% del total</p>
                </div>
              </div>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-100">
                <TrendingUp size={22} className="text-blue-600" />
              </div>
            </div>
          </div>
        ) : (
          <div 
            onClick={() => navigate('/unidades')}
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-500 font-medium group-hover:text-gray-700 transition-colors">Catálogo General</p>
                <p className="text-xl font-bold mt-2 text-gray-900">Unidades</p>
                <p className="text-xs mt-1 text-emerald-600 font-medium">Ir al catálogo</p>
              </div>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-100">
                <Building2 size={22} className="text-emerald-600" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Filter and 4 New Metric Cards */}
      {loadMetrics ? (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col items-center justify-center h-48">
          <RefreshCw size={24} className="animate-spin text-green-600 mb-2" />
          <p className="text-sm text-gray-500">Cargando métricas detalladas...</p>
        </div>
      ) : (
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-1">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Métricas Detalladas por Equipo</h2>
            <p className="text-xs text-gray-500 mt-0.5">Desglose de inventario para la unidad seleccionada</p>
          </div>
          <div className="relative w-full md:w-80">
            <button
              onClick={() => {
                setMetricsDropdownOpen(!metricsDropdownOpen);
                if (!metricsDropdownOpen) setMetricsSearchInput('');
              }}
              className="w-full flex items-center justify-between px-4 py-2 text-sm bg-white border border-gray-200 hover:border-green-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 shadow-sm transition-all text-gray-700"
            >
              <span className="truncate pr-2">
                {metricsSelectedUnit || "Todas las unidades"}
              </span>
              <div className="flex items-center gap-1">
                {metricsSelectedUnit && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setMetricsSelectedUnit(null);
                    }}
                    className="p-0.5 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={14} />
                  </div>
                )}
                <ChevronDown size={16} className="text-gray-400" />
              </div>
            </button>

            {metricsDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden flex flex-col max-h-72">
                <div className="p-2 border-b border-gray-100 relative">
                  <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar unidad..."
                    value={metricsSearchInput}
                    onChange={e => setMetricsSearchInput(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 transition-colors"
                  />
                </div>
                <div className="overflow-y-auto scrollbar-thin p-1">
                  <button
                    onClick={() => {
                      setMetricsSelectedUnit(null);
                      setMetricsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${
                      !metricsSelectedUnit ? 'bg-green-50 text-green-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Todas las unidades
                  </button>
                  {filteredMetricsUnits.map((u) => (
                    <button
                      key={u.jefatura}
                      onClick={() => {
                        setMetricsSelectedUnit(u.jefatura);
                        setMetricsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors truncate mt-0.5 ${
                        metricsSelectedUnit === u.jefatura ? 'bg-green-50 text-green-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {u.jefatura}
                    </button>
                  ))}
                  {filteredMetricsUnits.length === 0 && (
                    <div className="px-3 py-4 text-center text-xs text-gray-500">
                      No se encontraron resultados
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Computadoras */}
          <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 mb-1">Equipos de Cómputo (PC y Laptop)</h3>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-3xl font-bold text-gray-900 leading-none"><AnimatedCounter value={metricComp.total} /></span>
              <span className="text-xs text-gray-400 font-medium mb-1">total</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-50">
              <div className="flex flex-col">
                <span className="text-xs text-gray-400">Activos</span>
                <span className="text-sm font-semibold text-green-600"><AnimatedCounter value={metricComp.activos} /></span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-400">Préstamo</span>
                <span className="text-sm font-semibold text-blue-600"><AnimatedCounter value={metricComp.prestamo} /></span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-400">Inactivos</span>
                <span className="text-sm font-semibold text-gray-500"><AnimatedCounter value={metricComp.inactivos} /></span>
              </div>
            </div>
          </div>

          {/* Card 2: Impresoras */}
          <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 mb-1">Impresoras</h3>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-3xl font-bold text-gray-900 leading-none"><AnimatedCounter value={metricImpresoras.total} /></span>
              <span className="text-xs text-gray-400 font-medium mb-1">total</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-50">
              <div className="flex flex-col">
                <span className="text-xs text-gray-400">Activos</span>
                <span className="text-sm font-semibold text-green-600"><AnimatedCounter value={metricImpresoras.activos} /></span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-400">Préstamo</span>
                <span className="text-sm font-semibold text-blue-600"><AnimatedCounter value={metricImpresoras.prestamo} /></span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-400">Inactivos</span>
                <span className="text-sm font-semibold text-gray-500"><AnimatedCounter value={metricImpresoras.inactivos} /></span>
              </div>
            </div>
          </div>

          {/* Card 3: Switches */}
          <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-500 mb-1">Redes (Switches)</h3>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-3xl font-bold text-gray-900 leading-none"><AnimatedCounter value={metricSwitches.total} /></span>
              <span className="text-xs text-gray-400 font-medium mb-1">total</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-50">
              <div className="flex flex-col">
                <span className="text-xs text-gray-400">Activos</span>
                <span className="text-sm font-semibold text-green-600"><AnimatedCounter value={metricSwitches.activos} /></span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-400">Préstamo</span>
                <span className="text-sm font-semibold text-blue-600"><AnimatedCounter value={metricSwitches.prestamo} /></span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-400">Inactivos</span>
                <span className="text-sm font-semibold text-gray-500"><AnimatedCounter value={metricSwitches.inactivos} /></span>
              </div>
            </div>
          </div>

          {/* Card 4: Telefonía (Combined) */}
          <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 flex flex-col justify-between">
            <h3 className="text-sm font-semibold text-gray-500 mb-2">Telefonía</h3>
            <div className="grid grid-cols-2 gap-3">
              {/* Tel IP */}
              <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-xl font-bold text-gray-900 leading-none"><AnimatedCounter value={metricTelIP.total} /></span>
                  <span className="text-[10px] text-gray-500 font-medium mb-0.5">Tel. IP</span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-400">Act:</span>
                    <span className="font-semibold text-green-600"><AnimatedCounter value={metricTelIP.activos} /></span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-400">Prést:</span>
                    <span className="font-semibold text-blue-600"><AnimatedCounter value={metricTelIP.prestamo} /></span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-400">Inact:</span>
                    <span className="font-semibold text-gray-500"><AnimatedCounter value={metricTelIP.inactivos} /></span>
                  </div>
                </div>
              </div>
              
              {/* Tel Normal */}
              <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-xl font-bold text-gray-900 leading-none"><AnimatedCounter value={metricTelNorm.total} /></span>
                  <span className="text-[10px] text-gray-500 font-medium mb-0.5">Tel. Norm.</span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-400">Act:</span>
                    <span className="font-semibold text-green-600"><AnimatedCounter value={metricTelNorm.activos} /></span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-400">Prést:</span>
                    <span className="font-semibold text-blue-600"><AnimatedCounter value={metricTelNorm.prestamo} /></span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-400">Inact:</span>
                    <span className="font-semibold text-gray-500"><AnimatedCounter value={metricTelNorm.inactivos} /></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Main Charts */}
      {loadMetrics ? (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col items-center justify-center h-64 mt-2">
          <RefreshCw size={24} className="animate-spin text-green-600 mb-2" />
          <p className="text-sm text-gray-500">Cargando gráfica principal...</p>
        </div>
      ) : (
      <div className="flex flex-col gap-5 sm:gap-6 mt-2">
        {/* Main Bar Chart with Sidebar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm w-full overflow-hidden flex flex-col lg:flex-row lg:h-[420px]">
          
          {/* Sidebar: Lista de unidades */}
          <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-gray-100 bg-gray-50/50 flex flex-col h-72 lg:h-full flex-shrink-0">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">Unidades a Graficar</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">Seleccionadas: {selectedUnits.length}/10 (Mín 3)</p>
              <div className="relative mt-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar unidad..."
                  value={configSearch}
                  onChange={e => setConfigSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 shadow-sm"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
              {filteredAllUnits.map((u) => {
                const isSelected = selectedUnits.includes(u.jefatura);
                return (
                  <button
                    key={u.jefatura}
                    onClick={() => toggleUnit(u.jefatura)}
                    className={`w-full text-left text-xs px-3 py-2.5 rounded-lg transition-all flex items-center justify-between ${
                      isSelected 
                        ? 'bg-green-50 text-green-800 border border-green-200/50 shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-100 border border-transparent'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate font-semibold">{u.jefatura}</span>
                      <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-green-600' : 'text-gray-400'}`}>
                        {u.equipos} bienes en total
                      </span>
                    </div>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300 bg-white'
                    }`}>
                      {isSelected && <CheckCircle size={10} strokeWidth={4} />}
                    </div>
                  </button>
                );
              })}
              {filteredAllUnits.length === 0 && (
                <div className="py-8 flex flex-col items-center justify-center text-gray-400 gap-2">
                  <Search size={20} className="text-gray-300" />
                  <p className="text-xs">No se encontraron unidades</p>
                </div>
              )}
            </div>
          </div>

          {/* Área del Gráfico */}
          <div className="flex-1 p-4 sm:p-6 relative flex flex-col min-h-[300px] lg:min-h-0 w-full overflow-hidden">
            <div className="flex items-center justify-between mb-5 gap-3">
              <div>
                <h2 className="text-base font-bold text-gray-900">Bienes Activos por Unidad</h2>
                <p className="text-xs text-gray-400 mt-0.5">Clic en una barra para ver el desglose inferior</p>
              </div>
            </div>
            
            <div 
              className="w-full h-[250px] lg:h-[300px] transition-transform duration-200 ease-out origin-bottom"
              style={{ transform: `scaleY(${1 + scrollYVelocity * 0.0015})` }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" vertical={false} />
                  <XAxis 
                    dataKey="jefatura" 
                    tick={{ fontSize: 10, fill: '#6b7280' }} 
                    angle={0} 
                    textAnchor="middle" 
                    height={40} 
                    tickFormatter={(value) => value.length > 12 ? `${value.substring(0, 10)}...` : value}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,99,65,0.05)' }} />
                  <Bar 
                    dataKey="equipos" 
                    radius={[6, 6, 0, 0]} 
                    onClick={(data) => {
                      if (data && data.jefatura) {
                        setSelectedDrilldownUnit(data.jefatura);
                      }
                    }}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={selectedDrilldownUnit === entry.jefatura ? '#c9a227' : '#006341'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Drilldown Chart (Para todos los usuarios) */}
        <DeviceTypeBar
          selectedDrilldownUnit={selectedDrilldownUnit}
          allUnits={allUnits}
          metricsRawData={metricsRawData}
        />
      </div>
      )}

      {/* Activity Log (Solo Maestro) */}
      {isMaestro && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-5">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Actividad Reciente</h2>
            <Activity size={18} className="text-gray-400" />
          </div>
          <div className="divide-y divide-gray-50">
            {loadBitacora ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
                <RefreshCw size={24} className="animate-spin text-green-600 mb-2" />
                <p className="text-sm">Cargando actividad...</p>
              </div>
            ) : bitacora.length > 0 ? bitacora.map((log) => {
              const title = getNaturalTitle(log);
              let conf = LOG_ICONS[log.accion] || LOG_ICONS.EDICION;
              
              // Ajustes de ícono basados en el título para coincidir exactamente con el diseño
              if (title === 'Reporte de incidencia') conf = { icon: AlertTriangle, color: '#dc2626', bg: '#fee2e2' };
              if (title === 'Usuario creado') conf = { icon: Package, color: '#ca8a04', bg: '#fef9c3' };
              if (title === 'Inicio de sesión') conf = { icon: LogIn, color: '#ca8a04', bg: '#fef9c3' };
              if (title === 'QR generado') conf = { icon: CheckCircle, color: '#0891b2', bg: '#e0f2fe' };
              
              const Icon = conf.icon;
              const desc = formatDetails(log);
              return (
                <div key={log.id_bitacora} className="flex items-start gap-4 px-6 py-3 hover:bg-gray-50 transition-colors animate-slide-down">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: conf.bg }}>
                    <Icon size={14} style={{ color: conf.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800">{title}</p>
                      <span className="text-xs text-gray-400">por {log.usuario?.nombre_completo || 'Sistema'}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate" title={desc}>
                      {desc}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums">
                    {formatBitacoraDate(log.fecha_movimiento)}
                  </span>
                </div>
              );
            }) : (
              <div className="px-6 py-8 text-center text-gray-500 text-sm">
                No hay actividad reciente.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
