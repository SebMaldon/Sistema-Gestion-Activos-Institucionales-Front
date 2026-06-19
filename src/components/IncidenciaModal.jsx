import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Search, Save, Loader2, AlertCircle, CheckCircle2, Plus, ChevronDown, Users } from 'lucide-react';
import ReactDOM from 'react-dom';
import { useAuthStore } from '../store/auth.store';
import {
 useTiposIncidencia,
 useUsuariosActivos,
 useUnidades,
 useBienPorTermino,
 useCreateIncidencia,
 useCreateTipoIncidencia,
 usePasarAEnProceso,
 useResolverIncidencia,
} from '../hooks/useIncidencias';



// ─── Combobox con búsqueda Optimizado ──────────────────────────────────────────
const SearchableSelect = React.memo(({ options, value, onChange, placeholder, loading, disabled }) => {
 const [query, setQuery] = useState('');
 const [open, setOpen] = useState(false);
 const containerRef = useRef(null);

 const selectedLabel = options.find(o => String(o.value) === String(value))?.label ?? '';

 const filtered = useMemo(() => {
 if (!query.trim()) return options.slice(0, 50);
 const lowerQuery = query.toLowerCase();
 return options
 .filter(o => o.label.toLowerCase().includes(lowerQuery))
 .slice(0, 50); // Limitar a 50 resultados para fluidez total
 }, [query, options]);

 const handleSelect = (opt) => {
 onChange(opt.value);
 setQuery('');
 setOpen(false);
 };

 useEffect(() => {
 const handleOutside = (e) => {
 if (containerRef.current && !containerRef.current.contains(e.target)) {
 setOpen(false);
 setQuery('');
 }
 };
 document.addEventListener('mousedown', handleOutside);
 return () => document.removeEventListener('mousedown', handleOutside);
 }, []);

 return (
 <div ref={containerRef} className="relative">
 <div className="relative">
 <input
 type="text"
 value={open ? query : selectedLabel}
 onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
 onFocus={() => setOpen(true)}
 placeholder={loading ? 'Cargando...' : placeholder}
 disabled={loading || disabled}
 className="w-full px-3 py-2 pr-8 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-400"
 />
 <ChevronDown
 size={14}
 className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-transform ${open ? 'rotate-180' : ''}`}
 />
 </div>

 {open && !loading && (
 <div className="absolute z-30 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-52 overflow-y-auto scrollbar-hide">
 {filtered.length === 0 ? (
 <div className="px-3 py-3 text-sm text-gray-400 text-center">Sin resultados para "{query}"</div>
 ) : (
 filtered.map(opt => (
 <button
 key={opt.value}
 type="button"
 onClick={() => handleSelect(opt)}
 className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 ${String(opt.value) === String(value) ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 dark:text-blue-300 font-semibold' : 'text-gray-700 dark:text-gray-300 '}`}
 >
 {opt.label}
 </button>
 ))
 )}
 </div>
 )}
 </div>
 );
});

// ─── Modal Principal ──────────────────────────────────────────────────────────

