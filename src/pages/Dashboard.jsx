import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  Package, AlertTriangle, ShieldAlert, TrendingUp, Activity,
  CheckCircle, Clock, XCircle, Plus, ArrowRight
} from 'lucide-react';
import { mockActivityLog, mockEquiposPorJefatura, mockAssets, mockIncidencias } from '../data/mockData';
import { useApp } from '../context/AppContext';

const STAT_CARDS = [
  {
    title: 'Total de Activos', value: '47', sub: '+3 este mes', icon: Package,
    color: '#006341', bg: '#dcfce7', trend: 'up',
  },
  {
    title: 'Incidencias Activas', value: '6', sub: '2 críticas', icon: AlertTriangle,
    color: '#dc2626', bg: '#fee2e2', trend: 'neutral',
  },
  {
    title: 'Garantías por Vencer', value: '4', sub: 'Próximos 90 días', icon: ShieldAlert,
    color: '#ca8a04', bg: '#fef9c3', trend: 'warning',
  },
  {
    title: 'Tasa de Disponibilidad', value: '89.4%', sub: 'Equipos operativos', icon: TrendingUp,
    color: '#2563eb', bg: '#dbeafe', trend: 'up',
  },
];

const STATUS_COLORS = {
  'Activo': '#16a34a',
  'En Reparación': '#ca8a04',
  'Baja': '#dc2626',
};

const LOG_ICONS = {
  create: { icon: Plus, color: '#16a34a', bg: '#dcfce7' },
  incident: { icon: AlertTriangle, color: '#dc2626', bg: '#fee2e2' },
  edit: { icon: Activity, color: '#2563eb', bg: '#dbeafe' },
  transfer: { icon: ArrowRight, color: '#7c3aed', bg: '#ede9fe' },
  user: { icon: Package, color: '#ca8a04', bg: '#fef9c3' },
  qr: { icon: CheckCircle, color: '#0891b2', bg: '#e0f2fe' },
};

// Warranty expiring soon
const warrantySoon = mockAssets.filter(a => {
  const d = new Date(a.fechaVencimientoGarantia);
  const now = new Date('2026-03-07');
  const diff = (d - now) / (1000 * 60 * 60 * 24 * 30);
  return diff < 6 && diff > 0;
});

export default function Dashboard() {
  const { openFicha } = useApp();

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-lg">
          <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
          <p className="text-lg font-bold" style={{ color: '#006341' }}>{payload[0].value} equipos</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Panel Principal</h1>
        <p className="text-gray-500 text-sm mt-1">
          Delegación Nayarit – IMSS &nbsp;|&nbsp; Sábado, 7 de marzo de 2026
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-500 font-medium">{card.title}</p>
                  <p className="text-3xl font-bold mt-1 text-gray-900">{card.value}</p>
                  <p className="text-xs mt-1" style={{ color: card.color }}>{card.sub}</p>
                </div>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: card.bg }}>
                  <Icon size={22} style={{ color: card.color }} />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50">
                <div className="h-1.5 rounded-full bg-gray-100">
                  <div className="h-full rounded-full" style={{ width: '68%', backgroundColor: card.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart + Recent Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Bar Chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-gray-900">Equipos por Jefatura / Inmueble</h2>
              <p className="text-xs text-gray-400 mt-0.5">Distribución actual del inventario</p>
            </div>
            <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ backgroundColor: '#dcfce7', color: '#006341' }}>
              Total: 47
            </span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mockEquiposPorJefatura} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
              <XAxis dataKey="jefatura" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,99,65,0.05)' }} />
              <Bar dataKey="equipos" radius={[6, 6, 0, 0]}>
                {mockEquiposPorJefatura.map((_, i) => (
                  <Cell key={i} fill={i % 2 === 0 ? '#006341' : '#c9a227'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Warranty Expiring Soon */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Garantías por Vencer</h2>
            <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fef9c3' }}>
              <ShieldAlert size={16} style={{ color: '#ca8a04' }} />
            </span>
          </div>
          <div className="space-y-3">
            {warrantySoon.map(a => {
              const d = new Date(a.fechaVencimientoGarantia);
              const diff = Math.round((d - new Date('2026-03-07')) / (1000 * 60 * 60 * 24));
              return (
                <div key={a.id}
                  onClick={() => openFicha(a)}
                  className="p-3 rounded-xl border border-amber-100 bg-amber-50 cursor-pointer hover:bg-amber-100 transition-colors">
                  <p className="text-sm font-semibold text-gray-800 leading-tight">{a.equipo}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{a.numSerie}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs" style={{ color: '#ca8a04' }}>Vence: {a.fechaVencimientoGarantia}</span>
                    <span className="text-xs font-bold" style={{ color: diff < 60 ? '#dc2626' : '#ca8a04' }}>
                      {diff} días
                    </span>
                  </div>
                </div>
              );
            })}
            {warrantySoon.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Sin garantías por vencer pronto</p>
            )}
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Actividad Reciente</h2>
          <Activity size={18} className="text-gray-400" />
        </div>
        <div className="divide-y divide-gray-50">
          {mockActivityLog.map((log) => {
            const conf = LOG_ICONS[log.tipo] || LOG_ICONS.edit;
            const Icon = conf.icon;
            return (
              <div key={log.id} className="flex items-start gap-4 px-6 py-3 hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: conf.bg }}>
                  <Icon size={14} style={{ color: conf.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-800">{log.accion}</p>
                    <span className="text-xs text-gray-400">por {log.usuario}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{log.detalle}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums">{log.fecha}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
