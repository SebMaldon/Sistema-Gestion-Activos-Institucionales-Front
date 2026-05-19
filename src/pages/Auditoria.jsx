import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { GET_BITACORA } from '../api/bitacora.queries';
import { ShieldCheck, Edit, Trash2, FilePlus, Eye, ChevronLeft, ChevronRight, Activity, X, Braces, Search, Filter } from 'lucide-react';
import { formatDateTime } from '../lib/utils';
import { gql } from 'graphql-request';

const GET_BITACORA_LOOKUPS = gql`
  query GetBitacoraLookups {
    unidades: catUnidades { id_unidad nombre }
    inmuebles: catLegacyInmuebles { clave descripcion }
    usuarios(estatus: true) { edges { node { id_usuario nombre_completo } } }
    catCategoriasActivo { id_categoria nombre_categoria }
    catUnidadesMedida { id_unidad_medida nombre_unidad }
    proveedores { id_proveedor nombre_proveedor }
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

function DetalleJSONModal({ isOpen, onClose, log, catalogs }) {
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
              <p className="text-sm font-bold text-gray-800">{log.tabla_afectada} <span className="text-gray-400 ml-1">#{log.registro_afectado || 'N/A'}</span></p>
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
                            const u = catalogs.unidades?.find(u => String(u.id_unidad) === valStr);
                            if (u) return <span className="text-indigo-600 font-bold">{u.nombre} <span className="text-gray-400 font-normal text-[9px]">({val})</span></span>;
                          }
                          if (field === 'id_inmueble' || field === 'clave_inmueble_ref' || field === 'clave_unidad_ref') {
                            const i = catalogs.inmuebles?.find(i => String(i.clave) === valStr);
                            if (i) return <span className="text-indigo-600 font-bold">{i.descripcion} <span className="text-gray-400 font-normal text-[9px]">({val})</span></span>;
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
  const [cursor, setCursor] = useState(null);
  const [cursors, setCursors] = useState([]);
  const [filterAccion, setFilterAccion] = useState('');
  const [filterModulo, setFilterModulo] = useState('');
  const [modalLog, setModalLog] = useState(null);
  const PAGE_SIZE = 10;

  // Cargar catálogos completos para mapear IDs a nombres en la bitácora
  const { data: catalogs } = useQuery({
    queryKey: ['bitacora-lookups'],
    queryFn: () => gqlClient.request(GET_BITACORA_LOOKUPS),
    staleTime: 10 * 60 * 1000, // 10 minutos
  });

  const { data: bitacoraData, isLoading, isError } = useQuery({
    queryKey: ['bitacora', filterAccion, filterModulo, cursor],
    queryFn: () => gqlClient.request(GET_BITACORA, {
      accion: filterAccion || undefined,
      tabla_afectada: filterModulo || undefined,
      first: PAGE_SIZE,
      after: cursor ?? undefined,
    }),
    select: d => d.bitacora,
    refetchInterval: 15000, // Auto-refrescar cada 15 segundos
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  const logs = bitacoraData?.edges?.map(e => e.node) ?? [];
  const pageInfo = bitacoraData?.pageInfo;
  const totalCount = pageInfo?.totalCount ?? 0;

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

  return (
    <div className="flex flex-col h-[calc(100dvh-70px)] sm:h-[calc(100vh-70px)] overflow-hidden p-4 sm:p-6 gap-5 fade-in">
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
        {/* Filtros rápidos - Responsive Optimized */}
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col lg:flex-row lg:items-center gap-3 sm:gap-4">
          
          {/* Badge de contador (compacto en móvil) */}
          <div className="flex items-center justify-between lg:justify-start gap-3">
            <div className="flex items-center gap-2.5 px-3.5 py-2 bg-indigo-50/50 rounded-xl text-xs sm:text-sm border border-indigo-100/50 font-bold text-indigo-700 shadow-sm">
              <Activity size={16} className="text-indigo-500" />
              <span className="whitespace-nowrap">Eventos: <span className="text-gray-900 ml-0.5">{totalCount}</span></span>
            </div>
            
            {/* Divisor solo en mobile para separar del resto si fuera necesario, o indicador visual */}
            <div className="h-8 w-px bg-gray-100 lg:hidden"></div>
            
            <p className="text-[10px] sm:text-xs text-gray-400 font-medium lg:hidden italic">Filtros de búsqueda</p>
          </div>

          <div className="hidden lg:block h-8 w-px bg-gray-200 mx-1"></div>

          {/* Contenedor de Selects: 2 columnas en móvil, flex en desktop */}
          <div className="grid grid-cols-2 lg:flex lg:flex-1 gap-2.5 sm:gap-3">
            <div className="relative group flex-1 min-w-0">
              <Filter size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
              <select 
                value={filterAccion} 
                onChange={e => { setFilterAccion(e.target.value); setCursor(null); setCursors([]); }}
                className="w-full pl-10 pr-8 py-2.5 text-[11px] sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white cursor-pointer appearance-none font-bold text-gray-700 transition-all hover:bg-gray-50/50"
              >
                <option value="">Acciones</option>
                <option value="CREACION">Creaciones</option>
                <option value="EDICION">Ediciones</option>
                <option value="ELIMINACION">Eliminaciones</option>
                <option value="LOGIN">Sesiones</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronRight size={14} className="text-gray-300 rotate-90" />
              </div>
            </div>

            <div className="relative group flex-1 min-w-0">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
              <select 
                value={filterModulo} 
                onChange={e => { setFilterModulo(e.target.value); setCursor(null); setCursors([]); }}
                className="w-full pl-10 pr-8 py-2.5 text-[11px] sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white cursor-pointer appearance-none font-bold text-gray-700 transition-all hover:bg-gray-50/50"
              >
                <option value="">Módulos</option>
                <option value="Incidencias">Incidencias</option>
                <option value="Notas">Notas</option>
                <option value="Bienes">Activos</option>
                <option value="Usuarios">Usuarios</option>
                <option value="Garantias">Garantías</option>
                <option value="Unidades">Unidades</option>
                <option value="Inmuebles">Unidades Físicas</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronRight size={14} className="text-gray-300 rotate-90" />
              </div>
            </div>
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
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[18%]">Fecha / Hora</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[32%]">Usuario</th>
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
                    <tr key={log.id_bitacora} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-[11px] font-semibold text-gray-500">{formatDateTime(log.fecha_movimiento)}</span>
                      </td>
                      <td className="px-6 py-4 truncate">
                        <p className="font-bold text-gray-800 truncate" title={log.usuario.nombre_completo}>{log.usuario.nombre_completo}</p>
                        <p className="text-gray-400 font-mono text-[10px] mt-0.5">{log.usuario.matricula}</p>
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
                          {log.registro_afectado && (
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
              <div key={log.id_bitacora} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 relative overflow-hidden">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ backgroundColor: conf.bg }}>
                    <Icon size={18} style={{ color: conf.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold truncate" style={{ color: conf.color }}>{conf.label}</p>
                      <span className="text-[10px] font-mono text-gray-400">{formatDateTime(log.fecha_movimiento)}</span>
                    </div>
                    <p className="text-xs text-gray-600 font-semibold mt-0.5 truncate">
                      Módulo: {log.tabla_afectada} {log.registro_afectado ? (
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

        {/* Paginación */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between flex-shrink-0 rounded-b-2xl">
          <div className="flex flex-col gap-0.5">
            <p className="text-xs text-gray-500 font-medium">
              Total: <span className="text-gray-900 font-bold">{totalCount}</span> eventos registrados.
            </p>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
              Página {cursors.length + 1} de {Math.ceil(totalCount / PAGE_SIZE) || 1}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={cursors.length === 0}
              className="px-4 py-1.5 text-xs font-bold bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1"
            >
              <ChevronLeft size={14} /> Anterior
            </button>
            <button
              onClick={handleNextPage}
              disabled={!pageInfo?.hasNextPage}
              className="px-4 py-1.5 text-xs font-bold bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1"
            >
              Siguiente <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <DetalleJSONModal isOpen={!!modalLog} onClose={() => setModalLog(null)} log={modalLog} catalogs={catalogs} />
    </div>
  );
}