export default function IncidenciaModal({ isOpen, onClose, onCreated }) {
 const usuarioLogueado = useAuthStore((s) => s.usuario);

 // ── Datos de la BD ──
 const { data: tiposIncidencia = [], isLoading: loadingTipos } = useTiposIncidencia();
 const { data: usuarios = [], isLoading: loadingUsuarios } = useUsuariosActivos();
 const { data: unidades = [], isLoading: loadingUnidades } = useUnidades();

 // ── Mutations ──
 const createIncidencia = useCreateIncidencia();
 const createTipoIncidencia = useCreateTipoIncidencia();
 const pasarAEnProceso = usePasarAEnProceso();
 const resolverIncidencia = useResolverIncidencia();

 // ── Estado Sección 1: Equipo ──
 const [numSerieInput, setNumSerieInput] = useState('');
 const [numSerie, setNumSerie] = useState('');
 const [equipoEncontrado, setEquipoEncontrado] = useState(null);

 // ── Estado Sección 2: Detalles ──
 const [tipoIncidencia, setTipoIncidencia] = useState('');
 const [nuevoTipo, setNuevoTipo] = useState('');
 const [isAddingTipo, setIsAddingTipo] = useState(false);
 const [savingTipo, setSavingTipo] = useState(false);
 const [descripcion, setDescripcion] = useState('');
 const [unidadId, setUnidadId] = useState('');
 const [alias, setAlias] = useState('');
 const [requerimiento, setRequerimiento] = useState('');

 // ── Estado Sección 3: Estatus y Resolución ──
 const [estatus, setEstatus] = useState('Pendiente');
 const [notaSeguimiento, setNotaSeguimiento] = useState(''); // Si "En proceso"
 const [resolucionTextual, setResolucionTextual] = useState(''); // Si "Resuelto"

 // ── Estado de Errores ──
 const [errors, setErrors] = useState({});

 // ── Búsqueda de bien ──
 const { data: bienData, isLoading: buscandoBien, isError: bienNoEncontrado, refetch: buscarBien } =
 useBienPorTermino(numSerie);

 // ── Pre-rellenar unidad desde el bien encontrado ──
 useEffect(() => {
 if (bienData) {
 setEquipoEncontrado(bienData);
 setErrors(prev => ({ ...prev, equipment: null }));
 if (bienData.unidad?.clave) {
 setUnidadId(String(bienData.unidad.clave));
 }
 } else if (numSerie) {
 setEquipoEncontrado(null);
 }
 }, [bienData, numSerie]);

 const optsUnidades = useMemo(() => unidades.map(u => ({
 value: u.clave,
 label: u.descripcion,
 })), [unidades]);

 // ── Limpiar al cerrar ──
 useEffect(() => {
 if (!isOpen) {
 setNumSerieInput(''); setNumSerie(''); setEquipoEncontrado(null);
 setTipoIncidencia(''); setNuevoTipo(''); setIsAddingTipo(false);
 setDescripcion(''); setUnidadId(''); setAlias(''); setRequerimiento('');
 setEstatus('Pendiente'); setNotaSeguimiento(''); setResolucionTextual('');
 setErrors({});
 }
 }, [isOpen]);

 if (!isOpen) return null;

 // ── Handlers ──
 const handleBuscarSerie = () => {
 const val = numSerieInput.trim();
 if (!val) {
 setErrors(prev => ({ ...prev, equipment: 'Ingrese un número de serie o IP' }));
 return;
 }
 setErrors(prev => ({ ...prev, equipment: null }));
 setNumSerie(val);
 buscarBien();
 };

 const validate = () => {
 const newErrors = {};
 if (!tipoIncidencia) newErrors.type = 'Seleccione el tipo de incidencia';
 if (!descripcion.trim()) newErrors.description = 'La descripción es obligatoria';
 else if (descripcion.trim().length < 5) newErrors.description = 'Descripción demasiado corta';

 if (estatus === 'Resuelto') {
 if (!resolucionTextual.trim()) newErrors.resolution = 'Ingrese los detalles de la solución';
 }

 setErrors(newErrors);
 return Object.keys(newErrors).length === 0;
 };

 const handleGuardarNuevoTipo = async () => {
 if (!nuevoTipo.trim()) return;
 setSavingTipo(true);
 try {
 const res = await createTipoIncidencia.mutateAsync({ nombre_tipo: nuevoTipo.trim() });
 setTipoIncidencia(String(res.createTipoIncidencia.id_tipo_incidencia));
 setNuevoTipo('');
 setIsAddingTipo(false);
 setErrors(prev => ({ ...prev, type: null }));
 } catch {
 setErrors(prev => ({ ...prev, type: 'Error al crear el tipo (¿ya existe?)' }));
 } finally {
 setSavingTipo(false);
 }
 };

 const handleGuardar = async (e) => {
 e.preventDefault();
 if (!validate()) return;

 try {
 // 1) Crear la incidencia
 const result = await createIncidencia.mutateAsync({
 id_bien: equipoEncontrado?.id_bien || undefined,
 id_tipo_incidencia: parseInt(tipoIncidencia),
 descripcion_falla: descripcion,
 id_unidad: unidadId || undefined,
 alias,
 requerimiento,
 });

 const idNueva = result.createIncidencia.id_incidencia;

 // 2) Si el usuario eligió un estatus diferente a Pendiente, aplicar transición
 if (estatus === 'En proceso') {
 await pasarAEnProceso.mutateAsync({
 id_incidencia: String(idNueva),
 contenido_nota: notaSeguimiento.trim() || undefined,
 });
 } else if (estatus === 'Resuelto') {
 await pasarAEnProceso.mutateAsync({ id_incidencia: String(idNueva) });
 await resolverIncidencia.mutateAsync({
 id_incidencia: String(idNueva),
 estatus_cierre: 'Resuelto',
 resolucion_textual: resolucionTextual.trim(),
 });
 }

 onCreated?.();
 onClose();
 } catch (err) {
 const msg = err?.response?.errors?.[0]?.message || 'Error al crear la incidencia';
 setErrors(prev => ({ ...prev, global: msg }));
 }
 };

 const isSaving = createIncidencia.isPending || pasarAEnProceso.isPending || resolverIncidencia.isPending;

 return ReactDOM.createPortal(
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 fade-in">
 <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

 {/* HEADER */}
 <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-[#00472e] dark:bg-[#002618]">
 <div>
 <h2 className="text-xl font-bold text-white">Crear Nueva Incidencia</h2>
 <p className="text-sm text-gray-200 dark:text-gray-300">Completa los datos para generar el reporte de servicio.</p>
 </div>
 <button onClick={onClose} className="p-2 text-white hover:bg-[#003824] dark:hover:bg-[#003824] rounded-full transition-colors">
 <X size={20} />
 </button>
 </div>

 {/* BODY */}
 <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
 <form id="incidencia-form" onSubmit={handleGuardar} className="space-y-8">

 {/* ── SECCIÓN 1: Identificación del Equipo ── */}
 <section className="space-y-4">
 <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2 border-b pb-2">
 <span className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 dark:text-blue-300 flex items-center justify-center text-xs">1</span>
 Identificación del Equipo (Opcional)
 </h3>

 <div className="flex gap-4 items-end">
 <div className="flex-1">
 <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Número de Serie o IP</label>
 <input
 type="text"
 value={numSerieInput}
 onChange={(e) => setNumSerieInput(e.target.value)}
 onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleBuscarSerie())}
 placeholder="Ingrese serie o dirección IP..."
 className={`w-full px-4 py-2 text-sm border ${errors.equipment ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-700 '} rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
 />
 </div>
 <button
 type="button"
 onClick={handleBuscarSerie}
 disabled={buscandoBien}
 className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 flex items-center gap-2 disabled:opacity-60"
 >
 {buscandoBien ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
 Buscar
 </button>
 </div>
 {errors.equipment && <p className="text-[10px] font-bold text-red-600 dark:text-red-400 animate-bounce">{errors.equipment}</p>}

 {equipoEncontrado && (
 <div className="grid grid-cols-2 md:grid-cols-3 gap-y-5 gap-x-4 p-5 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 text-sm mt-2 fade-in">
 <div><p className="text-xs text-gray-400 mb-0.5">N.N.I. / Num. Inv.</p><p className="font-semibold text-gray-800 dark:text-gray-200 ">{equipoEncontrado.num_inv || '—'}</p></div>
 <div><p className="text-xs text-gray-400 mb-0.5">Num. Serie</p><p className="font-semibold text-gray-800 dark:text-gray-200 ">{equipoEncontrado.num_serie}</p></div>
 <div><p className="text-xs text-gray-400 mb-0.5">Dispositivo</p><p className="font-semibold text-gray-800 dark:text-gray-200 ">{equipoEncontrado.modelo?.descrip_disp || equipoEncontrado.categoria?.nombre_categoria || 'Sin desc.'}</p></div>
 <div><p className="text-xs text-gray-400 mb-0.5">Marca</p><p className="font-semibold text-gray-800 dark:text-gray-200 ">{equipoEncontrado.modelo?.marca?.marca || 'N/D'}</p></div>
 <div><p className="text-xs text-gray-400 mb-0.5">Unidad</p><p className="font-semibold text-blue-700 dark:text-blue-400 dark:text-blue-300">{equipoEncontrado.unidad?.descripcion || 'Sin unidad'}</p></div>
 <div><p className="text-xs text-gray-400 mb-0.5">Responsable Resguardo</p><p className="font-semibold text-gray-800 dark:text-gray-200 ">{equipoEncontrado.usuarioResguardo?.nombre_completo || '—'}</p></div>
 <div className="flex items-center gap-1.5 col-span-2 md:col-span-3 text-green-700 dark:text-green-400 dark:text-green-300">
 <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
 <span className="text-xs font-semibold uppercase tracking-tight">Equipo vinculado correctamente</span>
 </div>
 </div>
 )}

 {bienNoEncontrado && numSerie && (
 <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/50 dark:border-red-800/50 text-sm text-red-700 dark:text-red-400 dark:text-red-300 fade-in">
 <AlertCircle size={16} className="flex-shrink-0" />
 No se encontró ningún equipo con la serie o IP <strong>"{numSerie}"</strong>
 </div>
 )}
 </section>

 {/* ── SECCIÓN 2: Detalles del Reporte ── */}
 <section className="space-y-4">
 <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2 border-b pb-2">
 <span className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 dark:text-blue-300 flex items-center justify-center text-xs">2</span>
 Detalles del Reporte
 </h3>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

 {/* Tipo de incidencia */}
 <div className="md:col-span-1">
 <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Tipo de Incidencia <span className="text-red-500">*</span></label>
 {!isAddingTipo ? (
 <>
 <select
 value={tipoIncidencia}
 onChange={(e) => {
 if (e.target.value === '__nuevo__') setIsAddingTipo(true);
 else {
 setTipoIncidencia(e.target.value);
 setErrors(prev => ({ ...prev, type: null }));
 }
 }}
 className={`w-full px-3 py-2 text-sm border ${errors.type ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-700 '} rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-800 `}
 disabled={loadingTipos}
 >
 <option value="">{loadingTipos ? 'Cargando...' : 'Seleccione un tipo...'}</option>
 {tiposIncidencia.map(t => (
 <option key={t.id_tipo_incidencia} value={t.id_tipo_incidencia}>{t.nombre_tipo}</option>
 ))}
 <option value="__nuevo__" className="font-bold text-blue-600 dark:text-blue-400">+ Agregar nuevo tipo...</option>
 </select>
 {errors.type && <p className="text-[10px] font-bold text-red-600 dark:text-red-400 mt-1">{errors.type}</p>}
 </>
 ) : (
 <div className="space-y-2">
 <input
 type="text"
 value={nuevoTipo}
 onChange={(e) => setNuevoTipo(e.target.value)}
 placeholder="Nombre del nuevo tipo..."
 className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
 autoFocus
 />
 <div className="flex gap-2">
 <button type="button" onClick={handleGuardarNuevoTipo} disabled={savingTipo || !nuevoTipo.trim()} className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1">
 {savingTipo ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
 Guardar tipo
 </button>
 <button type="button" onClick={() => { setIsAddingTipo(false); setNuevoTipo(''); }} className="px-3 py-1.5 text-xs text-red-500 hover:underline">Cancelar</button>
 </div>
 </div>
 )}
 </div>

 {/* Matrícula (solo lectura) */}
 <div className="md:col-span-1">
 <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Matrícula (Genera Reporte)</label>
 <input
 type="text"
 value={usuarioLogueado?.matricula || ''}
 readOnly
 className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed font-mono"
 />
 </div>



 {/* Descripción */}
 <div className="md:col-span-3">
 <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
 Descripción de la Falla <span className="text-red-500">*</span>
 </label>
 <textarea
 value={descripcion}
 onChange={(e) => {
 setDescripcion(e.target.value);
 if (e.target.value.trim()) setErrors(prev => ({ ...prev, description: null }));
 }}
 rows="3"
 placeholder="Describa detalladamente el problema..."
 className={`w-full px-3 py-2 text-sm border ${errors.description ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-700 '} rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-all`}
 />
 {errors.description && <p className="text-[10px] font-bold text-red-600 dark:text-red-400 mt-1">{errors.description}</p>}
 </div>

 {/* Alias */}
 <div className="md:col-span-1">
 <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Alias (Opcional)</label>
 <input
 type="text"
 value={alias}
 onChange={(e) => setAlias(e.target.value)}
 placeholder="Ej: PC-ADM-01"
 className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
 />
 </div>

 {/* Requerimiento */}
 <div className="md:col-span-2">
 <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Requerimiento (Folio/Ticket)</label>
 <input
 type="text"
 value={requerimiento}
 onChange={(e) => setRequerimiento(e.target.value)}
 placeholder="Ej: REQ-2024-001"
 className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
 />
 </div>



 {/* Unidad */}
 <div className="md:col-span-2">
 <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
 Unidad
 {equipoEncontrado?.unidad?.nombre && (
 <span className="ml-2 text-blue-500 font-normal italic">(autocompletado)</span>
 )}
 </label>
 <SearchableSelect
 options={optsUnidades}
 value={unidadId}
 onChange={setUnidadId}
 placeholder="Buscar unidad..."
 loading={loadingUnidades}
 />
 </div>
 </div>
 </section>

 {/* ── SECCIÓN 3: Estatus y Resolución ── */}
 <section className="space-y-4 bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 ">
 <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
 <span className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center text-xs">3</span>
 Estatus y Resolución
 </h3>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

 {/* Selector de estatus */}
 <div className="md:col-span-1">
 <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Estatus Inicial</label>
 <select
 value={estatus}
 onChange={(e) => setEstatus(e.target.value)}
 className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-semibold bg-white dark:bg-gray-800 "
 >
 <option value="Pendiente">🕐 Pendiente</option>
 <option value="En proceso">🔧 En proceso</option>
 <option value="Resuelto">✅ Resuelto</option>
 </select>
 </div>



 {/* CONDICIONAL: En proceso → Nota de seguimiento */}
 {estatus === 'En proceso' && (
 <div className="md:col-span-3 fade-in">
 <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1">
 <Plus size={14} className="text-blue-500" /> Nota de Seguimiento Inicial
 </label>
 <textarea
 value={notaSeguimiento}
 onChange={(e) => setNotaSeguimiento(e.target.value)}
 rows="2"
 placeholder="Agregue avances o notas sobre lo que se está revisando..."
 className="w-full px-3 py-2 text-sm border border-blue-200 dark:border-blue-800/50 dark:border-blue-800/50 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white dark:bg-gray-800 shadow-inner"
 />
 </div>
 )}

 {/* CONDICIONAL: Resuelto → Quién resolvió + Detalle */}
 {estatus === 'Resuelto' && (
 <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-1 gap-5 fade-in border-t border-gray-200 dark:border-gray-700 pt-4">
 <div>
 <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
 Detalles Finales de la Resolución <span className="text-red-500">*</span>
 </label>
 <textarea
 value={resolucionTextual}
 onChange={(e) => {
 setResolucionTextual(e.target.value);
 if (e.target.value.trim()) setErrors(prev => ({ ...prev, resolution: null }));
 }}
 rows="3"
 placeholder="Describa cómo se solucionó el problema..."
 className={`w-full px-3 py-2 text-sm border ${errors.resolution ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-green-200 dark:border-green-800/50 dark:border-green-800/50'} rounded-lg focus:ring-2 focus:ring-green-500 outline-none resize-none bg-white dark:bg-gray-800 transition-all`}
 />
 {errors.resolution && <p className="text-[10px] font-bold text-red-600 dark:text-red-400 mt-1">{errors.resolution}</p>}
 </div>
 </div>
 )}

 </div>
 </section>
 
 {errors.global && (
 <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 dark:text-red-300 rounded-xl border border-red-100 dark:border-red-800/50 text-xs font-bold animate-pulse">
 <AlertCircle size={14} /> {errors.global}
 </div>
 )}
 </form>
 </div>

 {/* FOOTER */}
 <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex items-center justify-end gap-3 shrink-0">
 <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
 Cancelar
 </button>
 <button
 type="submit"
 form="incidencia-form"
 disabled={isSaving}
 className="px-6 py-2 bg-[#00472e] dark:bg-[#00472e] text-white text-sm font-semibold rounded-lg hover:bg-[#003824] dark:hover:bg-[#003824] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
 {isSaving ? 'Guardando...' : 'Finalizar y Guardar'}
 </button>
 </div>
 </div>
 </div>,
 document.body
 );
}