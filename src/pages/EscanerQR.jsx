import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { mockAssets } from '../data/mockData';
import { QrCode, Camera, AlertTriangle, Search, Check, Smartphone } from 'lucide-react';

export default function EscanerQR() {
  const { showToast, openFicha } = useApp();
  const [manualInput, setManualInput] = useState('');
  const [foundAsset, setFoundAsset] = useState(null);
  const [scanning, setScanning] = useState(true);
  const [report, setReport] = useState({ tipo: '', descripcion: '' });
  const [reportSent, setReportSent] = useState(false);

  const handleSearch = () => {
    const q = manualInput.trim().toLowerCase();
    const asset = mockAssets.find(a =>
      a.numSerie.toLowerCase().includes(q) || a.id.toLowerCase().includes(q) || a.qrCode.toLowerCase().includes(q)
    );
    if (asset) {
      setFoundAsset(asset);
      setScanning(false);
      showToast(`Activo encontrado: ${asset.equipo}`, 'success');
    } else {
      showToast('No se encontró ningún activo con ese código o serie.', 'error');
    }
  };

  const handleSimulateScan = () => {
    const randomAsset = mockAssets[Math.floor(Math.random() * mockAssets.length)];
    setFoundAsset(randomAsset);
    setScanning(false);
    showToast(`QR escaneado: ${randomAsset.equipo}`, 'success');
  };

  const handleSendReport = () => {
    if (!report.tipo || !report.descripcion) {
      showToast('Complete el tipo y descripción de la incidencia.', 'warning');
      return;
    }
    setReportSent(true);
    showToast('Incidencia reportada exitosamente. El área de informática será notificada.', 'success');
  };

  const handleReset = () => {
    setFoundAsset(null);
    setScanning(true);
    setManualInput('');
    setReport({ tipo: '', descripcion: '' });
    setReportSent(false);
  };

  const STATUS_COLOR = {
    'Activo': '#16a34a', 'En Reparación': '#ca8a04', 'Baja': '#dc2626'
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Escáner QR</h1>
        <p className="text-sm text-gray-500 mt-1">Escanea el código QR del equipo o ingresa el número de serie manualmente</p>
      </div>

      <div className="max-w-lg mx-auto space-y-5 w-full">
        {/* Mobile Frame */}
        <div className="relative mx-auto w-full max-w-xs">
          {/* Phone body */}
          <div className="relative rounded-[36px] overflow-hidden shadow-2xl border-4 border-gray-800"
            style={{ background: '#111' }}>
            {/* Notch */}
            <div className="absolute top-0 left-0 right-0 h-8 flex items-center justify-center z-10">
              <div className="w-24 h-5 bg-black rounded-b-2xl flex items-center justify-center gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-700" />
                <div className="w-1 h-1 rounded-full bg-gray-600" />
              </div>
            </div>

            {/* Screen */}
            <div className="relative pt-8 pb-6 px-4" style={{ minHeight: 420, background: scanning ? '#000' : '#111827' }}>
              {scanning ? (
                /* Camera view */
                <div className="relative mt-4">
                  {/* Viewfinder */}
                  <div className="relative rounded-2xl overflow-hidden" style={{ height: 280, background: 'linear-gradient(135deg, #0d1117, #1a2332)' }}>
                    {/* Corner markers */}
                    {[['top-3 left-3', 'border-t-2 border-l-2'],
                      ['top-3 right-3', 'border-t-2 border-r-2'],
                      ['bottom-3 left-3', 'border-b-2 border-l-2'],
                      ['bottom-3 right-3', 'border-b-2 border-r-2']].map(([pos, borders], i) => (
                      <div key={i} className={`absolute ${pos} w-7 h-7 ${borders} rounded-sm`} style={{ borderColor: '#00ff88' }} />
                    ))}

                    {/* Scan line */}
                    <div className="scan-line absolute left-6 right-6 h-0.5 rounded-full"
                      style={{ background: 'linear-gradient(90deg, transparent, #00ff88, transparent)' }} />

                    {/* Center text */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <QrCode size={32} className="mx-auto text-green-400 opacity-40" />
                        <p className="text-green-300 text-xs mt-2 opacity-60">Escaneando código QR...</p>
                      </div>
                    </div>
                  </div>

                  {/* Simulate button */}
                  <button
                    onClick={handleSimulateScan}
                    className="mt-4 w-full py-3 rounded-xl text-sm font-bold text-white pulse-ring"
                    style={{ background: 'linear-gradient(135deg, #006341, #00a866)' }}>
                    📷 Simular Escaneo
                  </button>

                  <p className="text-center text-gray-500 text-xs mt-3">o ingresa el No. de Serie</p>
                  <div className="flex gap-2 mt-2">
                    <input
                      value={manualInput}
                      onChange={e => setManualInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                      placeholder="SN-... o ACT-..."
                      className="flex-1 text-xs px-3 py-2.5 rounded-xl border border-gray-600 bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                    />
                    <button onClick={handleSearch}
                      className="px-3 py-2.5 rounded-xl text-white text-xs font-bold"
                      style={{ backgroundColor: '#006341' }}>
                      <Search size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                /* Found Asset */
                <div className="mt-4 fade-in">
                  <div className="text-center mb-4">
                    <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-2"
                      style={{ backgroundColor: '#dcfce7' }}>
                      <Check size={22} style={{ color: '#006341' }} />
                    </div>
                    <p className="text-white text-sm font-bold">{foundAsset.equipo}</p>
                    <p className="text-gray-400 text-xs mt-0.5 font-mono">{foundAsset.numSerie}</p>
                  </div>

                  <div className="bg-gray-800 rounded-xl p-3 space-y-2 text-xs">
                    {[
                      ['Ubicación', foundAsset.ubicacion],
                      ['Resguardo', foundAsset.resguardo.split(' ').slice(-2).join(' ')],
                      ['CPU', foundAsset.specs.cpu],
                      ['RAM', foundAsset.specs.ram],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-gray-500">{k}</span>
                        <span className="text-gray-200 font-medium text-right max-w-[110px] truncate">{v}</span>
                      </div>
                    ))}
                    <div className="flex justify-between">
                      <span className="text-gray-500">Estatus</span>
                      <span className="font-bold" style={{ color: STATUS_COLOR[foundAsset.estatus] || '#fff' }}>
                        {foundAsset.estatus}
                      </span>
                    </div>
                  </div>

                  <button onClick={handleReset}
                    className="mt-3 w-full py-2 rounded-xl text-xs font-semibold text-gray-400 border border-gray-700 hover:bg-gray-800 transition-colors">
                    ← Escanear otro
                  </button>
                </div>
              )}
            </div>

            {/* Home bar */}
            <div className="h-1 w-24 bg-gray-600 rounded-full mx-auto mb-2" />
          </div>

          {/* Side buttons */}
          <div className="absolute -right-2 top-20 w-1.5 h-12 bg-gray-700 rounded-full" />
          <div className="absolute -left-2 top-16 w-1.5 h-8 bg-gray-700 rounded-full" />
          <div className="absolute -left-2 top-28 w-1.5 h-8 bg-gray-700 rounded-full" />
        </div>

        {/* Report Incident Form */}
        {foundAsset && !reportSent && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 fade-in">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <AlertTriangle size={15} style={{ color: '#ca8a04' }} />
              Reportar Incidencia para este Equipo
            </h3>
            <div className="space-y-3">
              <select
                value={report.tipo}
                onChange={e => setReport(prev => ({ ...prev, tipo: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-green-500 bg-white">
                <option value="">— Tipo de falla —</option>
                <option>Falla de Hardware</option>
                <option>Problema de Software</option>
                <option>Conectividad / Red</option>
                <option>Periférico dañado</option>
                <option>Pantalla / Display</option>
                <option>Batería / Carga</option>
                <option>Otro</option>
              </select>
              <textarea
                value={report.descripcion}
                onChange={e => setReport(prev => ({ ...prev, descripcion: e.target.value }))}
                rows={3}
                placeholder="Describe el problema con detalle..."
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
              />
              <button
                onClick={handleSendReport}
                className="w-full py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)' }}>
                Enviar Reporte de Incidencia
              </button>
            </div>
          </div>
        )}

        {reportSent && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center fade-in">
            <Check size={28} className="mx-auto text-green-600 mb-2" />
            <p className="font-bold text-green-800">Reporte enviado correctamente</p>
            <p className="text-sm text-green-600 mt-1">El equipo de informática recibirá la notificación.</p>
            <button onClick={handleReset}
              className="mt-3 text-xs text-green-600 underline">
              Escanear otro equipo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
