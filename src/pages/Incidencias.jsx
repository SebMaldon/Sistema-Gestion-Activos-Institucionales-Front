import React, { useState, useCallback, useMemo, memo } from 'react';
import { useApp } from '../context/AppContext';
import { useAuthStore } from '../store/auth.store';
import {
  AlertTriangle, Clock, CheckCircle, User, Calendar,
  Plus, MoreVertical, Edit2, Trash2, Building2, Loader2, RefreshCw
} from 'lucide-react';
import IncidenciaModal from '../components/IncidenciaModal';
import EditarIncidenciaModal from '../components/EditarIncidenciaModal';
import ResolucionModal from '../components/ResolucionModal';
import NotaModal from '../components/NotasModal';
import {
  useIncidencias,
  useNotasIncidencia,
  useUpdateEstatusIncidencia,
  usePasarAEnProceso,
  useResolverIncidencia,
  useAgregarNota,
  useDeleteIncidencia,
} from '../hooks/useIncidencias';

// ROLES.ADMIN=1 → Maestro (edita+elimina), ROLES.SUPERVISOR=2 → Admin (edita), ROLES.USUARIO=3 → visualiza

const COLUMNS = [
  { id: 'Pendiente',  label: 'Pendiente',  icon: Clock,         color: '#ca8a04', bg: '#fef9c3', border: '#fde047' },
  { id: 'En proceso', label: 'En Proceso', icon: AlertTriangle, color: '#2563eb', bg: '#dbeafe', border: '#93c5fd' },
  { id: 'Resuelto',   label: 'Resuelto',   icon: CheckCircle,   color: '#16a34a', bg: '#dcfce7', border: '#86efac' },
];

const PRIORITY_BADGE = {
  'Crítica': { bg: '#fee2e2', color: '#991b1b' },
  'Alta':    { bg: '#ffedd5', color: '#c2410c' },
  'Media':   { bg: '#fef9c3', color: '#854d0e' },
  'Baja':    { bg: '#dbeafe', color: '#1e40af' },
};

