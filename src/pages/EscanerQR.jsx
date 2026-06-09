import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  QrCode, Search, Check, Loader2, Camera as CameraIcon, CameraOff, 
  Edit, Trash2, StickyNote, Hash, Package, Tag, Shield, MapPin, 
  User, Calendar, Monitor, Cpu, HardDrive, Wifi, Server, Layers,
  AlertTriangle, X, ChevronRight
} from 'lucide-react';
import { useBienByQR, useDeleteBien, useCreateNotaBien } from '../hooks/useEscaner';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useAuthStore } from '../store/auth.store';
import { useCatalogosBienes } from '../hooks/useCatalogosBienes';
import { EditBienModal, Modal } from '../components/EditBienModal';
import BienAtributosPanel from '../components/BienAtributosPanel';
import { formatDate, formatDateTime } from '../lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(v) { return v || '—'; }

const CATEGORIAS_TI = [1, 3];

function getDeviceMode(nombreCategoria = null, hasSpecs = false) {
  const c = (nombreCategoria || '').toLowerCase();
  if (c.includes('monitor')) return 'MONITOR';
  if (c.includes('laptop') || c.includes('port') || c.includes('notebook')) return 'LAPTOP';
  if (c.includes('cómputo') || c.includes('computo') || hasSpecs) return 'PC';
  return 'OTHER';
}

function InfoField({ label, value, icon, mono = false, alert = null }) {
  return (
    <div>
      <p className="text-xs text-gray-400 flex items-center gap-1 mb-0.5">
        {icon}{label}
      </p>
      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
        <p className={`text-sm font-semibold text-gray-800 ${mono ? 'font-mono' : ''}`}>
          {value ?? '—'}
        </p>
        {alert && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
            <AlertTriangle size={10} /> {alert}
          </span>
        )}
      </div>
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
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 w-48 bg-white"
            />
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto custom-scrollbar bg-white">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="bg-gray-50/80 sticky top-0 backdrop-blur-sm shadow-sm">
                <tr>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Programa</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 w-32">Versión</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 w-48">Editor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2 text-xs font-medium text-gray-800">{p.programa || '—'}</td>
                    <td className="px-4 py-2 text-xs text-gray-500 font-mono">{p.version || '—'}</td>
                    <td className="px-4 py-2 text-xs text-gray-500 truncate max-w-[12rem]">{p.editor || '—'}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-400">
                      No se encontraron programas instalados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}

