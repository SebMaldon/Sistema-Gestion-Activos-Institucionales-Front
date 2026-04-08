import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { QrCode, AlertTriangle, Search, Check, Loader2, Camera as CameraIcon, CameraOff, Edit, Trash2, StickyNote } from 'lucide-react';
import { useBienByQR, useDeleteBien, useCreateNotaBien } from '../hooks/useEscaner';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useAuthStore } from '../store/auth.store';
import { EditBienModal } from '../components/EditBienModal';

export default function EscanerQR() {
  const { showToast } = useApp();
  const [manualInput, setManualInput] = useState('');
  const [activeHash, setActiveHash] = useState('');
  const [isCamEnabled, setIsCamEnabled] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  
  const { usuario } = useAuthStore();
  const puedeEditar = [1, 2].includes(usuario?.id_rol);

  const { data: foundAsset, isFetching, isError } = useBienByQR(activeHash);
  const { mutateAsync: deleteBien } = useDeleteBien();
  const { mutateAsync: createNotaBien, isLoading: isCreatingNota } = useCreateNotaBien();
  
  const [notaText, setNotaText] = useState('');
  const [notaSaved, setNotaSaved] = useState(false);

  useEffect(() => {
    if (activeHash && !isFetching) {
      if (foundAsset) {
        showToast(`Activo encontrado: ${foundAsset.equipo}`, 'success');
      } else if (isError || !foundAsset) {
        showToast('No se encontró ningún activo con ese identificador.', 'error');
      }
    }
  }, [activeHash, isFetching, foundAsset, isError, showToast]);

  const handleSearch = () => {
    const q = manualInput.trim();
    if (!q) {
      showToast('Por favor captura el código QR.', 'warning');
      return;
    }
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
      showToast('Nota registrada a este equipo', 'success');
      setNotaText('');
    } catch (e) {
      showToast('Error al guardar la nota', 'error');
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el activo ${foundAsset.equipo}?`)) {
      try {
        await deleteBien(foundAsset.id);
        showToast('Activo eliminado', 'success');
        handleReset();
      } catch (error) {
        showToast('Error al eliminar el activo', 'error');
      }
    }
  };

  const STATUS_COLOR = {
    'Activo': '#16a34a', 'En Reparación': '#ca8a04', 'Baja': '#dc2626'
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 fade-in">
      <style>{`
        @keyframes scanGlow {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
        .scan-glow {
          animation: scanGlow 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Escáner QR</h1>
        <p className="text-sm text-gray-500 mt-1">Escanea el código QR del equipo o ingresa el hash manualmente</p>
      </div>

      <div className="max-w-3xl mx-auto space-y-5 w-full">
        <div className="relative mx-auto w-full">
          <div className="relative overflow-hidden shadow-2xl rounded-2xl bg-gray-900 border border-gray-800">
            <div className="relative p-0" style={{ minHeight: 420, background: !activeHash ? '#000' : '#111827' }}>
              {!activeHash || (isFetching || (!foundAsset && activeHash)) ? (
                <div className="relative fade-in">
                  <div className="relative w-full h-[360px] md:h-[480px] bg-[#0d1117]">
                    {isCamEnabled && (
                      <Scanner
                        onScan={(result) => {
                          if (result && result.length > 0 && result[0].rawValue) {
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
                        styles={{ container: { width: '100%', height: '100%' } }}
                      />
                    )}

                    {!activeHash && (
                      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${isCamEnabled ? 'opacity-100' : 'opacity-80'}`}>
                        <div className="absolute inset-0 z-0" style={{ boxShadow: 'inset 0 0 0 5000px rgba(0, 0, 0, 0.5)' }}></div>
                        <div className="absolute inset-0 flex justify-center items-center z-10 z-10">
                          <div className="relative w-full max-w-[240px] md:max-w-[300px] h-full max-h-[240px] md:max-h-[300px] box-border" style={{ boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)' }}>
                            <div className="absolute -top-1 -left-1 w-10 md:w-14 h-10 md:h-14 border-t-[5px] border-l-[5px] rounded-tl-2xl border-[#00ff88]"></div>
                            <div className="absolute -top-1 -right-1 w-10 md:w-14 h-10 md:h-14 border-t-[5px] border-r-[5px] rounded-tr-2xl border-[#00ff88]"></div>
                            <div className="absolute -bottom-1 -left-1 w-10 md:w-14 h-10 md:h-14 border-b-[5px] border-l-[5px] rounded-bl-2xl border-[#00ff88]"></div>
                            <div className="absolute -bottom-1 -right-1 w-10 md:w-14 h-10 md:h-14 border-b-[5px] border-r-[5px] rounded-br-2xl border-[#00ff88]"></div>
                            
                            <div className="absolute -left-2 -right-2 top-0 h-[60%] overflow-hidden pointer-events-none scan-glow">
                              <div className="absolute bottom-0 w-full h-full bg-gradient-to-t from-[#00ff8855] to-transparent"></div>
                              <div className="absolute bottom-0 w-full h-[3px] bg-[#00ff88] rounded-full shadow-[0_0_8px_#00ff88]"></div>
                            </div>
                            
                            {!isCamEnabled && (
                              <div className="absolute inset-0 flex items-center justify-center p-4">
                                <div className="text-center rounded-xl bg-black/50 backdrop-blur-sm p-4 ring-1 ring-[#00ff88]/30 shadow-xl">
                                  {isFetching ? (
                                    <><Loader2 size={32} className="mx-auto text-green-400 animate-spin" /><p className="text-green-300 text-sm mt-2 font-semibold tracking-wide">Buscando...</p></>
                                  ) : (
                                    <><QrCode size={32} className="mx-auto text-[#00ff88]" /><p className="text-[#00ff88] text-sm mt-2 font-semibold tracking-wide">Listo</p></>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 sm:p-6 bg-white border-t border-gray-100 rounded-b-2xl">
                    <button
                      onClick={() => setIsCamEnabled(!isCamEnabled)}
                      className="w-full py-3 flex items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 pulse-ring"
                      style={{ background: isCamEnabled ? 'linear-gradient(135deg, #1f2937, #111827)' : 'linear-gradient(135deg, #006341, #00a866)' }}
                    >
                      {isCamEnabled ? (
                        <><CameraOff size={16} /> Detener Cámara</>
                      ) : (
                        <><CameraIcon size={16} /> Usar Cámara del Dispositivo</>
                      )}
                    </button>

                    <p className="text-center text-gray-500 text-xs mt-6 mb-2">Conecta el escáner USB y captura el código</p>
                    <div className="flex gap-2">
                      <input
                        value={manualInput}
                        onChange={e => setManualInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        placeholder="Identificador o serie..."
                        className="flex-1 text-xs px-3 py-2.5 rounded-xl border border-gray-600 bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                      />
                      <button onClick={handleSearch}
                        className="px-3 py-2.5 rounded-xl text-white text-xs font-bold transition-all hover:bg-green-700"
                        style={{ backgroundColor: '#006341' }}>
                        <Search size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 md:p-8 fade-in">
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-full mx-auto flex items-center justify-center mb-3"
                      style={{ backgroundColor: '#dcfce7' }}>
                      <Check size={28} style={{ color: '#006341' }} />
                    </div>
                    <p className="text-white text-lg md:text-xl font-bold">{foundAsset.equipo}</p>
                    <p className="text-gray-400 text-sm mt-1 font-mono">{foundAsset.numSerie}</p>
                  </div>

                  <div className="bg-gray-800 rounded-xl p-4 md:p-5 space-y-3 text-sm">
                    {[
                      ['Unidad de Ubicación', foundAsset.ubicacion],
                      ['Matrícula', foundAsset.matricula],
                      ['Resguardo', foundAsset.usuario],
                      ['Actualizado', foundAsset.actualizacion],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4">
                        <span className="text-gray-500 whitespace-nowrap">{k}</span>
                        <span className="text-gray-200 font-medium text-right line-clamp-1">{v}</span>
                      </div>
                    ))}
                    
                    {foundAsset.specs?.hasSpecs && (
                      <div className="pt-2 mt-2 border-t border-gray-700/50 space-y-2">
                        <div className="text-[10px] uppercase font-bold tracking-wider text-[#00ff88] mb-1">Especificaciones TI</div>
                        {[
                          ['Equipo', foundAsset.specs.nom_pc],
                          ['CPU', foundAsset.specs.cpu],
                          ['RAM (GB)', foundAsset.specs.ram],
                          ['Almacenamiento (GB)', foundAsset.specs.almacenamiento],
                          ['IP', foundAsset.specs.ip],
                          ['MAC', foundAsset.specs.mac_eth],
                          ['SO', foundAsset.specs.os],
                        ].filter(([, v]) => v).map(([k, v]) => (
                           <div key={k} className="flex justify-between gap-4">
                            <span className="text-gray-500 whitespace-nowrap">{k}</span>
                            <span className="text-gray-200 font-medium text-right line-clamp-1">{v}</span>
                           </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex justify-between pt-2 border-t border-gray-700">
                      <span className="text-gray-500">Estatus</span>
                      <span className="font-bold" style={{ color: STATUS_COLOR[foundAsset.estatus] || '#fff' }}>
                        {foundAsset.estatus}
                      </span>
                    </div>
                  </div>

                  <button onClick={handleReset}
                    className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold text-gray-400 border border-gray-700 hover:bg-gray-800 transition-colors">
                    ← Escanear otro
                  </button>

                  {puedeEditar && (
                    <div className="flex gap-3 mt-4 pt-4 border-t border-gray-800">
                      <button onClick={() => setEditModalOpen(true)} className="flex-1 py-2.5 flex justify-center items-center gap-2 rounded-xl text-sm font-semibold text-amber-500 border border-amber-900/50 hover:bg-amber-900/20 transition-colors">
                        <Edit size={16} /> Editar
                      </button>
                      <button onClick={handleDelete} className="flex-1 py-2.5 flex justify-center items-center gap-2 rounded-xl text-sm font-semibold text-red-500 border border-red-900/50 hover:bg-red-900/20 transition-colors">
                        <Trash2 size={16} /> Eliminar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Note Form */}
        {foundAsset && !notaSaved && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 fade-in">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <StickyNote size={15} style={{ color: '#0ea5e9' }} />
              Añadir una Nota al Bien
            </h3>
            <div className="space-y-3">
              <textarea
                value={notaText}
                onChange={e => setNotaText(e.target.value)}
                rows={2}
                placeholder="Observaciones rápidas, condición del equipo..."
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
              />
              <button
                disabled={isCreatingNota || !notaText.trim()}
                onClick={handleCreateNota}
                className="w-full py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}>
                {isCreatingNota && <Loader2 size={16} className="animate-spin" />}
                Guardar Nota
              </button>
            </div>
          </div>
        )}

        {notaSaved && (
          <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5 text-center fade-in">
            <Check size={28} className="mx-auto text-sky-600 mb-2" />
            <p className="font-bold text-sky-800">Nota guardada correctamente</p>
            <p className="text-sm text-sky-600 mt-1">La observación se asignó al historial del bien.</p>
          </div>
        )}
      </div>

      {editModalOpen && foundAsset && (
        <EditBienModal 
          asset={foundAsset} 
          onClose={() => setEditModalOpen(false)} 
        />
      )}
    </div>
  );
}
