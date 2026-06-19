import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { gql } from 'graphql-request';
import { X, Check, XCircle, ArrowRight, AlertTriangle, PlusCircle } from 'lucide-react';

// Etiquetas legibles para los campos
const FIELD_LABELS = {
 num_serie: 'No. Serie',
 num_inv: 'No. Inventario',
 estatus_operativo: 'Estatus Operativo',
 clave_unidad_ref: 'Unidad',
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
 nombre_host: 'Nombre de Host',
 cuenta_windows: 'Cuenta de Windows',
 correo: 'Correo Electrónico',
 last_scan: 'Último Escaneo',
 tipo_user: 'Tipo de Usuario',
 windows_serial: 'Serial de Windows',
 monitores: 'Monitores Detectados',
 cuentasList: 'Cuentas de Usuario',
};

// Campos a ignorar en la comparación
const IGNORE_FIELDS = ['_esCreacion', 'id_bien', 'especificacionTI', '_idBienTemporal'];

const CATALOGS_QUERY = gql`
 query GetModalCatalogs {
 catUnidades { clave descripcion desc_corta }
 catSegmentos { id_segmento nombre clave }
 ubicaciones { id_ubicacion nombre_ubicacion }
 catCategoriasActivo { id_categoria nombre_categoria }
 usuarios(pagination: { first: 20000 }) {
 edges { node { id_usuario nombre_completo matricula } }
 }
 }
`;

