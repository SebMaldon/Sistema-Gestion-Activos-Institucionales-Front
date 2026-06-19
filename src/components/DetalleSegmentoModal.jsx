import React, { useState, useEffect } from 'react';
import { X, Building2, Globe, Shield, Activity, Calendar, Phone, User, Hash, Zap, Loader2, AlertTriangle, MapPin, Network, Image as ImageIcon } from 'lucide-react';
import ReactDOM from 'react-dom';
export default function DetalleSegmentoModal({ isOpen, onClose, segmento }) {

 const [nodos, setNodos] = useState([]);
 const [loadingNodos, setLoadingNodos] = useState(false);
 const [errorNodos, setErrorNodos] = useState(null);
 const [selectedImage, setSelectedImage] = useState(null);

 useEffect(() => {
 if (isOpen && segmento?.ip) {
 const fetchNodos = async () => {
 setLoadingNodos(true);
 setErrorNodos(null);
 try {
 const url = `${import.meta.env.VITE_NODOS_API_URL}/api/integracion/nodos?ip_segment=${segmento.ip}`;
 const response = await fetch(url, {
 method: 'GET',
 headers: {
 'x-api-key': import.meta.env.VITE_NODOS_API_KEY,
 'Content-Type': 'application/json'
 }
 });

 if (!response.ok) {
 throw new Error(`Error al obtener los nodos: ${response.status}`);
 }

 const data = await response.json();
 if (data.ok && data.nodos) {
 setNodos(data.nodos);
 } else {
 setNodos([]);
 }
 } catch (error) {
 console.error("Hubo un error al conectar con Nodos API:", error);
 setErrorNodos(error.message);
 } finally {
 setLoadingNodos(false);
 }
 };

 fetchNodos();
 } else {
 setNodos([]);
 }
 }, [isOpen, segmento]);

 if (!isOpen || !segmento) return null;


 const colorMap = {
 blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
 green: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
 teal: "bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400",
 purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
 orange: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
 gray: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
 };

 const DetailItem = ({ icon: Icon, label, value, color = "blue" }) => (
 <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:border-gray-700 transition-colors min-w-0">
 <div className={`p-2 rounded-lg flex-shrink-0 ${colorMap[color] || colorMap.blue}`}>
 <Icon size={18} />
 </div>
 <div className="min-w-0 flex-1">
 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">{label}</p>
 <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 break-words">{value || '—'}</p>
 </div>
 </div>
 );

 return ReactDOM.createPortal(
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => { e.stopPropagation(); onClose(); }}>
 <div className="absolute inset-0 bg-black/50 dark:bg-black/70 transition-opacity pointer-events-none" />
 <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
 
 {/* Header */}
 <div className="bg-[#00472e] dark:bg-[#002618] px-6 py-5 flex items-center justify-between text-white shrink-0">
 <div className="min-w-0">
 <h2 className="text-xl font-bold break-words leading-tight">{segmento.nombre || 'Sin nombre'}</h2>
 <div className="flex items-center gap-2 mt-1">
 <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30 uppercase">
 {segmento.no_ref}
 </span>
 <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${segmento.estatus === 1 ? 'bg-green-500/20 text-green-100 border-green-500/30' : 'bg-white/10 text-gray-200 border-white/20 '} uppercase`}>
 {segmento.estatus === 1 ? 'Activa' : 'Inactiva'}
 </span>
 </div>
 </div>
 <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors shrink-0">
 <X size={20} />
 </button>
 </div>

 {/* Content */}
 <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
 
 {/* Section: Información General */}
 <section>
 <div className="flex items-center gap-2 mb-4">
 <div className="h-4 w-1 bg-blue-600 rounded-full"></div>
 <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight">Información General</h3>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
 <DetailItem icon={Hash} label="Clave Interna" value={segmento.clave} />
 <DetailItem icon={Calendar} label="Migración" value={segmento.fecha_migracion ? new Date(segmento.fecha_migracion).toLocaleDateString() : null} />
 <DetailItem icon={Building2} label="Proveedor" value={segmento.proveedor} />
 </div>
 </section>

 {/* Section: Detalles de Red */}
 <section>
 <div className="flex items-center gap-2 mb-4">
 <div className="h-4 w-1 bg-green-600 rounded-full"></div>
 <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight text-green-700 dark:text-green-400 dark:text-green-300">Configuración de Red</h3>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
 <DetailItem icon={Globe} label="Dirección IP" value={segmento.ip} color="green" />
 <DetailItem icon={Zap} label="IP Inicial (Octeto)" value={segmento.ip_init} color="green" />
 <DetailItem icon={Activity} label="VLAN" value={segmento.vlan} color="green" />
 <DetailItem icon={Activity} label="Bits" value={segmento.bits} color="green" />
 <DetailItem icon={Activity} label="Velocidad" value={segmento.velocidad} color="green" />
 <DetailItem icon={Zap} label="Tipo de Enlace" value={segmento.tipo_enlace} color="green" />
 <DetailItem icon={Activity} label="Monitoreo" value={segmento.monitorear === 1 ? 'Habilitado' : 'Deshabilitado'} color={segmento.monitorear === 1 ? 'green' : 'gray'} />
 </div>
 </section>

 {/* Section: Clasificación */}
 <section>
 <div className="flex items-center gap-2 mb-4">
 <div className="h-4 w-1 bg-purple-600 rounded-full"></div>
 <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight text-purple-700 dark:text-purple-400">Clasificación Operativa</h3>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 <DetailItem 
 icon={Shield} 
 label="Régimen" 
 value={segmento.regimen} 
 color="purple" 
 />
 </div>
 </section>

 {/* Section: Nodos Asociados */}
 <section>
 <div className="flex items-center gap-2 mb-4">
 <div className="h-4 w-1 bg-orange-600 rounded-full"></div>
 <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight text-orange-700 dark:text-orange-400">Nodos Asociados al Segmento</h3>
 </div>
 
 {loadingNodos ? (
 <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 border-dashed">
 <Loader2 size={32} className="text-orange-500 animate-spin mb-3" />
 <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 ">Buscando nodos...</p>
 </div>
 ) : errorNodos ? (
 <div className="flex flex-col items-center justify-center p-8 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800/50 border-dashed text-red-600 dark:text-red-400">
 <AlertTriangle size={32} className="mb-3" />
 <p className="text-sm font-semibold">Error al obtener los nodos</p>
 <p className="text-xs text-red-500 mt-1">{errorNodos}</p>
 </div>
 ) : nodos.length > 0 ? (
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
 {nodos.map(nodo => (
 <div key={nodo.Id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
 {/* Header Compacto */}
 <div className="p-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex items-start justify-between gap-2">
 <div className="flex items-start gap-2.5 min-w-0">
 <div className="p-1.5 bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-lg shrink-0 mt-0.5">
 <Network size={16} />
 </div>
 <div className="min-w-0">
 <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight truncate" title={`Nodo ${nodo.Id}`}>Nodo {nodo.Id}</h4>
 <div className="flex flex-col gap-0.5 mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 ">
 <span className="flex items-center gap-1 truncate" title={nodo.Unidad}><Building2 size={10} className="shrink-0"/> {nodo.Unidad || 'Sin unidad'}</span>
 <span className="flex items-center gap-1 truncate" title={nodo.Ubicacion}><MapPin size={10} className="shrink-0"/> {nodo.Ubicacion || 'Sin ubicación'}</span>
 </div>
 </div>
 </div>
 <div className="text-right shrink-0 flex flex-col items-end gap-1">
 <span className="inline-block px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 dark:text-blue-300 text-[9px] font-bold rounded uppercase border border-blue-100 dark:border-blue-800/50">
 Cat. {nodo.Categoria || 'N/A'}
 </span>
 <p className="text-[9px] font-bold text-gray-400 mt-0.5 uppercase">SW: {nodo.IpSwitch || '—'}</p>
 </div>
 </div>
 
 {/* Body Compacto */}
 <div className="p-3 grid grid-cols-2 gap-2 text-xs bg-white dark:bg-gray-800 flex-1">
 <div className="flex flex-col">
 <p className="text-gray-400 font-bold uppercase text-[8px]">Año / Longitud</p>
 <p className="font-semibold text-gray-800 dark:text-gray-200 text-[11px] truncate">
 {nodo.AnioInstalacion || '—'} • {nodo.Longitud ? `${nodo.Longitud}m` : '—'}
 </p>
 </div>
 <div className="flex flex-col">
 <p className="text-gray-400 font-bold uppercase text-[8px]">Estado</p>
 <p className="font-semibold text-gray-800 dark:text-gray-200 text-[11px] truncate" title={nodo.EstadoCable}>{nodo.EstadoCable || '—'}</p>
 </div>
 <div className="col-span-2 flex flex-col">
 <p className="text-gray-400 font-bold uppercase text-[8px]">Observaciones</p>
 <p className="font-semibold text-gray-800 dark:text-gray-200 text-[11px] line-clamp-1" title={nodo.Observaciones}>{nodo.Observaciones || 'Ninguna'}</p>
 </div>
 </div>

 {/* Footer Imágenes */}
 {nodo.Imagenes && nodo.Imagenes.length > 0 && (
 <div className="p-2.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 mt-auto">
 <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
 {nodo.Imagenes.map((imgUrl, i) => (
 <img 
 key={i} 
 src={`${import.meta.env.VITE_NODOS_API_URL}${imgUrl}`} 
 alt={`Nodo foto ${i+1}`}
 className="h-16 w-16 min-w-[4rem] rounded-lg border border-gray-200 dark:border-gray-700 object-cover bg-white dark:bg-gray-800 shadow-sm cursor-pointer hover:opacity-80 hover:ring-2 ring-orange-400 transition-all"
 onClick={() => setSelectedImage(imgUrl)}
 onError={(e) => {
 e.target.onerror = null; 
 e.target.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22150%22%20height%3D%22150%22%20viewBox%3D%220%200%20150%20150%22%3E%3Crect%20fill%3D%22%23f3f4f6%22%20width%3D%22150%22%20height%3D%22150%22%2F%3E%3Ctext%20fill%3D%22%239ca3af%22%20font-family%3D%22sans-serif%22%20font-size%3D%2216%22%20dy%3D%2210.5%22%20font-weight%3D%22bold%22%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%3EError%3C%2Ftext%3E%3C%2Fsvg%3E';
 }}
 />
 ))}
 </div>
 </div>
 )}
 </div>
 ))}
 </div>
 ) : (
 <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 border-dashed">
 <Network size={32} className="text-gray-300 mb-2" />
 <p className="text-sm font-medium text-gray-500 dark:text-gray-400 ">No hay nodos registrados en este segmento</p>
 </div>
 )}
 </section>

 </div>

 {/* Footer */}
 <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex items-center justify-end shrink-0">
 <button onClick={onClose} className="px-6 py-2 text-sm font-semibold text-white bg-[#00472e] dark:bg-[#002618] rounded-lg hover:bg-[#003824] transition-colors flex items-center gap-2">
 Cerrar Detalles
 </button>
 </div>
 </div>
 {/* Lightbox para imágenes */}
 {selectedImage && (
 <div 
 className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 transition-opacity animate-in fade-in duration-200"
 onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
 >
 <button 
 className="absolute top-4 right-4 p-3 bg-white dark:bg-gray-800/10 dark:bg-gray-800/20 hover:bg-white dark:bg-gray-800/20 dark:hover:bg-gray-700/20 text-white rounded-full transition-colors backdrop-blur-sm"
 onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
 title="Cerrar imagen"
 >
 <X size={24} />
 </button>
 <img 
 src={`${import.meta.env.VITE_NODOS_API_URL}${selectedImage}`} 
 alt="Vista ampliada" 
 className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-200"
 onClick={(e) => e.stopPropagation()}
 />
 </div>
 )}
 </div>,
 document.body
 );
}
