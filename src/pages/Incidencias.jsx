import React, { useState } from 'react';
import { mockIncidencias } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { useAuthStore } from '../store/auth.store';
import { AlertTriangle, Clock, CheckCircle, User, Calendar, Plus, MoreVertical, Edit2, Trash2 } from 'lucide-react';

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

function IncidenciaCard({ inc, onStatusChange, canEdit }) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); // Estado para el menú Kebab
  const pBadge = PRIORITY_BADGE[inc.prioridad] || PRIORITY_BADGE['Media'];

  // Manejar el clic en la tarjeta
  const handleCardClick = () => {
    if (menuOpen) {
      setMenuOpen(false); // Si el menú está abierto, un clic en la tarjeta lo cierra
    } else {
      setExpanded(!expanded); // Si está cerrado, expande/colapsa la tarjeta
    }
  };

  // Manejar acciones del menú
  const handleAction = (e, action) => {
    e.stopPropagation(); // Evita que la tarjeta se expanda
    setMenuOpen(false);  // Cierra el menú
    console.log(`${action} incidencia: ${inc.id}`);
    // Aquí conectarías con tu modal de edición o tu endpoint de eliminación
  };

  return (
    <div className="kanban-card bg-white rounded-xl border border-gray-100 p-4 shadow-sm cursor-pointer relative"
      onClick={handleCardClick}>

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-gray-400">{inc.id}</p>
          <p className="text-sm font-bold text-gray-800 mt-0.5 leading-snug">{inc.equipo}</p>
        </div>

        {/* Contenedor derecho: Etiqueta + Menú Kebab */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0"
            style={{ backgroundColor: pBadge.bg, color: pBadge.color }}>
            {inc.prioridad}
          </span>

          {/* Menú de Opciones (Solo para Master/Admin) */}
          {canEdit && (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                className={`p-1 rounded-lg transition-colors ${menuOpen ? 'bg-gray-100 text-gray-800' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}
              >
                <MoreVertical size={18} />
              </button>

              {/* Dropdown del menú */}
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-10 fade-in overflow-hidden">
                  <button
                    onClick={(e) => handleAction(e, 'Editar')}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2 transition-colors"
                  >
                    <Edit2 size={14} /> Editar
                  </button>
                  <button
                    onClick={(e) => handleAction(e, 'Eliminar')}
                    className="w-full px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  >
                    <Trash2 size={14} /> Eliminar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
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
  const usuario = useAuthStore((s) => s.usuario);
  const [incidencias, setIncidencias] = useState(mockIncidencias);

  const idRol = usuario?.id_rol ?? 3;
  const canCreateIncident = idRol === 1 || idRol === 2;

  const handleStatusChange = (id, newStatus) => {
    setIncidencias(prev => prev.map(i => i.id === id ? { ...i, estatus: newStatus } : i));
    showToast(`Incidencia movida a "${newStatus}"`, 'success');
  };

  const contadoresJSX = (
    <div className="flex gap-3 items-center">
      {COLUMNS.map(col => {
        const count = incidencias.filter(i => i.estatus === col.id).length;
        const Icon = col.icon;
        return (
          <div key={col.id} className="flex items-center gap-1.5 text-sm text-gray-600">
            <Icon size={14} style={{ color: col.color }} />
            <span className="font-semibold">{count}</span>
            <span className="text-gray-400 hidden lg:inline">{col.id}</span>
          </div>
        );
      })}
    </div>
  );

  return (
    // 1. Contenedor Principal Estático
    // h-[calc(100dvh-70px)] evita el scroll global, restando el tamaño de tu navbar superior.
    <div className="p-4 sm:p-6 fade-in relative flex flex-col h-[calc(100dvh-70px)] sm:h-[calc(100vh-70px)] overflow-hidden">

      {/* 2. Header (Ya no ocupa sticky porque la página no hace scroll) */}
      <div className="flex-shrink-0 z-20 pb-4 mb-4 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 -mx-4 px-4 sm:mx-0 sm:px-0">

        <div className="flex flex-col items-start w-full sm:w-auto">
          <div className="flex items-center justify-between w-full sm:w-auto gap-4 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Incidencias y Garantías</h1>
            <div className="sm:hidden mt-1">
              {contadoresJSX}
            </div>
          </div>

          {canCreateIncident && (
            <button
              onClick={() => console.log('Abrir modal de nueva incidencia')}
              className="hidden sm:flex mt-4 sm:mt-5 items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm shadow-sm flex-shrink-0"
            >
              <Plus size={16} />
              <span>Nueva Incidencia</span>
            </button>
          )}
        </div>

        <div className="hidden sm:block mt-1">
          {contadoresJSX}
        </div>
      </div>

      {/* 3. Contenedor del Kanban: Ocupa el espacio sobrante de la pantalla */}
      <div className="flex-1 overflow-hidden -mx-4 sm:mx-0">
        {/* Slider */}
        <div className="h-full flex overflow-x-auto snap-x snap-mandatory md:grid md:grid-cols-3 gap-5 px-4 sm:px-0 scrollbar-hide">
          {COLUMNS.map(col => {
            const Icon = col.icon;
            const cards = incidencias.filter(i => i.estatus === col.id);
            return (
              // 4. Columna: Altura completa (h-full)
              <div key={col.id} className="h-full flex flex-col min-w-[85vw] md:min-w-0 snap-center md:snap-align-none pb-2 md:pb-0">

                {/* Column Header */}
                <div className="flex-shrink-0 flex items-center gap-2.5 px-4 py-3 rounded-xl mb-3"
                  style={{ backgroundColor: col.bg, border: `1px solid ${col.border}` }}>
                  <Icon size={16} style={{ color: col.color }} />
                  <h3 className="text-sm font-bold" style={{ color: col.color }}>{col.label}</h3>
                  <span className="ml-auto w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: col.color }}>
                    {cards.length}
                  </span>
                </div>

                {/* 5. Contenedor de Tarjetas: AQUÍ ESTÁ LA MAGIA DEL SCROLL INDIVIDUAL (overflow-y-auto) */}
                <div className="flex-1 overflow-y-auto space-y-3 pb-24 md:pb-4 scrollbar-hide pr-1">
                  {cards.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl py-10 text-center text-sm text-gray-300">
                      Sin incidencias
                    </div>
                  ) : cards.map(inc => (
                    <IncidenciaCard key={inc.id} inc={inc} onStatusChange={handleStatusChange} canEdit={canCreateIncident} />
                  ))}
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Botón Flotante (FAB) - Visible SOLO en móvil */}
      {canCreateIncident && (
        <button
          onClick={() => console.log('Abrir modal de nueva incidencia (Móvil)')}
          className="fixed bottom-6 right-6 z-50 sm:hidden w-14 h-14 bg-blue-600 hover:bg-blue-700 rounded-full shadow-xl flex items-center justify-center text-white transition-transform active:scale-95"
        >
          <Plus size={26} />
        </button>
      )}

    </div>
  );
}