export default function RevisionCambiosModal({ solicitud, onAprobar, onRechazar, onClose }) {
 const [motivoRechazo, setMotivoRechazo] = useState('');
 const [showRechazoInput, setShowRechazoInput] = useState(false);
 const [processing, setProcessing] = useState(false);

 const { data: catData } = useQuery({
 queryKey: ['modalCatalogs'],
 queryFn: () => gqlClient.request(CATALOGS_QUERY),
 staleTime: 1000 * 60 * 5,
 });

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

 // Helper for formatting values
 const formatValue = (campo, valor) => {
 if (valor === undefined || valor === null || valor === '') return '—';
 if (campo === 'monitores' && Array.isArray(valor)) {
 return valor.length > 0 
 ? valor.map(m => `${m.marca || ''} ${m.modelo || ''} (Serie: ${m.num_serie || 'S/N'})`.trim()).join(' | ')
 : 'Sin monitores';
 }
 if (campo === 'cuentasList' && Array.isArray(valor)) {
 return valor.length > 0
 ? valor.map(c => `${c.cuenta_windows} (${c.correo || 'Sin correo'}) - ${c.tipo_user || 'Estándar'}`).join(' | ')
 : 'Sin cuentas';
 }
 if (campo === 'adaptadores_red' && Array.isArray(valor)) {
 return valor.length > 0
 ? valor.map(a => `${a.descripcion} [IP: ${a.ip || 'N/A'}]`).join(' | ')
 : 'Sin adaptadores';
 }
 if ((campo === 'id_unidad' || campo === 'clave_unidad_ref') && catData?.catUnidades) {
 const u = catData.catUnidades.find(x => String(x.clave) === String(valor));
 if (u) return `${valor} - ${u.descripcion || u.desc_corta}`;
 }
 if (campo === 'id_segmento' && catData?.catSegmentos) {
 const s = catData.catSegmentos.find(x => String(x.id_segmento) === String(valor));
 if (s) return `${valor} - ${s.nombre || s.clave}`;
 }
 if (campo === 'id_usuario_resguardo' && catData?.usuarios) {
 const u = catData.usuarios.edges.find(x => String(x.node.id_usuario) === String(valor))?.node;
 if (u) return `${valor} - ${u.nombre_completo}`;
 }
 if (campo === 'id_ubicacion' && catData?.ubicaciones) {
 const u = catData.ubicaciones.find(x => String(x.id_ubicacion) === String(valor));
 if (u) return `${valor} - ${u.nombre_ubicacion}`;
 }
 if (campo === 'id_categoria' && catData?.catCategoriasActivo) {
 const c = catData.catCategoriasActivo.find(x => String(x.id_categoria) === String(valor));
 if (c) return `${valor} - ${c.nombre_categoria}`;
 }
 if (typeof valor === 'object') return JSON.stringify(valor);
 return String(valor);
 };

 // Obtener valor actual de un campo
 const getValorActual = (campo) => {
 if (campo === 'monitores' && bienActual.monitores) {
 const mapped = bienActual.monitores.map(bm => {
 const desc = bm.monitor?.modelo?.descrip_disp || '';
 const marca = bm.monitor?.modelo?.marca?.marca || '';
 let cleanMod = desc;
 if (marca && desc.toLowerCase().startsWith(marca.toLowerCase())) {
 cleanMod = desc.substring(marca.length).trim();
 }
 return {
 marca: marca,
 modelo: cleanMod,
 num_serie: bm.monitor?.num_serie || ''
 };
 });
 return formatValue(campo, mapped);
 }
 if (campo === 'cuentasList') {
 return formatValue(campo, bienActual.cuentasPC || []);
 }
 if (bienActual[campo] !== undefined && bienActual[campo] !== null) {
 return formatValue(campo, bienActual[campo]);
 }
 if (specActual[campo] !== undefined && specActual[campo] !== null) {
 return formatValue(campo, specActual[campo]);
 }
 return '—';
 };

 // Lista de campos a comparar
 const camposComparar = useMemo(() => Object.keys(datosNuevos).filter(
 (k) => !IGNORE_FIELDS.includes(k)
 ), [datosNuevos]);

 const [selectedCampos, setSelectedCampos] = useState(() => {
 const initial = {};
 camposComparar.forEach(c => initial[c] = true);
 return initial;
 });

 const toggleCampo = (campo) => {
 setSelectedCampos(prev => ({ ...prev, [campo]: !prev[campo] }));
 };

 const handleAprobar = async () => {
 setProcessing(true);
 try {
 const aprobados = Object.keys(selectedCampos).filter(k => selectedCampos[k]);
 await onAprobar(solicitud.id, aprobados);
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
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 ">
 <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden m-4 animate-in fade-in zoom-in-95 duration-200">
 {/* Header */}
 <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 ">
 <div className="flex items-center gap-3">
 {esCreacion ? (
 <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
 <PlusCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
 </div>
 ) : (
 <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/20 rounded-xl flex items-center justify-center">
 <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
 </div>
 )}
 <div>
 <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 ">
 {esCreacion ? 'Solicitud de Creación' : 'Revisión de Cambios'}
 </h2>
 <p className="text-sm text-gray-500 dark:text-gray-400 ">
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
 className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600 dark:text-gray-400 transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Info del Equipo */}
 <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex flex-wrap gap-x-6 gap-y-2 text-sm">
 <div>
 <span className="text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wider">No. Serie:</span>
 <span className="ml-1.5 font-semibold text-gray-800 dark:text-gray-200 ">{bienActual.num_serie || datosNuevos.num_serie || 'N/A'}</span>
 </div>
 <div>
 <span className="text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wider">No. Inventario:</span>
 <span className="ml-1.5 font-semibold text-gray-800 dark:text-gray-200 ">{bienActual.num_inv || datosNuevos.num_inv || 'N/A'}</span>
 </div>
 <div>
 <span className="text-gray-500 dark:text-gray-400 font-medium text-xs uppercase tracking-wider">Modelo:</span>
 <span className="ml-1.5 font-semibold text-gray-800 dark:text-gray-200 ">{bienActual.modelo?.descrip_disp || datosNuevos.clave_modelo || 'N/A'}</span>
 </div>
 </div>

 {/* Body — Comparación */}
 <div className="flex-1 overflow-y-auto px-6 py-4">
 {camposComparar.length === 0 ? (
 <p className="text-center text-gray-400 py-8">No se encontraron campos para comparar.</p>
 ) : (
 <div className="space-y-1">
 {/* Header de columnas */}
 {!esCreacion && (
 <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-3 px-4 py-2 mb-2 items-center">
 <div className="w-5" />
 <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
 Valor Actual
 </p>
 <div className="w-6" />
 <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
 Valor Propuesto
 </p>
 </div>
 )}

 {camposComparar.map((campo) => {
 const valorActual = esCreacion ? '—' : getValorActual(campo);
 const valorNuevo = formatValue(campo, datosNuevos[campo]);
 const hayCambio = String(valorActual) !== String(valorNuevo);
 const label = FIELD_LABELS[campo] || campo;

 const renderValueText = (val) => {
 if (typeof val === 'string' && val.includes(' | ')) {
 return (
 <ul className="list-disc pl-4 space-y-0.5 m-0">
 {val.split(' | ').map((line, i) => (
 <li key={i}>{line}</li>
 ))}
 </ul>
 );
 }
 return val || '—';
 };

 if (esCreacion) {
 return (
 <div key={campo} className="px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 last:border-0">
 <p className="text-xs font-medium text-gray-400 mb-0.5">{label}</p>
 <div className="text-sm font-semibold text-green-600 dark:text-green-400">
 {renderValueText(valorNuevo)}
 </div>
 </div>
 );
 }

 return (
 <div
 key={campo}
 onClick={() => !esCreacion && toggleCampo(campo)}
 className={`grid ${esCreacion ? 'grid-cols-[1fr]' : 'grid-cols-[auto_1fr_auto_1fr] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 '} gap-3 items-center px-4 py-3 rounded-xl transition-colors ${
 hayCambio && selectedCampos[campo] ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-gray-50 dark:bg-gray-900 '
 } ${!selectedCampos[campo] ? 'opacity-50 grayscale' : ''}`}
 >
 {!esCreacion && (
 <div className="flex items-center justify-center">
 <input 
 type="checkbox" 
 checked={!!selectedCampos[campo]} 
 onChange={() => {}} 
 className="w-4 h-4 text-green-600 dark:text-green-400 rounded border-gray-300 dark:border-gray-600 focus:ring-green-500 cursor-pointer"
 />
 </div>
 )}

 {/* Valor actual */}
 <div>
 <p className="text-xs font-medium text-gray-400 mb-0.5">{label}</p>
 <div className={`text-sm ${hayCambio ? 'text-red-500 line-through' : 'text-gray-600 dark:text-gray-400 '}`}>
 {renderValueText(valorActual)}
 </div>
 </div>

 {/* Flecha */}
 <div className="flex items-center justify-center">
 <ArrowRight className={`w-4 h-4 ${hayCambio ? 'text-amber-500' : 'text-gray-300'}`} />
 </div>

 {/* Valor nuevo */}
 <div>
 <p className="text-xs font-medium text-gray-400 mb-0.5">{label}</p>
 <div className={`text-sm font-semibold ${hayCambio ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400 '}`}>
 {renderValueText(valorNuevo)}
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}

 {/* Rechazo — motivo */}
 {showRechazoInput && (
 <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800/50 dark:border-red-800/50">
 <label className="text-sm font-medium text-red-700 dark:text-red-400 dark:text-red-300 block mb-2">
 Motivo del rechazo (opcional)
 </label>
 <textarea
 value={motivoRechazo}
 onChange={(e) => setMotivoRechazo(e.target.value)}
 placeholder="Describe el motivo por el cual rechazas esta solicitud..."
 rows={3}
 className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800/50 dark:border-red-800/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
 />
 <div className="flex justify-end gap-2 mt-3">
 <button
 onClick={() => setShowRechazoInput(false)}
 className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
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
 <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 ">
 <button
 onClick={onClose}
 className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
 >
 Cerrar
 </button>
 <button
 onClick={() => setShowRechazoInput(true)}
 className="flex items-center gap-2 px-5 py-2.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 text-red-600 dark:text-red-400 text-sm font-semibold rounded-lg border border-red-200 dark:border-red-800/50 dark:border-red-800/50 transition-colors"
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
