import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, X, BarChart2, CheckCircle, AlertCircle, Shield, Package, AlertTriangle, Monitor, Cpu, Hash } from 'lucide-react';
import { gqlClient } from '../api/client';
import { GET_BIENES_QUERY } from '../api/inventario.queries';
import { mapBienNode } from '../hooks/useBienes';

// ── Fetch de todos los bienes filtrados (hasta agotar paginación) ─────────────
async function fetchAllBienesForReport(serverFilter) {
  let all = [];
  let after = undefined;
  let hasNext = true;
  while (hasNext) {
    const data = await gqlClient.request(GET_BIENES_QUERY, {
      filter: serverFilter,
      pagination: { first: 500, after },
    });
    const edges = data.bienes.edges ?? [];
    const pageInfo = data.bienes.pageInfo ?? {};
    all = all.concat(edges.map(({ node }) => mapBienNode(node)));
    hasNext = pageInfo.hasNextPage && !!pageInfo.endCursor;
    after = pageInfo.endCursor;
  }
  return all;
}

// ── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color = '#006341', bg = '#F0FDF4', icon: Icon }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: color + '30', backgroundColor: bg }}>
      {Icon && (
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + '18' }}>
          <Icon size={15} style={{ color }} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide truncate">{label}</p>
        <p className="text-lg font-bold leading-tight" style={{ color }}>{value}</p>
      </div>
    </div>
  );
}

