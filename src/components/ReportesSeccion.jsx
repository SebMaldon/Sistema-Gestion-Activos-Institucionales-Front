import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { useApp } from '../context/AppContext';
import { 
 GET_REPORTES_GARANTIA, 
 CREATE_REPORTE_GARANTIA, 
 UPDATE_REPORTE_GARANTIA, 
 DELETE_REPORTE_GARANTIA 
} from '../api/garantias.queries';
import { GET_MARCAS_TIPOS_QUERY, CREATE_TIPO_DISPOSITIVO_MUTATION } from '../api/inventario.queries';
import { 
  Plus, Edit, Trash2, ShieldAlert, Calendar, CheckCircle2,
  Clock, Hammer, Wrench, PackageSearch, AlertCircle, Info, X,
  ChevronDown, ChevronRight, FileText
} from 'lucide-react';
import { formatDate } from '../lib/utils';
import UserSearchDropdown from './UserSearchDropdown';
import SearchableSelect from './SearchableSelect';
import { useUsuariosActivos } from '../hooks/useIncidencias';

const toLocalDate = (val) => {
  if (!val) return '';
  const d = new Date(Number(val) || val);
  if (isNaN(d.getTime())) return '';
  const tzoffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzoffset).toISOString().slice(0, 10);
};

const parseDateForPayload = (val) => {
  if (!val) return null;
  if (val.length === 10) return new Date(val + 'T12:00:00').toISOString();
  return new Date(val).toISOString();
};

// Constantes de estatus
const ESTATUS_OPTIONS = [
 'Enviado a proveedor',
 'En revisión',
 'En reparación',
 'Esperando piezas',
 'Listo para recoger',
 'Resuelto / Entregado',
 'Rechazado'
];

function EstatusIcon({ estatus, size = 16 }) {
 switch (estatus) {
 case 'Enviado a proveedor': return <PackageSearch size={size} className="text-blue-500" />;
 case 'En revisión': return <Clock size={size} className="text-purple-500" />;
 case 'En reparación': return <Hammer size={size} className="text-orange-500" />;
 case 'Esperando piezas': return <Wrench size={size} className="text-amber-500" />;
 case 'Listo para recoger': return <CheckCircle2 size={size} className="text-teal-500" />;
 case 'Resuelto / Entregado': return <CheckCircle2 size={size} className="text-emerald-500" />;
 case 'Rechazado': return <ShieldAlert size={size} className="text-red-500" />;
 default: return <Info size={size} className="text-gray-400" />;
 }
}

