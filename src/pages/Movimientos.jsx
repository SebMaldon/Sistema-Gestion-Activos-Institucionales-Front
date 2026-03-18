import React, { useState } from 'react';
import { mockAssets, mockUsers, UBICACIONES } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { ArrowLeftRight, FileText, Building, User, Package, ChevronRight } from 'lucide-react';

export default function Movimientos() {
  const { showToast } = useApp();
  const [form, setForm] = useState({
    origen: '',
    destino: '',
    equipo: '',
    usuario: '',
    motivo: '',
    fechaTraslado: '2026-03-07',
    observaciones: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [folio, setFolio] = useState('');

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const isComplete = form.origen && form.destino && form.equipo && form.usuario && form.motivo;

  const handleGenerate = () => {
    if (!isComplete) {
      showToast('Complete todos los campos requeridos para generar el formato.', 'warning');
      return;
    }
    const folioNum = `TRP-${Date.now().toString().slice(-6)}`;
    setFolio(folioNum);
    setSubmitted(true);
    showToast(`Formato de Traspaso generado exitosamente — Folio: ${folioNum}`, 'success');
  };

  const handleReset = () => {
    setForm({ origen: '', destino: '', equipo: '', usuario: '', motivo: '', fechaTraslado: '2026-03-07', observaciones: '' });
    setSubmitted(false);
    setFolio('');
  };

  const selectedAsset = mockAssets.find(a => a.id === form.equipo);

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Traspasos y Salidas</h1>
        <p className="text-sm text-gray-500 mt-1">Autorización de movimientos de equipo entre jefaturas</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Form */}
        <div className="xl:col-span-2 space-y-5">
          {submitted ? (
            /* Success State */
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center fade-in">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: '#dcfce7' }}>
                <FileText size={28} style={{ color: '#006341' }} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Formato Generado</h2>
              <p className="text-gray-500 text-sm mt-2">El formato de traspaso ha sido creado y está listo para firma.</p>
              <div className="mt-4 inline-block px-5 py-2 rounded-xl text-sm font-bold"
                style={{ backgroundColor: '#dcfce7', color: '#006341' }}>
                Folio: {folio}
              </div>

              {/* Summary */}
              <div className="mt-6 text-left bg-gray-50 rounded-xl p-5 space-y-3 border border-gray-100">
                {[
                  { label: 'Equipo', value: selectedAsset?.equipo },
                  { label: 'No. Serie', value: selectedAsset?.numSerie },
                  { label: 'Origen', value: form.origen },
                  { label: 'Destino', value: form.destino },
                  { label: 'Resguardatario', value: mockUsers.find(u => u.id === form.usuario)?.nombre },
                  { label: 'Motivo', value: form.motivo },
                  { label: 'Fecha Traslado', value: form.fechaTraslado },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-baseline gap-3">
                    <span className="text-xs text-gray-400 font-medium w-28 flex-shrink-0">{label}</span>
                    <span className="text-sm font-semibold text-gray-800">{value || '—'}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex gap-3 justify-center">
                <button
                  onClick={() => showToast('PDF del formato enviado a impresión.', 'success')}
                  className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold"
                  style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
                  Imprimir / Firmar
                </button>
                <button
                  onClick={handleReset}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 hover:bg-gray-50">
                  Nuevo Traspaso
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#dcfce7' }}>
                  <ArrowLeftRight size={18} style={{ color: '#006341' }} />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">Solicitud de Traspaso</h2>
                  <p className="text-xs text-gray-400">Complete el formulario para generar el formato oficial</p>
                </div>
              </div>

              {/* Origin & Destination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    <Building size={11} className="inline mr-1" />
                    Jefatura de Origen *
                  </label>
                  <select name="origen" value={form.origen} onChange={handleChange}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-green-500 bg-white">
                    <option value="">—Seleccionar—</option>
                    {UBICACIONES.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    <Building size={11} className="inline mr-1" />
                    Jefatura de Destino *
                  </label>
                  <select name="destino" value={form.destino} onChange={handleChange}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-green-500 bg-white">
                    <option value="">—Seleccionar—</option>
                    {UBICACIONES.filter(u => u !== form.origen).map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* Asset Select */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  <Package size={11} className="inline mr-1" />
                  Equipo a Trasladar *
                </label>
                <select name="equipo" value={form.equipo} onChange={handleChange}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-green-500 bg-white">
                  <option value="">—Seleccionar Activo—</option>
                  {mockAssets.filter(a => a.estatus === 'Activo').map(a => (
                    <option key={a.id} value={a.id}>{a.equipo} — {a.numSerie}</option>
                  ))}
                </select>
              </div>

              {/* User Select */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  <User size={11} className="inline mr-1" />
                  Nuevo Resguardatario *
                </label>
                <select name="usuario" value={form.usuario} onChange={handleChange}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-green-500 bg-white">
                  <option value="">—Seleccionar Usuario—</option>
                  {mockUsers.filter(u => u.activo).map(u => (
                    <option key={u.id} value={u.id}>{u.nombre} — {u.area}</option>
                  ))}
                </select>
              </div>

              {/* Motivo + Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Motivo del Traspaso *</label>
                  <select name="motivo" value={form.motivo} onChange={handleChange}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-green-500 bg-white">
                    <option value="">—Seleccionar—</option>
                    <option>Reubicación de Personal</option>
                    <option>Optimización de Recursos</option>
                    <option>Equipo de Reemplazo</option>
                    <option>Préstamo Temporal</option>
                    <option>Baja y Sustitución</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Fecha de Traslado</label>
                  <input type="date" name="fechaTraslado" value={form.fechaTraslado} onChange={handleChange}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-green-500" />
                </div>
              </div>

              {/* Observations */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Observaciones</label>
                <textarea
                  name="observaciones"
                  value={form.observaciones}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Notas adicionales para el formato de traspaso..."
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
                />
              </div>

              <button
                onClick={handleGenerate}
                className={`w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all ${
                  isComplete ? 'hover:opacity-90' : 'opacity-50 cursor-not-allowed'
                }`}
                style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
                <FileText size={16} />
                Generar Formato de Traspaso (PDF)
              </button>
            </div>
          )}
        </div>

        {/* Preview Panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4">Vista Previa del Equipo</h3>
            {selectedAsset ? (
              <div className="space-y-3 fade-in">
                <div className="p-3 rounded-xl" style={{ backgroundColor: '#f0fdf4' }}>
                  <p className="text-xs text-gray-400">Equipo</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">{selectedAsset.equipo}</p>
                </div>
                {[
                  ['No. Serie', selectedAsset.numSerie],
                  ['Tipo', selectedAsset.tipo],
                  ['CPU', selectedAsset.specs.cpu],
                  ['RAM', selectedAsset.specs.ram],
                  ['Ubic. Actual', selectedAsset.ubicacion],
                  ['Resguardo Actual', selectedAsset.resguardo],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-start gap-2">
                    <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
                    <span className="text-xs font-semibold text-gray-700 text-right">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-300 text-sm">
                <Package size={32} className="mx-auto mb-2 opacity-30" />
                Selecciona un equipo
              </div>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-amber-700 mb-1">⚠ Nota Legal</p>
            <p className="text-xs text-amber-600 leading-relaxed">
              El formato de Traspaso de Equipo requiere firma autógrafa del Jefe de Área de origen y del Coordinador de Informática. Conservar copia en expediente del activo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
