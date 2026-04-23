import React from 'react';
import { X, Building2, MapPin, User, Phone, Hash, Layers, Info, Settings, Shield } from 'lucide-react';

export default function DetalleInmuebleModal({ isOpen, onClose, inmueble }) {
  if (!isOpen || !inmueble) return null;

  const DetailItem = ({ icon: Icon, label, value, color = "blue" }) => (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-colors">
      <div className={`p-2 rounded-lg bg-${color}-100 text-${color}-600 flex-shrink-0`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-gray-900 leading-tight">{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 transition-opacity" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 bg-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
              <Building2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{inmueble.descripcion || 'Sin descripción'}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase">
                  Clave: {inmueble.clave}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-50 text-gray-600 border border-gray-200 uppercase">
                  Zona: {inmueble.clave_zona}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
          
          {/* Section: Información Principal */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-4 w-1 bg-blue-600 rounded-full"></div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Información Principal</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <DetailItem icon={Hash} label="Clave Inmueble" value={inmueble.clave} />
              <DetailItem icon={Info} label="Desc. Corta" value={inmueble.desc_corta} />
              <DetailItem icon={User} label="Encargado" value={inmueble.encargado} />
              <DetailItem icon={Phone} label="Teléfono" value={inmueble.telefono} />
            </div>
          </section>

          {/* Section: Ubicación Completa */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-4 w-1 bg-green-600 rounded-full"></div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight text-green-700">Ubicación y Dirección</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="md:col-span-3">
                <DetailItem icon={MapPin} label="Dirección Completa" value={inmueble.direccion} color="green" />
              </div>
              <DetailItem icon={MapPin} label="Calle" value={inmueble.calle} color="green" />
              <DetailItem icon={MapPin} label="Número" value={inmueble.numero} color="green" />
              <DetailItem icon={MapPin} label="Colonia" value={inmueble.colonia} color="green" />
              <DetailItem icon={MapPin} label="Ciudad" value={inmueble.ciudad} color="green" />
              <DetailItem icon={MapPin} label="Municipio" value={inmueble.municipio} color="green" />
              <DetailItem icon={Layers} label="C.P." value={inmueble.cp} color="green" />
            </div>
          </section>

          {/* Section: Datos Técnicos y Clasificación */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-4 w-1 bg-purple-600 rounded-full"></div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight text-purple-700">Datos Técnicos y Clasificación</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <DetailItem icon={Settings} label="Tipo de Unidad" value={inmueble.tipoUnidadInfo?.tipo_unidad || `ID: ${inmueble.tipo_unidad}`} color="purple" />
              <DetailItem icon={Shield} label="Régimen" value={inmueble.regimen === 19 ? 'Ordinario (19)' : (inmueble.regimen === 64 ? 'IMSS-B (64)' : (inmueble.regimen === 69 ? 'OPD IMSS-B (69)' : inmueble.regimen))} color="purple" />
              <DetailItem icon={Layers} label="Nivel" value={inmueble.nivel} color="purple" />
              <DetailItem icon={Layers} label="No. Inmueble" value={inmueble.no_inmueble} color="purple" />
              <DetailItem icon={Layers} label="Ppal" value={inmueble.ppal} color="purple" />
              <DetailItem icon={Layers} label="Clave A" value={inmueble.clave_a} color="purple" />
              <DetailItem icon={Layers} label="Zona Reporte" value={inmueble.zona_reporte} color="purple" />
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-200">
            Cerrar Detalles
          </button>
        </div>
      </div>
    </div>
  );
}
