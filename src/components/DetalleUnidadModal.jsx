import React from 'react';
import { X, Building2, MapPin, User, Phone, Hash, Layers, Info, Settings, Shield, Network } from 'lucide-react';
import ReactDOM from 'react-dom';
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

 const colorMap = {
 blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
 green: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
 teal: "bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400",
 purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
 orange: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
 };

 const DetailItem = ({ icon: Icon, label, value, color = "blue" }) => (
 <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:border-gray-700 transition-colors min-w-0">
 <div className={`p-2 rounded-lg flex-shrink-0 ${colorMap[color] || colorMap.blue}`}>
 <Icon size={18} />
 </div>
 <div className="min-w-0 flex-1">
 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">{label}</p>
 <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight break-words">{value || '—'}</p>
 </div>
 </div>
 );

 return ReactDOM.createPortal(
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
 <div className="absolute inset-0 bg-black/50 dark:bg-black/70 transition-opacity pointer-events-none" />
 <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
 
 {/* Header */}
 <div className="bg-[#00472e] dark:bg-[#002618] px-6 py-5 flex items-center justify-between text-white shrink-0">
 <div className="min-w-0">
 <h2 className="text-xl font-bold break-words leading-tight" title={unidad.descripcion}>{unidad.descripcion || 'Sin descripción'}</h2>
 <div className="flex items-center gap-2 mt-1">
 <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30 uppercase">
 Clave: {unidad.clave}
 </span>
 <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-gray-200 border border-white/20 uppercase">
 Zona: {unidad.clave_zona}
 </span>
 </div>
 </div>
 <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors shrink-0">
 <X size={20} />
 </button>
 </div>

 {/* Tabs */}
 <div className="flex border-b border-gray-100 dark:border-gray-800 px-6 bg-gray-50 dark:bg-gray-900 ">
 <button 
 onClick={() => setActiveTab('general')}
 className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'general' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 '}`}
 >
 <Info size={16} /> Información Principal
 </button>
 <button 
 onClick={() => setActiveTab('ubicacion')}
 className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'ubicacion' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 '}`}
 >
 <MapPin size={16} /> Ubicación y Dirección
 </button>
 <button 
 onClick={() => setActiveTab('tecnico')}
 className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'tecnico' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 '}`}
 >
 <Settings size={16} /> Datos Técnicos
 </button>
 <button 
 onClick={() => setActiveTab('segmentos')}
 className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'segmentos' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 '}`}
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
 <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight">Información Principal</h3>
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
 <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight text-green-700 dark:text-green-400 dark:text-green-300">Ubicación y Dirección</h3>
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
 <div className="md:col-span-2 lg:col-span-3">
 <DetailItem icon={MapPin} label="Coordenadas (Lat, Long)" value={unidad.ubicacion_coordenada} color="green" />
 </div>
 </div>

 <div className="flex items-center gap-2 mt-6 mb-4">
 <div className="h-4 w-1 bg-teal-600 rounded-full"></div>
 <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight text-teal-700 dark:text-teal-400">Contactos</h3>
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
 <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight text-purple-700 dark:text-purple-400">Datos Técnicos y Clasificación</h3>
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
 <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight text-orange-700 dark:text-orange-400">Segmentos de Red Asociados</h3>
 </div>
 
 {unidad.segmentos && unidad.segmentos.length > 0 ? (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
 {unidad.segmentos.map(seg => (
 <div 
 key={seg.id_segmento} 
 onClick={() => setSelectedSegmento(seg)}
 className="p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/50 flex flex-col gap-1 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-md cursor-pointer transition-all"
 >
 <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 font-bold text-xs uppercase tracking-wider mb-1">
 <Network size={14} />
 {seg.nombre || `REF: ${seg.no_ref}`}
 </div>
 <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 ">IP: {seg.ip}</p>
 {seg.velocidad ? <p className="text-xs font-medium text-gray-600 dark:text-gray-400 ">Velocidad: {seg.velocidad}</p> : null}
 </div>
 ))}
 </div>
 ) : (
 <div className="p-6 text-center bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 border-dashed">
 <Network size={24} className="mx-auto text-gray-400 mb-2" />
 <p className="text-sm font-medium text-gray-600 dark:text-gray-400 ">No hay segmentos de red asociados a esta unidad</p>
 </div>
 )}
 </section>
 )}

 </div>

 {/* Footer */}
 <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex items-center justify-end shrink-0">
 <button onClick={onClose} className="px-6 py-2 text-sm font-semibold text-white bg-[#00472e] dark:bg-[#002618] rounded-lg hover:bg-[#003824] transition-colors flex items-center gap-2">
 Cerrar Detalles
 </button>
 </div>
 </div>

 <DetalleSegmentoModal 
 isOpen={!!selectedSegmento} 
 onClose={() => setSelectedSegmento(null)} 
 segmento={selectedSegmento} 
 />
 </div>,
 document.body
 );
}
