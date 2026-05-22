import React, { useState, useMemo } from 'react';
import { X, Check, XCircle, ArrowRight, AlertTriangle, PlusCircle } from 'lucide-react';

// Etiquetas legibles para los campos
const FIELD_LABELS = {
  num_serie: 'No. Serie',
  num_inv: 'No. Inventario',
  estatus_operativo: 'Estatus Operativo',
  clave_unidad_ref: 'Inmueble',
  clave_modelo: 'Modelo',
  id_usuario_resguardo: 'Usuario Resguardo',
  id_unidad: 'Unidad Operativa',
  id_ubicacion: 'Ubicación',
  fecha_adquisicion: 'Fecha Adquisición',
  id_categoria: 'Categoría',
  id_unidad_medida: 'Unidad de Medida',
  id_segmento: 'Segmento',
  cpu_info: 'Procesador (CPU)',
  ram_gb: 'RAM (GB)',
  almacenamiento_gb: 'Almacenamiento (GB)',
  mac_address: 'Dirección MAC',
  dir_ip: 'Dirección IP',
  dir_mac: 'Dir. MAC (alt)',
  puerto_red: 'Puerto de Red',
  switch_red: 'Switch',
  modelo_so: 'Sistema Operativo',
  nom_pc: 'Nombre de Host',
};

// Campos a ignorar en la comparación
const IGNORE_FIELDS = ['_esCreacion', 'id_bien', 'especificacionTI'];

export default function RevisionCambiosModal({ solicitud, onAprobar, onRechazar, onClose }) {
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [showRechazoInput, setShowRechazoInput] = useState(false);
  const [processing, setProcessing] = useState(false);

  const datosNuevos = useMemo(() => {
    try {
      return typeof solicitud.datos_nuevos === 'string'
        ? JSON.parse(solicitud.datos_nuevos)
        : solicitud.datos_nuevos;
    } catch {
      return {};
    }
  }, [solicitud.datos_nuevos]);

  const esCreacion = datosNuevos._esCreacion === true;

  // Datos actuales del bien (puede ser null si es creación)
  const bienActual = solicitud.bien || {};
  const specActual = bienActual.especificacionTI || {};

  // Obtener valor actual de un campo
  const getValorActual = (campo) => {
    if (bienActual[campo] !== undefined && bienActual[campo] !== null) {
      return String(bienActual[campo]);
    }
    if (specActual[campo] !== undefined && specActual[campo] !== null) {
      return String(specActual[campo]);
    }
    return '—';
  };

  // Lista de campos a comparar
  const camposComparar = Object.keys(datosNuevos).filter(
    (k) => !IGNORE_FIELDS.includes(k)
  );

  const handleAprobar = async () => {
    setProcessing(true);
    try {
      await onAprobar(solicitud.id);
    } finally {
      setProcessing(false);
    }
  };

  const handleRechazar = async () => {
    setProcessing(true);
    try {
      await onRechazar(solicitud.id, motivoRechazo);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {esCreacion ? (
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <PlusCircle className="w-5 h-5 text-blue-600" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                {esCreacion ? 'Solicitud de Creación' : 'Revisión de Cambios'}
              </h2>
              <p className="text-sm text-gray-500">
                Solicitado por <strong>{solicitud.solicitante?.nombre_completo}</strong>
                {' — '}
                {new Date(solicitud.fecha_solicitud).toLocaleDateString('es-MX', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body — Comparación */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {camposComparar.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No se encontraron campos para comparar.</p>
          ) : (
            <div className="space-y-1">
              {/* Header de columnas */}
              <div className="grid grid-cols-[1fr_auto_1fr] gap-3 px-4 py-2 mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {esCreacion ? '' : 'Valor Actual'}
                </p>
                <div className="w-6" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {esCreacion ? 'Valor Propuesto' : 'Valor Propuesto'}
                </p>
              </div>

              {camposComparar.map((campo) => {
                const valorActual = esCreacion ? '—' : getValorActual(campo);
                const valorNuevo = String(datosNuevos[campo] ?? '');
                const hayCambio = valorActual !== valorNuevo;
                const label = FIELD_LABELS[campo] || campo;

                return (
                  <div
                    key={campo}
                    className={`grid grid-cols-[1fr_auto_1fr] gap-3 items-center px-4 py-3 rounded-xl transition-colors ${
                      hayCambio ? 'bg-amber-50/70' : 'bg-gray-50/50'
                    }`}
                  >
                    {/* Valor actual */}
                    <div>
                      <p className="text-xs font-medium text-gray-400 mb-0.5">{label}</p>
                      <p className={`text-sm ${hayCambio ? 'text-red-500 line-through' : 'text-gray-600'}`}>
                        {valorActual || '—'}
                      </p>
                    </div>

                    {/* Flecha */}
                    <div className="flex items-center justify-center">
                      <ArrowRight className={`w-4 h-4 ${hayCambio ? 'text-amber-500' : 'text-gray-300'}`} />
                    </div>

                    {/* Valor nuevo */}
                    <div>
                      <p className="text-xs font-medium text-gray-400 mb-0.5">{label}</p>
                      <p className={`text-sm font-semibold ${hayCambio ? 'text-green-600' : 'text-gray-600'}`}>
                        {valorNuevo || '—'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Rechazo — motivo */}
          {showRechazoInput && (
            <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-200">
              <label className="text-sm font-medium text-red-700 block mb-2">
                Motivo del rechazo (opcional)
              </label>
              <textarea
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                placeholder="Describe el motivo por el cual rechazas esta solicitud..."
                rows={3}
                className="w-full px-3 py-2 bg-white border border-red-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
              />
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={() => setShowRechazoInput(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRechazar}
                  disabled={processing}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {processing ? 'Procesando...' : 'Confirmar Rechazo'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!showRechazoInput && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={() => setShowRechazoInput(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-lg border border-red-200 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Rechazar
            </button>
            <button
              onClick={handleAprobar}
              disabled={processing}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {processing ? 'Aprobando...' : 'Aprobar Cambio'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
