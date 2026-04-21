import React, { useState, useCallback, useMemo, memo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useAuthStore } from '../store/auth.store';
import {
  AlertTriangle, Clock, CheckCircle, User, Calendar,
  Plus, MoreVertical, Edit2, Trash2, Building2, Loader2, RefreshCw, LayoutDashboard, List, Search, ChevronLeft, ChevronRight, Eye, AlignLeft,
  Hash, FileText, MapPin
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { GET_INCIDENCIAS_QUERY } from '../api/incidencias.queries';
import IncidenciaModal from '../components/IncidenciaModal';
import EditarIncidenciaModal from '../components/EditarIncidenciaModal';
import ResolucionModal from '../components/ResolucionModal';
import NotaModal from '../components/NotasModal';
import DetalleIncidenciaModal from '../components/DetalleIncidenciaModal';
import {
  useIncidencias,
  useNotasIncidencia,
  useUpdateEstatusIncidencia,
  usePasarAEnProceso,
  useResolverIncidencia,
  useAgregarNota,
  useDeleteIncidencia,
  mapIncidenciaNode,
} from '../hooks/useIncidencias';
import { parseServerDate } from '../lib/utils';

// ROLES.ADMIN=1 → Maestro (edita+elimina), ROLES.SUPERVISOR=2 → Admin (edita), ROLES.USUARIO=3 → visualiza

const COLUMNS = [
  { id: 'Pendiente',  label: 'Pendiente',  icon: Clock,         color: '#ca8a04', bg: '#fef9c3', border: '#fde047' },
  { id: 'En proceso', label: 'En Proceso', icon: AlertTriangle, color: '#2563eb', bg: '#dbeafe', border: '#93c5fd' },
  { id: 'Resuelto',   label: 'Resuelto',   icon: CheckCircle,   color: '#16a34a', bg: '#dcfce7', border: '#86efac' },
];



// ─── NotasPanel: carga notas solo cuando la tarjeta se expande ────────────────
// Al montar (expanded=true) dispara la query. Si ya está en caché, no re-fetcha.
const NotasPanel = memo(function NotasPanel({ incidenciaId, estatus, onAddNota, resolucion, fechaResolucion }) {
  const { data: notas = [], isLoading } = useNotasIncidencia(incidenciaId);

  return (
    <>
      {isLoading ? (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 py-1">
          <Loader2 size={12} className="animate-spin" /> Cargando notas...
        </div>
      ) : estatus === 'Resuelto' ? (
        resolucion ? (
          <div className="bg-green-50 rounded-lg p-2.5 border border-green-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-green-600 font-medium text-xs flex items-center gap-1.5">
                <CheckCircle size={12} /> Detalles de Resolución
              </p>
              {fechaResolucion && (
                <span className="text-[10px] text-green-500 font-semibold">{fechaResolucion}</span>
              )}
            </div>
            <p className="text-green-900 leading-relaxed whitespace-pre-wrap text-xs break-words">{resolucion}</p>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100 text-gray-500 text-center italic text-[11px]">
            No se registraron detalles de resolución.
          </div>
        )
      ) : notas.length > 0 ? (
        <div className="bg-amber-50 rounded-lg p-2.5 border border-amber-100">
          <p className="text-amber-600 font-medium text-xs mb-2">Notas de Seguimiento</p>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
            {notas.map(nota => (
              <div key={nota.id_nota} className="border-t border-amber-100 first:border-t-0 pt-1.5 first:pt-0">
                <p className="text-amber-900 leading-relaxed whitespace-pre-wrap text-xs break-words">{nota.contenido_nota}</p>
                <p className="text-amber-500 mt-0.5 text-xs">
                  — {nota.usuarioAutor?.nombre_completo || 'Sistema'} ·{' '}
                  {(() => {
                    const d = parseServerDate(nota.fecha_creacion);
                    return d ? d.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '';
                  })()}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {(estatus === 'En proceso' || estatus === 'Pendiente') && (
        <button
          onClick={(e) => { e.stopPropagation(); onAddNota(incidenciaId); }}
          className="w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 font-semibold transition-colors"
        >
          <Plus size={14} /> Agregar Avance / Nota
        </button>
      )}
    </>
  );
});

// ─── Tarjeta de Incidencia ────────────────────────────────────────────────────
// memo evita re-renders cuando el padre re-renderiza pero las props no cambian.
const IncidenciaCard = memo(function IncidenciaCard({
  inc, onStatusChange, onEdit, onDelete, onAddNota, canEdit, canDelete, isMoving
}) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (cardRef.current && !cardRef.current.contains(event.target)) {
        setExpanded(false);
        setMenuOpen(false);
      }
    };
    if (expanded || menuOpen) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [expanded, menuOpen]);

  const handleCardClick = useCallback(() => {
    if (menuOpen) setMenuOpen(false);
    else setExpanded(prev => !prev);
  }, [menuOpen]);

  // Obtener config de columna para el indicador visual
  const colConfig = COLUMNS.find(c => c.id === inc.estatus) || COLUMNS[0];

  return (
    <div
      ref={cardRef}
      className={`group bg-white rounded-2xl border border-gray-50 p-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden ${isMoving ? 'opacity-50 pointer-events-none' : ''}`}
      onClick={handleCardClick}
    >
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Hash size={14} className="text-gray-400" />
            <p className="text-sm font-black text-gray-900 tracking-tight leading-none uppercase">{inc.numSerie}</p>
          </div>
          {inc.alias && (
            <p className="text-[11px] font-bold text-blue-600/80 italic ml-5 truncate" title={inc.alias}>
              {inc.alias}
            </p>
          )}
        </div>

        {(canEdit || canDelete) && (
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(prev => !prev); }}
              className={`p-1.5 rounded-xl transition-all duration-200 ${menuOpen ? 'bg-gray-100 text-gray-900 scale-110' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}
            >
              <MoreVertical size={18} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-30 fade-in overflow-hidden ring-4 ring-black/5">
                {canEdit && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(inc); }}
                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-gray-700 hover:bg-amber-50 hover:text-amber-600 flex items-center gap-3 transition-colors"
                  >
                    <div className="p-1 bg-amber-100 rounded-lg text-amber-600"><Edit2 size={14} /></div>
                    Editar Registro
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(inc.id); }}
                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                  >
                    <div className="p-1 bg-red-100 rounded-lg text-red-600"><Trash2 size={14} /></div>
                    Eliminar
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contenido Principal */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <span className="text-[10px] uppercase font-black px-2.5 py-1 rounded-full border shadow-sm transition-all group-hover:shadow-md"
            style={{ 
              backgroundColor: `${colConfig.bg}80`, // 80 is alpha
              color: colConfig.color,
              borderColor: colConfig.border 
            }}
          >
            {inc.tipoIncidencia}
          </span>
        </div>
        
        <div className="flex gap-2.5 items-start bg-gray-50/30 p-2.5 rounded-xl border border-gray-50/50 group-hover:bg-white group-hover:border-gray-100 transition-all">
          <FileText size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-gray-700 font-medium leading-relaxed line-clamp-3" title={inc.falla}>
            {inc.falla}
          </p>
        </div>
      </div>

      {/* Footer Informátivo */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2 min-w-0 text-gray-500">
          <div className="p-1 bg-gray-50 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
            <Building2 size={12} />
          </div>
          <span className="truncate font-bold tracking-tight">{inc.unidad || 'Ubicación General'}</span>
        </div>
        
        {inc.tecnico && (
          <div className="flex items-center gap-2 text-blue-600 bg-blue-50/50 px-2 py-1 rounded-lg border border-blue-100/50">
            <User size={12} className="flex-shrink-0" />
            <span className="truncate font-black tracking-tight max-w-[100px]">{inc.tecnico.split(' ')[0]}</span>
          </div>
        )}
      </div>

      {/* Ver más indicador */}
      {!expanded && (
        <div className="mt-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-blue-500 transition-all py-1 rounded-lg hover:bg-gray-50">
          <AlignLeft size={12} className="transition-transform group-hover:scale-125" />
          <span>Detalles de seguimiento</span>
        </div>
      )}

      {/* Detalle expandido */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4 fade-in">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-3 border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Hash size={10} /> Dispositivo
              </p>
              <p className="text-xs text-gray-800 font-bold leading-tight" title={inc.equipo}>{inc.equipo}</p>
              <p className="text-[10px] text-gray-400 mt-1 font-mono">ID: {inc.id}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50/50 to-white rounded-2xl p-3 border border-blue-50 shadow-sm">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User size={10} /> Reportado por
              </p>
              <p className="text-xs text-blue-900 font-bold leading-tight">{inc.generadoPor || 'Personal IMSS'}</p>
              <p className="text-[10px] text-blue-600/70 mt-1 truncate">REQ: {inc.requerimiento || 'S/N'}</p>
            </div>
          </div>

          <div className="flex gap-4 px-2">
            <div className="flex items-center gap-2 text-gray-500 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
              <Calendar size={12} />
              <span className="font-bold">{inc.fecha}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
              <Clock size={12} />
              <span className="font-bold">{inc.horaCreacion || '--:--'}</span>
            </div>
          </div>

          {/* Notas y Resolución */}
          <div className="bg-white/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-100 p-1">
            <NotasPanel 
              incidenciaId={inc.id} 
              estatus={inc.estatus} 
              onAddNota={onAddNota} 
              resolucion={inc.resolucion} 
              fechaResolucion={inc.fechaResolucion} 
            />
          </div>

          {/* Botones de cambio de estatus */}
          {canEdit && inc.estatus !== 'Resuelto' && (
            <div className="flex gap-2 mt-2">
              {COLUMNS.filter(c => {
                if (inc.estatus === 'Pendiente') return c.id === 'En proceso' || c.id === 'Resuelto';
                if (inc.estatus === 'En proceso') return c.id === 'Resuelto';
                return false;
              }).map(col => {
                const ColIcon = col.icon;
                return (
                  <button
                    key={col.id}
                    onClick={(e) => { e.stopPropagation(); onStatusChange(inc, col.id); }}
                    className="flex-1 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-wider py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all duration-300 shadow-sm"
                  >
                    <ColIcon size={14} />
                    {col.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// ─── Componente Tabla Histórico ────────────────────────────────────────────────

function TablaHistorico({ canEdit, canDelete, onEdit, onDelete, onViewDetail }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [cursor, setCursor] = useState(null);
  const [cursors, setCursors] = useState([]);
  const PAGE_SIZE = 15;

  const handleSearch = useCallback((val) => {
    setSearchQuery(val);
    clearTimeout(window._incidSearchTimer);
    window._incidSearchTimer = setTimeout(() => {
      setDebouncedSearch(val);
      setCursor(null);
      setCursors([]);
    }, 400);
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['incidencias', 'historico', debouncedSearch, cursor],
    queryFn: async () => {
      const res = await gqlClient.request(GET_INCIDENCIAS_QUERY, {
        estatus_reparacion: 'Resuelto',
        search: debouncedSearch || undefined,
        first: PAGE_SIZE,
        after: cursor ?? undefined,
      });
      return res.incidencias;
    },
  });

  const incidenciasNodes = data?.edges?.map(e => mapIncidenciaNode(e.node)) ?? [];
  const pageInfo = data?.pageInfo;

  const handleNextPage = () => {
    if (pageInfo?.hasNextPage && pageInfo.endCursor) {
      setCursors(p => [...p, cursor]);
      setCursor(pageInfo.endCursor);
    }
  };

  const handlePrevPage = () => {
    const prev = [...cursors];
    const prevCursor = prev.pop() ?? null;
    setCursors(prev);
    setCursor(prevCursor);
  };

  if (isError) return <div className="p-4 text-red-500 text-sm">Error cargando incidencias.</div>;

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-8">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <h3 className="font-bold text-gray-800 text-base">Histórico de Incidencias</h3>
        <div className="relative min-w-[250px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar serie, falla o persona..."
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="py-10 text-center text-sm text-gray-400">Cargando incidencias...</div>
        ) : incidenciasNodes.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">No hay incidencias.</div>
        ) : (
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500 sticky top-0 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-semibold">Num Serie</th>
                <th className="px-4 py-3 font-semibold">Alias</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Falla</th>
                <th className="px-4 py-3 font-semibold">Requerimiento</th>
                <th className="px-4 py-3 font-semibold">F. Creación</th>
                <th className="px-4 py-3 font-semibold">F. Resolución</th>
                <th className="px-4 py-3 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {incidenciasNodes.map(inc => (
                <tr key={inc.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-800">{inc.numSerie}</td>
                  <td className="px-4 py-3 text-blue-600 font-medium">{inc.alias || '—'}</td>
                  <td className="px-4 py-3 text-blue-600 font-medium">{inc.tipoIncidencia}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate" title={inc.falla}>{inc.falla}</td>
                  <td className="px-4 py-3 text-gray-700">{inc.requerimiento || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 font-medium">{inc.fecha}</td>
                  <td className="px-4 py-3 text-green-700 font-medium">
                    {inc.fechaResolucion || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => onViewDetail(inc)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors" title="Ver Detalles">
                        <Eye size={13} />
                      </button>
                      {canEdit && (
                        <button onClick={() => onEdit(inc)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Editar">
                          <Edit2 size={13} />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => onDelete(inc.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Eliminar">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="p-3 border-t border-gray-100 flex items-center justify-between text-sm bg-gray-50 text-gray-600">
        <div>
          Página {cursors.length + 1}
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrevPage} disabled={cursors.length === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors">
            <ChevronLeft size={14} /> Anterior
          </button>
          <button onClick={handleNextPage} disabled={!pageInfo?.hasNextPage}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors">
            Siguiente <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function Incidencias() {
  const { showToast } = useApp();
  const usuario = useAuthStore((s) => s.usuario);

  const { data: incidencias = [], isLoading, isError, refetch } = useIncidencias();

  const updateEstatus      = useUpdateEstatusIncidencia();
  const pasarAEnProceso    = usePasarAEnProceso();
  const resolverIncidencia = useResolverIncidencia();
  const agregarNota        = useAgregarNota();
  const deleteIncidencia   = useDeleteIncidencia();

  const [movingId, setMovingId] = useState(null);
  const [tab, setTab] = useState('kanban'); // 'kanban' | 'historico'

  const idRol = usuario?.id_rol ?? 3;
  const canCreateIncident = idRol === 1 || idRol === 2;
  const canEdit           = idRol === 1 || idRol === 2;
  const canDelete         = idRol === 1;

  const [isModalOpen,            setIsModalOpen]            = useState(false);
  const [isEditarModalOpen,      setIsEditarModalOpen]      = useState(false);
  const [incidenciaParaEditar,   setIncidenciaParaEditar]   = useState(null);
  const [isResolucionModalOpen,  setIsResolucionModalOpen]  = useState(false);
  const [incidenciaParaResolver, setIncidenciaParaResolver] = useState(null);
  const [isNotaModalOpen,        setIsNotaModalOpen]        = useState(false);
  const [incidenciaParaNota,     setIncidenciaParaNota]     = useState(null);
  const [incidenciaDetalle,      setIncidenciaDetalle]      = useState(null);

  // ── useMemo: agrupa incidencias por columna y filtra resueltas por semana ──
  const columnedCards = useMemo(() => {
    const map = { Pendiente: [], 'En proceso': [], Resuelto: [] };
    
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);

    incidencias.forEach(inc => { 
      if (map[inc.estatus]) {
        if (inc.estatus === 'Resuelto') {
          const resolvedDate = parseServerDate(inc._raw?.fecha_resolucion || inc._raw?.fecha_actualizacion);
          if (resolvedDate && resolvedDate >= startOfWeek) {
            map[inc.estatus].push(inc);
          }
        } else {
          map[inc.estatus].push(inc);
        }
      } 
    });
    return map;
  }, [incidencias]);

  // ── useCallback: handlers estables (IncidenciaCard no re-renderiza en vano) ──

  const handleEdit = useCallback((inc) => {
    setIncidenciaParaEditar(inc);
    setIsEditarModalOpen(true);
  }, []);

  const handleVerDetalle = useCallback((inc) => {
    setIncidenciaDetalle(inc);
  }, []);

  // Recibe el objeto completo para no depender de `incidencias` en los deps
  const handleStatusChange = useCallback(async (inc, newStatus) => {
    if (newStatus === 'Resuelto') {
      setIncidenciaParaResolver(inc);
      setIsResolucionModalOpen(true);
      return;
    }
    setMovingId(inc.id);
    try {
      if (newStatus === 'En proceso') {
        await pasarAEnProceso.mutateAsync({ id_incidencia: String(inc.id) });
      } else {
        await updateEstatus.mutateAsync({ id_incidencia: String(inc.id), estatus_reparacion: newStatus });
      }
      showToast(`Incidencia movida a "${newStatus}"`, 'success');
    } catch {
      showToast('Error al cambiar el estatus', 'error');
    } finally {
      setMovingId(null);
    }
  }, [pasarAEnProceso, updateEstatus, showToast]);

  const handleConfirmarResolucion = useCallback(async (id, resolucion_textual, id_usuario_resuelve) => {
    try {
      await resolverIncidencia.mutateAsync({
        id_incidencia: String(id),
        estatus_cierre: 'Resuelto',
        resolucion_textual,
        id_usuario_resuelve,
      });
      showToast('Incidencia finalizada correctamente', 'success');
    } catch {
      showToast('Error al resolver la incidencia', 'error');
    }
    setIsResolucionModalOpen(false);
    setIncidenciaParaResolver(null);
  }, [resolverIncidencia, showToast]);

  const handleAbrirNotaModal = useCallback((id) => {
    setIncidenciaParaNota(id);
    setIsNotaModalOpen(true);
  }, []);

  const handleGuardarNota = useCallback(async (id, textoNota) => {
    try {
      await agregarNota.mutateAsync({ id_incidencia: String(id), contenido_nota: textoNota });
      showToast('Nota de seguimiento agregada', 'success');
    } catch {
      showToast('Error al guardar la nota', 'error');
    }
    setIsNotaModalOpen(false);
    setIncidenciaParaNota(null);
  }, [agregarNota, showToast]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('¿Eliminar esta incidencia? Esta acción no se puede deshacer.')) return;
    try {
      await deleteIncidencia.mutateAsync({ id_incidencia: String(id) });
      showToast('Incidencia eliminada', 'success');
    } catch {
      showToast('Error al eliminar la incidencia', 'error');
    }
  }, [deleteIncidencia, showToast]);

  // ── useMemo: contadores del header (solo recalcula cuando cambian los datos) ──
  const contadoresJSX = useMemo(() => (
    <div className="flex gap-3 items-center">
      {COLUMNS.map(col => {
        const Icon = col.icon;
        return (
          <div key={col.id} className="flex items-center gap-1.5 text-sm text-gray-600">
            <Icon size={14} style={{ color: col.color }} />
            <span className="font-semibold">{(columnedCards[col.id] ?? []).length}</span>
            <span className="text-gray-400 hidden lg:inline">{col.id}</span>
          </div>
        );
      })}
    </div>
  ), [columnedCards]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-70px)]">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Loader2 size={36} className="animate-spin text-blue-500" />
          <p className="text-sm font-medium">Cargando incidencias...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-70px)]">
        <div className="flex flex-col items-center gap-4 text-gray-500">
          <AlertTriangle size={40} className="text-red-400" />
          <p className="text-sm font-medium text-gray-700">Error al cargar las incidencias</p>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw size={14} /> Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 fade-in relative flex flex-col h-[calc(100dvh-70px)] sm:h-[calc(100vh-70px)] overflow-hidden">

      {/* Header */}
      <div className="sticky top-0 z-40 flex-shrink-0 pb-4 mb-4 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 -mx-4 px-4 sm:mx-0 sm:px-0 bg-white/90 backdrop-blur-md">
        <div className="flex flex-col items-start w-full sm:w-auto">
          <div className="flex items-center justify-between w-full sm:w-auto gap-4 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Incidencias</h1>
            <div className="sm:hidden mt-1">{tab === 'kanban' && contadoresJSX}</div>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mt-3 w-fit">
            {[
              { id: 'kanban', label: 'Tablero Kanban', icon: LayoutDashboard },
              { id: 'historico', label: 'Todas las Incidencias', icon: List },
            ].map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${tab === t.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Icon size={14} /> {t.label}
                </button>
              );
            })}
          </div>
          {canCreateIncident && tab === 'kanban' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="hidden sm:flex mt-4 sm:mt-5 items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm shadow-sm flex-shrink-0"
            >
              <Plus size={16} /><span>Nueva Incidencia</span>
            </button>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-3 mt-1">
          {tab === 'kanban' && contadoresJSX}
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Actualizar"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Contenido principal según la pestaña */}
      {tab === 'kanban' && (
        <div className="flex-1 overflow-hidden -mx-4 sm:mx-0">
          <div className="h-full flex overflow-x-auto snap-x snap-mandatory md:grid md:grid-cols-3 gap-5 px-4 sm:px-0 scrollbar-hide">
            {COLUMNS.map(col => {
              const Icon   = col.icon;
              const cards  = columnedCards[col.id] ?? [];
              return (
                <div key={col.id} className="h-full flex flex-col min-w-[85vw] md:min-w-0 snap-center md:snap-align-none pb-2 md:pb-0">
                  <div
                    className="sticky top-0 z-30 flex-shrink-0 flex items-center gap-2.5 px-4 py-3 rounded-t-2xl shadow-sm backdrop-blur-sm"
                    style={{ backgroundColor: `${col.bg}EE` }}
                  >
                    <Icon size={16} style={{ color: col.color }} />
                    <h3 className="text-sm font-bold" style={{ color: col.color }}>{col.label}</h3>
                    <span
                      className="ml-auto w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: col.color }}
                    >
                      {cards.length}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 pb-24 md:pb-4 scrollbar-hide px-3 pt-4 rounded-b-2xl bg-gray-50/10">
                    {cards.length === 0 ? (
                      <div className="border-2 border-dashed border-gray-200 rounded-xl py-10 text-center text-sm text-gray-300">
                        Sin incidencias
                      </div>
                    ) : (
                      cards.map(inc => (
                        <IncidenciaCard
                          key={inc.id}
                          inc={inc}
                          onStatusChange={handleStatusChange}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onAddNota={handleAbrirNotaModal}
                          canEdit={canEdit}
                          canDelete={canDelete}
                          isMoving={movingId === inc.id}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'historico' && (
        <TablaHistorico 
          canEdit={idRol === 1} 
          canDelete={idRol === 1} 
          onEdit={handleEdit} 
          onDelete={handleDelete} 
          onViewDetail={handleVerDetalle}
        />
      )}

      {canCreateIncident && tab === 'kanban' && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-6 right-6 z-50 sm:hidden w-14 h-14 bg-blue-600 hover:bg-blue-700 rounded-full shadow-xl flex items-center justify-center text-white transition-transform active:scale-95"
        >
          <Plus size={26} />
        </button>
      )}

      <IncidenciaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={() => showToast('Incidencia creada correctamente', 'success')}
      />
      <EditarIncidenciaModal
        isOpen={isEditarModalOpen}
        onClose={() => { setIsEditarModalOpen(false); setIncidenciaParaEditar(null); }}
        onUpdated={() => showToast('Incidencia actualizada correctamente', 'success')}
        incidencia={incidenciaParaEditar}
      />
      <ResolucionModal
        isOpen={isResolucionModalOpen}
        onClose={() => { setIsResolucionModalOpen(false); setIncidenciaParaResolver(null); }}
        onConfirm={handleConfirmarResolucion}
        incidencia={incidenciaParaResolver}
      />
      <NotaModal
        isOpen={isNotaModalOpen}
        onClose={() => { setIsNotaModalOpen(false); setIncidenciaParaNota(null); }}
        onSave={handleGuardarNota}
        incidenciaId={incidenciaParaNota}
      />
      <DetalleIncidenciaModal
        isOpen={!!incidenciaDetalle}
        onClose={() => setIncidenciaDetalle(null)}
        incidencia={incidenciaDetalle}
      />
    </div>
  );
}