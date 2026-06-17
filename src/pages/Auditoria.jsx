import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { GET_BITACORA } from '../api/bitacora.queries';
import { ShieldCheck, Edit, Trash2, FilePlus, Eye, ChevronLeft, ChevronRight, Activity, X, Braces, Filter } from 'lucide-react';
import { formatDateTime } from '../lib/utils';
import { gql } from 'graphql-request';
import MultiSelect from '../components/MultiSelect';
import DetalleBienVisualModal from '../components/DetalleBienVisualModal';
import DetalleIncidenciaWrapperModal from '../components/DetalleIncidenciaWrapperModal';

const GET_BITACORA_LOOKUPS = gql`
  query GetBitacoraLookups {
    usuarios(estatus: true, pagination: { first: 20000 }) { edges { node { id_usuario nombre_completo } } }
    catCategoriasActivo { id_categoria nombre_categoria }
    catUnidadesMedida { id_unidad_medida nombre_unidad }
    proveedores { id_proveedor nombre_proveedor }
    catSegmentos { id_segmento nombre no_ref }
    catUnidades { clave descripcion desc_corta }
    catModelos { clave_modelo descrip_disp }
  }
`;

const ACTION_CONFIG = {
  CREACION: { icon: FilePlus, bg: '#dcfce7', color: '#16a34a', label: 'Creación' },
  EDICION: { icon: Edit, bg: '#fff7ed', color: '#ea580c', label: 'Edición' },
  ELIMINACION: { icon: Trash2, bg: '#fee2e2', color: '#dc2626', label: 'Eliminación' },
  LECTURA: { icon: Eye, bg: '#f3f4f6', color: '#6b7280', label: 'Lectura' },
  LOGIN: { icon: ShieldCheck, bg: '#e0f2fe', color: '#0369a1', label: 'Inicio de Sesión' },
};

function parseDetalles(jsonStr) {
  if (!jsonStr) return null;
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    // Si no es JSON, devolvemos un objeto con el texto original para que el visor lo muestre
    return { mensaje: jsonStr };
  }
}