// ─── NotasPanel: carga notas solo cuando la tarjeta se expande ────────────────
// Al montar (expanded=true) dispara la query. Si ya está en caché, no re-fetcha.
const NotasPanel = memo(function NotasPanel({ incidenciaId, estatus, onAddNota }) {
  const { data: notas = [], isLoading } = useNotasIncidencia(incidenciaId);

  return (
    <>
      {isLoading ? (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 py-1">
          <Loader2 size={12} className="animate-spin" /> Cargando notas...
        </div>
      ) : notas.length > 0 ? (
        <div className="bg-amber-50 rounded-lg p-2.5 border border-amber-100 space-y-2">
          <p className="text-amber-600 font-medium text-xs">Notas de Seguimiento</p>
          {notas.map(nota => (
            <div key={nota.id_nota} className="border-t border-amber-100 pt-1.5">
              <p className="text-amber-900 leading-relaxed whitespace-pre-wrap text-xs">{nota.contenido_nota}</p>
              <p className="text-amber-500 mt-0.5 text-xs">
                — {nota.usuarioAutor?.nombre_completo || 'Sistema'} ·{' '}
                {nota.fecha_creacion
                  ? new Date(nota.fecha_creacion).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
                  : ''}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {estatus === 'En proceso' && (
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

  const pBadge = PRIORITY_BADGE[inc.prioridad] ?? PRIORITY_BADGE['Media'];

  const handleCardClick = useCallback(() => {
    if (menuOpen) setMenuOpen(false);
    else setExpanded(prev => !prev);
  }, [menuOpen]);

  return (
    <div
      className={`bg-white rounded-xl border border-gray-100 p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow relative ${isMoving ? 'opacity-50 pointer-events-none' : ''}`}
      onClick={handleCardClick}
    >
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 leading-snug">{inc.numSerie}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0"
            style={{ backgroundColor: pBadge.bg, color: pBadge.color }}
          >
            {inc.prioridad ?? 'Media'}
          </span>

          {(canEdit || canDelete) && (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(prev => !prev); }}
                className={`p-1 rounded-lg transition-colors ${menuOpen ? 'bg-gray-100 text-gray-800' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}
              >
                <MoreVertical size={18} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-10 fade-in overflow-hidden">
                  {canEdit && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(inc); }}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-amber-50 hover:text-amber-600 flex items-center gap-2"
                    >
                      <Edit2 size={14} /> Editar
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(inc.id); }}
                      className="w-full px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 size={14} /> Eliminar
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-600 mt-1.5 truncate flex items-center gap-1.5">
        <User size={13} className="text-gray-400 flex-shrink-0" />
        <span>Reporta: <span className="font-semibold text-gray-800">{inc.reportadoPor}</span></span>
      </p>
      <p className="text-xs font-semibold text-blue-600 mt-1">{inc.tipoIncidencia}</p>

      <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-gray-50 text-xs text-gray-500">
        <div className="flex items-center gap-1.5 min-w-0">
          <User size={12} className="flex-shrink-0" />
          <span className="truncate">{inc.tecnico}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 text-right">
          <span className="truncate max-w-[120px] font-medium">{inc.unidad || 'Sin unidad'}</span>
          <Building2 size={12} className="flex-shrink-0" />
        </div>
      </div>

      {/* Detalle expandido */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3 fade-in text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 rounded-lg p-2.5">
              <p className="text-gray-400 font-medium mb-0.5">Equipo Afectado</p>
              <p className="text-gray-800 font-semibold truncate" title={inc.equipo}>{inc.equipo}</p>
              <p className="text-gray-500 mt-0.5">ID: {inc.id}</p>
            </div>
            <div className="bg-blue-50/50 rounded-lg p-2.5 border border-blue-50">
              <p className="text-blue-400 font-medium mb-0.5">Generado por</p>
              <p className="text-blue-900 font-semibold truncate">{inc.generadoPor || 'Usuario del Sistema'}</p>
              <p className="text-blue-600/70 mt-0.5 truncate">Matrícula: {inc.matriculaGenera || 'S/N'}</p>
            </div>
          </div>

          <div>
            <p className="text-gray-400 font-medium mb-1">Descripción de la Falla</p>
            <p className="text-gray-700 leading-relaxed bg-gray-50 p-2.5 rounded-lg border border-gray-100">{inc.falla}</p>
          </div>

          <div className="flex gap-6 px-1">
            <div className="flex items-center gap-1.5 text-gray-600">
              <Calendar size={13} className="text-gray-400" /><span>{inc.fecha}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-600">
              <Clock size={13} className="text-gray-400" /><span>{inc.horaCreacion || 'Hora no registrada'}</span>
            </div>
          </div>

          {/* Notas cargadas lazily cuando se expande */}
          <NotasPanel incidenciaId={inc.id} estatus={inc.estatus} onAddNota={onAddNota} />

          {/* Botones de cambio de estatus */}
          {canEdit && (
            <div className="flex gap-1.5 mt-2">
              {COLUMNS.filter(c => c.id !== inc.estatus).map(col => (
                <button
                  key={col.id}
                  onClick={(e) => { e.stopPropagation(); onStatusChange(inc, col.id); }}
                  className="flex-1 text-xs py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 font-medium transition-colors"
                >
                  → {col.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

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

  // ── useMemo: agrupa incidencias por columna (evita .filter() en cada render) ──
  const columnedCards = useMemo(() => {
    const map = { Pendiente: [], 'En proceso': [], Resuelto: [] };
    incidencias.forEach(inc => { if (map[inc.estatus]) map[inc.estatus].push(inc); });
    return map;
  }, [incidencias]);

  // ── useCallback: handlers estables (IncidenciaCard no re-renderiza en vano) ──

  const handleEdit = useCallback((inc) => {
    setIncidenciaParaEditar(inc);
    setIsEditarModalOpen(true);
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
      <div className="flex-shrink-0 z-20 pb-4 mb-4 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex flex-col items-start w-full sm:w-auto">
          <div className="flex items-center justify-between w-full sm:w-auto gap-4 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Incidencias y Garantías</h1>
            <div className="sm:hidden mt-1">{contadoresJSX}</div>
          </div>
          {canCreateIncident && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="hidden sm:flex mt-4 sm:mt-5 items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm shadow-sm flex-shrink-0"
            >
              <Plus size={16} /><span>Nueva Incidencia</span>
            </button>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-3 mt-1">
          {contadoresJSX}
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Actualizar"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Kanban */}
      <div className="flex-1 overflow-hidden -mx-4 sm:mx-0">
        <div className="h-full flex overflow-x-auto snap-x snap-mandatory md:grid md:grid-cols-3 gap-5 px-4 sm:px-0 scrollbar-hide">
          {COLUMNS.map(col => {
            const Icon   = col.icon;
            const cards  = columnedCards[col.id] ?? [];
            return (
              <div key={col.id} className="h-full flex flex-col min-w-[85vw] md:min-w-0 snap-center md:snap-align-none pb-2 md:pb-0">
                <div
                  className="flex-shrink-0 flex items-center gap-2.5 px-4 py-3 rounded-xl mb-3"
                  style={{ backgroundColor: col.bg, border: `1px solid ${col.border}` }}
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

                <div className="flex-1 overflow-y-auto space-y-3 pb-24 md:pb-4 scrollbar-hide pr-1">
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

      {canCreateIncident && (
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
    </div>
  );
}