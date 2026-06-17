import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { GET_BIEN_DETAIL_QUERY } from '../api/inventario.queries';
import {
  Package, Search, Layers, ChevronLeft, ChevronRight,
  Monitor, Cpu, Server, HardDrive, Wifi, Tag, User, Shield, MapPin, Calendar, X
} from 'lucide-react';
import ReactDOM from 'react-dom';
import BienAtributosPanel from './BienAtributosPanel';
import { formatDate, formatDateTime } from '../lib/utils';

// --- Helpers copiados de Inventario.jsx ---
function fmt(v) { return v || '—'; }

function getDeviceMode(nombreTipo, nombreCategoria = null) {
  const n = (nombreTipo || '').toLowerCase();
  const c = (nombreCategoria || '').toLowerCase();

  if (n.includes('monitor') || c.includes('monitor')) return 'MONITOR';
  if (n.includes('laptop') || n.includes('port') || n.includes('notebook') || c.includes('laptop')) return 'LAPTOP';
  if (n.includes('pc') || n.includes('desktop') || n.includes('escritorio') || n.includes('cómputo') || n.includes('computo') || c.includes('cómputo') || c.includes('computo')) return 'PC';

  return 'OTHER';
}

function EstatusBadge({ estatus }) {
  const map = {
    'ACTIVO': { bg: '#dcfce7', color: '#15803d', label: 'Activo' },
    'INACTIVO': { bg: '#fee2e2', color: '#b91c1c', label: 'Inactivo' },
    'DAÑADO': { bg: '#fef3c7', color: '#d97706', label: 'Dañado' },
    'DEVOLUCIÓN': { bg: '#f3e8ff', color: '#7e22ce', label: 'Devolución' },
    'OTRO': { bg: '#f3f4f6', color: '#374151', label: 'Otro' },
    'P_BAJA': { bg: '#ffedd5', color: '#c2410c', label: 'Pre-Baja' },
    'PRESTAMO': { bg: '#dbeafe', color: '#1d4ed8', label: 'Préstamo' },
    'SINIESTRADO': { bg: '#fef2f2', color: '#991b1b', label: 'Siniestrado' },
    'SUSTITUIDO': { bg: '#e0e7ff', color: '#4338ca', label: 'Sustituido' },
    'TRASPASO OOAD': { bg: '#ccfbf1', color: '#0f766e', label: 'Traspaso OOAD' },
    'TRASPASO_FORANEO': { bg: '#cffafe', color: '#0369a1', label: 'Traspaso Foráneo' },
  };
  const s = map[estatus] ?? { bg: '#f3f4f6', color: '#374151', label: estatus };
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function InfoField({ label, value, icon, mono = false }) {
  return (
    <div>
      <p className="text-xs text-gray-400 flex items-center gap-1 mb-0.5">
        {icon}{label}
      </p>
      <p className={`text-sm font-semibold text-gray-800 ${mono ? 'font-mono' : ''}`}>
        {value ?? '—'}
      </p>
    </div>
  );
}

function SoftwareTable({ programas }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query) return programas;
    const lower = query.toLowerCase();
    return programas.filter(p =>
      (p.programa || '').toLowerCase().includes(lower) ||
      (p.version || '').toLowerCase().includes(lower) ||
      (p.editor || '').toLowerCase().includes(lower)
    );
  }, [programas, query]);

  return (
    <div className="space-y-4 fade-in">
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-100 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Layers size={15} className="text-gray-500" />
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Programas Instalados ({filtered.length})
            </span>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar software..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 w-48"
            />
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 sticky top-0 border-b border-gray-100 shadow-sm z-10">
              <tr>
                <th className="px-4 py-2 font-semibold text-gray-500 uppercase tracking-wide">Programa</th>
                <th className="px-4 py-2 font-semibold text-gray-500 uppercase tracking-wide">Versión</th>
                <th className="px-4 py-2 font-semibold text-gray-500 uppercase tracking-wide">Editor</th>
                <th className="px-4 py-2 font-semibold text-gray-500 uppercase tracking-wide">Fecha Inst.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">No se encontraron programas</td></tr>
              ) : filtered.map((prog, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-900 font-medium break-words max-w-[250px]">{prog.programa || '—'}</td>
                  <td className="px-4 py-2 text-gray-600 break-words">{prog.version || '—'}</td>
                  <td className="px-4 py-2 text-gray-600 break-words max-w-[150px]">{prog.editor || '—'}</td>
                  <td className="px-4 py-2 text-gray-500 break-words whitespace-nowrap">
                    {prog.fecha_instalacion ? formatDate(prog.fecha_instalacion) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Modal({ onClose, title, subtitle, children, footer, wide = false, small = false }) {
  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50 fade-in pointer-events-none" />
      <div className={`relative bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100vh-4rem)] ${small ? 'max-w-sm' : wide ? 'max-w-3xl' : 'max-w-lg'
        } fade-in`}>
        {/* Header */}
        <div className="bg-[#00472e] px-5 sm:px-6 py-4 flex items-center justify-between text-white flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold">{title}</h3>
            {subtitle && <p className="text-sm text-green-100 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors">
            <X size={20} />
          </button>
        </div>
        {/* Body scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5">
          {children}
        </div>
        {/* Footer sticky (opcional) */}
        {footer && (
          <div className="px-5 sm:px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0 mt-auto">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// --- Componente Principal ---
export default function DetalleBienVisualModal({ id_bien, onClose }) {
  const [fichaTabs, setFichaTabs] = useState('info');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['bienDetail', String(id_bien)],
    queryFn: async () => {
      const res = await gqlClient.request(GET_BIEN_DETAIL_QUERY, { id_bien });
      return res.bien;
    },
    enabled: !!id_bien,
  });

  if (isLoading) {
    return (
      <Modal onClose={onClose} title="Ficha Técnica" subtitle="Cargando información del equipo..." wide>
        <div className="flex items-center justify-center py-20 text-gray-500">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            <p>Cargando datos...</p>
          </div>
        </div>
      </Modal>
    );
  }

  if (isError || !data) {
    return (
      <Modal onClose={onClose} title="Ficha Técnica" subtitle="Error" wide>
        <div className="py-10 text-center text-red-500">
          Ocurrió un error al cargar la información del bien.
        </div>
      </Modal>
    );
  }

  const activeFicha = data;
  const fichaMode = getDeviceMode(activeFicha.modelo?.tipoDispositivo?.nombre_tipo, activeFicha.categoria?.nombre_categoria);
  const hasTecnico = activeFicha.especificacionTI || (activeFicha.cuentasPC?.length > 0) || (activeFicha.monitores?.length > 0) || activeFicha.equipoAsignado || (activeFicha.garantias?.length > 0) || fichaMode === 'OTHER' || fichaMode === 'PC' || fichaMode === 'LAPTOP';

  const equipoDesc = activeFicha.modelo?.descrip_disp || activeFicha.categoria?.nombre_categoria || 'Equipo sin descripción';

  return (
    <Modal onClose={onClose} title="Ficha Técnica" subtitle="Detalles y especificaciones del equipo (Solo Visualización)" wide>
      <div className="space-y-4 text-sm">
        {/* Encabezado del bien */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#006341,#004d32)' }}>
            <Package size={22} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-base leading-tight">{equipoDesc}</p>
            <p className="text-xs text-gray-500">{activeFicha.categoria?.nombre_categoria}</p>
          </div>
          <EstatusBadge estatus={activeFicha.estatus_operativo} />
        </div>

        {/* ── Pestañas Ficha ── */}
        <div className="flex gap-1 border-b border-gray-200">
          {[
            { key: 'info', label: 'Información' },
            ...(hasTecnico ? [{ key: 'tecnico', label: 'Técnico / Garantía' }] : []),
            ...(activeFicha.programasPC && activeFicha.programasPC.length > 0 ? [{ key: 'software', label: 'Software Instalado' }] : []),
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setFichaTabs(t.key)}
              className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border-b-2 -mb-px ${fichaTabs === t.key
                ? 'border-green-600 text-green-700 bg-green-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Información ── */}
        {fichaTabs === 'info' && (
          <div className="space-y-4 fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoField icon={<Tag size={14} />} label="No. Serie" value={fmt(activeFicha.num_serie)} mono />
              <InfoField icon={<Tag size={14} />} label="No. Inventario" value={fmt(activeFicha.num_inv)} mono />
              <InfoField icon={<Shield size={14} />} label="Clave Presupuestal" value={fmt(activeFicha.clave_presupuestal)} mono />
              <InfoField icon={<MapPin size={14} />} label="Unidad Física" value={activeFicha.unidad ? fmt(activeFicha.unidad.descripcion || activeFicha.unidad.desc_corta) : '—'} />
              <InfoField icon={<MapPin size={14} />} label="Ubicación" value={activeFicha.ubicacion ? fmt(activeFicha.ubicacion.nombre_ubicacion) : '—'} />
              <InfoField icon={<Wifi size={14} />} label="Segmento de Red" value={activeFicha.segmento ? fmt(activeFicha.segmento.nombre || activeFicha.segmento.clave) : 'Sin segmento'} />
              <InfoField icon={<User size={14} />} label="En Resguardo de" value={fmt(activeFicha.usuarioResguardo?.nombre_completo) + (activeFicha.usuarioResguardo?.matricula ? ` (Mat: ${activeFicha.usuarioResguardo.matricula})` : '')} />
              <InfoField icon={<Calendar size={14} />} label="Fecha Adquisición" value={formatDate(activeFicha.fecha_adquisicion)} />
              <InfoField icon={<Calendar size={14} />} label="Última Actualización" value={formatDateTime(activeFicha.fecha_actualizacion)} />
              <InfoField icon={<Package size={14} />} label="Cantidad" value={activeFicha.cantidad} />
            </div>
          </div>
        )}

        {/* ── Tab: Técnico / Garantía ── */}
        {fichaTabs === 'tecnico' && (
          <div className="space-y-4 fade-in">
            {/* Especificaciones TI */}
            {(fichaMode === 'PC' || fichaMode === 'LAPTOP') && (
              <div className="rounded-xl border border-blue-100 overflow-hidden">
                <div className="bg-blue-50 px-4 py-2.5 flex items-center gap-2">
                  <Monitor size={15} className="text-blue-600" />
                  <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Especificaciones TI</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
                  {(() => {
                    const ti = activeFicha.especificacionTI || {};
                    return (
                      <>
                        <InfoField icon={<Monitor size={13} />} label="Host Name" value={fmt(ti.nombre_host)} />
                        <InfoField icon={<Cpu size={13} />} label="CPU" value={fmt(ti.cpu_info)} />
                        <InfoField icon={<Server size={13} />} label="RAM" value={ti.ram_gb ? `${ti.ram_gb} GB` : '—'} />
                        <InfoField icon={<HardDrive size={13} />} label="Almacenamiento" value={ti.almacenamiento_gb ? `${ti.almacenamiento_gb} GB` : '—'} />
                        <InfoField icon={<Wifi size={13} />} label="Dirección IP" value={fmt(ti.dir_ip)} mono />
                        <InfoField icon={<Wifi size={13} />} label="MAC Address" value={fmt(ti.mac_address)} mono />
                        <InfoField icon={<Wifi size={13} />} label="Dir. MAC Alt" value={fmt(ti.dir_mac)} mono />
                        <InfoField icon={<Monitor size={13} />} label="Sistema Op." value={fmt(ti.modelo_so)} />
                        <InfoField icon={<Monitor size={13} />} label="Versión Office" value={fmt(ti.version_office)} />
                        <InfoField icon={<Calendar size={13} />} label="Último Escaneo" value={formatDateTime(ti.last_scan)} />
                        <InfoField icon={<Tag size={13} />} label="Win Serial" value={fmt(ti.windows_serial)} mono />
                        <InfoField icon={<Wifi size={13} />} label="Pto. Red" value={fmt(ti.puerto_red)} />
                        <InfoField icon={<Wifi size={13} />} label="Switch Red" value={fmt(ti.switch_red)} />
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Cuentas PC */}
            {(fichaMode === 'PC' || fichaMode === 'LAPTOP') && (
              <div className="rounded-xl border border-purple-200 overflow-hidden">
                <div className="bg-purple-50 px-4 py-2.5 flex items-center gap-2">
                  <User size={15} className="text-purple-600" />
                  <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Cuentas de Usuario</span>
                </div>
                <div className="p-4 bg-white">
                  {activeFicha.cuentasPC && activeFicha.cuentasPC.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeFicha.cuentasPC.map((c, i) => (
                        <div key={i} className="col-span-full border-b border-gray-100 last:border-0 pb-2 mb-2 last:pb-0 last:mb-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <InfoField icon={<User size={13} />} label={`Cuenta Win. ${i + 1}`} value={fmt(c.cuenta_windows)} />
                          <InfoField icon={<User size={13} />} label="Correo" value={fmt(c.correo)} />
                          <InfoField icon={<User size={13} />} label="Tipo Usuario" value={fmt(c.tipo_user)} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic text-center py-2">No hay cuentas registradas</p>
                  )}
                </div>
              </div>
            )}

            {/* Monitores Asignados */}
            {(fichaMode === 'PC' || fichaMode === 'LAPTOP') && activeFicha.monitores?.length > 0 && (
              <div className="rounded-xl border border-teal-200 overflow-hidden">
                <div className="bg-teal-50 px-4 py-2.5 flex items-center gap-2">
                  <Monitor size={15} className="text-teal-600" />
                  <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Monitores Asignados</span>
                </div>
                <div className="p-4 space-y-2 bg-white">
                  {activeFicha.monitores.map((am) => (
                    <div key={am.id_bien_monitor} className="flex justify-between items-center p-2 rounded-lg border border-gray-100 bg-gray-50">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-800">{am.monitor?.modelo?.descrip_disp || 'Monitor genérico'}</span>
                        <span className="text-[10px] text-gray-500 font-mono">S/N: {am.monitor?.num_serie || 'S/N'} | INV: {am.monitor?.num_inv || 'S/N'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Equipo Asignado (Monitores) */}
            {activeFicha.equipoAsignado && (
              <div className="rounded-xl border border-teal-200 overflow-hidden">
                <div className="bg-teal-50 px-4 py-2.5 flex items-center gap-2">
                  <Monitor size={15} className="text-teal-600" />
                  <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Equipo Asignado</span>
                </div>
                <div className="p-4 bg-white">
                  <div className="flex flex-col p-2 rounded-lg border border-gray-100 bg-gray-50">
                    <span className="text-xs font-semibold text-gray-800">{activeFicha.equipoAsignado.equipo?.modelo?.descrip_disp || 'Equipo genérico'}</span>
                    <span className="text-[10px] text-gray-500 font-mono mt-1">ID: {activeFicha.equipoAsignado.equipo?.id_bien || 'N/A'}</span>
                    <span className="text-[10px] text-gray-500 font-mono">S/N: {activeFicha.equipoAsignado.equipo?.num_serie || 'S/N'} | INV: {activeFicha.equipoAsignado.equipo?.num_inv || 'S/N'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Atributos EAV */}
            {fichaMode === 'OTHER' && (
              <div className="rounded-xl border border-purple-200 overflow-hidden">
                <div className="bg-purple-50 px-4 py-2.5 flex items-center gap-2">
                  <Tag size={15} className="text-purple-600" />
                  <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Atributos Técnicos</span>
                </div>
                <div className="p-4 bg-white">
                  <BienAtributosPanel id_bien={activeFicha.id_bien} readOnly={true} />
                </div>
              </div>
            )}

            {/* Póliza de Garantía */}
            {activeFicha.garantias && activeFicha.garantias.length > 0 && (
              <div className="rounded-xl border border-green-200 overflow-hidden">
                <div className="bg-green-50 px-4 py-2.5 flex items-center gap-2">
                  <Shield size={15} className="text-green-600" />
                  <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Póliza de Garantía</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-white">
                  <InfoField icon={<Calendar size={13} />} label="Fecha Inicio" value={formatDate(activeFicha.garantias[0].fecha_inicio)} />
                  <InfoField icon={<Calendar size={13} />} label="Fecha Fin" value={formatDate(activeFicha.garantias[0].fecha_fin)} />
                  <InfoField icon={<User size={13} />} label="Proveedor" value={activeFicha.garantias[0].proveedorObj?.nombre_proveedor || 'Sin proveedor'} />
                  <div>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mb-0.5">Estado</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${activeFicha.garantias[0].estado_garantia === 'VIGENTE' ? 'bg-green-100 text-green-800' :
                      activeFicha.garantias[0].estado_garantia === 'VENCIDA' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>{activeFicha.garantias[0].estado_garantia || 'VIGENTE'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Software Instalado ── */}
        {fichaTabs === 'software' && activeFicha.programasPC && (
          <SoftwareTable programas={activeFicha.programasPC} />
        )}
      </div>
    </Modal>
  );
}