function DetalleJSONModal({ isOpen, onClose, log, catalogs, onVerBien, onVerIncidencia }) {
  const isValidId = (val) => val && val !== 'N/A' && String(val).trim() !== '';

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  if (!isOpen || !log) return null;
  const parsed = parseDetalles(log.detalles_movimiento);
  const isEdicion = log.accion === 'EDICION' && parsed?.estadoAnterior && parsed?.estadoNuevo;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Braces size={20} className="text-indigo-500" />
            Inspeccionar Detalles
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto bg-gray-50/30 flex-1">
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-sm flex-1 min-w-[200px]">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Módulo Afectado</p>
              <p className="text-sm font-bold text-gray-800">
                {log.tabla_afectada}{' '}
                {isValidId(log.registro_afectado) && (log.tabla_afectada === 'Bienes' || log.tabla_afectada === 'Especificaciones_TI') ? (
                  <span 
                    className="text-indigo-500 hover:text-indigo-700 ml-1 cursor-pointer underline decoration-indigo-300 decoration-2 underline-offset-2" 
                    onClick={() => onVerBien(log.registro_afectado)}
                    title="Ver Ficha Técnica"
                  >
                    #{log.registro_afectado}
                  </span>
                ) : isValidId(log.registro_afectado) && log.tabla_afectada === 'Incidencias' ? (
                  <span 
                    className="text-indigo-500 hover:text-indigo-700 ml-1 cursor-pointer underline decoration-indigo-300 decoration-2 underline-offset-2" 
                    onClick={() => onVerIncidencia(log.registro_afectado)}
                    title="Ver Detalles de Incidencia"
                  >
                    #{log.registro_afectado}
                  </span>
                ) : (
                  <span className="text-gray-400 ml-1">#{log.registro_afectado || 'N/A'}</span>
                )}
              </p>
            </div>
            <div className="bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-sm flex-1 min-w-[200px]">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Acción Realizada</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ACTION_CONFIG[log.accion]?.color || '#9ca3af' }} />
                <p className="text-sm font-bold text-gray-800 uppercase tracking-tight">{ACTION_CONFIG[log.accion]?.label || log.accion}</p>
              </div>
            </div>
          </div>

          {isEdicion ? (
            <div className="space-y-4">
              <h4 className="text-xs font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                Comparativa de Cambios
              </h4>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-xs font-black text-gray-600 uppercase tracking-wider w-1/3">Propiedad</th>
                      <th className="px-4 py-3 text-xs font-black text-red-600 uppercase tracking-wider w-1/3 border-l border-gray-200">Valor Anterior</th>
                      <th className="px-4 py-3 text-xs font-black text-green-600 uppercase tracking-wider w-1/3 border-l border-gray-200">Valor Nuevo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parsed.columnasModificadas?.map(col => {
                      const vAnterior = parsed.estadoAnterior[col];
                      const vNuevo = parsed.estadoNuevo[col];
                      
                      // Mapeo de nombres de columnas a etiquetas amigables
                      const COLUMN_LABELS = {
                        id_usuario: 'Usuario (ID)',
                        id_rol: 'Rol del Sistema',
                        id_unidad: 'Unidad Operativa (ID)',
                        id_inmueble: 'Unidad Física (ID)',
                        clave_unidad_ref: 'Unidad de Ref. (Clave)',
                        clave_inmueble_ref: 'Inmueble de Ref. (Clave)',
                        id_segmento: 'Segmento de Red (ID)',
                        clave_modelo: 'Modelo de Activo (Clave)',
                        id_proveedor: 'Proveedor (ID)',
                        id_categoria: 'Categoría (ID)',
                        id_unidad_medida: 'Unidad de Medida (ID)',
                        id_bien: 'ID de Activo',
                        num_serie: 'Número de Serie',
                        num_inv: 'Número de Inventario',
                        estatus: 'Estado (Activo/Inactivo)',
                        matricula: 'Matrícula',
                        nombre_completo: 'Nombre Completo',
                        correo: 'Correo Electrónico',
                        telefono: 'Teléfono',
                        descripcion: 'Descripción',
                        observaciones: 'Observaciones',
                        cantidad: 'Cantidad / Stock',
                        precio: 'Precio / Costo',
                        fecha_actualizacion: 'Última Actualización',
                        fecha_adquisicion: 'Fecha de Adquisición',
                        fecha_movimiento: 'Fecha del Movimiento',
                      };

                      const formatVal = (field, val) => {
                        if (val === null || val === undefined) return 'N/A';
                        if (typeof val === 'boolean') return val ? 'Sí' : 'No';
                        if (field === 'estatus') return val === 1 ? 'ACTIVO' : 'INACTIVO';
                        
                        // Formateo de fechas si parece una fecha ISO o el nombre del campo lo sugiere
                        if (field.startsWith('fecha_') || (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}T/))) {
                          return formatDateTime(val);
                        }

                        if (field === 'id_rol') {
                          if (val === 1) return 'MAESTRO (1)';
                          if (val === 2) return 'ADMINISTRADOR (2)';
                          if (val === 3) return 'USUARIO (3)';
                        }

                        // Mapeo dinámico usando catálogos
                        if (catalogs) {
                          const valStr = String(val);
                          
                          if (field === 'id_usuario' || field === 'id_usuario_resguardo') {
                            const u = catalogs.usuarios?.edges?.find(e => String(e.node.id_usuario) === valStr)?.node;
                            if (u) return <span className="text-indigo-600 font-bold">{u.nombre_completo} <span className="text-gray-400 font-normal text-[9px]">({val})</span></span>;
                          }
                          if (field === 'id_unidad') {
                            const u = catalogs.catUnidades?.find(u => String(u.clave) === valStr) || catalogs.unidades?.find(u => String(u.id_unidad) === valStr);
                            if (u) return <span className="text-indigo-600 font-bold">{u.descripcion || u.nombre} <span className="text-gray-400 font-normal text-[9px]">({val})</span></span>;
                          }
                          if (field === 'id_inmueble' || field === 'clave_inmueble_ref' || field === 'clave_unidad_ref') {
                            const i = catalogs.catUnidades?.find(u => String(u.clave) === valStr) || catalogs.inmuebles?.find(i => String(i.clave) === valStr);
                            if (i) return <span className="text-indigo-600 font-bold">{i.descripcion} <span className="text-gray-400 font-normal text-[9px]">({val})</span></span>;
                          }
                          if (field === 'id_segmento') {
                            const s = catalogs.catSegmentos?.find(s => String(s.id_segmento) === valStr);
                            if (s) return <span className="text-indigo-600 font-bold">{s.nombre || s.no_ref} <span className="text-gray-400 font-normal text-[9px]">({val})</span></span>;
                          }
                          if (field === 'clave_modelo') {
                            const m = catalogs.catModelos?.find(m => String(m.clave_modelo) === valStr);
                            if (m) return <span className="text-indigo-600 font-bold">{m.descrip_disp} <span className="text-gray-400 font-normal text-[9px]">({val})</span></span>;
                          }
                          if (field === 'id_categoria') {
                            const c = catalogs.catCategoriasActivo?.find(c => String(c.id_categoria) === valStr);
                            if (c) return <span className="text-indigo-600 font-bold">{c.nombre_categoria} <span className="text-gray-400 font-normal text-[9px]">({val})</span></span>;
                          }
                          if (field === 'id_unidad_medida') {
                            const m = catalogs.catUnidadesMedida?.find(m => String(m.id_unidad_medida) === valStr);
                            if (m) return <span className="text-indigo-600 font-bold">{m.nombre_unidad} <span className="text-gray-400 font-normal text-[9px]">({val})</span></span>;
                          }
                          if (field === 'id_proveedor') {
                            const p = catalogs.proveedores?.find(p => String(p.id_proveedor) === valStr);
                            if (p) return <span className="text-indigo-600 font-bold">{p.nombre_proveedor} <span className="text-gray-400 font-normal text-[9px]">({val})</span></span>;
                          }
                        }

                        return String(val);
                      };

                      return (
                        <tr key={col} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-gray-700 bg-gray-50/30 border-r border-gray-100">
                            <p className="text-[11px] uppercase tracking-tight">{COLUMN_LABELS[col] || col.replace(/_/g, ' ')}</p>
                            <p className="text-[9px] font-mono text-gray-400 mt-0.5">{col}</p>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-red-700 bg-red-50/10 break-words border-r border-gray-100">
                            {formatVal(col, vAnterior)}
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-green-700 bg-green-50/10 break-words">
                            {formatVal(col, vNuevo)}
                          </td>
                        </tr>
                      );
                    })}
                    {(!parsed.columnasModificadas || parsed.columnasModificadas.length === 0) && (
                      <tr>
                        <td colSpan="3" className="px-4 py-5 text-center text-xs text-gray-400 italic">La entidad se procesó sin modificaciones estructurales en columnas auditadas.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : log.accion === 'LOGIN' ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-5 border border-green-100 shadow-sm">
                <ShieldCheck size={40} className="text-green-600" />
              </div>
              <h4 className="text-xl font-bold text-gray-900">Inicio de Sesión Exitoso</h4>
              <p className="text-sm text-gray-500 mt-2 max-w-sm leading-relaxed">
                El usuario ha autenticado correctamente su identidad y ha accedido al sistema de gestión de activos.
              </p>
              {parsed?.info && (
                <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl max-w-md w-full text-left">
                  <p className="text-xs font-bold text-indigo-800 uppercase tracking-wider mb-1 flex items-center gap-1"><Activity size={12}/> Información Adicional</p>
                  <p className="text-sm text-indigo-600 font-medium">{parsed.info}</p>
                </div>
              )}
              <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <Activity size={14} /> Actividad Registrada
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">
                Estado del Registro ({ACTION_CONFIG[log.accion]?.label || 'Operación'})
              </h4>
              <div className="bg-[#1e1e2e] rounded-xl p-5 shadow-inner overflow-x-auto border border-gray-800">
                <pre className="text-[11px] font-mono text-[#a6accd] leading-relaxed">
                  {JSON.stringify(parsed, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



export default function Auditoria() {
  const [modalLog, setModalLog] = useState(null);
  const [visualModalBienId, setVisualModalBienId] = useState(null);
  const [visualModalIncidenciaId, setVisualModalIncidenciaId] = useState(null);
  
  const isValidId = (val) => val && val !== 'N/A' && String(val).trim() !== '';

  const [currentPage, setCurrentPage] = useState(1);
  const setCursor = () => {};
  const setCursors = () => setCurrentPage(1);
  const cursor = null;
  const cursors = { length: currentPage - 1 };
  const [pageInput, setPageInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterAccion, setFilterAccion] = useState([]);
  const [filterModulo, setFilterModulo] = useState([]);
  const [filterOrigen, setFilterOrigen] = useState('');
  const [filterUsuario, setFilterUsuario] = useState([]);
  const [filterFechaDesde, setFilterFechaDesde] = useState('');
  const [filterFechaHasta, setFilterFechaHasta] = useState('');


  const PAGE_SIZE = 10;

  // Cargar catálogos completos para mapear IDs a nombres en la bitácora
  const { data: catalogs } = useQuery({
    queryKey: ['bitacora-lookups'],
    queryFn: () => gqlClient.request(GET_BITACORA_LOOKUPS),
    staleTime: 10 * 60 * 1000, // 10 minutos
  });

  const { data: bitacoraData, isLoading, isError } = useQuery({
    queryKey: ['bitacora', filterAccion, filterModulo, filterOrigen, filterUsuario, filterFechaDesde, filterFechaHasta, currentPage],
    queryFn: () => gqlClient.request(GET_BITACORA, {
      accion: filterAccion.length > 0 ? filterAccion : undefined,
      tabla_afectada: filterModulo.length > 0 ? filterModulo : undefined,
      origen: filterOrigen || undefined,
      id_usuario: filterUsuario.length > 0 ? filterUsuario.map(Number) : undefined,
      fechaDesde: filterFechaDesde ? new Date(filterFechaDesde).toISOString() : undefined,
      fechaHasta: filterFechaHasta ? new Date(new Date(filterFechaHasta).setHours(23, 59, 59, 999)).toISOString() : undefined,
      first: PAGE_SIZE,
      page: currentPage,
    }),
    select: d => d.bitacora,
    refetchInterval: 10000, // Auto-refrescar cada 10 segundos
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  const logs = bitacoraData?.edges?.map(e => e.node) ?? [];
  const pageInfo = bitacoraData?.pageInfo;
  const totalCount = pageInfo?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  const handleNextPage = () => { if (currentPage < (typeof totalPages !== 'undefined' ? totalPages : 9999)) setCurrentPage(p => p + 1); };

  const handlePrevPage = () => { setCurrentPage(p => Math.max(1, p - 1)); };

  const handleJumpToPage = (e) => { e.preventDefault(); const p = parseInt(pageInput); if (!isNaN(p) && p >= 1 && p <= (typeof totalPages !== 'undefined' ? totalPages : 9999)) { setCurrentPage(p); } setPageInput(''); };

  return (
    <div className="flex flex-col h-[calc(100dvh-70px)] sm:h-[calc(100vh-70px)] overflow-hidden p-4 sm:p-6 gap-5 fade-in">
      <style>{`
        @keyframes slideDownFade {
          0% { opacity: 0; transform: translateY(-15px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down { animation: slideDownFade 0.5s ease-out forwards; }
      `}</style>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Bitácora de Auditoría</h1>
          <p className="text-sm text-gray-500 mt-1">Registro global de movimientos del sistema — Solo lectura</p>
        </div>
        <div className="flex items-center gap-2">

          <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-200 bg-amber-50">
            <ShieldCheck size={16} style={{ color: '#ca8a04' }} />
            <span className="text-xs font-semibold text-amber-700">Modo Supervisión</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0 gap-4">
        {/* Panel principal de filtros estilo Unidades */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex-shrink-0">
          <div className="p-4 border-b border-gray-50 bg-gray-50/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 px-3.5 py-2 bg-indigo-50/50 rounded-xl text-xs sm:text-sm border border-indigo-100/50 font-bold text-indigo-700 shadow-sm w-fit">
                <Activity size={16} className="text-indigo-500" />
                <span className="whitespace-nowrap">Eventos Totales: <span className="text-gray-900 ml-0.5">{totalCount}</span></span>
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border transition-all ${
                  showFilters || filterAccion.length > 0 || filterModulo.length > 0 || filterOrigen || filterUsuario.length > 0 || filterFechaDesde || filterFechaHasta
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Filter size={16} />
                <span>Filtros avanzados {
                  (filterAccion.length > 0 || filterModulo.length > 0 || filterOrigen || filterUsuario.length > 0 || filterFechaDesde || filterFechaHasta)
                    ? '(Activos)' : ''
                }</span>
              </button>
            </div>

            {showFilters && (
              <div className="mt-4 p-5 bg-gray-50/50 border border-gray-200/80 rounded-2xl shadow-inner animate-in fade-in slide-in-from-top-1 duration-250">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Grupo 1: Operación */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-indigo-100 pb-1">
                      Detalles de la Operación
                    </h3>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Acción Realizada</label>
                      <MultiSelect
                        selectedValues={filterAccion}
                        onChange={(val) => { setFilterAccion(val); setCursor(null); setCursors([]); }}
                        options={[
                          { value: 'CREACION', label: 'Creación' },
                          { value: 'EDICION', label: 'Edición' },
                          { value: 'ELIMINACION', label: 'Eliminación' },
                          { value: 'LOGIN', label: 'Inicio de Sesión' },
                        ]}
                        placeholder="Todas las acciones"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Módulo Afectado</label>
                      <MultiSelect
                        selectedValues={filterModulo}
                        onChange={(val) => { setFilterModulo(val); setCursor(null); setCursors([]); }}
                        options={[
                          { value: 'Bienes', label: 'Bienes / Activos' },
                          { value: 'Especificaciones_TI', label: 'Especificaciones TI' },
                          { value: 'solicitudes_cambio', label: 'Aprobaciones de Cambio' },
                          { value: 'Movimientos_Inventario', label: 'Movimientos de Inventario' },
                          { value: 'Incidencias', label: 'Incidencias' },
                          { value: 'Notas', label: 'Notas' },
                          { value: 'Garantias', label: 'Garantías' },
                          { value: 'Usuarios', label: 'Usuarios' },
                          { value: 'Unidad_A_Cargo', label: 'Unidades Organizacionales' },
                          { value: 'unidades', label: 'Inmuebles / U. Físicas' },
                          { value: 'Proveedores', label: 'Proveedores' },
                          { value: 'marcas', label: 'Marcas' },
                          { value: 'Cat_Modelos', label: 'Modelos' },
                          { value: 'Cat_CategoriasActivo', label: 'Categorías de Activo' },
                          { value: 'Cat_UnidadesMedida', label: 'Unidades de Medida' },
                          { value: 'tipo_dispositivos', label: 'Tipos de Dispositivo' },
                        ]}
                        placeholder="Todos los módulos"
                      />
                    </div>
                  </div>

                  {/* Grupo 2: Autor y Origen */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-indigo-100 pb-1">
                      Autoría y Procedencia
                    </h3>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Usuario</label>
                      <MultiSelect
                        selectedValues={filterUsuario}
                        onChange={(val) => { setFilterUsuario(val); setCursor(null); setCursors([]); }}
                        options={catalogs?.usuarios?.edges?.map(u => ({
                          value: String(u.node.id_usuario),
                          label: u.node.nombre_completo
                        })) || []}
                        placeholder="Todos los usuarios"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Plataforma de Origen</label>
                      <select 
                        value={filterOrigen} 
                        onChange={e => { setFilterOrigen(e.target.value); setCursor(null); setCursors([]); }}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      >
                        <option value="">Cualquier origen</option>
                        <option value="web">Web (Navegador)</option>
                        <option value="win">Windows (Escritorio)</option>
                      </select>
                    </div>
                  </div>

                  {/* Grupo 3: Fechas */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-indigo-100 pb-1">
                      Rango de Fechas
                    </h3>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Desde</label>
                      <input 
                        type="date"
                        value={filterFechaDesde} 
                        onChange={e => { setFilterFechaDesde(e.target.value); setCursor(null); setCursors([]); }}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-0.5">Hasta</label>
                      <input 
                        type="date"
                        value={filterFechaHasta} 
                        onChange={e => { setFilterFechaHasta(e.target.value); setCursor(null); setCursors([]); }}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Botón de limpiar filtros en la parte inferior */}
                <div className="mt-4 pt-3 border-t border-gray-200/80 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400 font-medium">
                    Filtros activos actualmente
                  </span>
                  <button
                    onClick={() => {
                      setFilterAccion([]);
                      setFilterModulo([]);
                      setFilterOrigen('');
                      setFilterUsuario([]);
                      setFilterFechaDesde('');
                      setFilterFechaHasta('');
                      setCursor(null);
                      setCursors([]);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                  >
                    <X size={14} className="text-gray-400" />
                    Limpiar Filtros
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabla desktop */}
        <div className="hidden md:block flex-1 min-h-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-auto">
          {isLoading ? (
             <div className="py-16 text-center text-sm text-gray-400">Cargando bitácora...</div>
          ) : isError ? (
             <div className="py-16 text-center text-sm text-red-400">Error al cargar la auditoría</div>
          ) : logs.length === 0 ? (
             <div className="py-16 text-center text-sm text-gray-400">No hay registros aún</div>
          ) : (
            <table className="w-full text-sm text-left table-fixed">
              <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[15%]">Fecha / Hora</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[25%]">Usuario</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[10%]">Origen</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[18%]">Acción</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[18%]">Módulo Afectado</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center w-[14%]">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map(log => {
                  const conf = ACTION_CONFIG[log.accion] || ACTION_CONFIG.LECTURA;
                  const Icon = conf.icon;
                  return (
                    <tr key={log.id_bitacora} className="hover:bg-gray-50/80 transition-colors group animate-slide-down">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-[11px] font-semibold text-gray-500">{formatDateTime(log.fecha_movimiento)}</span>
                      </td>
                      <td className="px-6 py-4 truncate">
                        <p className="font-bold text-gray-800 truncate" title={log.usuario.nombre_completo}>{log.usuario.nombre_completo}</p>
                        <p className="text-gray-400 font-mono text-[10px] mt-0.5">{log.usuario.matricula}</p>
                      </td>
                      <td className="px-6 py-4">
                        {log.origen ? (
                          <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">{log.origen}</span>
                        ) : (
                          <span className="text-[10px] font-black uppercase text-gray-400 italic">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm" style={{ backgroundColor: conf.bg }}>
                            <Icon size={14} style={{ color: conf.color }} />
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-wider break-words" style={{ color: conf.color }}>{conf.label}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold text-[11px] text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200 uppercase tracking-wide flex-shrink-0">
                            {log.tabla_afectada}
                          </span>
                          {isValidId(log.registro_afectado) && (log.tabla_afectada === 'Bienes' || log.tabla_afectada === 'Especificaciones_TI') ? (
                            <span 
                              className="text-[11px] font-mono font-bold text-indigo-500 hover:text-indigo-700 truncate cursor-pointer underline decoration-indigo-300 decoration-2 underline-offset-2" 
                              title="Ver Ficha Técnica"
                              onClick={() => setVisualModalBienId(log.registro_afectado)}
                            >
                              #{log.registro_afectado}
                            </span>
                          ) : isValidId(log.registro_afectado) && log.tabla_afectada === 'Incidencias' ? (
                            <span 
                              className="text-[11px] font-mono font-bold text-indigo-500 hover:text-indigo-700 truncate cursor-pointer underline decoration-indigo-300 decoration-2 underline-offset-2" 
                              title="Ver Detalles de Incidencia"
                              onClick={() => setVisualModalIncidenciaId(log.registro_afectado)}
                            >
                              #{log.registro_afectado}
                            </span>
                          ) : isValidId(log.registro_afectado) && (
                            <span 
                              className="text-[11px] font-mono font-bold text-gray-400 truncate" 
                              title={log.registro_afectado}
                            >
                              #{log.registro_afectado}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        {log.detalles_movimiento && log.detalles_movimiento !== 'null' ? (
                          <button
                            onClick={() => setModalLog(log)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-600 text-[11px] uppercase tracking-wide font-black hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm active:scale-95"
                          >
                            <Braces size={14} /> Inspeccionar
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold uppercase text-gray-400 italic">N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Móvil View */}
        <div className="md:hidden flex-1 min-h-0 overflow-y-auto space-y-3 pb-2">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-gray-400">Cargando...</div>
          ) : logs.map(log => {
            const conf = ACTION_CONFIG[log.accion] || ACTION_CONFIG.LECTURA;
            const Icon = conf.icon;
            return (
              <div key={log.id_bitacora} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 relative overflow-hidden animate-slide-down">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ backgroundColor: conf.bg }}>
                    <Icon size={18} style={{ color: conf.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold truncate" style={{ color: conf.color }}>{conf.label}</p>
                        {log.origen && <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-sm border border-indigo-100">{log.origen}</span>}
                      </div>
                      <span className="text-[10px] font-mono text-gray-400">{formatDateTime(log.fecha_movimiento)}</span>
                    </div>
                    <p className="text-xs text-gray-600 font-semibold mt-0.5 truncate">
                      Módulo: {log.tabla_afectada} {isValidId(log.registro_afectado) && (log.tabla_afectada === 'Bienes' || log.tabla_afectada === 'Especificaciones_TI') ? (
                        <span 
                          className="font-mono text-indigo-500 hover:text-indigo-700 truncate cursor-pointer underline decoration-indigo-300 decoration-2 underline-offset-2" 
                          onClick={() => setVisualModalBienId(log.registro_afectado)}
                          title="Ver Ficha Técnica"
                        >
                          #{log.registro_afectado}
                        </span>
                      ) : isValidId(log.registro_afectado) && log.tabla_afectada === 'Incidencias' ? (
                        <span 
                          className="font-mono text-indigo-500 hover:text-indigo-700 truncate cursor-pointer underline decoration-indigo-300 decoration-2 underline-offset-2" 
                          onClick={() => setVisualModalIncidenciaId(log.registro_afectado)}
                          title="Ver Detalles de Incidencia"
                        >
                          #{log.registro_afectado}
                        </span>
                      ) : isValidId(log.registro_afectado) ? (
                        <span 
                          className="font-mono text-gray-400 truncate" 
                          title={log.registro_afectado}
                        >
                          #{log.registro_afectado}
                        </span>
                      ) : ''}
                    </p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-xs text-gray-600"><span className="text-gray-400 font-medium">Por:</span> <span className="font-semibold text-gray-800">{log.usuario.nombre_completo}</span></p>
                  {log.detalles_movimiento && log.detalles_movimiento !== 'null' && (
                    <button
                      onClick={() => setModalLog(log)}
                      className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"
                    >
                      <Braces size={14} /> Inspeccionar Cambios
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── Paginación ─────────────────────────────────────────── */}
        <div className="p-3 border-t border-gray-100 flex flex-col gap-2 bg-gray-50 flex-shrink-0 rounded-b-2xl">
          {/* Info total */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-700">
              Total: {totalCount} eventos registrados.
            </span>
            <span className="font-bold text-gray-400 uppercase tracking-wider">
              Pág. {currentPage}/{totalPages}
            </span>
          </div>

          {/* Botones de paginación */}
          <div className="flex items-center gap-2 justify-center flex-wrap">
            <button
              onClick={handlePrevPage}
              disabled={cursors.length === 0}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors flex-shrink-0"
              title="Página anterior"
            >
              <ChevronLeft size={15} />
            </button>

            <div className="flex items-center justify-center gap-1 sm:gap-2 w-full sm:w-[260px] order-last sm:order-none mt-2 sm:mt-0">
              {/* Páginas: anterior, actual, siguiente */}
              {currentPage > 2 && (
                <button
                  onClick={() => setCurrentPage(1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 flex-shrink-0"
                >
                  1
                </button>
              )}
              {currentPage > 3 && (
                <span className="px-1 text-gray-400 text-xs">...</span>
              )}
              {currentPage > 1 && (
                <button
                  onClick={handlePrevPage}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 flex-shrink-0"
                >
                  {currentPage - 1}
                </button>
              )}
              <button
                className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-[#006341] text-white shadow-sm flex-shrink-0"
              >
                {currentPage}
              </button>
              {currentPage < (typeof totalPages !== undefined ? totalPages : 9999) && (
                <button
                  onClick={handleNextPage}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 flex-shrink-0"
                >
                  {currentPage + 1}
                </button>
              )}
              {currentPage < totalPages - 2 && (
                <span className="px-1 text-gray-400 text-xs">...</span>
              )}
              {currentPage < totalPages - 1 && totalPages > 1 && (
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 flex-shrink-0"
                >
                  {totalPages}
                </button>
              )}
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage >= (typeof totalPages !== 'undefined' ? totalPages : 1)}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors flex-shrink-0"
              title="Página siguiente"
            >
              <ChevronRight size={15} />
            </button>

            {/* Ir a página — solo páginas ya visitadas (1..currentPage) */}
            <form onSubmit={handleJumpToPage} className="flex items-center gap-1 ml-1 border-l border-gray-200 pl-2">
              <input
                type="number"
                min="1"
                max={totalPages || 1}
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                placeholder="Ir a..."
                title={`Ingresa un número de página válido`}
                className="w-14 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#006341] focus:ring-1 focus:ring-[#006341] bg-white text-center"
              />
              <button
                type="submit"
                disabled={!pageInput}
                className="px-2 py-1.5 bg-[#006341]/10 text-[#006341] font-semibold text-xs rounded-lg hover:bg-[#006341]/20 disabled:opacity-50 transition-colors"
              >
                Ir
              </button>
            </form>
          </div>
        </div>
      </div>

      <DetalleJSONModal 
        isOpen={!!modalLog} 
        onClose={() => setModalLog(null)} 
        log={modalLog} 
        catalogs={catalogs} 
        onVerBien={setVisualModalBienId} 
        onVerIncidencia={setVisualModalIncidenciaId} 
      />
      
      {visualModalBienId && (
        <DetalleBienVisualModal 
          id_bien={visualModalBienId} 
          onClose={() => setVisualModalBienId(null)} 
        />
      )}

      {visualModalIncidenciaId && (
        <DetalleIncidenciaWrapperModal 
          id_incidencia={visualModalIncidenciaId} 
          onClose={() => setVisualModalIncidenciaId(null)} 
        />
      )}
    </div>
  );
}
