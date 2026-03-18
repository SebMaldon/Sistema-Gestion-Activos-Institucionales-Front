import React from 'react';
import { mockAuditLog } from '../data/mockData';
import { ShieldCheck, LogIn, Edit, Trash2, Download, AlertTriangle, Eye } from 'lucide-react';

const ACTION_CONFIG = {
  LOGIN: { icon: LogIn, bg: '#dcfce7', color: '#16a34a' },
  CREATE: { icon: Edit, bg: '#dbeafe', color: '#2563eb' },
  UPDATE: { icon: Edit, bg: '#fff7ed', color: '#ea580c' },
  READ: { icon: Eye, bg: '#f3f4f6', color: '#6b7280' },
  DELETE: { icon: Trash2, bg: '#fee2e2', color: '#dc2626' },
  EXPORT: { icon: Download, bg: '#ede9fe', color: '#7c3aed' },
};

const RESULT_BADGE = {
  'Exitoso': { bg: '#dcfce7', color: '#166534' },
  'Fallido': { bg: '#fee2e2', color: '#991b1b' },
};

export default function Auditoria() {
  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Bitácora de Auditoría</h1>
          <p className="text-sm text-gray-500 mt-1">Registro de accesos y operaciones — Solo lectura</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-200 bg-amber-50">
          <ShieldCheck size={16} style={{ color: '#ca8a04' }} />
          <span className="text-xs font-semibold text-amber-700">Modo Supervisión</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Accesos Exitosos', val: 5, color: '#166534', bg: '#dcfce7' },
          { label: 'Accesos Fallidos', val: 1, color: '#991b1b', bg: '#fee2e2' },
          { label: 'Modificaciones', val: 4, color: '#1e40af', bg: '#dbeafe' },
          { label: 'Exportaciones', val: 1, color: '#6d28d9', bg: '#ede9fe' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-xl sm:text-2xl font-bold" style={{ color: s.color }}>{s.val}</p>
            <p className="text-xs text-gray-500 mt-1 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* MOBILE: Card list */}
      <div className="md:hidden space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-gray-800">Registro de Eventos</h2>
          <span className="text-xs text-gray-400">{mockAuditLog.length} entradas</span>
        </div>
        {mockAuditLog.map(log => {
          const conf = ACTION_CONFIG[log.accion] || ACTION_CONFIG.READ;
          const Icon = conf.icon;
          const resBadge = RESULT_BADGE[log.resultado] || RESULT_BADGE['Exitoso'];
          return (
            <div key={log.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: conf.bg }}>
                  <Icon size={14} style={{ color: conf.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: conf.color }}>{log.accion}</p>
                  <p className="text-xs text-gray-500 truncate">{log.modulo}</p>
                </div>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold flex-shrink-0"
                  style={{ backgroundColor: resBadge.bg, color: resBadge.color }}>
                  {log.resultado}
                </span>
              </div>
              <div className="text-xs text-gray-500 space-y-0.5">
                <p><span className="text-gray-400">Usuario:</span> {log.usuario}</p>
                <p><span className="text-gray-400">IP:</span> <span className="font-mono">{log.ip}</span></p>
                <p><span className="text-gray-400">Fecha:</span> <span className="font-mono">{log.fecha}</span></p>
              </div>
            </div>
          );
        })}
      </div>

      {/* DESKTOP: Table */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-800">Registro de Eventos</h2>
          <span className="text-xs text-gray-400">{mockAuditLog.length} entradas</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Fecha / Hora', 'Usuario', 'IP', 'Acción', 'Módulo', 'Resultado'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mockAuditLog.map(log => {
                const conf = ACTION_CONFIG[log.accion] || ACTION_CONFIG.READ;
                const Icon = conf.icon;
                const resBadge = RESULT_BADGE[log.resultado] || RESULT_BADGE['Exitoso'];
                return (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs text-gray-600">{log.fecha}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-medium text-gray-800 max-w-[150px] truncate">{log.usuario}</td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs text-gray-500">{log.ip}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: conf.bg }}>
                          <Icon size={12} style={{ color: conf.color }} />
                        </div>
                        <span className="text-xs font-bold" style={{ color: conf.color }}>{log.accion}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-600">{log.modulo}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ backgroundColor: resBadge.bg, color: resBadge.color }}>
                        {log.resultado}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400">
            Datos auditables bajo normativa MAAGTIC-SI y Ley Federal de Transparencia. Retención: 5 años.
          </p>
        </div>
      </div>
    </div>
  );
}
