import React from 'react';
import { X, Building2, Globe, Shield, Activity, Calendar, Phone, User, Hash, Zap } from 'lucide-react';

export default function DetalleUnidadModal({ isOpen, onClose, unidad }) {
  if (!isOpen || !unidad) return null;

  const DetailItem = ({ icon: Icon, label, value, color = "blue" }) => (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-colors">
      <div className={`p-2 rounded-lg bg-${color}-100 text-${color}-600`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-gray-900">{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 transition-opacity" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 bg-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
              <Building2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{unidad.nombre || 'Sin nombre'}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase">
                  {unidad.no_ref}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${unidad.estatus === 1 ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-500 border-gray-200'} uppercase`}>
                  {unidad.estatus === 1 ? 'Activa' : 'Inactiva'}
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
          
          {/* Section: Información General */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-4 w-1 bg-blue-600 rounded-full"></div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Información General</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <DetailItem icon={Hash} label="Clave Interna" value={unidad.clave} />
              <DetailItem icon={User} label="Encargado" value={unidad.encargado} />
              <DetailItem icon={Phone} label="Teléfono" value={unidad.telefono} />
              <DetailItem icon={Calendar} label="Migración" value={unidad.fecha_migracion ? new Date(unidad.fecha_migracion).toLocaleDateString() : null} />
              <DetailItem icon={Building2} label="Proveedor" value={unidad.proveedor} />
            </div>
          </section>

          {/* Section: Detalles de Red */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-4 w-1 bg-green-600 rounded-full"></div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight text-green-700">Configuración de Red</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <DetailItem icon={Globe} label="Dirección IP" value={unidad.ip} color="green" />
              <DetailItem icon={Zap} label="IP Inicial (Octeto)" value={unidad.ip_init} color="green" />
              <DetailItem icon={Activity} label="VLAN" value={unidad.vlan} color="green" />
              <DetailItem icon={Activity} label="Bits" value={unidad.bits} color="green" />
              <DetailItem icon={Activity} label="Velocidad" value={unidad.velocidad} color="green" />
              <DetailItem icon={Zap} label="Tipo de Enlace" value={unidad.tipo_enlace} color="green" />
              <DetailItem icon={Activity} label="Monitoreo" value={unidad.monitorear === 1 ? 'Habilitado' : 'Deshabilitado'} color={unidad.monitorear === 1 ? 'green' : 'gray'} />
            </div>
          </section>

          {/* Section: Clasificación */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-4 w-1 bg-purple-600 rounded-full"></div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight text-purple-700">Clasificación Operativa</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <DetailItem icon={Building2} label="Tipo de Unidad (ID)" value={unidad.tipo_unidad} color="purple" />
              <DetailItem icon={Shield} label="Régimen" value={unidad.regimen} color="purple" />
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