// ── Barra horizontal ──────────────────────────────────────────────────────────
function BarRow({ label, count, total, color = '#006341' }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-700 font-medium truncate max-w-[70%]">{label}</span>
        <span className="font-bold text-gray-900 ml-1">{count} <span className="text-gray-400 font-normal text-[10px]">({pct}%)</span></span>
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

// ── Componente principal ──────────────────────────────────────────────────────
export default function ReportePanel({ serverFilter, activeTab, onClose }) {
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [bienes, setBienes]     = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAllBienesForReport(serverFilter)
      .then(data => { if (!cancelled) { setBienes(data); setLoading(false); } })
      .catch(e  => { if (!cancelled) { setError(e?.message || 'Error'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [JSON.stringify(serverFilter)]);

  // ── Estadísticas calculadas ──────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!bienes.length) return null;

    const total = bienes.length;

    // Por estatus
    const estatusMap = {
      ACTIVO: { label: 'Activo',       color: '#15803D', bg: '#DCFCE7', icon: CheckCircle },
      EN_REPARACION: { label: 'En Reparación', color: '#A16207', bg: '#FEF9C3', icon: AlertCircle },
      BAJA: { label: 'Baja',           color: '#B91C1C', bg: '#FEE2E2', icon: X },
      PRESTAMO: { label: 'Préstamo',   color: '#1D4ED8', bg: '#DBEAFE', icon: Package },
      INACTIVO: { label: 'Inactivo',   color: '#6B7280', bg: '#F3F4F6', icon: AlertCircle },
    };
    const byEstatus = {};
    bienes.forEach(b => {
      const k = b.estatusOperativo || 'DESCONOCIDO';
      byEstatus[k] = (byEstatus[k] || 0) + 1;
    });

    // Por tipo dispositivo
    const byTipo = {};
    bienes.forEach(b => {
      const k = b.modelo?.tipoDispositivo?.nombre_tipo || 'Sin tipo';
      byTipo[k] = (byTipo[k] || 0) + 1;
    });

    // Garantía
    const conGarantia = bienes.filter(b => b.garantias?.length > 0);
    const garantiaVigente = conGarantia.filter(b => {
      const fin = b.garantias[0]?.fecha_fin;
      if (!fin) return false;
      const d = new Date(isNaN(Number(fin)) ? fin : Number(fin));
      return d > new Date();
    }).length;
    const garantiaVencida   = conGarantia.length - garantiaVigente;
    const sinGarantia       = total - conGarantia.length;

    // Inventario
    const conInv  = bienes.filter(b => b.numInv && b.numInv !== 'N/D').length;
    const sinInv  = total - conInv;

    // Advertencias recientes (últimos 30 días)
    const conAdv  = bienes.filter(b =>
      b.notas?.some(n => {
        const d = new Date(isNaN(Number(n.fecha_creacion)) ? n.fecha_creacion : Number(n.fecha_creacion));
        return (new Date() - d) < 86400000 * 30;
      })
    ).length;

    // Capitalizables
    const capitalizables    = bienes.filter(b => b.esCapitalizable).length;
    const noCapitalizables  = total - capitalizables;

    return {
      total, byEstatus, byTipo, estatusMap,
      garantiaVigente, garantiaVencida, sinGarantia,
      conInv, sinInv, conAdv,
      capitalizables, noCapitalizables,
    };
  }, [bienes]);

  return (
    <div className="mt-2 bg-white rounded-2xl border border-blue-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-blue-100"
           style={{ background: 'linear-gradient(135deg, #1E3A5F08, #1D4ED808)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <BarChart2 size={14} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Reporte de Inventario</p>
            <p className="text-[10px] text-gray-500">
              {activeTab === 'Capitalizable' ? 'Bienes Capitalizables' : 'Bienes No Capitalizables'} — datos completos filtrados
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Contenido */}
      <div className="p-5 max-h-[65vh] overflow-y-auto custom-scrollbar space-y-5">

        {loading && (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-gray-400">
            <Loader2 size={28} className="animate-spin text-blue-500" />
            <p className="text-sm font-medium">Cargando datos completos del inventario…</p>
            <p className="text-xs text-gray-400">Esto puede tardar unos segundos si hay muchos registros</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center text-red-600 text-sm">
            Error al cargar datos: {error}
          </div>
        )}

        {!loading && !error && stats && (
          <>
            {/* ── Total y resumen rápido ─────────────────────────────────── */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                <Hash size={11} /> General
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl text-center"
                     style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
                  <p className="text-4xl font-black text-white">{stats.total}</p>
                  <p className="text-[11px] text-green-200 mt-1 font-semibold uppercase tracking-wide">Total registros</p>
                </div>
                <StatCard label="Con inventario"  value={stats.conInv}  color="#15803D" bg="#DCFCE7" icon={CheckCircle} />
                <StatCard label="Sin inventario"  value={stats.sinInv}  color="#B91C1C" bg="#FEE2E2" icon={AlertTriangle} />
                <StatCard label="Con advertencia reciente" value={stats.conAdv} color="#A16207" bg="#FEF9C3" icon={AlertTriangle} />
              </div>
            </div>

            {/* ── Por estatus ────────────────────────────────────────────── */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                <CheckCircle size={11} /> Desglose por Estatus
              </p>
              <div className="space-y-2.5">
                {Object.entries(stats.byEstatus)
                  .sort((a, b) => b[1] - a[1])
                  .map(([key, count]) => {
                    const meta = stats.estatusMap[key] ?? { label: key, color: '#6B7280' };
                    return (
                      <BarRow
                        key={key}
                        label={meta.label}
                        count={count}
                        total={stats.total}
                        color={meta.color}
                      />
                    );
                  })}
              </div>
            </div>

            {/* ── Por tipo de dispositivo ────────────────────────────────── */}
            {Object.keys(stats.byTipo).length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                  <Cpu size={11} /> Desglose por Tipo de Dispositivo
                </p>
                <div className="space-y-2.5">
                  {Object.entries(stats.byTipo)
                    .sort((a, b) => b[1] - a[1])
                    .map(([tipo, count]) => (
                      <BarRow
                        key={tipo}
                        label={tipo}
                        count={count}
                        total={stats.total}
                        color="#1D4ED8"
                      />
                    ))}
                </div>
              </div>
            )}

            {/* ── Garantía ───────────────────────────────────────────────── */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                <Shield size={11} /> Garantía
              </p>
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Vigente"  value={stats.garantiaVigente} color="#15803D" bg="#DCFCE7" icon={Shield} />
                <StatCard label="Vencida"  value={stats.garantiaVencida} color="#B91C1C" bg="#FEE2E2" icon={AlertCircle} />
                <StatCard label="Sin garantía" value={stats.sinGarantia} color="#6B7280" bg="#F3F4F6" icon={Shield} />
              </div>
            </div>

            {/* ── N° Inventario ─────────────────────────────────────────── */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                <Package size={11} /> Estado de Número de Inventario
              </p>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Con N° Inventario"  value={stats.conInv} color="#15803D" bg="#DCFCE7" icon={CheckCircle} />
                <StatCard label="Sin N° Inventario" value={stats.sinInv} color="#B91C1C" bg="#FEE2E2" icon={AlertTriangle} />
              </div>
              <div className="mt-2">
                <BarRow label="Con número de inventario" count={stats.conInv} total={stats.total} color="#15803D" />
              </div>
            </div>

            {/* ── Nota al pie ───────────────────────────────────────────── */}
            <p className="text-[10px] text-gray-400 text-center pt-2 border-t border-gray-100">
              Datos calculados sobre <strong>{stats.total}</strong> registros con los filtros actuales • {new Date().toLocaleString('es-MX')}
            </p>
          </>
        )}

        {!loading && !error && (!stats || bienes.length === 0) && (
          <div className="text-center py-10 text-gray-400 text-sm">
            <Package size={32} className="mx-auto mb-2 opacity-30" />
            No hay registros con los filtros actuales.
          </div>
        )}
      </div>
    </div>
  );
}
