import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { QrCode, Search, Check, Loader2, Camera as CameraIcon, CameraOff, Edit, Trash2, StickyNote, Hash, Package } from 'lucide-react';
import { useBienByQR, useDeleteBien, useCreateNotaBien } from '../hooks/useEscaner';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useAuthStore } from '../store/auth.store';
import { EditBienModal } from '../components/EditBienModal';

const STATUS_CONFIG = {
  'Activo':        { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  'En Reparación': { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
  'Baja':          { bg: 'bg-red-100',   text: 'text-red-800',   dot: 'bg-red-500'   },
};

export default function EscanerQR() {
  const { showToast } = useApp();
  const [manualInput, setManualInput] = useState('');
  const [activeHash, setActiveHash] = useState('');
  const [isCamEnabled, setIsCamEnabled] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [notaText, setNotaText] = useState('');
  const [notaSaved, setNotaSaved] = useState(false);

  const { usuario } = useAuthStore();
  const puedeEditar = [1, 2].includes(usuario?.id_rol);

  const { data: foundAsset, isFetching, isError } = useBienByQR(activeHash);
  const { mutateAsync: deleteBien } = useDeleteBien();
  const { mutateAsync: createNotaBien, isLoading: isCreatingNota } = useCreateNotaBien();

  useEffect(() => {
    if (activeHash && !isFetching) {
      if (foundAsset) {
        showToast(`Activo encontrado: ${foundAsset.equipo}`, 'success');
      } else if (isError || !foundAsset) {
        showToast('No se encontró ningún activo con ese identificador.', 'error');
      }
    }
  }, [activeHash, isFetching, foundAsset, isError]);

  const handleSearch = () => {
    const q = manualInput.trim();
    if (!q) { showToast('Por favor captura o ingresa un identificador.', 'warning'); return; }
    setActiveHash(q);
  };

  const handleReset = () => {
    setActiveHash('');
    setManualInput('');
    setNotaText('');
    setNotaSaved(false);
    setIsCamEnabled(false);
  };

  const handleCreateNota = async () => {
    if (!notaText.trim()) return;
    try {
      await createNotaBien({ id_bien: foundAsset.id, contenido_nota: notaText });
      setNotaSaved(true);
      showToast('Nota registrada', 'success');
      setNotaText('');
    } catch { showToast('Error al guardar la nota', 'error'); }
  };

  const handleDelete = async () => {
    if (!window.confirm(`¿Eliminar el activo "${foundAsset.equipo}"?`)) return;
    try {
      await deleteBien(foundAsset.id);
      showToast('Activo eliminado', 'success');
      handleReset();
    } catch { showToast('Error al eliminar el activo', 'error'); }
  };

  const statusCfg = foundAsset ? (STATUS_CONFIG[foundAsset.estatus] || STATUS_CONFIG['Activo']) : null;

  return (
    <div className="p-4 sm:p-6 fade-in">
      <style>{`
        @keyframes scanGlow {
          0%   { transform: translateY(-100%); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
        .scan-glow { animation: scanGlow 2.5s cubic-bezier(0.4,0,0.2,1) infinite; }
      `}</style>

      <div className="mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Escáner QR</h1>
        <p className="text-sm text-gray-500 mt-1">Escanea el código QR o ingresa cualquier identificador del bien</p>
      </div>

      {/* ── Grid de 2 columnas en desktop ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

        {/* ═══ COLUMNA IZQUIERDA: Escáner (siempre visible) ═══ */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Viewport cámara */}
          <div className="relative bg-gray-950" style={{ minHeight: 300 }}>
            {isCamEnabled && (
              <Scanner
                onScan={(result) => {
                  if (result?.[0]?.rawValue) {
                    setActiveHash(result[0].rawValue);
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
            {/* Marco QR animado */}
            <div className={`absolute inset-0 pointer-events-none flex items-center justify-center ${isCamEnabled ? 'opacity-100' : 'opacity-90'}`}>
              <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 0 5000px rgba(0,0,0,0.55)' }} />
              <div className="relative w-52 h-52 z-10">
                <div className="absolute -top-1 -left-1  w-10 h-10 border-t-4 border-l-4 rounded-tl-xl border-[#00ff88]" />
                <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 rounded-tr-xl border-[#00ff88]" />
                <div className="absolute -bottom-1 -left-1  w-10 h-10 border-b-4 border-l-4 rounded-bl-xl border-[#00ff88]" />
                <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 rounded-br-xl border-[#00ff88]" />
                <div className="absolute -left-2 -right-2 top-0 h-[60%] overflow-hidden pointer-events-none scan-glow">
                  <div className="absolute bottom-0 w-full h-full bg-gradient-to-t from-[#00ff8855] to-transparent" />
                  <div className="absolute bottom-0 w-full h-[3px] bg-[#00ff88] rounded-full shadow-[0_0_8px_#00ff88]" />
                </div>
                {!isCamEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center bg-black/40 backdrop-blur-sm rounded-xl p-4 ring-1 ring-[#00ff88]/30">
                      <QrCode size={28} className="mx-auto text-[#00ff88] mb-1" />
                      <p className="text-[#00ff88] text-xs font-semibold">Listo para escanear</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Controles */}
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
              <p className="text-xs text-gray-400">Acepta: QR hash, número de serie, núm. inventario, ID bien</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    value={manualInput}
                    onChange={e => setManualInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder="Identificador, serie, núm. inventario..."
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
        </div>{/* /col-izquierda */}

        {/* ═══ COLUMNA DERECHA: Resultado + Nota ═══ */}
        <div className="space-y-4">

          {/* Cargando */}
          {isFetching && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-14 flex flex-col items-center gap-3">
              <Loader2 size={32} className="animate-spin text-green-600" />
              <p className="text-sm text-gray-500 font-medium">Buscando activo...</p>
            </div>
          )}

          {/* Sin resultado */}
          {!isFetching && !foundAsset && activeHash && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center fade-in">
              <p className="text-gray-400 text-sm">No se encontró ningún activo con ese identificador.</p>
            </div>
          )}

          {/* Tarjeta del bien */}
          {!isFetching && foundAsset && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden fade-in">

              {/* Cabecera */}
              <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center shrink-0">
                  <Package size={22} className="text-green-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold text-gray-900 truncate">{foundAsset.equipo}</h2>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{foundAsset.numSerie}</p>
                </div>
                <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusCfg.bg} ${statusCfg.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                  {foundAsset.estatus}
                </span>
              </div>

              {/* Datos */}
              <div className="px-6 py-4">
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {[
                    ['Unidad', foundAsset.unidad],
                    ['Ubicación', foundAsset.ubicacion],
                    ['Usuario de Resguardo', foundAsset.usuario],
                    ['Matrícula', foundAsset.matricula],
                    ['Última Actualización', foundAsset.actualizacion],
                  ].filter(([, v]) => v && v !== 'N/A').map(([k, v]) => (
                    <div key={k} className="flex flex-col gap-0.5">
                      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{k}</span>
                      <span className="text-gray-800 font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Especificaciones TI */}
              {foundAsset.specs?.hasSpecs && (
                <div className="mx-6 mb-4 p-4 rounded-xl bg-blue-50 border border-blue-100">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-blue-600 mb-3">Especificaciones TI</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    {[
                      ['Nombre Equipo', foundAsset.specs.nom_pc],
                      ['CPU', foundAsset.specs.cpu],
                      ['RAM (GB)', foundAsset.specs.ram],
                      ['Almacenamiento (GB)', foundAsset.specs.almacenamiento],
                      ['Dirección IP', foundAsset.specs.ip],
                      ['MAC (Ethernet)', foundAsset.specs.mac_eth],
                      ['Sistema Operativo', foundAsset.specs.os],
                    ].filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wide">{k}</span>
                        <span className="text-gray-800 font-medium font-mono text-xs">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Acciones */}
              <div className="px-6 pb-5 flex gap-2 border-t border-gray-100 pt-4">
                <button onClick={handleReset} className="flex-1 py-2 rounded-xl text-sm font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors">
                  ← Escanear otro
                </button>
                {puedeEditar && (
                  <>
                    <button onClick={() => setEditModalOpen(true)} className="flex-1 py-2 flex justify-center items-center gap-1.5 rounded-xl text-sm font-semibold text-amber-700 border border-amber-200 hover:bg-amber-50 transition-colors">
                      <Edit size={14} /> Editar
                    </button>
                    <button onClick={handleDelete} className="flex-1 py-2 flex justify-center items-center gap-1.5 rounded-xl text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors">
                      <Trash2 size={14} /> Eliminar
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Nota rápida */}
          {foundAsset && !notaSaved && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 fade-in">
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <StickyNote size={15} className="text-sky-500" />
                Añadir Nota al Bien
              </h3>
              <div className="space-y-3">
                <textarea
                  value={notaText}
                  onChange={e => setNotaText(e.target.value)}
                  rows={2}
                  placeholder="Observaciones rápidas, condición del equipo..."
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
                />
                <button
                  disabled={isCreatingNota || !notaText.trim()}
                  onClick={handleCreateNota}
                  className="w-full py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#0ea5e9,#0284c7)' }}
                >
                  {isCreatingNota && <Loader2 size={16} className="animate-spin" />}
                  Guardar Nota
                </button>
              </div>
            </div>
          )}

          {notaSaved && (
            <div className="bg-sky-50 border border-sky-100 rounded-2xl p-5 text-center fade-in">
              <Check size={24} className="mx-auto text-sky-500 mb-2" />
              <p className="font-bold text-sky-800 text-sm">Nota guardada correctamente</p>
              <p className="text-xs text-sky-600 mt-1">La observación se asignó al historial del bien.</p>
            </div>
          )}

        </div>{/* /col-derecha */}

      </div>{/* /grid */}

      {editModalOpen && foundAsset && (
        <EditBienModal
          asset={foundAsset}
          onClose={() => setEditModalOpen(false)}
        />
      )}
    </div>
  );
}
