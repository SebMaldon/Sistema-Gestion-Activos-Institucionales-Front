import React, { useState, useCallback, useMemo, memo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useAuthStore } from '../store/auth.store';
import {
 AlertTriangle, Clock, CheckCircle, User, Calendar,
 Plus, MoreVertical, Edit2, Trash2, Building2, Loader2, RefreshCw, LayoutDashboard, List, Search, ChevronLeft, ChevronRight, Eye, AlignLeft,
 Hash, FileText, MapPin, Copy, FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { useQuery } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { GET_INCIDENCIAS_QUERY } from '../api/incidencias.queries';
import IncidenciaModal from '../components/IncidenciaModal';
import EditarIncidenciaModal from '../components/EditarIncidenciaModal';
import ResolucionModal from '../components/ResolucionModal';
import NotaModal from '../components/NotasModal';
import DetalleIncidenciaModal from '../components/DetalleIncidenciaModal';
import DetalleBienVisualModal from '../components/DetalleBienVisualModal';
import ConfirmModal from '../components/ConfirmModal';
import {
 useIncidencias,
 useNotasIncidencia,
 useUpdateEstatusIncidencia,
 usePasarAEnProceso,
 useResolverIncidencia,
 useAgregarNota,
 useDeleteIncidencia,
 useDeleteNota,
 mapIncidenciaNode,
} from '../hooks/useIncidencias';
import { parseServerDate, copyTextToClipboard } from '../lib/utils';

// ROLES.ADMIN=1 → Maestro (edita+elimina), ROLES.SUPERVISOR=2 → Admin (edita), ROLES.USUARIO=3 → visualiza

const COLUMNS = [
 { id: 'Pendiente', label: 'Pendiente', icon: Clock, colorClass: 'text-amber-600 dark:text-amber-400', bgClass: 'bg-amber-100 dark:bg-amber-900/30', borderClass: 'border-amber-300 dark:border-amber-800/50', badgeBg: 'bg-amber-600 dark:bg-amber-500' },
 { id: 'En proceso', label: 'En Proceso', icon: AlertTriangle, colorClass: 'text-blue-600 dark:text-blue-400', bgClass: 'bg-blue-100 dark:bg-blue-900/30', borderClass: 'border-blue-300 dark:border-blue-800/50', badgeBg: 'bg-blue-600 dark:bg-blue-500' },
 { id: 'Resuelto', label: 'Resuelto', icon: CheckCircle, colorClass: 'text-green-600 dark:text-green-400', bgClass: 'bg-green-100 dark:bg-green-900/30', borderClass: 'border-green-300 dark:border-green-800/50', badgeBg: 'bg-green-600 dark:bg-green-500' },
];



// ─── NotasPanel: carga notas solo cuando la tarjeta se expande ────────────────
// Al montar (expanded=true) dispara la query. Si ya está en caché, no re-fetcha.
const NotasPanel = memo(function NotasPanel({ incidenciaId, estatus, onAddNota, onDeleteNota, resolucion, fechaResolucion }) {
 const { data: notas = [], isLoading } = useNotasIncidencia(incidenciaId);

 return (
 <>
 {isLoading ? (
 <div className="flex items-center gap-1.5 text-xs text-gray-400 py-1">
 <Loader2 size={12} className="animate-spin" /> Cargando notas...
 </div>
 ) : estatus === 'Resuelto' ? (
 resolucion ? (
 <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2.5 border border-green-100 dark:border-green-800/50">
 <div className="flex items-center justify-between mb-2">
 <p className="text-green-600 dark:text-green-400 font-medium text-xs flex items-center gap-1.5">
 <CheckCircle size={12} /> Detalles de Resolución
 </p>
 {fechaResolucion && (
 <span className="text-[10px] text-green-500 font-semibold">{fechaResolucion}</span>
 )}
 </div>
 <p className="text-green-900 leading-relaxed whitespace-pre-wrap text-xs break-words">{resolucion}</p>
 </div>
 ) : (
 <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-2.5 border border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-center italic text-[11px]">
 No se registraron detalles de resolución.
 </div>
 )
 ) : notas.length > 0 ? (
 <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2.5 border border-amber-100 dark:border-amber-800/50">
 <p className="text-amber-600 dark:text-amber-400 font-medium text-xs mb-2">Notas de Seguimiento</p>
 <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
 {notas.map(nota => (
 <div key={nota.id_nota} className="border-t border-amber-100 dark:border-amber-800/50 first:border-t-0 pt-1.5 first:pt-0 relative group/nota">
 <p className="text-amber-900 leading-relaxed whitespace-pre-wrap text-xs break-words pr-6">{nota.contenido_nota}</p>
 <div className="flex items-center justify-between mt-0.5">
 <p className="text-amber-500 text-xs">
 — {nota.usuarioAutor?.nombre_completo || 'Sistema'} ·{' '}
 {(() => {
 const d = parseServerDate(nota.fecha_creacion);
 return d ? d.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '';
 })()}
 </p>
 <button 
 onClick={(e) => { e.stopPropagation(); if(window.confirm('¿Eliminar esta nota?')) onDeleteNota(nota.id_nota, incidenciaId); }}
 className="opacity-0 group-hover/nota:opacity-100 p-1 hover:bg-amber-100 rounded text-red-500 transition-all"
 title="Eliminar Nota"
 >
 <Trash2 size={12} />
 </button>
 </div>
 </div>
 ))}
 </div>
 </div>
 ) : null}

 {(estatus === 'En proceso' || estatus === 'Pendiente') && (
 <button
 onClick={(e) => { e.stopPropagation(); onAddNota(incidenciaId); }}
 className="w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg border border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 font-semibold transition-colors"
 >
 <Plus size={14} /> Agregar Avance / Nota
 </button>
 )}
 </>
 );
});

// ─── Tarjeta de Incidencia ────────────────────────────────────────────────────
const IncidenciaCard = memo(function IncidenciaCard({
 inc, onStatusChange, onEdit, onDelete, onAddNota, onDeleteNota, canEdit, canDelete, isMoving,
 isExpanded, onToggle, isHighlighted, onVerBien
}) {
 const { showToast } = useApp();
 const [menuOpen, setMenuOpen] = useState(false);
 const cardRef = useRef(null);

 useEffect(() => {
 const handleOutsideClick = (event) => {
 // Ignorar clics si ocurren dentro de un modal global (que usan z-50)
 if (event.target.closest('.z-50')) {
 return;
 }
 
 const isOutside = cardRef.current && !cardRef.current.contains(event.target);
 
 if (isOutside) {
 // Siempre cerrar el menú al hacer clic fuera
 if (menuOpen) setMenuOpen(false);
 }
 };
 if (menuOpen) document.addEventListener('mousedown', handleOutsideClick);
 return () => document.removeEventListener('mousedown', handleOutsideClick);
 }, [menuOpen, inc.estatus]);

 const handleCardClick = useCallback(() => {
 if (menuOpen) setMenuOpen(false);
 else onToggle();
 }, [menuOpen, onToggle]);

 // Obtener config de columna para el indicador visual
 const colConfig = COLUMNS.find(c => c.id === inc.estatus) || COLUMNS[0];

 return (
 <div
 ref={cardRef}
 data-card-status={inc.estatus}
 className={`group bg-white dark:bg-gray-800 rounded-2xl border p-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden ${isMoving ? 'opacity-50 pointer-events-none' : ''} ${isHighlighted ? 'border-[#006341] ring-2 ring-[#006341]/20 shadow-lg shadow-[#006341]/10' : 'border-gray-50 dark:border-gray-800'}`}
 onClick={handleCardClick}
 >
 {/* Cabecera */}
 <div className="flex items-start justify-between gap-3 mb-3">
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-0.5">
 <Hash size={14} className="text-gray-400" />
 <p className="text-sm font-black text-gray-900 dark:text-gray-100 tracking-tight leading-none uppercase">{inc.numSerie}</p>
 </div>
 {inc.alias && (
 <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400/80 italic ml-5 truncate" title={inc.alias}>
 {inc.alias}
 </p>
 )}
 </div>

 <div className="flex items-center gap-2 shrink-0">
 {inc.requerimiento && (
 <div 
 onClick={(e) => {
 e.stopPropagation();
 copyTextToClipboard(inc.requerimiento);
 showToast('Requerimiento copiado', 'success');
 }}
 className="flex items-center gap-1.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 dark:text-blue-300 font-bold px-2.5 py-1 rounded-lg border border-blue-100 dark:border-blue-800/50 hover:bg-blue-100 hover:text-blue-800 dark:text-blue-300 transition-all cursor-pointer shadow-sm"
 title="Copiar Requerimiento"
 >
 <span>REQ: {inc.requerimiento}</span>
 <Copy size={12} className="shrink-0" />
 </div>
 )}

 {(canEdit || canDelete) && (
 <div className="relative">
 <button
 onClick={(e) => { e.stopPropagation(); setMenuOpen(prev => !prev); }}
 className={`p-1.5 rounded-xl transition-all duration-200 ${menuOpen ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 scale-110' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 hover:text-gray-600 dark:text-gray-400 '}`}
 >
 <MoreVertical size={18} />
 </button>
 {menuOpen && (
 <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 py-2 z-30 fade-in overflow-hidden ring-4 ring-black/5">
 {canEdit && (
 <button
 onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(inc); }}
 className="w-full px-4 py-2.5 text-left text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-3 transition-colors"
 >
 <div className="p-1 bg-amber-100 dark:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400"><Edit2 size={14} /></div>
 Editar Registro
 </button>
 )}
 {canDelete && (
 <button
 onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(inc.id); }}
 className="w-full px-4 py-2.5 text-left text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-3 transition-colors"
 >
 <div className="p-1 bg-red-100 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400"><Trash2 size={14} /></div>
 Eliminar
 </button>
 )}
 </div>
 )}
 </div>
 )}
 </div>
 </div>

 {/* Contenido Principal */}
 <div className="space-y-3">
 <div className="flex flex-wrap gap-2">
 <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-full border shadow-sm transition-all group-hover:shadow-md ${colConfig.bgClass} ${colConfig.colorClass} ${colConfig.borderClass}`}>
 {inc.tipoIncidencia}
 </span>
 </div>
 
 <div className="flex gap-2.5 items-start bg-gray-50/30 dark:bg-gray-900/20 p-2.5 rounded-xl border border-gray-50 dark:border-gray-800/50 group-hover:bg-white dark:bg-gray-800 group-hover:border-gray-100 dark:border-gray-800 transition-all">
 <FileText size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
 <p className="text-xs text-gray-700 dark:text-gray-300 font-medium leading-relaxed line-clamp-3" title={inc.falla}>
 {inc.falla}
 </p>
 </div>
 </div>

 {/* Footer Informátivo */}
 <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px]">
 <div className="flex items-center gap-2 min-w-0 text-gray-500 dark:text-gray-400 ">
 <div className="p-1 bg-gray-50 dark:bg-gray-900 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
 <Building2 size={12} />
 </div>
 <span className="truncate font-bold tracking-tight">{inc.unidad || 'Ubicación General'}</span>
 </div>
 </div>

 {/* Ver más indicador */}
 {!isExpanded && (
 <div className="mt-3 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-blue-500 transition-all py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 ">
 <AlignLeft size={12} className="transition-transform group-hover:scale-125" />
 <span>Detalles de seguimiento</span>
 </div>
 )}

 {/* Detalle expandido */}
 {isExpanded && (
 <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-4 fade-in">
 <div className="grid grid-cols-2 gap-3">
 <div 
 onClick={(e) => { e.stopPropagation(); if (inc.id_bien) onVerBien(inc.id_bien); }}
 className={`bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900/50 rounded-2xl p-3 border border-gray-100 dark:border-gray-800 shadow-sm min-w-0 ${inc.id_bien ? 'cursor-pointer hover:border-green-300 dark:hover:border-green-700/50 hover:shadow-md transition-all' : ''}`}
 title={inc.id_bien ? "Ver Ficha Técnica" : ""}
 >
 <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
 <Hash size={10} /> Dispositivo
 </p>
 <p className="text-xs text-gray-800 dark:text-gray-200 font-bold leading-tight break-words">{inc.equipo}</p>
 <p className="text-[10px] text-gray-400 mt-1 font-mono">ID: {inc.id}</p>
 </div>
 <div className="bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-900/20 dark:to-transparent rounded-2xl p-3 border border-blue-50 dark:border-blue-900/30 shadow-sm min-w-0">
 <p className="text-[10px] font-black text-blue-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
 <User size={10} /> Reportado por
 </p>
 <p className="text-xs text-blue-900 dark:text-blue-300 font-bold leading-tight break-words">{inc.generadoPor || 'Personal IMSS'}</p>
 <p className="text-[10px] text-blue-600 dark:text-blue-400/70 mt-1 truncate">REQ: {inc.requerimiento || 'S/N'}</p>
 </div>
 </div>

 <div className="flex gap-4 px-2">
 <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded-lg border border-gray-100 dark:border-gray-800 ">
 <Calendar size={12} />
 <span className="font-bold">{inc.fecha}</span>
 </div>
 <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded-lg border border-gray-100 dark:border-gray-800 ">
 <Clock size={12} />
 <span className="font-bold">{inc.horaCreacion || '--:--'}</span>
 </div>
 </div>

 {/* Notas y Resolución */}
 <div className="bg-white dark:bg-gray-800/50 dark:bg-gray-800/20 backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 p-1">
 <NotasPanel 
 incidenciaId={inc.id} 
 estatus={inc.estatus} 
 onAddNota={onAddNota} 
 onDeleteNota={onDeleteNota}
 resolucion={inc.resolucion} 
 fechaResolucion={inc.fechaResolucion} 
 />
 </div>

 {/* Botones de cambio de estatus */}
 {canEdit && (
 <div className="flex gap-2 mt-2">
 {COLUMNS.filter(c => c.id !== inc.estatus).map(col => {
 const ColIcon = col.icon;
 return (
 <button
 key={col.id}
 onClick={(e) => { e.stopPropagation(); onStatusChange(inc, col.id); }}
 className="flex-1 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-wider py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all duration-300 shadow-sm"
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

function TablaHistorico({ canEdit, canDelete, onEdit, onDelete, onViewDetail, onStatusChange, onVerBien }) {
 const { showToast } = useApp();
 const [estatusFiltro, setEstatusFiltro] = useState('');
 const [fechaFiltroTipo, setFechaFiltroTipo] = useState(''); // 'creacion' o 'resolucion'
 const [fechaDesde, setFechaDesde] = useState('');
 const [fechaHasta, setFechaHasta] = useState('');
 
 const [searchQuery, setSearchQuery] = useState('');
 const [debouncedSearch, setDebouncedSearch] = useState('');
 const [currentPage, setCurrentPage] = useState(1);
 const [pageInput, setPageInput] = useState('');
 const PAGE_SIZE = 15;

 const handleSearch = useCallback((val) => {
 setSearchQuery(val);
 clearTimeout(window._incidSearchTimer);
 window._incidSearchTimer = setTimeout(() => {
 setDebouncedSearch(val);
 setCurrentPage(1);
 }, 400);
 }, []);

 const handleEstatusChange = (val) => {
 setEstatusFiltro(val);
 setCurrentPage(1);
 };

 const handleFilterChange = () => {
 setCurrentPage(1);
 };

 const { data, isLoading, isError } = useQuery({
 queryKey: ['incidencias', 'historico', debouncedSearch, estatusFiltro, fechaFiltroTipo, fechaDesde, fechaHasta, currentPage],
 queryFn: async () => {
 let f_creacion_desde = undefined;
 let f_creacion_hasta = undefined;
 let f_resolucion_desde = undefined;
 let f_resolucion_hasta = undefined;

 if (fechaFiltroTipo === 'creacion') {
 if (fechaDesde) f_creacion_desde = new Date(fechaDesde + 'T00:00:00').toISOString();
 if (fechaHasta) f_creacion_hasta = new Date(fechaHasta + 'T23:59:59').toISOString();
 } else if (fechaFiltroTipo === 'resolucion') {
 if (fechaDesde) f_resolucion_desde = new Date(fechaDesde + 'T00:00:00').toISOString();
 if (fechaHasta) f_resolucion_hasta = new Date(fechaHasta + 'T23:59:59').toISOString();
 }

 const res = await gqlClient.request(GET_INCIDENCIAS_QUERY, {
 estatus_reparacion: estatusFiltro || undefined,
 search: debouncedSearch || undefined,
 fecha_creacion_desde: f_creacion_desde,
 fecha_creacion_hasta: f_creacion_hasta,
 fecha_resolucion_desde: f_resolucion_desde,
 fecha_resolucion_hasta: f_resolucion_hasta,
 first: PAGE_SIZE,
 page: currentPage,
 });
 return res.incidencias;
 },
 });

 const incidenciasNodes = data?.edges?.map(e => mapIncidenciaNode(e.node)) ?? [];
 const pageInfo = data?.pageInfo;
 const totalPages = Math.max(1, Math.ceil((pageInfo?.totalCount || 0) / PAGE_SIZE));

 const handleJumpToPage = (e) => {
 e.preventDefault();
 const p = parseInt(pageInput, 10);
 if (!isNaN(p) && p >= 1 && p <= totalPages) {
 setCurrentPage(p);
 setPageInput('');
 }
 };

 const handleExportarExcel = async () => {
 try {
 showToast('Exportando datos, por favor espera...', 'info');
 let f_creacion_desde = undefined;
 let f_creacion_hasta = undefined;
 let f_resolucion_desde = undefined;
 let f_resolucion_hasta = undefined;

 if (fechaFiltroTipo === 'creacion') {
 if (fechaDesde) f_creacion_desde = new Date(fechaDesde + 'T00:00:00').toISOString();
 if (fechaHasta) f_creacion_hasta = new Date(fechaHasta + 'T23:59:59').toISOString();
 } else if (fechaFiltroTipo === 'resolucion') {
 if (fechaDesde) f_resolucion_desde = new Date(fechaDesde + 'T00:00:00').toISOString();
 if (fechaHasta) f_resolucion_hasta = new Date(fechaHasta + 'T23:59:59').toISOString();
 }

 const limit = data?.pageInfo?.totalCount || 5000;
 
 const res = await gqlClient.request(GET_INCIDENCIAS_QUERY, {
 estatus_reparacion: estatusFiltro || undefined,
 search: debouncedSearch || undefined,
 fecha_creacion_desde: f_creacion_desde,
 fecha_creacion_hasta: f_creacion_hasta,
 fecha_resolucion_desde: f_resolucion_desde,
 fecha_resolucion_hasta: f_resolucion_hasta,
 first: limit === 0 ? 1 : limit,
 page: 1,
 });

 const items = res.incidencias.edges.map(e => mapIncidenciaNode(e.node));

 const dataToExport = items.map(inc => {
 const notasFormateadas = inc.notas && inc.notas.length > 0 
 ? inc.notas.map((n, i) => `${i + 1}. [${new Date(n.fecha_creacion).toLocaleDateString('es-MX')}] ${n.usuarioAutor?.nombre_completo || 'Usuario'}: ${n.contenido_nota}`).join('\n\n')
 : 'Sin notas';

 return {
 'Número de Serie': inc.numSerie,
 'Alias': inc.alias || 'N/A',
 'Tipo de Incidencia': inc.tipoIncidencia,
 'Estatus': inc.estatus,
 'Falla Reportada': inc.falla,
 'Requerimiento': inc.requerimiento || 'N/A',
 'Fecha de Creación': inc.fecha,
 'Fecha de Resolución': inc.fechaResolucion || 'N/A',
 'Generado Por': inc.generadoPor || 'N/A',
 'Equipo': inc.equipo || 'N/A',
 'Serie/Inv': inc.numSerie || 'N/A',
 'Unidad': inc.unidad || 'N/A',
 'Resolución Textual': inc.resolucion || 'N/A',
 'Notas de Seguimiento': notasFormateadas
 };
 });

 const colWidths = [
 { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 40 },
 { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 25 }, { wch: 30 },
 { wch: 25 }, { wch: 50 }, { wch: 50 }
 ];

 const isFiltered = estatusFiltro || debouncedSearch || f_creacion_desde || f_resolucion_desde;
 const today = new Date();
 const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
 const fileName = `Incidencias_${isFiltered ? 'Filtradas' : 'Completas'}_${dateStr}.xlsx`;

 let filtrosTexto = [];
 if (estatusFiltro) filtrosTexto.push(`Estatus: ${estatusFiltro}`);
 if (debouncedSearch) filtrosTexto.push(`Búsqueda: "${debouncedSearch}"`);
 if (fechaFiltroTipo === 'creacion' && (fechaDesde || fechaHasta)) {
 filtrosTexto.push(`Creación: ${fechaDesde || 'Inicio'} a ${fechaHasta || 'Hoy'}`);
 }
 if (fechaFiltroTipo === 'resolucion' && (fechaDesde || fechaHasta)) {
 filtrosTexto.push(`Resolución: ${fechaDesde || 'Inicio'} a ${fechaHasta || 'Hoy'}`);
 }
 const textoFiltrosAplicados = filtrosTexto.length > 0 
 ? `Filtros aplicados ─ ${filtrosTexto.join(', ')}` 
 : `Filtros aplicados ─ Ninguno (Todas las incidencias)`;

 const headerRows = [
 ['SISTEMA INTEGRAL DE INFRAESTRUCTURA TECNOLOGICA — IMSS Delegación Nayarit'],
 [`Reporte de: Incidencias — ${textoFiltrosAplicados}`],
 [`Fecha de exportación: ${today.toLocaleString('es-MX')}`],
 [`Total de registros: ${items.length}`],
 [] // Separator
 ];

 const worksheet = XLSX.utils.aoa_to_sheet(headerRows);
 XLSX.utils.sheet_add_json(worksheet, dataToExport, { origin: 'A6' });

 worksheet['!cols'] = colWidths;
 
 const range = XLSX.utils.decode_range(worksheet['!ref']);
 range.s.r = 5; // Start autofilter at row 6 (0-indexed 5)
 worksheet['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
 
 // Aplicar estilos
 for (const key in worksheet) {
 if (key[0] === '!') continue;
 const cell = worksheet[key];
 const rowNum = parseInt(key.replace(/^[A-Z]+/, ''), 10);
 
 if (rowNum <= 4) {
 cell.s = { font: { bold: true }, alignment: { vertical: 'top' } };
 } else if (rowNum === 6) {
 cell.s = { font: { bold: true }, alignment: { wrapText: true, vertical: 'top' } };
 } else {
 cell.s = { alignment: { wrapText: true, vertical: 'top' } };
 }
 }

 const workbook = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(workbook, worksheet, 'Incidencias');
 XLSX.writeFile(workbook, fileName);
 showToast('Exportación completada', 'success');
 } catch (e) {
 console.error(e);
 showToast('Error al exportar a Excel', 'error');
 }
 };

 if (isError) return <div className="p-4 text-red-500 text-sm">Error cargando incidencias.</div>;

 return (
 <div className="flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden mb-8 sm:mb-0 sm:flex-1 sm:min-h-0 sm:flex sm:flex-col">
 {/* ─── Cabecera de filtros ─────────────────────────────────── */}
 <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col gap-3 bg-gray-50 dark:bg-gray-900 ">

 {/* Título + badge total + botón exportar */}
 <div className="flex items-center justify-between gap-2 flex-wrap">
 <div className="flex items-center gap-2">
 <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm sm:text-base">Todas las Incidencias</h3>
 {data?.pageInfo?.totalCount !== undefined && (
 <span className="bg-[#006341]/10 text-[#006341] text-xs font-semibold px-2 py-0.5 rounded-full">
 {data.pageInfo.totalCount} total
 </span>
 )}
 </div>
 
 <button
 onClick={handleExportarExcel}
 className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-xs font-bold hover:opacity-90 transition-all shadow-sm flex-shrink-0"
 style={{ background: 'linear-gradient(135deg, #107c41, #185c37)' }}
 title="Exportar listado a Excel"
 >
 <FileSpreadsheet size={14} />
 Exportar Excel
 </button>
 </div>

 {/* Filtro estatus + buscador (apilados en móvil, en fila en desktop) */}
 <div className="flex flex-col sm:flex-row gap-2">
 <select
 value={estatusFiltro}
 onChange={(e) => handleEstatusChange(e.target.value)}
 className="w-full sm:w-auto px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 "
 >
 <option value="">Todos los estatus</option>
 <option value="Pendiente">Pendiente</option>
 <option value="En proceso">En proceso</option>
 <option value="Resuelto">Resuelto</option>
 </select>
 <div className="relative flex-1">
 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
 <input
 type="text"
 placeholder="Buscar serie, falla, o requerimiento..."
 value={searchQuery}
 onChange={e => handleSearch(e.target.value)}
 className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 "
 />
 </div>
 </div>

 {/* Filtros de Fecha */}
 <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm border-t border-gray-200 dark:border-gray-700/60 pt-2">
 <span className="text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wide whitespace-nowrap">Filtro por fecha:</span>
 <select
 value={fechaFiltroTipo}
 onChange={(e) => { setFechaFiltroTipo(e.target.value); handleFilterChange(); }}
 className="w-full sm:w-auto px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 "
 >
 <option value="">Sin filtro de fecha</option>
 <option value="creacion">Fecha de Creación</option>
 <option value="resolucion">Fecha de Resolución</option>
 </select>

 {fechaFiltroTipo && (
 <div className="flex flex-wrap items-center gap-2">
 <input
 type="date"
 value={fechaDesde}
 onChange={(e) => { setFechaDesde(e.target.value); handleFilterChange(); }}
 className="flex-1 min-w-[130px] px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 "
 />
 <span className="text-gray-400 text-xs">hasta</span>
 <input
 type="date"
 value={fechaHasta}
 onChange={(e) => { setFechaHasta(e.target.value); handleFilterChange(); }}
 className="flex-1 min-w-[130px] px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 "
 />
 {(fechaDesde || fechaHasta) && (
 <button
 onClick={() => { setFechaDesde(''); setFechaHasta(''); setFechaFiltroTipo(''); handleFilterChange(); }}
 className="px-2 py-1.5 text-xs text-red-500 hover:text-red-700 dark:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
 >
 Limpiar
 </button>
 )}
 </div>
 )}
 </div>
 </div>

 {/* ─── Tabla: scroll-x en móvil, scroll completo (x+y) en desktop ───── */}
 <div className="w-full overflow-x-auto sm:flex-1 sm:min-h-0 sm:overflow-y-auto">
 {isLoading ? (
 <div className="py-10 text-center text-sm text-gray-400">Cargando incidencias...</div>
 ) : incidenciasNodes.length === 0 ? (
 <div className="py-10 text-center text-sm text-gray-400">No hay incidencias.</div>
 ) : (
 <table className="w-full text-left text-xs" style={{ minWidth: '700px' }}>
 <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 uppercase tracking-wider">
 <tr>
 <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Num Serie</th>
 <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Alias</th>
 <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Dispositivo</th>
 <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Estatus</th>
 <th className="px-3 py-2.5 font-semibold">Falla</th>
 <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Requerimiento</th>
 <th className="px-3 py-2.5 font-semibold whitespace-nowrap">F. Creación</th>
 <th className="px-3 py-2.5 font-semibold whitespace-nowrap">F. Resolución</th>
 <th className="px-3 py-2.5 font-semibold text-center whitespace-nowrap">Acciones</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
 {incidenciasNodes.map(inc => (
 <tr key={inc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 transition-colors">
 <td className="px-3 py-2.5 font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap max-w-[110px] truncate" title={inc.numSerie}>{inc.numSerie}</td>
 <td className="px-3 py-2.5 text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap max-w-[100px] truncate" title={inc.alias}>{inc.alias || '—'}</td>
 <td className="px-4 py-3 whitespace-nowrap">
 <div 
 className={`text-xs font-medium text-gray-900 dark:text-gray-100 ${inc.id_bien ? 'cursor-pointer hover:text-green-700 dark:text-green-400 underline decoration-green-300 decoration-2 underline-offset-2' : ''}`}
 onClick={(e) => { e.stopPropagation(); if (inc.id_bien) onVerBien(inc.id_bien); }}
 title={inc.id_bien ? "Ver Ficha Técnica" : ""}
 >
 {inc.equipo}
 </div>
 </td>
 <td className="px-3 py-2.5 whitespace-nowrap">
 {canEdit ? (
 <select
 value={inc.estatus}
 onChange={(e) => { e.stopPropagation(); onStatusChange(inc, e.target.value); }}
 onClick={(e) => e.stopPropagation()}
 className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider outline-none cursor-pointer border-r-4 ${
 inc.estatus === 'Pendiente' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 dark:text-amber-300 border-amber-100 dark:border-amber-800/50' :
 inc.estatus === 'En proceso' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 dark:text-blue-300 border-blue-100 dark:border-blue-800/50' :
 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 dark:text-green-300 border-green-100 dark:border-green-800/50'
 }`}
 >
 <option value="Pendiente" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">PENDIENTE</option>
 <option value="En proceso" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">EN PROCESO</option>
 <option value="Resuelto" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">RESUELTO</option>
 </select>
 ) : (
 <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
 inc.estatus === 'Pendiente' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 dark:text-amber-300' :
 inc.estatus === 'En proceso' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 dark:text-blue-300' :
 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 dark:text-green-300'
 }`}>
 {inc.estatus}
 </span>
 )}
 </td>
 <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 max-w-[200px] truncate" title={inc.falla}>{inc.falla}</td>
 <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 whitespace-nowrap">
 {inc.requerimiento ? (
 <div className="flex items-center gap-1.5">
 <span>{inc.requerimiento}</span>
 <button
 onClick={(e) => {
 e.stopPropagation();
 copyTextToClipboard(inc.requerimiento);
 showToast('Requerimiento copiado', 'success');
 }}
 className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-gray-400 hover:text-blue-600 transition-colors cursor-pointer shrink-0"
 title="Copiar Requerimiento"
 >
 <Copy size={11} />
 </button>
 </div>
 ) : (
 '—'
 )}
 </td>
 <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">{inc.fecha}</td>
 <td className="px-3 py-2.5 text-green-700 dark:text-green-400 dark:text-green-300 font-medium whitespace-nowrap">
 {inc.fechaResolucion || '—'}
 </td>
 <td className="px-3 py-2.5">
 <div className="flex items-center justify-center gap-1.5">
 <button onClick={() => onViewDetail(inc)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors" title="Ver Detalles">
 <Eye size={13} />
 </button>
 {canEdit && (
 <button onClick={() => onEdit(inc)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors" title="Editar">
 <Edit2 size={13} />
 </button>
 )}
 {canDelete && (
 <button onClick={() => onDelete(inc.id)} className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors" title="Eliminar">
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

 {/* ─── Paginación ─────────────────────────────────────────── */}
 <div className="p-3 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-2 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 ">
 {/* Info total */}
 <div className="flex items-center justify-between text-xs">
 {data?.pageInfo?.totalCount !== undefined && (
 <span className="font-semibold text-gray-700 dark:text-gray-300 ">Total: {data.pageInfo.totalCount} incidencias registradas.</span>
 )}
 <span className="font-bold text-gray-400 uppercase tracking-wider">
 Pág. {currentPage}/{totalPages}
 </span>
 </div>

 {/* Controles de paginación */}
 <div className="flex items-center gap-1 flex-wrap justify-center">
 {/* Flecha Anterior */}
 <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
 className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors flex-shrink-0">
 <ChevronLeft size={15} />
 </button>

 <div className="flex items-center justify-center gap-1 sm:gap-2 w-full sm:w-[260px] order-last sm:order-none mt-2 sm:mt-0">
 {/* Página actual y páginas cercanas — más compacto en móvil */}
 {(() => {
 const pages = [];
 // Siempre mostrar página 1
 if (currentPage > 2) pages.push(1);
 // Separador
 if (currentPage > 3) pages.push('...-left');
 // Página anterior (si existe)
 if (currentPage > 1) pages.push(currentPage - 1);
 // Página actual
 pages.push(currentPage);
 // Página siguiente (si existe)
 if (currentPage < totalPages) pages.push(currentPage + 1);
 // Separador
 if (currentPage < totalPages - 2) pages.push('...-right');
 // Última página
 if (currentPage < totalPages - 1) pages.push(totalPages);
 return pages.map((p, idx) => {
 if (typeof p === 'string') {
 return <span key={p} className="px-1 text-gray-400 text-xs">...</span>;
 }
 return (
 <button key={`page-${p}-${idx}`} onClick={() => setCurrentPage(p)}
 className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors flex-shrink-0 ${
 currentPage === p ? 'bg-[#006341] text-white shadow-sm' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 '
 }`}>
 {p}
 </button>
 );
 });
 })()}
 </div>

 {/* Flecha Siguiente */}
 <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages || totalPages === 0}
 className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors flex-shrink-0">
 <ChevronRight size={15} />
 </button>

 {/* Ir a página */}
 <form onSubmit={handleJumpToPage} className="flex items-center gap-1 ml-1 border-l border-gray-200 dark:border-gray-700 pl-2">
 <input
 type="number"
 min="1"
 max={totalPages}
 value={pageInput}
 onChange={(e) => setPageInput(e.target.value)}
 placeholder="Ir a..."
 className="w-14 px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-[#006341] focus:ring-1 focus:ring-[#006341] bg-white dark:bg-gray-800 text-center"
 />
 <button type="submit" disabled={!pageInput} className="px-2 py-1.5 bg-[#006341]/10 text-[#006341] font-semibold text-xs rounded-lg hover:bg-[#006341]/20 disabled:opacity-50 transition-colors">
 Ir
 </button>
 </form>
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

 const updateEstatus = useUpdateEstatusIncidencia();
 const pasarAEnProceso = usePasarAEnProceso();
 const resolverIncidencia = useResolverIncidencia();
 const agregarNota = useAgregarNota();
 const deleteIncidencia = useDeleteIncidencia();
 const deleteNota = useDeleteNota();

 const handleDeleteNota = useCallback(async (id_nota, id_incidencia) => {
 try {
 await deleteNota.mutateAsync({ id_nota: String(id_nota), id_incidencia: String(id_incidencia) });
 showToast('Nota de seguimiento eliminada', 'success');
 } catch {
 showToast('Error al eliminar la nota', 'error');
 }
 }, [deleteNota, showToast]);

 const [movingId, setMovingId] = useState(null);
 const [tab, setTab] = useState('kanban'); // 'kanban' | 'historico'
 const [kanbanSearch, setKanbanSearch] = useState('');

 const idRol = usuario?.id_rol ?? 3;
 const canCreateIncident = idRol === 1 || idRol === 2;
 const canEdit = idRol === 1 || idRol === 2;
 const canDelete = idRol === 1;

 const [isModalOpen, setIsModalOpen] = useState(false);
 const [isEditarModalOpen, setIsEditarModalOpen] = useState(false);
 const [incidenciaParaEditar, setIncidenciaParaEditar] = useState(null);
 const [isResolucionModalOpen, setIsResolucionModalOpen] = useState(false);
 const [incidenciaParaResolver, setIncidenciaParaResolver] = useState(null);
 
 const [visualModalBienId, setVisualModalBienId] = useState(null);
 const [isNotaModalOpen, setIsNotaModalOpen] = useState(false);
 const [incidenciaParaNota, setIncidenciaParaNota] = useState(null);
 const [incidenciaDetalle, setIncidenciaDetalle] = useState(null);
 const [expandedCards, setExpandedCards] = useState({}); // { [estatus]: id_incidencia }
 const [lastEditedId, setLastEditedId] = useState(null);
 const [confirmConfig, setConfirmConfig] = useState({
 isOpen: false,
 title: '',
 message: '',
 confirmText: '',
 type: 'danger',
 onConfirm: () => {},
 });

 const handleToggleCard = useCallback((id, estatus) => {
 setExpandedCards(prev => ({
 ...prev,
 [estatus]: prev[estatus] === id ? null : id
 }));
 setLastEditedId(prevId => prevId === id ? null : prevId);
 }, []);

 // ── useMemo: agrupa incidencias por columna y filtra resueltas por semana ──
 const columnedCards = useMemo(() => {
 const map = { Pendiente: [], 'En proceso': [], Resuelto: [] };
 
 const now = new Date();
 const day = now.getDay();
 const diff = now.getDate() - day + (day === 0 ? -6 : 1);
 const startOfWeek = new Date(now.setDate(diff));
 startOfWeek.setHours(0, 0, 0, 0);

 const term = kanbanSearch.trim().toLowerCase();

 incidencias.forEach(inc => { 
 if (term) {
 const match = 
 (inc.numSerie && inc.numSerie.toLowerCase().includes(term)) ||
 (inc.falla && inc.falla.toLowerCase().includes(term)) ||
 (inc.alias && inc.alias.toLowerCase().includes(term)) ||
 (inc.requerimiento && inc.requerimiento.toLowerCase().includes(term)) ||
 (inc.generadoPor && inc.generadoPor.toLowerCase().includes(term));
 if (!match) return;
 }

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
 }, [incidencias, kanbanSearch]);

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
 if (inc.estatus === newStatus) return;

 if (newStatus === 'Resuelto') {
 setIncidenciaParaResolver(inc);
 setIsResolucionModalOpen(true);
 return;
 }

 if (inc.estatus === 'Resuelto') {
 setConfirmConfig({
 isOpen: true,
 title: 'Reabrir Incidencia Resuelta',
 message: `¿Deseas cambiar el estatus a "${newStatus}"? Al hacerlo se borrarán los detalles de la resolución actual y la incidencia volverá a estar activa.`,
 confirmText: 'Sí, cambiar estatus',
 type: 'danger',
 onConfirm: async () => {
 setMovingId(inc.id);
 try {
 await updateEstatus.mutateAsync({ id_incidencia: String(inc.id), estatus_reparacion: newStatus });
 showToast(`Estatus cambiado a "${newStatus}"`, 'success');
 setLastEditedId(inc.id);
 } catch {
 showToast('Error al cambiar el estatus', 'error');
 } finally {
 setMovingId(null);
 setConfirmConfig(prev => ({ ...prev, isOpen: false }));
 }
 }
 });
 return;
 }

 if (newStatus === 'En proceso') {
 setConfirmConfig({
 isOpen: true,
 title: 'Iniciar Atención',
 message: '¿Desea marcar esta incidencia como "En proceso"? Esto notificará que el equipo ya está siendo atendido.',
 confirmText: 'Comenzar',
 type: 'info',
 onConfirm: async () => {
 setMovingId(inc.id);
 try {
 await pasarAEnProceso.mutateAsync({ id_incidencia: String(inc.id) });
 showToast('Atención iniciada', 'success');
 } catch {
 showToast('Error al iniciar atención', 'error');
 } finally {
 setMovingId(null);
 setConfirmConfig(prev => ({ ...prev, isOpen: false }));
 }
 }
 });
 return;
 }

 setMovingId(inc.id);
 try {
 await updateEstatus.mutateAsync({ id_incidencia: String(inc.id), estatus_reparacion: newStatus });
 showToast(`Incidencia movida a "${newStatus}"`, 'success');
 setLastEditedId(inc.id);
 } catch {
 showToast('Error al cambiar el estatus', 'error');
 } finally {
 setMovingId(null);
 }
 }, [pasarAEnProceso, updateEstatus, showToast]);

 const handleConfirmarResolucion = useCallback(async (id, resolucion_textual) => {
 try {
 await resolverIncidencia.mutateAsync({
 id_incidencia: String(id),
 estatus_cierre: 'Resuelto',
 resolucion_textual,
 });
 showToast('Incidencia finalizada correctamente', 'success');
 setLastEditedId(id);
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
 setLastEditedId(id);
 } catch {
 showToast('Error al guardar la nota', 'error');
 }
 setIsNotaModalOpen(false);
 setIncidenciaParaNota(null);
 }, [agregarNota, showToast]);

 const handleDelete = useCallback(async (id) => {
 setConfirmConfig({
 isOpen: true,
 title: '¿Eliminar Incidencia?',
 message: 'Esta acción es permanente y no se podrá recuperar el reporte de esta incidencia.',
 confirmText: 'Eliminar permanentemente',
 type: 'danger',
 onConfirm: async () => {
 try {
 await deleteIncidencia.mutateAsync({ id_incidencia: String(id) });
 showToast('Incidencia eliminada', 'success');
 } catch {
 showToast('Error al eliminar la incidencia', 'error');
 } finally {
 setConfirmConfig(prev => ({ ...prev, isOpen: false }));
 }
 }
 });
 }, [deleteIncidencia, showToast]);

 // ── useMemo: contadores del header (solo recalcula cuando cambian los datos) ──
 const contadoresJSX = useMemo(() => (
 <div className="flex gap-3 items-center">
 {COLUMNS.map(col => {
 const Icon = col.icon;
 return (
 <div key={col.id} className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 ">
 <Icon size={14} className={col.colorClass} />
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
 <div className="flex flex-col items-center gap-4 text-gray-500 dark:text-gray-400 ">
 <AlertTriangle size={40} className="text-red-400" />
 <p className="text-sm font-medium text-gray-700 dark:text-gray-300 ">Error al cargar las incidencias</p>
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
 <div className={`p-4 sm:p-6 fade-in relative flex flex-col ${
 tab === 'historico'
 ? 'min-h-[calc(100dvh-70px)] overflow-y-auto sm:h-[calc(100vh-70px)] sm:overflow-hidden sm:min-h-0'
 : 'h-[calc(100dvh-70px)] sm:h-[calc(100vh-70px)] overflow-hidden'
 }`}>

 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
 <div className="flex flex-col items-start w-full sm:w-auto">
 <div className="flex items-center justify-between w-full sm:w-auto gap-4 flex-wrap">
 <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 ">Incidencias</h1>
 <div className="sm:hidden mt-1">{tab === 'kanban' && contadoresJSX}</div>
 </div>
 {/* Tabs */}
 <div className="flex gap-1 bg-gray-100 dark:bg-gray-900/50 rounded-xl p-1 mt-3 w-fit border border-gray-200 dark:border-gray-800">
 {[
 { id: 'kanban', label: 'Tablero Kanban', icon: LayoutDashboard },
 { id: 'historico', label: 'Todas las Incidencias', icon: List },
 ].map(t => {
 const Icon = t.icon;
 return (
 <button
 key={t.id}
 onClick={() => setTab(t.id)}
 className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
 tab === t.id 
 ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white border border-gray-200/50 dark:border-gray-700/50' 
 : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
 }`}
 >
 <Icon size={14} /> {t.label}
 </button>
 );
 })}
 </div>
 {canCreateIncident && tab === 'kanban' && (
 <button
 onClick={() => setIsModalOpen(true)}
 className="hidden sm:flex mt-4 sm:mt-5 items-center gap-2 bg-[#006341] hover:bg-[#004e33] text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm shadow-sm flex-shrink-0"
 >
 <Plus size={16} /><span>Nueva Incidencia</span>
 </button>
 )}
 </div>
 <div className="hidden sm:flex items-center gap-3 mt-1 flex-wrap justify-end">
 {tab === 'kanban' && (
 <div className="relative">
 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
 <input
 type="text"
 placeholder="Buscar requerimiento, serie..."
 value={kanbanSearch}
 onChange={e => setKanbanSearch(e.target.value)}
 className="w-48 xl:w-64 pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006341] focus:border-[#006341] bg-white dark:bg-gray-800 transition-all"
 />
 </div>
 )}
 {tab === 'kanban' && contadoresJSX}
 <button
 onClick={() => refetch()}
 className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
 title="Actualizar"
 >
 <RefreshCw size={14} />
 </button>
 </div>
 </div>

 {/* Contenido principal según la pestaña */}
 {tab === 'kanban' && (
 <div className="flex-1 overflow-hidden -mx-4 sm:mx-0 flex flex-col">
 <div className="flex-1 min-h-0 flex overflow-x-auto snap-x snap-mandatory md:grid md:grid-cols-3 gap-5 px-4 sm:px-0 scrollbar-hide">
 {COLUMNS.map(col => {
 const Icon = col.icon;
 const cards = columnedCards[col.id] ?? [];
 return (
 <div key={col.id} className="h-full flex flex-col min-w-[85vw] md:min-w-0 min-h-0 snap-center md:snap-align-none pb-2 md:pb-0">
 <div
 className={`sticky top-0 z-30 flex-shrink-0 flex items-center gap-2.5 px-4 py-3 rounded-t-2xl shadow-sm backdrop-blur-sm ${col.bgClass}`}
 >
 <Icon size={16} className={col.colorClass} />
 <h3 className={`text-sm font-bold ${col.colorClass}`}>{col.label}</h3>
 <span
 className={`ml-auto w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${col.badgeBg}`}
 >
 {cards.length}
 </span>
 </div>

 <div className="flex-1 overflow-y-auto space-y-3 pb-24 md:pb-4 scrollbar-hide px-3 pt-4 rounded-b-2xl bg-gray-50/10 dark:bg-gray-900/20">
 {cards.length === 0 ? (
 <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl py-10 text-center text-sm text-gray-300">
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
 onDeleteNota={handleDeleteNota}
 canEdit={canEdit}
 canDelete={canDelete}
 isMoving={movingId === inc.id}
 isExpanded={expandedCards[inc.estatus] === inc.id}
 isHighlighted={lastEditedId === inc.id}
 onToggle={() => handleToggleCard(inc.id, inc.estatus)}
 onVerBien={setVisualModalBienId}
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
 <div className="sm:flex-1 sm:min-h-0 sm:flex sm:flex-col sm:overflow-hidden">
 <TablaHistorico 
 canEdit={canEdit} 
 canDelete={idRol === 1} 
 onEdit={handleEdit} 
 onDelete={handleDelete} 
 onViewDetail={handleVerDetalle}
 onStatusChange={handleStatusChange}
 onVerBien={setVisualModalBienId}
 />
 </div>
 )}

 {canCreateIncident && tab === 'kanban' && (
 <button
 onClick={() => setIsModalOpen(true)}
 className="fixed bottom-6 right-6 z-50 sm:hidden w-14 h-14 bg-[#006341] hover:bg-[#004e33] rounded-full shadow-xl flex items-center justify-center text-white transition-transform active:scale-95"
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
 onUpdated={() => {
 showToast('Incidencia actualizada correctamente', 'success');
 setLastEditedId(incidenciaParaEditar?.id);
 }}
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
 onDeleteNota={canDelete ? handleDeleteNota : undefined}
 />

 {/* Modal de Confirmación Genérico */}
 <ConfirmModal
 {...confirmConfig}
 onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
 isLoading={deleteIncidencia.isPending || pasarAEnProceso.isPending}
 />

 {visualModalBienId && (
 <DetalleBienVisualModal 
 id_bien={visualModalBienId} 
 onClose={() => setVisualModalBienId(null)} 
 />
 )}
 </div>
 );
}