function EstatusBadge({ estatus }) {
  const map = {
    'ALTA':          { bg: '#dcfce7', color: '#15803d', label: 'Alta' },
    'BAJA':          { bg: '#fee2e2', color: '#b91c1c', label: 'Baja' },
    'DAÑADO':        { bg: '#fef3c7', color: '#d97706', label: 'Dañado' },
    'DEVOLUCIÓN':    { bg: '#f3e8ff', color: '#7e22ce', label: 'Devolución' },
    'OTRO':          { bg: '#f3f4f6', color: '#374151', label: 'Otro' },
    'P_BAJA':        { bg: '#ffedd5', color: '#c2410c', label: 'Pre-Baja' },
    'PRESTAMO':      { bg: '#dbeafe', color: '#1d4ed8', label: 'Préstamo' },
    'SINIESTRADO':   { bg: '#fef2f2', color: '#991b1b', label: 'Siniestrado' },
    'SUSTITUIDO':    { bg: '#e0e7ff', color: '#4338ca', label: 'Sustituido' },
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

// ─── Componente Principal ──────────────────────────────────────────────────────
export default function EscanerQR() {
  const { showToast } = useApp();
  const [manualInput, setManualInput] = useState('');
  const [activeHash, setActiveHash] = useState('');
  const [isCamEnabled, setIsCamEnabled] = useState(false);
  
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [modalConfirmDel, setModalConfirmDel] = useState(false);
  const [fichaTabs, setFichaTabs] = useState('info');
  const [notaText, setNotaText] = useState('');
  const prevIdRef = useRef(null);

  const { usuario } = useAuthStore();
  const puedeEditar   = [1, 2].includes(usuario?.id_rol);
  const puedeEliminar = usuario?.id_rol === 1;

  const { data: foundAssets, isFetching, isError, refetch } = useBienByQR(activeHash);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const { mutateAsync: deleteBien } = useDeleteBien();
  const { data: catalogos } = useCatalogosBienes();
  const { mutateAsync: createNotaBien, isLoading: isCreatingNota } = useCreateNotaBien();

  useEffect(() => {
    if (activeHash && !isFetching) {
      if (foundAssets && foundAssets.length > 0) {
        if (prevIdRef.current !== activeHash) {
          prevIdRef.current = activeHash;
          if (foundAssets.length === 1) {
            setSelectedIndex(0);
            showToast(`Activo encontrado: ${foundAssets[0].equipo}`, 'success');
            setFichaTabs('info');
          } else {
            setSelectedIndex(null);
            showToast(`Se encontraron ${foundAssets.length} coincidencias. Selecciona una.`, 'info');
          }
        }
      } else if (isError || !foundAssets || foundAssets.length === 0) {
        if (prevIdRef.current !== 'error-' + activeHash) {
           showToast('No se encontró ningún activo con ese identificador.', 'error');
           prevIdRef.current = 'error-' + activeHash;
        }
      }
    }
  }, [activeHash, isFetching, foundAssets, isError]);

  const foundAsset = foundAssets && selectedIndex !== null ? foundAssets[selectedIndex] : null;

  const handleSearch = () => {
    const q = manualInput.trim();
    if (!q) { showToast('Por favor captura o ingresa un identificador.', 'warning'); return; }
    setActiveHash(q);
    setSelectedIndex(null);
  };

  const handleReset = () => {
    setActiveHash('');
    setManualInput('');
    setNotaText('');
    setIsCamEnabled(false);
    setSelectedIndex(null);
    prevIdRef.current = null;
  };

  const handleCreateNota = async () => {
    if (!notaText.trim()) return;
    try {
      await createNotaBien({ id_bien: foundAsset.id_bien, contenido_nota: notaText });
      showToast('Nota registrada', 'success');
      setNotaText('');
    } catch { showToast('Error al guardar la nota', 'error'); }
  };

  const handleDelete = () => {
    setModalConfirmDel(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteBien(foundAsset.id_bien);
      showToast('Activo eliminado', 'success');
      setModalConfirmDel(false);
      handleReset();
    } catch { showToast('Error al eliminar el activo', 'error'); }
  };

  const handleEditClose = () => {
    setEditModalOpen(false);
    refetch();
  };

  const fichaMode = foundAsset ? getDeviceMode(foundAsset.categoria?.nombre_categoria, !!foundAsset.especificacionTI) : null;
  const isTICategory = foundAsset ? CATEGORIAS_TI.includes(Number(foundAsset.idCategoria)) : false;
  const hasTecnico = foundAsset && (!!foundAsset.especificacionTI || isTICategory || fichaMode === 'OTHER' || (foundAsset.cuentasPC?.length > 0) || (foundAsset.monitores?.length > 0) || foundAsset.equipoAsignado || (foundAsset.garantias?.length > 0));

  const ipConflictMsg = foundAsset?.inconvenientes?.find(i => i.startsWith('IP Repetida'));
  const hasNoInvMsg = foundAsset?.inconvenientes?.find(i => i.toLowerCase().includes('inventario')) ? 'Sin número de inventario' : null;

  return (
    <div className="p-4 sm:p-6 fade-in h-full flex flex-col overflow-hidden">
      <style>{`
        @keyframes scanGlow {
          0%   { transform: translateY(-100%); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
        .scan-glow { animation: scanGlow 2.5s cubic-bezier(0.4,0,0.2,1) infinite; }
      `}</style>

      <div className="mb-5 shrink-0">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Escáner QR</h1>
        <p className="text-sm text-gray-500 mt-1">Escanea el código QR o ingresa cualquier identificador del bien</p>
      </div>

      {/* ── Grid de 2 columnas en desktop, apilado en móvil ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch flex-1 min-h-0 overflow-y-auto xl:overflow-hidden pb-10 xl:pb-0">
        
        {/* ═══ COLUMNA IZQUIERDA: Escáner ═══ */}
        <div className="xl:col-span-4 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col shrink-0">
          
          <div className="relative bg-gray-950" style={{ minHeight: 300 }}>
            {isCamEnabled && (
              <Scanner
                onScan={(result) => {
                  if (result?.[0]?.rawValue) {
                    setActiveHash(result[0].rawValue);
                    setSelectedIndex(null);
                    setIsCamEnabled(false);
                  }
                }}
                onError={(error) => {
                  if (error.name === 'NotAllowedError') {
                    showToast('Permiso de cámara denegado.', 'error');
                    setIsCamEnabled(false);
                  }
                }}
                components={{ audio: false, onOff: false, finder: false }}
                styles={{ container: { width: '100%', height: '300px' } }}
              />
            )}
            <div 
              className={`absolute inset-0 flex items-center justify-center transition-opacity ${isCamEnabled ? 'opacity-100' : 'opacity-90 hover:opacity-100 cursor-pointer'}`}
              onClick={() => { if (!isCamEnabled) setIsCamEnabled(true); }}
            >
              <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 0 5000px rgba(0,0,0,0.55)' }} />
              <div className="relative w-52 h-52 z-10">
                <div className="absolute -top-1 -left-1  w-10 h-10 border-t-4 border-l-4 rounded-tl-xl border-[#00ff88] pointer-events-none" />
                <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 rounded-tr-xl border-[#00ff88] pointer-events-none" />
                <div className="absolute -bottom-1 -left-1  w-10 h-10 border-b-4 border-l-4 rounded-bl-xl border-[#00ff88] pointer-events-none" />
                <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 rounded-br-xl border-[#00ff88] pointer-events-none" />
                
                {/* Contenedor con overflow hidden para que la línea no salga del recuadro */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-xl">
                  <div className="absolute -left-2 -right-2 top-0 h-[60%] scan-glow">
                    <div className="absolute bottom-0 w-full h-full bg-gradient-to-t from-[#00ff8855] to-transparent" />
                    <div className="absolute bottom-0 w-full h-[3px] bg-[#00ff88] rounded-full shadow-[0_0_8px_#00ff88]" />
                  </div>
                </div>
                
                {!isCamEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center bg-black/40 backdrop-blur-sm rounded-xl p-4 ring-1 ring-[#00ff88]/30 transition-transform hover:scale-105">
                      <QrCode size={28} className="mx-auto text-[#00ff88] mb-1" />
                      <p className="text-[#00ff88] text-xs font-semibold">Toca para escanear</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <button
              onClick={() => setIsCamEnabled(!isCamEnabled)}
              className="w-full py-2.5 flex items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: isCamEnabled ? 'linear-gradient(135deg,#1f2937,#111827)' : 'linear-gradient(135deg,#006341,#00a866)' }}
            >
              {isCamEnabled ? <><CameraOff size={16} /> Detener Cámara</> : <><CameraIcon size={16} /> Usar Cámara del Dispositivo</>}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-gray-400">o ingresa un identificador</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs text-gray-400">Acepta: dirección IP, número de serie, núm. inventario, ID bien, QR hash </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    value={manualInput}
                    onChange={e => setManualInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder="Inventario, serie, IP..."
                    className="w-full pl-8 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90 flex items-center gap-1.5"
                  style={{ backgroundColor: '#006341' }}
                >
                  {isFetching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                  Buscar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ COLUMNA DERECHA: Resultado Detallado ═══ */}
        <div className="xl:col-span-8 flex flex-col h-full min-h-0 shrink-0">
          
          {isFetching && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-14 flex flex-col items-center gap-3">
              <Loader2 size={32} className="animate-spin text-green-600" />
              <p className="text-sm text-gray-500 font-medium">Buscando activo...</p>
            </div>
          )}

          {!isFetching && (!foundAssets || foundAssets.length === 0) && activeHash && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center fade-in">
              <p className="text-gray-400 text-sm">No se encontró ningún activo con ese identificador.</p>
            </div>
          )}

          {!isFetching && (!foundAssets || foundAssets.length === 0) && !activeHash && (
            <div className="hidden xl:flex bg-gray-50/50 rounded-2xl border border-dashed border-gray-300 p-14 flex-col items-center justify-center text-center h-full">
              <Package size={48} className="text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">Esperando escaneo</p>
              <p className="text-sm text-gray-400 mt-1">La información del bien aparecerá aquí</p>
            </div>
          )}

          {!isFetching && foundAssets && foundAssets.length > 1 && selectedIndex === null && (
            <Modal
              onClose={handleReset}
              title={`Múltiples coincidencias (${foundAssets.length})`}
              subtitle="Se encontraron varios bienes con el mismo identificador. Selecciona el que deseas consultar:"
              footer={
                <div className="flex justify-center w-full">
                  <button onClick={handleReset} className="text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors px-4 py-2">
                    Cancelar búsqueda
                  </button>
                </div>
              }
            >
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                {foundAssets.map((asset, idx) => (
                  <div 
                    key={asset.id_bien} 
                    onClick={() => {
                      setSelectedIndex(idx);
                      setFichaTabs('info');
                    }}
                    className="group relative flex flex-col p-4 rounded-xl border border-gray-200 hover:border-green-500 hover:bg-green-50/40 hover:shadow-md cursor-pointer transition-all overflow-hidden"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="pr-8">
                        <p className="font-bold text-gray-900 text-sm sm:text-base leading-snug group-hover:text-green-800 transition-colors">
                          {asset.equipo}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                           <Package size={12} className="text-gray-400" />
                           {asset.categoria?.nombre_categoria || 'Bien'}
                        </p>
                      </div>
                      <div className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-300 group-hover:text-green-600 transition-transform group-hover:translate-x-1">
                        <ChevronRight size={20} />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 mt-auto pt-3 border-t border-gray-100/80">
                      <div className="flex items-center gap-1.5 text-[11px] sm:text-xs">
                        <span className="text-gray-400"><Hash size={13} /></span>
                        <span className="text-gray-500 font-medium">S/N:</span>
                        <span className="font-semibold text-gray-800 truncate">{asset.numSerie || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] sm:text-xs">
                        <span className="text-gray-400"><Tag size={13} /></span>
                        <span className="text-gray-500 font-medium">Inv:</span>
                        <span className="font-semibold text-gray-800 truncate">{asset.numInv || 'N/A'}</span>
                      </div>
                      {asset.especificacionTI?.dir_ip && (
                        <div className="flex items-center gap-1.5 text-xs sm:col-span-2 mt-1">
                          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-100 font-bold tracking-wide shadow-sm">
                            <Wifi size={12} /> IP: {asset.especificacionTI.dir_ip}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Modal>
          )}

          {!isFetching && foundAsset && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden fade-in flex flex-col h-full min-h-0">
              
              {/* ── Encabezado del Bien ── */}
              <div className="p-5 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4 bg-gradient-to-br from-green-50/80 to-emerald-50/80 border-b border-green-100">
                <div className="flex items-center gap-4 w-full">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#006341,#004d32)' }}>
                    <Package size={24} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-lg leading-tight truncate">{foundAsset.equipo}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{foundAsset.categoria?.nombre_categoria || 'Bien de Inventario'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto w-full sm:w-auto justify-between sm:justify-end">
                  {foundAsset.inconvenientes?.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-700 animate-pulse border border-red-200">
                      <AlertTriangle size={12} /> Inconvenientes
                    </span>
                  )}
                  <EstatusBadge estatus={foundAsset.estatusOperativo} />
                </div>
              </div>

              {/* ── Pestañas Ficha ── */}
              <div className="flex gap-1 border-b border-gray-200 px-4 pt-3 bg-gray-50/30 overflow-x-auto overflow-y-hidden shrink-0 scrollbar-hide">
                {[
                  { key: 'info', label: 'Información Básica' },
                  ...(hasTecnico ? [{ key: 'tecnico', label: 'Técnico / Atributos' }] : []),
                  ...(foundAsset.programasPC && foundAsset.programasPC.length > 0 ? [{ key: 'software', label: 'Software Instalado' }] : []),
                ].map(t => (
                  <button
                    key={t.key}
                    onClick={() => setFichaTabs(t.key)}
                    className={`whitespace-nowrap px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors border-b-2 -mb-px ${
                      fichaTabs === t.key
                        ? 'border-green-600 text-green-700 bg-white'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* ── Contenido de Pestañas ── */}
              <div className="flex-1 overflow-y-auto p-5 min-h-0">
                
                {/* TAB: Información */}
                {fichaTabs === 'info' && (
                  <div className="space-y-6 fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                      <InfoField icon={<Tag size={14}/>}      label="No. Serie"          value={fmt(foundAsset.numSerie)} mono />
                      <InfoField icon={<Tag size={14}/>}      label="No. Inventario"     value={fmt(foundAsset.numInv)} mono alert={hasNoInvMsg} />
                      <InfoField icon={<Shield size={14}/>}   label="Clave Presupuestal" value={fmt(foundAsset.clavePresupuestal)} mono />
                      <InfoField icon={<MapPin size={14}/>}   label="Ubicación"          value={fmt(foundAsset.ubicacion)} />
                      <InfoField icon={<User size={14}/>}     label="En Resguardo de"    value={fmt(foundAsset.resguardo) + (foundAsset.usuarioResguardo?.matricula ? ` (Mat: ${foundAsset.usuarioResguardo.matricula})` : '')} />
                      <InfoField icon={<Calendar size={14}/>} label="Fecha Adquisición"  value={formatDate(foundAsset.fechaAdquisicion)} />
                      <InfoField icon={<Calendar size={14}/>} label="Última Actualización" value={formatDateTime(foundAsset.fechaActualizacion)} />
                      <InfoField icon={<Package size={14}/>}  label="Cantidad"           value={foundAsset.cantidad} />
                    </div>

                    {/* Notas */}
                    <div className="rounded-xl border border-gray-200 overflow-hidden mt-6">
                      <div className="bg-gray-50 px-4 py-2.5 flex items-center justify-between border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <StickyNote size={15} className="text-gray-500" />
                          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Notas de Observación</span>
                        </div>
                      </div>
                      <div className="p-4 space-y-3 bg-white">
                        {foundAsset.notas && foundAsset.notas.length > 0 ? (
                          foundAsset.notas.map((nota) => (
                            <div key={nota.id_nota} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                              <p className="text-sm text-gray-800">{nota.contenido_nota}</p>
                              <div className="flex justify-between items-center mt-2 text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                                <span>{nota.usuarioAutor?.nombre_completo || 'Sistema'}</span>
                                <span>{new Date(isNaN(Number(nota.fecha_creacion)) ? nota.fecha_creacion : Number(nota.fecha_creacion)).toLocaleString('es-MX')}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-400 italic">No hay notas registradas para este bien.</p>
                        )}
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <textarea
                            value={notaText}
                            onChange={(e) => setNotaText(e.target.value)}
                            placeholder="Escribe una nueva nota u observación..."
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none"
                            rows={2}
                          />
                          <div className="flex justify-end mt-2">
                            <button
                              onClick={handleCreateNota}
                              disabled={!notaText.trim() || isCreatingNota}
                              className="px-4 py-1.5 bg-[#006341] text-white rounded-lg text-xs font-semibold hover:bg-[#004d32] disabled:opacity-50 flex items-center gap-2 transition-colors"
                            >
                              {isCreatingNota ? <Loader2 size={14} className="animate-spin" /> : 'Guardar Nota'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB: Técnico / Atributos */}
                {fichaTabs === 'tecnico' && (
                  <div className="space-y-5 fade-in">
                    
                    {/* Especificaciones TI */}
                    {foundAsset.especificacionTI && (fichaMode === 'PC' || fichaMode === 'LAPTOP') && (
                      <div className="rounded-xl border border-blue-100 overflow-hidden">
                        <div className="bg-blue-50 px-4 py-2.5 flex items-center gap-2">
                          <Monitor size={15} className="text-blue-600" />
                          <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Especificaciones TI</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-white">
                          <InfoField icon={<Monitor size={13}/>}   label="Host Name"      value={fmt(foundAsset.especificacionTI.nombre_host)} />
                          <InfoField icon={<Cpu size={13}/>}       label="CPU"            value={fmt(foundAsset.especificacionTI.cpu_info)} />
                          <InfoField icon={<Server size={13}/>}    label="RAM"            value={foundAsset.especificacionTI.ram_gb ? `${foundAsset.especificacionTI.ram_gb} GB` : '—'} />
                          <InfoField icon={<HardDrive size={13}/>} label="Almacenamiento" value={foundAsset.especificacionTI.almacenamiento_gb ? `${foundAsset.especificacionTI.almacenamiento_gb} GB` : '—'} />
                          <InfoField icon={<Wifi size={13}/>}      label="Dirección IP"   value={fmt(foundAsset.especificacionTI.dir_ip)} mono alert={ipConflictMsg} />
                          <InfoField icon={<Wifi size={13}/>}      label="MAC Address"    value={fmt(foundAsset.especificacionTI.mac_address)} mono />
                          <InfoField icon={<Wifi size={13}/>}      label="Dir. MAC Alt"   value={fmt(foundAsset.especificacionTI.dir_mac)} mono />
                          <InfoField icon={<Monitor size={13}/>}   label="Sistema Op."    value={fmt(foundAsset.especificacionTI.modelo_so)} />
                          <InfoField icon={<Monitor size={13}/>}   label="Versión Office" value={fmt(foundAsset.especificacionTI.version_office)} />
                          <InfoField icon={<Calendar size={13}/>}  label="Último Escaneo" value={formatDateTime(foundAsset.especificacionTI.last_scan)} />
                          <InfoField icon={<Tag size={13}/>}       label="Win Serial"     value={fmt(foundAsset.especificacionTI.windows_serial)} mono />
                          <InfoField icon={<Wifi size={13}/>}      label="Pto. Red"       value={fmt(foundAsset.especificacionTI.puerto_red)} />
                          <InfoField icon={<Wifi size={13}/>}      label="Switch Red"     value={fmt(foundAsset.especificacionTI.switch_red)} />
                        </div>
                      </div>
                    )}

                    {/* Cuentas PC */}
                    {foundAsset.cuentasPC && foundAsset.cuentasPC.length > 0 && (
                      <div className="rounded-xl border border-purple-200 overflow-hidden">
                        <div className="bg-purple-50 px-4 py-2.5 flex items-center gap-2">
                          <User size={15} className="text-purple-600" />
                          <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Cuentas de Usuario</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-white">
                          {foundAsset.cuentasPC.map((c, i) => (
                            <div key={i} className="col-span-full border-b border-gray-100 last:border-0 pb-2 mb-2 last:pb-0 last:mb-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <InfoField icon={<User size={13}/>} label={`Cuenta Win. ${i+1}`} value={fmt(c.cuenta_windows)} />
                              <InfoField icon={<User size={13}/>} label="Correo"               value={fmt(c.correo)} />
                              <InfoField icon={<User size={13}/>} label="Tipo Usuario"         value={fmt(c.tipo_user)} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Monitores Asignados */}
                    {(fichaMode === 'PC' || fichaMode === 'LAPTOP') && foundAsset.monitores?.length > 0 && (
                      <div className="rounded-xl border border-teal-200 overflow-hidden">
                        <div className="bg-teal-50 px-4 py-2.5 flex items-center gap-2">
                          <Monitor size={15} className="text-teal-600" />
                          <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Monitores Asignados</span>
                        </div>
                        <div className="p-4 space-y-2 bg-white">
                          {foundAsset.monitores.map((am) => (
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
                    {foundAsset.equipoAsignado && (
                      <div className="rounded-xl border border-teal-200 overflow-hidden">
                        <div className="bg-teal-50 px-4 py-2.5 flex items-center gap-2">
                          <Monitor size={15} className="text-teal-600" />
                          <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Equipo Asignado</span>
                        </div>
                        <div className="p-4 bg-white">
                          <div className="flex flex-col p-2 rounded-lg border border-gray-100 bg-gray-50">
                            <span className="text-xs font-semibold text-gray-800">{foundAsset.equipoAsignado.equipo?.modelo?.descrip_disp || 'Equipo genérico'}</span>
                            <span className="text-[10px] text-gray-500 font-mono mt-1">ID: {foundAsset.equipoAsignado.equipo?.id_bien || 'N/A'}</span>
                            <span className="text-[10px] text-gray-500 font-mono">S/N: {foundAsset.equipoAsignado.equipo?.num_serie || 'S/N'} | INV: {foundAsset.equipoAsignado.equipo?.num_inv || 'S/N'}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Panel EAV Dinámico (Atributos) */}
                    {fichaMode === 'OTHER' && (
                      <div className="rounded-xl border border-purple-200 overflow-hidden">
                        <div className="bg-purple-50 px-4 py-2.5 flex items-center gap-2 border-b border-purple-100">
                          <Tag size={15} className="text-purple-700" />
                          <span className="text-xs font-semibold text-purple-800 uppercase tracking-wide">Atributos Técnicos Adicionales</span>
                        </div>
                        <div className="p-4 bg-white">
                          <BienAtributosPanel id_bien={foundAsset.id_bien} readOnly={true} />
                        </div>
                      </div>
                    )}

                    {/* Póliza de Garantía */}
                    {foundAsset.garantias && foundAsset.garantias.length > 0 && (
                      <div className="rounded-xl border border-green-200 overflow-hidden">
                        <div className="bg-green-50 px-4 py-2.5 flex items-center gap-2">
                          <Shield size={15} className="text-green-600" />
                          <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Póliza de Garantía</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-white">
                          <InfoField icon={<Calendar size={13}/>} label="Fecha Inicio" value={formatDate(foundAsset.garantias[0].fecha_inicio)} />
                          <InfoField icon={<Calendar size={13}/>} label="Fecha Fin" value={formatDate(foundAsset.garantias[0].fecha_fin)} />
                          <InfoField icon={<User size={13}/>} label="Proveedor" value={foundAsset.garantias[0].proveedorObj?.nombre_proveedor || 'Sin proveedor'} />
                          <div>
                            <p className="text-xs text-gray-400 flex items-center gap-1 mb-0.5">Estado</p>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
                                foundAsset.garantias[0].estado_garantia === 'VIGENTE' ? 'bg-green-100 text-green-800' :
                                foundAsset.garantias[0].estado_garantia === 'VENCIDA' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>{foundAsset.garantias[0].estado_garantia || 'VIGENTE'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: Software Instalado */}
                {fichaTabs === 'software' && foundAsset.programasPC && (
                  <SoftwareTable programas={foundAsset.programasPC} />
                )}
              </div>

              {/* ── Footer de Acciones ── */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-3 shrink-0">
                <button onClick={() => { if (foundAssets?.length > 1) { setSelectedIndex(null); } else { handleReset(); } }} className="flex-1 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 transition-colors shadow-sm">
                  ← {foundAssets?.length > 1 ? 'Volver a la lista' : 'Escanear otro'}
                </button>
                {puedeEditar && (
                  <button onClick={() => setEditModalOpen(true)} className="flex-1 py-2 flex justify-center items-center gap-1.5 rounded-xl text-sm font-semibold text-green-700 bg-white border border-green-200 hover:bg-green-50 transition-colors shadow-sm">
                    <Edit size={14} /> Editar
                  </button>
                )}
                {puedeEliminar && (
                  <button onClick={handleDelete} className="flex-1 py-2 flex justify-center items-center gap-1.5 rounded-xl text-sm font-semibold text-red-600 bg-white border border-red-200 hover:bg-red-50 transition-colors shadow-sm">
                    <Trash2 size={14} /> Eliminar
                  </button>
                )}
              </div>

            </div>
          )}
        </div>
      </div>

      {modalConfirmDel && foundAsset && (
        <Modal onClose={() => setModalConfirmDel(false)} title="Eliminar Bien" subtitle="Esta acción no se puede deshacer" small>
          <div className="flex flex-col gap-4 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600 mb-1">
              <AlertTriangle size={28} />
            </div>
            <p className="text-sm text-gray-600">
              ¿Estás seguro de que deseas eliminar permanentemente el bien <strong className="text-gray-900">{foundAsset.equipo}</strong>?
            </p>
            <div className="bg-gray-50 p-3 rounded-lg text-left text-xs space-y-1 border border-gray-100">
              <p><span className="text-gray-400">ID:</span> <span className="font-mono text-gray-700">{foundAsset.id_bien || foundAsset.id}</span></p>
              <p><span className="text-gray-400">Serie:</span> <span className="font-mono text-gray-700">{foundAsset.numSerie || 'S/N'}</span></p>
              <p><span className="text-gray-400">Inv:</span> <span className="font-mono text-gray-700">{foundAsset.numInv || 'S/N'}</span></p>
            </div>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setModalConfirmDel(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                Sí, eliminar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {editModalOpen && foundAsset && (
        <EditBienModal
          isOpen={editModalOpen}
          mode="edit"
          asset={foundAsset}
          catalogos={catalogos}
          onClose={handleEditClose}
          refetch={refetch}
        />
      )}
    </div>
  );
}
