import React, { useState } from 'react';
import { mockIncidencias } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { AlertTriangle, Clock, CheckCircle, User, Calendar, ChevronDown } from 'lucide-react';

const COLUMNS = [
  { id: 'Pendiente', label: 'Pendiente', icon: Clock, color: '#ca8a04', bg: '#fef9c3', border: '#fde047' },
  { id: 'En Revisión', label: 'En Revisión', icon: AlertTriangle, color: '#2563eb', bg: '#dbeafe', border: '#93c5fd' },
  { id: 'Resuelto', label: 'Resuelto', icon: CheckCircle, color: '#16a34a', bg: '#dcfce7', border: '#86efac' },
];

const PRIORITY_BADGE = {
  'Crítica': { bg: '#fee2e2', color: '#991b1b' },
  'Alta': { bg: '#ffedd5', color: '#c2410c' },
  'Media': { bg: '#fef9c3', color: '#854d0e' },
  'Baja': { bg: '#dbeafe', color: '#1e40af' },
};

function IncidenciaCard({ inc, onStatusChange }) {
  const [expanded, setExpanded] = useState(false);
  const pBadge = PRIORITY_BADGE[inc.prioridad] || PRIORITY_BADGE['Media'];

  return (
    <div className="kanban-card bg-white rounded-xl border border-gray-100 p-4 shadow-sm cursor-pointer"
      onClick={() => setExpanded(!expanded)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-400">{inc.id}</p>
          <p className="text-sm font-bold text-gray-800 mt-0.5 leading-snug">{inc.equipo}</p>
        </div>
        <span className="text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0"
          style={{ backgroundColor: pBadge.bg, color: pBadge.color }}>
          {inc.prioridad}
        </span>
      </div>

      <p className="text-xs text-gray-500 mt-2 leading-relaxed">{inc.falla}</p>

      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <User size={11} />
          <span className="truncate max-w-[100px]">{inc.reportadoPor.split(' ').slice(-2).join(' ')}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Calendar size={11} />
          <span>{inc.fecha}</span>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 fade-in">
          <div className="bg-gray-50 rounded-lg p-2.5 text-xs">
            <p className="text-gray-400 font-medium">Técnico Asignado</p>
            <p className="text-gray-700 font-semibold mt-0.5">{inc.tecnico}</p>
          </div>
          {inc.notas && (
            <div className="bg-blue-50 rounded-lg p-2.5 text-xs">
              <p className="text-blue-400 font-medium">Notas Técnicas</p>
              <p className="text-blue-700 mt-0.5 leading-relaxed">{inc.notas}</p>
            </div>
          )}
          <p className="text-xs text-gray-400">No. Serie: <span className="font-mono font-semibold">{inc.numSerie}</span></p>
          <div className="flex gap-1.5 mt-2">
            {['Pendiente', 'En Revisión', 'Resuelto'].filter(s => s !== inc.estatus).map(s => (
              <button
                key={s}
                onClick={(e) => { e.stopPropagation(); onStatusChange(inc.id, s); }}
                className="flex-1 text-xs py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 font-medium transition-colors"
              >
                → {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Incidencias() {
  const { showToast } = useApp();
  const [incidencias, setIncidencias] = useState(mockIncidencias);

  const handleStatusChange = (id, newStatus) => {
    setIncidencias(prev => prev.map(i => i.id === id ? { ...i, estatus: newStatus } : i));
    showToast(`Incidencia movida a "${newStatus}"`, 'success');
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Incidencias y Garantías</h1>
          <p className="text-sm text-gray-500 mt-1">Tablero Kanban — haz clic en una tarjeta para expandir y mover</p>
        </div>
        <div className="flex gap-3 items-center">
          {COLUMNS.map(col => {
            const count = incidencias.filter(i => i.estatus === col.id).length;
            const Icon = col.icon;
            return (
              <div key={col.id} className="flex items-center gap-1.5 text-sm text-gray-600">
                <Icon size={14} style={{ color: col.color }} />
                <span className="font-semibold">{count}</span>
                <span className="text-gray-400 hidden md:inline">{col.id}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {COLUMNS.map(col => {
          const Icon = col.icon;
          const cards = incidencias.filter(i => i.estatus === col.id);
          return (
            <div key={col.id} className="flex flex-col gap-3">
              {/* Column Header */}
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl"
                style={{ backgroundColor: col.bg, border: `1px solid ${col.border}` }}>
                <Icon size={16} style={{ color: col.color }} />
                <h3 className="text-sm font-bold" style={{ color: col.color }}>{col.label}</h3>
                <span className="ml-auto w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: col.color }}>
                  {cards.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-3 min-h-[150px]">
                {cards.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl py-10 text-center text-sm text-gray-300">
                    Sin incidencias
                  </div>
                ) : cards.map(inc => (
                  <IncidenciaCard key={inc.id} inc={inc} onStatusChange={handleStatusChange} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
