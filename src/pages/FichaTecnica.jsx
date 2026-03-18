import React from 'react';
import { useApp } from '../context/AppContext';
import { X, QrCode, Cpu, HardDrive, Wifi, Monitor, Calendar, Shield, Building, User, Package, DollarSign } from 'lucide-react';

const STATUS_BADGE = {
  'Activo': 'badge-activo',
  'En Reparación': 'badge-reparacion',
  'Baja': 'badge-baja',
};

// Simple QR code visual placeholder
function QRPlaceholder({ value }) {
  // Generate a deterministic pattern based on the value string
  const blocks = Array.from({ length: 81 }, (_, i) => {
    const charCode = value.charCodeAt(i % value.length) + i;
    return charCode % 3 === 0;
  });

  return (
    <div className="relative inline-block p-3 bg-white border-2 border-gray-200 rounded-xl">
      {/* Corner markers */}
      <div className="absolute top-3 left-3 w-8 h-8 border-4 rounded-sm" style={{ borderColor: '#006341' }} />
      <div className="absolute top-3 right-3 w-8 h-8 border-4 rounded-sm" style={{ borderColor: '#006341' }} />
      <div className="absolute bottom-3 left-3 w-8 h-8 border-4 rounded-sm" style={{ borderColor: '#006341' }} />
      <div className="grid gap-0.5 mx-auto" style={{ gridTemplateColumns: 'repeat(9, 10px)', padding: '10px' }}>
        {blocks.map((filled, i) => (
          <div key={i} className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: filled ? '#006341' : 'transparent' }} />
        ))}
      </div>
      <p className="text-center text-xs text-gray-500 font-mono mt-1">{value.slice(0, 20)}</p>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f0fdf4' }}>
        <Icon size={14} style={{ color: '#006341' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-sm font-semibold text-gray-800 mt-0.5 break-words">{value || '—'}</p>
      </div>
    </div>
  );
}

function SpecChip({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="text-sm font-bold text-gray-800 mt-0.5">{value || 'N/A'}</p>
    </div>
  );
}

export default function FichaTecnica() {
  const { selectedAsset, isFichaOpen, closeFicha, showToast } = useApp();

  if (!selectedAsset) return null;

  const a = selectedAsset;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity ${isFichaOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={closeFicha}
      />

      {/* Modal */}
      <div className={`fixed right-0 top-0 h-full w-full md:max-w-2xl bg-white z-[60] shadow-2xl flex flex-col transition-transform duration-300 ${isFichaOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between" style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
          <div>
            <p className="text-white/60 text-xs font-medium uppercase tracking-wide">Ficha Técnica del Activo</p>
            <h2 className="text-white font-bold text-lg mt-1 leading-tight">{a.equipo}</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[a.estatus]}`}>
                {a.estatus}
              </span>
              <span className="text-white/50 text-xs">{a.id}</span>
            </div>
          </div>
          <button onClick={closeFicha} className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors mt-1">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* QR Code */}
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <QrCode size={13} /> Código QR del Activo
              </p>
              <QRPlaceholder value={a.qrCode} />
              <button
                onClick={() => showToast(`Código QR descargado para ${a.numSerie}`, 'success')}
                className="mt-2 w-full text-xs font-medium py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5">
                <QrCode size={12} /> Descargar QR
              </button>
            </div>

            {/* Quick Stats */}
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Monitor size={13} /> Especificaciones Técnicas
              </p>
              <div className="grid grid-cols-2 gap-2">
                <SpecChip label="Procesador" value={a.specs.cpu} />
                <SpecChip label="Memoria RAM" value={a.specs.ram} />
                <SpecChip label="Almacenamiento" value={a.specs.storage} />
                <SpecChip label="Dirección IP" value={a.specs.ip} />
                <div className="col-span-2">
                  <SpecChip label="Sistema Operativo" value={a.specs.so} />
                </div>
              </div>
            </div>
          </div>

          {/* Admin Data */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3">
              <Package size={15} style={{ color: '#006341' }} />
              Datos Administrativos
            </h3>
            <div className="divide-y divide-gray-50">
              <InfoRow icon={Building} label="Ubicación" value={a.ubicacion} />
              <InfoRow icon={User} label="Resguardatario" value={a.resguardo} />
              <InfoRow icon={Calendar} label="Fecha de Adquisición" value={a.fechaAdquisicion} />
              <InfoRow icon={Shield} label="Vencimiento de Garantía" value={a.fechaVencimientoGarantia} />
              <InfoRow icon={DollarSign} label="Costo de Adquisición" value={a.costoAdquisicion} />
              <InfoRow icon={Package} label="Partida Presupuestal" value={a.partida} />
              <InfoRow icon={Package} label="Proveedor" value={a.proveedor} />
              <InfoRow icon={Package} label="Número de Serie" value={a.numSerie} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={() => showToast('Reporte de incidencia iniciado para este equipo.', 'info')}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all hover:bg-orange-50"
            style={{ borderColor: '#f59e0b', color: '#ca8a04' }}>
            Reportar Incidencia
          </button>
          <button
            onClick={() => showToast(`PDF de Ficha Técnica generado para ${a.numSerie}`, 'success')}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
            Exportar PDF
          </button>
        </div>
      </div>
    </>
  );
}