export default function ReportesSeccion({ garantia, readOnly = false }) {
  const { showToast } = useApp();
  const qc = useQueryClient();
  const { data: usuarios = [] } = useUsuariosActivos();
  const [editingReporte, setEditingReporte] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [reporteToDelete, setReporteToDelete] = useState(null);
  const [isAddingTipo, setIsAddingTipo] = useState(false);
  const [newTipoName, setNewTipoName] = useState('');
  const [isNewReportNum, setIsNewReportNum] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const normalize = (str) => (str || '').toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  const { data: catData } = useQuery({
    queryKey: ['marcas-tipos'],
    queryFn: () => gqlClient.request(GET_MARCAS_TIPOS_QUERY),
    staleTime: 5 * 60 * 1000
  });
  const tiposDispositivo = catData?.tiposDispositivo ?? [];

  const { mutate: createTipoMut, isPending: creatingTipo } = useMutation({
    mutationFn: (vars) => gqlClient.request(CREATE_TIPO_DISPOSITIVO_MUTATION, vars),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['marcas-tipos'] });
      qc.invalidateQueries({ queryKey: ['catalogos-bienes'] });
      setForm(f => ({ ...f, tipo_dispositivo: String(data.createTipoDispositivo.tipo_disp) }));
      setIsAddingTipo(false);
      setNewTipoName('');
      showToast(`Tipo "${data.createTipoDispositivo.nombre_tipo}" creado correctamente`, 'success');
    },
    onError: (e) => {
      const msg = e?.response?.errors?.[0]?.message ?? '';
      if (msg.startsWith('EL_TIPO_YA_EXISTE:')) {
        const parts = msg.split(':');
        const id = parts[1];
        const nombre = parts.slice(2).join(':');
        showToast(`El tipo "${nombre}" ya existe. Seleccionándolo...`, 'warning');
        setForm(f => ({ ...f, tipo_dispositivo: String(id) }));
        setIsAddingTipo(false);
        setNewTipoName('');
      } else {
        showToast(msg || 'Error al crear tipo de dispositivo', 'error');
      }
    }
  });

  const handleCreateTipo = () => {
    if (!newTipoName.trim()) return;
    const dup = tiposDispositivo.find(t => normalize(t.nombre_tipo) === normalize(newTipoName));
    if (dup) {
      showToast(`El tipo "${dup.nombre_tipo}" ya existe. Seleccionándolo...`, 'warning');
      setForm(f => ({ ...f, tipo_dispositivo: String(dup.tipo_disp) }));
      setIsAddingTipo(false);
      setNewTipoName('');
      return;
    }
    createTipoMut({ nombre_tipo: newTipoName.trim() });
  };

  const [form, setForm] = useState({
    estatus: 'Enviado a proveedor',
    descripcion_falla: '',
    resolucion: '',
    numero_reporte: '',
    tipo_dispositivo: '',
    usuario_reporta: '',
    serie_pieza_nueva: '',
    fecha_atencion: '',
    fecha_resolucion: ''
  });

  const { data: reportes = [], isLoading } = useQuery({
    queryKey: ['reportesGarantia', garantia.id_garantia],
    queryFn: () => gqlClient.request(GET_REPORTES_GARANTIA, { id_garantia: garantia.id_garantia }),
    select: d => d.reportesPorGarantia ?? []
  });

  const existingReportNumbers = useMemo(() => {
    const nums = new Set();
    const idBien = garantia.bien?.id_bien || garantia.id_bien;

    reportes.forEach(r => {
      if (r.numero_reporte && r.numero_reporte.trim()) {
        nums.add(r.numero_reporte.trim());
      }
    });

    if (garantia.reportes && Array.isArray(garantia.reportes)) {
      garantia.reportes.forEach(r => {
        if (r.numero_reporte && r.numero_reporte.trim()) {
          nums.add(r.numero_reporte.trim());
        }
      });
    }

    const todasGarantias = qc.getQueryData(['garantias']);
    if (todasGarantias?.garantias && Array.isArray(todasGarantias.garantias)) {
      todasGarantias.garantias.forEach(g => {
        const gBienId = g.bien?.id_bien || g.id_bien;
        if (String(gBienId) === String(idBien) && g.reportes && Array.isArray(g.reportes)) {
          g.reportes.forEach(r => {
            if (r.numero_reporte && r.numero_reporte.trim()) {
              nums.add(r.numero_reporte.trim());
            }
          });
        }
      });
    }

    return Array.from(nums).sort();
  }, [reportes, garantia, qc]);

  const groupedReportes = useMemo(() => {
    const groupMap = new Map();
    const sinReporte = [];

    reportes.forEach(rep => {
      const key = rep.numero_reporte?.trim();
      if (!key) {
        sinReporte.push(rep);
      } else {
        if (!groupMap.has(key)) groupMap.set(key, { key, reportes: [] });
        groupMap.get(key).reportes.push(rep);
      }
    });

    return [
      ...Array.from(groupMap.values()),
      ...(sinReporte.length > 0 ? [{ key: '__SIN_NUMERO__', reportes: sinReporte }] : [])
    ];
  }, [reportes]);

  const createMut = useMutation({
    mutationFn: (vars) => gqlClient.request(CREATE_REPORTE_GARANTIA, vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reportesGarantia', garantia.id_garantia] });
      qc.invalidateQueries({ queryKey: ['garantias'] });
      showToast('Reporte registrado exitosamente', 'success');
      resetForm();
    },
    onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al registrar reporte', 'error')
  });

  const updateMut = useMutation({
    mutationFn: (vars) => gqlClient.request(UPDATE_REPORTE_GARANTIA, vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reportesGarantia', garantia.id_garantia] });
      qc.invalidateQueries({ queryKey: ['garantias'] });
      showToast('Reporte actualizado', 'success');
      resetForm();
    },
    onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al actualizar reporte', 'error')
  });

  const deleteMut = useMutation({
    mutationFn: (vars) => gqlClient.request(DELETE_REPORTE_GARANTIA, vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reportesGarantia', garantia.id_garantia] });
      qc.invalidateQueries({ queryKey: ['garantias'] });
      showToast('Reporte eliminado', 'success');
      setReporteToDelete(null);
    },
    onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al eliminar reporte', 'error')
  });

  const handleEditClick = (rep) => {
    setEditingReporte(rep);
    setIsCreating(false);
    setIsAddingTipo(false);
    const numRep = rep.numero_reporte || '';
    setIsNewReportNum(numRep && !existingReportNumbers.includes(numRep));
    setForm({
      estatus: rep.estatus,
      descripcion_falla: rep.descripcion_falla,
      resolucion: rep.resolucion || '',
      numero_reporte: rep.numero_reporte || '',
      tipo_dispositivo: rep.tipo_dispositivo !== null && rep.tipo_dispositivo !== undefined ? String(rep.tipo_dispositivo) : '',
      usuario_reporta: rep.usuario_reporta || '',
      serie_pieza_nueva: rep.serie_pieza_nueva || '',
      fecha_atencion: rep.fecha_atencion ? toLocalDate(rep.fecha_atencion) : '',
      fecha_resolucion: rep.fecha_resolucion ? toLocalDate(rep.fecha_resolucion) : ''
    });
  };

  const handleCreateClick = () => {
    setIsCreating(true);
    setEditingReporte(null);
    setIsAddingTipo(false);
    setIsNewReportNum(false);
    const defTipo = garantia.bien?.modelo?.tipoDispositivo?.tipo_disp 
      ? String(garantia.bien.modelo.tipoDispositivo.tipo_disp) 
      : (garantia.bien?.modelo?.tipo_disp ? String(garantia.bien.modelo.tipo_disp) : '');
    setForm({
      estatus: 'Enviado a proveedor',
      descripcion_falla: '',
      resolucion: '',
      numero_reporte: '',
      tipo_dispositivo: defTipo,
      usuario_reporta: '',
      serie_pieza_nueva: '',
      fecha_atencion: '',
      fecha_resolucion: ''
    });
  };

  const resetForm = () => {
    setIsCreating(false);
    setEditingReporte(null);
    setIsAddingTipo(false);
    setIsNewReportNum(false);
    const defTipo = garantia.bien?.modelo?.tipoDispositivo?.tipo_disp 
      ? String(garantia.bien.modelo.tipoDispositivo.tipo_disp) 
      : (garantia.bien?.modelo?.tipo_disp ? String(garantia.bien.modelo.tipo_disp) : '');
    setForm({
      estatus: 'Enviado a proveedor',
      descripcion_falla: '',
      resolucion: '',
      numero_reporte: '',
      tipo_dispositivo: defTipo,
      usuario_reporta: '',
      serie_pieza_nueva: '',
      fecha_atencion: '',
      fecha_resolucion: ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.descripcion_falla.trim()) {
      showToast('La descripción es obligatoria', 'warning');
      return;
    }

    const isReadyOrResolved = form.estatus === 'Listo para recoger' || form.estatus === 'Resuelto / Entregado';

    if (isCreating) {
      createMut.mutate({
        id_garantia: garantia.id_garantia,
        id_bien: garantia.bien?.id_bien || garantia.id_bien,
        num_serie: garantia.bien?.num_serie,
        estatus: form.estatus,
        descripcion_falla: form.descripcion_falla,
        resolucion: form.resolucion,
        numero_reporte: form.numero_reporte || null,
        tipo_dispositivo: form.tipo_dispositivo && form.tipo_dispositivo !== 'null' ? parseInt(form.tipo_dispositivo) : null,
        usuario_reporta: form.usuario_reporta ? parseInt(form.usuario_reporta) : null,
        serie_pieza_nueva: isReadyOrResolved ? (form.serie_pieza_nueva || null) : null,
        fecha_atencion: parseDateForPayload(form.fecha_atencion),
        fecha_resolucion: parseDateForPayload(form.fecha_resolucion)
      });
    } else if (editingReporte) {
      updateMut.mutate({
        id_reporte_garantia: editingReporte.id_reporte_garantia,
        estatus: form.estatus,
        descripcion_falla: form.descripcion_falla,
        resolucion: form.resolucion,
        numero_reporte: form.numero_reporte || null,
        tipo_dispositivo: form.tipo_dispositivo && form.tipo_dispositivo !== 'null' ? parseInt(form.tipo_dispositivo) : null,
        usuario_reporta: form.usuario_reporta ? parseInt(form.usuario_reporta) : null,
        serie_pieza_nueva: isReadyOrResolved ? (form.serie_pieza_nueva || null) : null,
        fecha_atencion: parseDateForPayload(form.fecha_atencion),
        fecha_resolucion: parseDateForPayload(form.fecha_resolucion)
      });
    }
  };

 return (
 <div className="w-full">
 {/* Content */}
 <div className="w-full">
 {/* Listado de Reportes */}
 {!isCreating && !editingReporte ? (
 <div className="space-y-4">
 <div className="flex justify-between items-center mb-4">
 <h4 className="font-semibold text-slate-700 dark:text-slate-300 text-lg">Bitácora de Seguimiento</h4>
 {!readOnly && (
 <button type="button" onClick={handleCreateClick}
 className="bg-[#006341] hover:bg-[#004d32] text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm">
 <Plus size={16} /> Nueva Nota
 </button>
 )}
 </div>

 {isLoading ? (
 <div className="text-center py-10 text-slate-500">Cargando notas...</div>
 ) : reportes.length === 0 ? (
 <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700/50 rounded-xl p-8 text-center shadow-sm">
 <div className="bg-slate-100 dark:bg-slate-800/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
 <ShieldAlert size={32} className="text-slate-400" />
 </div>
 <h5 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">Sin seguimiento registrado</h5>
 <p className="text-sm text-slate-500 mb-4">No hay notas de seguimiento registradas para este bien.</p>
 {!readOnly && (
 <button type="button" onClick={handleCreateClick} className="text-[#006341] hover:underline font-semibold text-sm">
 Registrar primera nota
 </button>
 )}
 </div>
 ) : (
 <div className="space-y-4">
 {groupedReportes.map(group => {
  const isCollapsed = collapsedGroups[group.key] !== false;
  const tiposDelGrupo = [...new Set(
    group.reportes
      .map(r => r.tipoDispositivoObj?.nombre_tipo ||
        tiposDispositivo.find(t => String(t.tipo_disp) === String(r.tipo_dispositivo))?.nombre_tipo ||
        null)
      .filter(Boolean)
  )];

  const totalNotas = group.reportes.length;
  const isSinNumero = group.key === '__SIN_NUMERO__';

  return (
    <div key={group.key} className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsedGroups(prev => ({ ...prev, [group.key]: !isCollapsed }))}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700/40 transition-colors border-b border-slate-200 dark:border-slate-700/60 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          {isCollapsed
            ? <ChevronRight size={16} className="shrink-0 text-slate-400" />
            : <ChevronDown size={16} className="shrink-0 text-slate-400" />}
          {isSinNumero ? (
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-slate-400 shrink-0" />
              <span className="font-semibold text-sm text-slate-500 dark:text-slate-400 italic">Sin número de reporte</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <FileText size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-bold text-sm text-[#006341] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/50 font-mono">
                {group.key}
              </span>
              {tiposDelGrupo.length > 0 && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  &mdash; {tiposDelGrupo.join(', ')}
                </span>
              )}
            </div>
          )}
        </div>
        <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0 ml-3 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
          {totalNotas} {totalNotas === 1 ? 'nota' : 'notas'}
        </span>
      </button>

      {!isCollapsed && (
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {group.reportes.map(rep => (
            <div key={rep.id_reporte_garantia} className="bg-white dark:bg-gray-800 border-none rounded-none shadow-sm overflow-hidden hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="bg-slate-50/50 dark:bg-slate-800/20 px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <EstatusIcon estatus={rep.estatus} size={18} />
                  <span className="font-bold text-slate-800 dark:text-slate-200">{rep.estatus}</span>
                </div>
                {!readOnly && (
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => handleEditClick(rep)} className="p-1.5 text-slate-400 hover:text-[#006341] rounded bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700/50 shadow-sm transition-colors" title="Editar nota">
                      <Edit size={14} />
                    </button>
                    <button type="button" onClick={() => setReporteToDelete(rep)} className="p-1.5 text-slate-400 hover:text-red-600 rounded bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700/50 shadow-sm transition-colors" title="Eliminar nota">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              <div className={`p-4 grid grid-cols-1 ${['Resuelto / Entregado', 'Listo para recoger'].includes(rep.estatus) ? 'md:grid-cols-2' : ''} gap-4`}>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Detalles de la Nota</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{rep.descripcion_falla}</p>
                </div>
                {['Resuelto / Entregado', 'Listo para recoger'].includes(rep.estatus) && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Resolución</p>
                    {rep.resolucion ? (
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{rep.resolucion}</p>
                    ) : (
                      <p className="text-sm text-slate-400 italic">Sin resolución registrada aún.</p>
                    )}
                  </div>
                )}
              </div>
              {(rep.tipo_dispositivo || rep.tipoDispositivoObj || rep.usuarioReportaObj || rep.serie_pieza_nueva || rep.fecha_atencion) && (
                <div className="mx-4 mb-4 pt-3 border-t border-slate-100 dark:border-slate-700/50 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-slate-50/70 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/40">
                  {(rep.tipo_dispositivo || rep.tipoDispositivoObj) && (
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tipo Dispositivo</span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5 block">
                        {rep.tipoDispositivoObj?.nombre_tipo || tiposDispositivo.find(t => String(t.tipo_disp) === String(rep.tipo_dispositivo))?.nombre_tipo || rep.tipo_dispositivo}
                      </span>
                    </div>
                  )}
                  {rep.usuarioReportaObj && (
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Usuario Reportó</span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5 block truncate" title={rep.usuarioReportaObj.nombre_completo}>
                        {rep.usuarioReportaObj.nombre_completo}
                      </span>
                    </div>
                  )}
                  {rep.serie_pieza_nueva && (
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Serie Pieza Nueva</span>
                      <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md inline-block mt-0.5 border border-amber-200 dark:border-emerald-800/50">{rep.serie_pieza_nueva}</span>
                    </div>
                  )}
                  {rep.fecha_atencion && (
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Fecha Atención</span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5 block flex items-center gap-1">
                        <Clock size={12} className="text-slate-400 inline" />
                        {new Date(Number(rep.fecha_atencion) || rep.fecha_atencion).toLocaleDateString('es-MX', { dateStyle: 'medium' })}
                      </span>
                    </div>
                  )}
                </div>
              )}
              <div className="bg-slate-50 dark:bg-slate-900/20 px-4 py-2 border-t border-slate-100 dark:border-slate-800/50 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} /> Registrado: <span className="font-semibold text-slate-700 dark:text-slate-300">{new Date(Number(rep.fecha_reporte) || rep.fecha_reporte).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
                <div className="flex items-center gap-1.5 ml-auto">
                  Por: <span className="font-semibold text-slate-700 dark:text-slate-300">{rep.usuarioRegistra?.nombre_completo || 'Sistema'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
})}
 </div>
 )}
 </div>
 ) : (
 /* Formulario Crear/Editar */
 <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm overflow-hidden">
 <div className="bg-slate-50 dark:bg-slate-900/20 px-5 py-4 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center">
 <h4 className="font-bold text-slate-800 dark:text-slate-200 text-lg">
 {isCreating ? 'Registrar Nueva Nota' : 'Editar Nota'}
 </h4>
 <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-600 dark:text-slate-400">
 <X size={20} />
 </button>
 </div>
 <div className="p-5 space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Estatus de la Nota <span className="text-red-500">*</span></label>
                    <select 
                      value={form.estatus}
                      onChange={e => setForm(p => ({ ...p, estatus: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600/50 rounded-lg focus:ring-2 focus:ring-[#006341] focus:border-[#006341] outline-none transition-all"
                    >
                      {ESTATUS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Número de Reporte / Ticket</label>
                    {existingReportNumbers.length > 0 ? (
                      <div className="space-y-2">
                        <select 
                          value={isNewReportNum ? '__NEW__' : (form.numero_reporte || '')}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === '__NEW__') {
                              setIsNewReportNum(true);
                              setForm(p => ({ ...p, numero_reporte: '' }));
                            } else {
                              setIsNewReportNum(false);
                              setForm(p => ({ ...p, numero_reporte: val }));
                            }
                          }}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600/50 rounded-lg focus:ring-2 focus:ring-[#006341] focus:border-[#006341] outline-none transition-all text-sm font-medium"
                        >
                          <option value="">-- Seleccionar número de reporte existente --</option>
                          {existingReportNumbers.map(num => (
                            <option key={num} value={num}>Reporte Existente: {num}</option>
                          ))}
                          <option value="__NEW__">+ Registrar un número de reporte aparte / nuevo...</option>
                        </select>

                        {isNewReportNum && (
                          <input 
                            type="text"
                            value={form.numero_reporte}
                            onChange={e => setForm(p => ({ ...p, numero_reporte: e.target.value }))}
                            placeholder="Escribe el nuevo número de reporte o ticket..."
                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-slate-800 dark:text-slate-200 border border-emerald-500/60 dark:border-emerald-500/60 rounded-lg focus:ring-2 focus:ring-[#006341] focus:border-[#006341] outline-none transition-all text-sm font-mono shadow-sm"
                            autoFocus
                          />
                        )}
                      </div>
                    ) : (
                      <input 
                        type="text"
                        value={form.numero_reporte}
                        onChange={e => setForm(p => ({ ...p, numero_reporte: e.target.value }))}
                        placeholder="Ej. FOL-2026-001 o Ticket de Proveedor"
                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600/50 rounded-lg focus:ring-2 focus:ring-[#006341] focus:border-[#006341] outline-none transition-all text-sm"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Tipo de Dispositivo</label>
                    {isAddingTipo ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTipoName}
                          onChange={e => setNewTipoName(e.target.value)}
                          placeholder="Nombre de nuevo tipo..."
                          className="flex-1 bg-white dark:bg-gray-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006341]"
                          autoFocus
                        />
                        <button type="button" onClick={handleCreateTipo} disabled={creatingTipo || !newTipoName.trim()}
                          className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors">
                          Guardar
                        </button>
                        <button type="button" onClick={() => { setIsAddingTipo(false); setNewTipoName(''); }}
                          className="px-3 py-2 border border-slate-300 dark:border-slate-600/50 text-gray-500 dark:text-gray-400 rounded-lg text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <div className="flex-1 min-w-0">
                          <SearchableSelect
                            value={form.tipo_dispositivo ? String(form.tipo_dispositivo) : ''}
                            onChange={(val) => setForm((p) => ({ ...p, tipo_dispositivo: val }))}
                            options={tiposDispositivo.map(t => ({ value: String(t.tipo_disp), label: t.nombre_tipo }))}
                            placeholder="Seleccionar tipo de dispositivo..."
                          />
                        </div>
                        <button type="button" onClick={() => setIsAddingTipo(true)} title="Añadir nuevo tipo de dispositivo"
                          className="px-3 py-2 border border-slate-300 dark:border-slate-600/50 text-gray-500 dark:text-gray-400 flex items-center justify-center rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <Plus size={15} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Usuario que Reporta</label>
                    <UserSearchDropdown 
                      usuarios={usuarios}
                      value={form.usuario_reporta}
                      onChange={val => setForm(p => ({ ...p, usuario_reporta: val }))}
                    />
                  </div>

                  {(form.estatus === 'Listo para recoger' || form.estatus === 'Resuelto / Entregado') && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Serie de Pieza Nueva / Repuesto</label>
                      <input 
                        type="text"
                        value={form.serie_pieza_nueva}
                        onChange={e => setForm(p => ({ ...p, serie_pieza_nueva: e.target.value }))}
                        placeholder="Ej. S/N de pieza o componente reemplazado"
                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600/50 rounded-lg focus:ring-2 focus:ring-[#006341] focus:border-[#006341] outline-none transition-all font-mono text-sm"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Fecha de Atención</label>
                    <input 
                      type="date"
                      value={form.fecha_atencion}
                      onChange={e => setForm(p => ({ ...p, fecha_atencion: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600/50 rounded-lg focus:ring-2 focus:ring-[#006341] focus:border-[#006341] outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Descripción <span className="text-red-500">*</span></label>
                  <textarea 
                    value={form.descripcion_falla}
                    onChange={e => setForm(p => ({ ...p, descripcion_falla: e.target.value }))}
                    placeholder="Detalles sobre el problema, envío, revisión, etc..."
                    rows={4}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600/50 rounded-lg focus:ring-2 focus:ring-[#006341] focus:border-[#006341] outline-none transition-all resize-none"
                  />
                </div>
                {['Resuelto / Entregado', 'Listo para recoger'].includes(form.estatus) && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Resolución / Diagnóstico del Proveedor</label>
                    <textarea 
                      value={form.resolucion}
                      onChange={e => setForm(p => ({ ...p, resolucion: e.target.value }))}
                      placeholder="Detalles de la reparación o solución (opcional hasta que se resuelva)..."
                      rows={3}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600/50 rounded-lg focus:ring-2 focus:ring-[#006341] focus:border-[#006341] outline-none transition-all resize-none"
                    />
                  </div>
                )}
                
                {form.estatus === 'Resuelto / Entregado' && (
                  <div className="space-y-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <Info className="text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" size={18} />
                      <p className="text-xs text-emerald-800 dark:text-emerald-300">
                        Al guardar con estatus <strong>Resuelto / Entregado</strong>, se registrará automáticamente la fecha de resolución al día de hoy si no especificas una fecha diferente.
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider mb-1">
                        Fecha de Resolución (Opcional)
                      </label>
                      <input 
                        type="date"
                        value={form.fecha_resolucion}
                        onChange={e => setForm(p => ({ ...p, fecha_resolucion: e.target.value }))}
                        className="w-full sm:w-1/2 px-3 py-2 bg-white dark:bg-gray-800 text-slate-800 dark:text-slate-200 border border-emerald-300 dark:border-emerald-700/60 rounded-lg focus:ring-2 focus:ring-[#006341] focus:border-[#006341] outline-none transition-all text-sm shadow-sm"
                      />
                    </div>
                  </div>
                )}

 <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/50">
 <button type="button" onClick={resetForm} disabled={createMut.isPending || updateMut.isPending}
 className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 transition-colors">
 Cancelar
 </button>
 <button type="button" onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}
 className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-60"
 style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
 {createMut.isPending || updateMut.isPending ? 'Guardando...' : 'Guardar Nota'}
 </button>
 </div>
 </div>
 </div>
 )}
 </div>

 {/* Modal Eliminación */}
 {reporteToDelete && ReactDOM.createPortal(
 <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 ">
 <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-sm w-full">
 <div className="flex justify-center mb-4">
 <div className="bg-red-100 dark:bg-red-900/20 p-3 rounded-full">
 <AlertCircle size={32} className="text-red-600 dark:text-red-400" />
 </div>
 </div>
 <h4 className="text-center font-bold text-lg text-slate-800 dark:text-slate-200 mb-2">¿Eliminar nota?</h4>
 <p className="text-center text-sm text-slate-500 mb-6">
 Esta acción no se puede deshacer y el historial de este evento se perderá.
 </p>
 <div className="flex gap-3">
 <button type="button" onClick={() => setReporteToDelete(null)} disabled={deleteMut.isPending}
 className="flex-1 py-2 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold rounded-lg transition-colors">
 Cancelar
 </button>
 <button type="button" onClick={() => deleteMut.mutate({ id_reporte_garantia: reporteToDelete.id_reporte_garantia })} disabled={deleteMut.isPending}
 className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-sm transition-colors">
 {deleteMut.isPending ? 'Borrando...' : 'Sí, eliminar'}
 </button>
 </div>
 </div>
 </div>,
 document.body
 )}
 </div>
 );
}
