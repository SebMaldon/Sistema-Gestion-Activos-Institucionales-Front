import React from 'react';
import { X, Building2, MapPin, User, Phone, Hash, Layers, Info, Settings, Shield, Network } from 'lucide-react';
import { useCatTipoUnidades } from '../hooks/useUnidades';
import DetalleSegmentoModal from './DetalleSegmentoModal';

export default function DetalleUnidadModal({ isOpen, onClose, unidad }) {
  const { data: catTipos } = useCatTipoUnidades();
  const [activeTab, setActiveTab] = React.useState('general');
  const [selectedSegmento, setSelectedSegmento] = React.useState(null);

  if (!isOpen || !unidad) return null;

  const encargado = unidad.unidadesACargo?.find(u => u.id_rol_empleado === 1)?.usuario?.nombre_completo || '—';
  const administrador = unidad.unidadesACargo?.find(u => u.id_rol_empleado === 2)?.usuario?.nombre_completo || '—';
  const informatica = unidad.unidadesACargo?.find(u => u.id_rol_empleado === 3)?.usuario?.nombre_completo || '—';

  const telefonos = unidad.contactos?.filter(c => c.tipo_contacto === 'telefonico').map(c => c.contacto).join(' / ') || '—';
  const correos = unidad.contactos?.filter(c => c.tipo_contacto === 'correo electronico').map(c => c.contacto).join(' / ') || '—';

  const DetailItem = ({ icon: Icon, label, value, color = "blue" }) => (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-colors min-w-0">
      <div className={`p-2 rounded-lg bg-${color}-100 text-${color}-600 flex-shrink-0`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">{label}</p>
        <p className="text-sm font-semibold text-gray-900 leading-tight break-words">{value || '—'}</p>
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
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-gray-900 break-words leading-tight" title={unidad.descripcion}>{unidad.descripcion || 'Sin descripción'}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase">
                  Clave: {unidad.clave}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-50 text-gray-600 border border-gray-200 uppercase">
                  Zona: {unidad.clave_zona}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 bg-gray-50/50">
          <button 
            onClick={() => setActiveTab('general')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Info size={16} /> Información Principal
          </button>
          <button 
            onClick={() => setActiveTab('ubicacion')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'ubicacion' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <MapPin size={16} /> Ubicación y Dirección
          </button>
          <button 
            onClick={() => setActiveTab('tecnico')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'tecnico' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Settings size={16} /> Datos Técnicos
          </button>
          <button 
            onClick={() => setActiveTab('segmentos')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'segmentos' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Network size={16} /> Segmentos Asociados
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
          
          {/* Section: Información Principal */}
          {activeTab === 'general' && (
            <section className="animate-in fade-in duration-300">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-4 w-1 bg-blue-600 rounded-full"></div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Información Principal</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <DetailItem icon={Hash} label="Clave unidad" value={unidad.clave} />
                <DetailItem icon={Info} label="Desc. Corta" value={unidad.desc_corta} />
                <DetailItem icon={User} label="Encargado" value={encargado} />
                <DetailItem icon={User} label="Administrador" value={administrador} />
                <DetailItem icon={Settings} label="Informática" value={informatica} />
                <DetailItem icon={Info} label="Encargado (Físico)" value={unidad.encargado} />
              </div>
            </section>
          )}

          {/* Section: Ubicación Completa */}
          {activeTab === 'ubicacion' && (
            <section className="animate-in fade-in duration-300">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-4 w-1 bg-green-600 rounded-full"></div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight text-green-700">Ubicación y Dirección</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="md:col-span-3">
                  <DetailItem icon={MapPin} label="Dirección Completa" value={unidad.direccion} color="green" />
                </div>
                <DetailItem icon={MapPin} label="Calle" value={unidad.calle} color="green" />
                <DetailItem icon={MapPin} label="Número" value={unidad.numero} color="green" />
                <DetailItem icon={MapPin} label="Colonia" value={unidad.colonia} color="green" />
                <DetailItem icon={MapPin} label="Ciudad" value={unidad.ciudad} color="green" />
                <DetailItem icon={MapPin} label="Municipio" value={unidad.municipio} color="green" />
                <DetailItem icon={Layers} label="C.P." value={unidad.cp} color="green" />
              </div>

              <div className="flex items-center gap-2 mt-6 mb-4">
                <div className="h-4 w-1 bg-teal-600 rounded-full"></div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight text-teal-700">Contactos</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <DetailItem icon={Phone} label="Teléfono(s)" value={telefonos} color="teal" />
                <DetailItem icon={Info} label="Correo(s) Electrónico(s)" value={correos} color="teal" />
              </div>
            </section>
          )}

          {/* Section: Datos Técnicos y Clasificación */}
          {activeTab === 'tecnico' && (
            <section className="animate-in fade-in duration-300">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-4 w-1 bg-purple-600 rounded-full"></div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight text-purple-700">Datos Técnicos y Clasificación</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <DetailItem 
                  icon={Settings} 
                  label="Tipo de Unidad" 
                  value={unidad.tipoUnidadInfo?.tipo_unidad || catTipos?.find(t => t.id_tipo === unidad.tipo_unidad)?.tipo_unidad || unidad.tipo_unidad || 'SIN TIPO'} 
                  color="purple" 
                />
                <DetailItem 
                  icon={Shield} 
                  label="Régimen" 
                  value={unidad.regimen} 
                  color="purple" 
                />
                <DetailItem icon={Layers} label="Nivel" value={unidad.nivel} color="purple" />
                <DetailItem icon={Layers} label="No. unidad" value={unidad.no_inmueble} color="purple" />
                <DetailItem icon={Layers} label="Ppal" value={unidad.ppal} color="purple" />
                <DetailItem icon={Layers} label="Clave A" value={unidad.clave_a} color="purple" />
                <DetailItem icon={Layers} label="Clave Zona" value={unidad.clave_zona} color="purple" />
                <DetailItem icon={Layers} label="Zona Reporte" value={unidad.zona_reporte} color="purple" />
              </div>
            </section>
          )}

          {/* Section: Segmentos */}
          {activeTab === 'segmentos' && (
            <section className="animate-in fade-in duration-300">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-4 w-1 bg-orange-600 rounded-full"></div>
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight text-orange-700">Segmentos de Red Asociados</h3>
              </div>
              
              {unidad.segmentos && unidad.segmentos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {unidad.segmentos.map(seg => (
                    <div 
                      key={seg.id_segmento} 
                      onClick={() => setSelectedSegmento(seg)}
                      className="p-3 rounded-xl bg-orange-50/50 border border-orange-100 flex flex-col gap-1 hover:border-orange-300 hover:shadow-md cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-2 text-orange-700 font-bold text-xs uppercase tracking-wider mb-1">
                        <Network size={14} />
                        {seg.nombre || `REF: ${seg.no_ref}`}
                      </div>
                      <p className="text-sm font-semibold text-gray-900">IP: {seg.ip}</p>
                      {seg.velocidad ? <p className="text-xs font-medium text-gray-600">Velocidad: {seg.velocidad}</p> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                  <Network size={24} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm font-medium text-gray-600">No hay segmentos de red asociados a esta unidad</p>
                </div>
              )}
            </section>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-200">
            Cerrar Detalles
          </button>
        </div>
      </div>

      <DetalleSegmentoModal 
        isOpen={!!selectedSegmento} 
        onClose={() => setSelectedSegmento(null)} 
        segmento={selectedSegmento} 
      />
    </div>
  );
}
