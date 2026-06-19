import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getArchivos, crearMesaCorrespondencia, editarMesaCorrespondencia } from '../api/correspondencia.queries';
import { GET_CAT_UNIDADES_QUERY } from '../api/unidades.queries';
import { GET_UBICACIONES_POR_UNIDAD } from '../api/inventario.queries';
import { gqlClient } from '../api/client';
import { useAuthStore } from '../store/auth.store';
import { useApp } from '../context/AppContext';

export default function FormCorrespondenciaModal({ isOpen, onClose, initialData }) {
 const queryClient = useQueryClient();
 const { showToast } = useApp();
 const usuario = useAuthStore((s) => s.usuario);
 const [isManualFolio, setIsManualFolio] = useState(!!initialData);
 const [isManualNoOficio, setIsManualNoOficio] = useState(!!initialData);

 const [formData, setFormData] = useState({
 Folio: '',
 Tipo: 1, // 1: Enviada, 2: Recibida
 NoOficio: '',
 FechaOficio: new Date().toISOString().split('T')[0],
 Remitente: usuario?.nombre_completo || '',
 Descripcion: '',
 Clave_unidad: '',
 id_ubicacion: '',
 Archivo: ''
 });

 // Fetch Catálogos
 const { data: archivosData, isLoading: loadingArchivos } = useQuery({
 queryKey: ['archivos'],
 queryFn: getArchivos,
 enabled: isOpen
 });

 const { data: unidadesData, isLoading: loadingUnidades } = useQuery({
 queryKey: ['unidadesSelect'],
 queryFn: async () => {
 const res = await gqlClient.request(GET_CAT_UNIDADES_QUERY);
 return res.catUnidades;
 },
 enabled: isOpen
 });

 const unidades = unidadesData || [];

 const { data: ubicacionesData, isLoading: loadingUbicaciones, isError: errorUbicaciones } = useQuery({
 queryKey: ['ubicaciones-corr', formData.Clave_unidad],
 queryFn: async () => {
 const res = await gqlClient.request(GET_UBICACIONES_POR_UNIDAD, { id_unidad: formData.Clave_unidad });
 return res.ubicacionesPorUnidad;
 },
 enabled: isOpen && !!formData.Clave_unidad,
 staleTime: 0,
 retry: 1,
 });

 const ubicaciones = ubicacionesData || [];

 const createMutation = useMutation({
 mutationFn: crearMesaCorrespondencia,
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['mesaCorrespondencias'] });
 showToast('Registro creado exitosamente', 'success');
 onClose();
 },
 onError: (err) => {
 showToast(err.message || 'Error al crear el registro', 'error');
 }
 });

 const editMutation = useMutation({
 mutationFn: (data) => editarMesaCorrespondencia(initialData.Folio, data),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['mesaCorrespondencias'] });
 showToast('Registro actualizado exitosamente', 'success');
 onClose();
 },
 onError: (err) => {
 showToast(err.message || 'Error al actualizar el registro', 'error');
 }
 });

 const isLoadingMutation = createMutation.isPending || editMutation.isPending;

 // Reset form on open or initialData change
 useEffect(() => {
 if (isOpen) {
 setIsManualFolio(!!initialData);
 setIsManualNoOficio(!!initialData);
 if (initialData) {
 setFormData({
 Folio: initialData.Folio || '',
 Tipo: initialData.Tipo,
 NoOficio: initialData.NoOficio || '',
 FechaOficio: initialData.FechaOficio ? new Date(initialData.FechaOficio).toISOString().split('T')[0] : '',
 Remitente: initialData.Remitente || '',
 Descripcion: initialData.Descripcion || '',
 Clave_unidad: initialData.unidad?.clave || '',
 id_ubicacion: initialData.ubicacion?.id_ubicacion || '',
 Archivo: initialData.Archivo || ''
 });
 } else {
 setFormData({
 Folio: '',
 Tipo: 1,
 NoOficio: '',
 FechaOficio: new Date().toISOString().split('T')[0],
 Remitente: usuario?.nombre_completo || '',
 Descripcion: '',
 Clave_unidad: '',
 id_ubicacion: '',
 Archivo: ''
 });
 }
 }
 }, [isOpen, initialData, usuario]);

 const handleChange = (e) => {
 const { name, value } = e.target;
 setFormData(prev => ({
 ...prev,
 [name]: name === 'Tipo' || name === 'Archivo' || name === 'Folio' ? parseInt(value) || value : value,
 ...(name === 'Clave_unidad' ? { id_ubicacion: '' } : {})
 }));
 };

 const handleSubmit = (e) => {
 e.preventDefault();

 // Validaciones
 if (!formData.Tipo) {
 return showToast('Seleccione un tipo de correspondencia', 'error');
 }
 if (!formData.FechaOficio) {
 return showToast('La fecha del oficio es requerida', 'error');
 }
 if (!formData.Remitente?.trim()) {
 return showToast('El remitente es requerido', 'error');
 }
 if (!formData.Descripcion?.trim()) {
 return showToast('La descripción es requerida', 'error');
 }
 if (!formData.Archivo) {
 return showToast('Debe seleccionar un catálogo de Archivo', 'error');
 }
 // Solo recibidas requieren No. Oficio manual
 if (formData.Tipo === 2 && !formData.NoOficio?.trim()) {
 return showToast('El Número de Oficio es requerido para correspondencia Recibida', 'error');
 }

 const input = {
 Folio: formData.Folio ? parseInt(formData.Folio) : undefined,
 Tipo: formData.Tipo,
 NoOficio: formData.NoOficio?.trim() || undefined,
 FechaOficio: new Date(formData.FechaOficio).toISOString(),
 Remitente: formData.Remitente,
 Descripcion: formData.Descripcion,
 Clave_unidad: formData.Clave_unidad || undefined,
 id_ubicacion: formData.id_ubicacion ? parseInt(formData.id_ubicacion) : undefined,
 Archivo: parseInt(formData.Archivo),
 };

 if (initialData) {
 editMutation.mutate(input);
 } else {
 createMutation.mutate(input);
 }
 };

 return (
 <Dialog.Root open={isOpen} onOpenChange={onClose}>
 <Dialog.Portal>
 <Dialog.Overlay className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 transition-opacity" />
 <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh]">
 
 <div className="bg-[#00472e] dark:bg-[#002618] p-5 flex justify-between items-center text-white shrink-0">
 <div>
 <Dialog.Title className="text-xl font-bold">{initialData ? 'Editar Correspondencia' : 'Control de Correspondencia'}</Dialog.Title>
 <p className="text-green-100 text-sm mt-1">{initialData ? `Editando folio ${initialData.Folio}` : 'Registrar un nuevo oficio o correspondencia'}</p>
 </div>
 <Dialog.Close asChild>
 <button className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
 <X size={20} />
 </button>
 </Dialog.Close>
 </div>

 <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div>
 <label className="flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
 <span>Folio</span>
 {!initialData && (
 <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 font-normal cursor-pointer hover:text-gray-700 dark:text-gray-300 ">
 <input
 type="checkbox"
 checked={isManualFolio}
 onChange={(e) => {
 setIsManualFolio(e.target.checked);
 if (!e.target.checked) setFormData(p => ({ ...p, Folio: '' }));
 }}
 className="rounded w-3 h-3 text-[#00472e] focus:ring-[#00472e]"
 />
 Manual
 </label>
 )}
 </label>
 <input
 type="number"
 name="Folio"
 value={formData.Folio}
 onChange={handleChange}
 placeholder="Autogenerado..."
 disabled={!isManualFolio && !initialData}
 className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800/50 disabled:text-gray-500 disabled:cursor-not-allowed"
 />
 </div>

 <div>
 <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
 <select
 name="Tipo"
 value={formData.Tipo}
 onChange={handleChange}
 className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 required
 >
 <option value={1}>Enviada</option>
 <option value={2}>Recibida</option>
 </select>
 </div>

 <div>
 <label className="flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
 <span>No. Oficio</span>
 {!initialData && formData.Tipo === 1 && (
 <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 font-normal cursor-pointer hover:text-gray-700 dark:text-gray-300 ">
 <input
 type="checkbox"
 checked={isManualNoOficio}
 onChange={(e) => {
 setIsManualNoOficio(e.target.checked);
 if (!e.target.checked) setFormData(p => ({ ...p, NoOficio: '' }));
 }}
 className="rounded w-3 h-3 text-[#00472e] focus:ring-[#00472e]"
 />
 Manual
 </label>
 )}
 </label>
 <input
 type="text"
 name="NoOficio"
 value={formData.NoOficio}
 onChange={handleChange}
 placeholder={formData.Tipo === 1 && !initialData && !isManualNoOficio ? "Autogenerado..." : "Ingrese el número..."}
 disabled={!isManualNoOficio && !initialData && formData.Tipo === 1}
 className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800/50 disabled:text-gray-500 disabled:cursor-not-allowed"
 required={formData.Tipo === 2}
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Fecha de Oficio</label>
 <input
 type="date"
 name="FechaOficio"
 value={formData.FechaOficio}
 onChange={handleChange}
 className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 required
 />
 </div>

 <div>
 <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Remitente</label>
 <input
 type="text"
 name="Remitente"
 value={formData.Remitente}
 onChange={handleChange}
 placeholder="Nombre del remitente..."
 className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 required
 />
 </div>
 </div>

 <div>
 <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
 <textarea
 name="Descripcion"
 value={formData.Descripcion}
 onChange={handleChange}
 rows={8}
 placeholder="Detalles de la correspondencia..."
 className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
 required
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 <div>
 <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Unidad</label>
 <select
 name="Clave_unidad"
 value={formData.Clave_unidad}
 onChange={handleChange}
 className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 >
 <option value="">Seleccione una unidad (Opcional)</option>
 {loadingUnidades ? (
 <option disabled>Cargando unidades...</option>
 ) : (
 unidades.map((u) => (
 <option key={u.clave} value={u.clave}>{u.descripcion}</option>
 ))
 )}
 </select>
 </div>

 <div>
 <div className="flex items-center h-5 mb-1">
 <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">Ubicación</label>
 {formData.Clave_unidad && loadingUbicaciones && <span className="text-[11px] text-gray-400 ml-2 font-normal truncate">Cargando...</span>}
 {formData.Clave_unidad && !loadingUbicaciones && ubicaciones.length === 0 && !errorUbicaciones && (
 <span className="text-[11px] text-amber-500 ml-2 font-normal truncate" title="(Sin ubicaciones registradas para esta unidad)">(Sin ubicaciones)</span>
 )}
 {errorUbicaciones && <span className="text-[11px] text-red-500 ml-2 font-normal truncate">(Error al cargar)</span>}
 </div>
 <select
 name="id_ubicacion"
 value={formData.id_ubicacion}
 onChange={handleChange}
 className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800/50 disabled:text-gray-400"
 disabled={!formData.Clave_unidad}
 >
 <option value="">{!formData.Clave_unidad ? 'Primero seleccione una unidad' : 'Seleccione una ubicación (Opcional)'}</option>
 {ubicaciones.map((u) => (
 <option key={u.id_ubicacion} value={u.id_ubicacion}>{u.nombre_ubicacion}</option>
 ))}
 </select>
 </div>

 <div>
 <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Archivo</label>
 <select
 name="Archivo"
 value={formData.Archivo}
 onChange={handleChange}
 className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
 >
 <option value="">Seleccione un catálogo de archivo (Opcional)</option>
 {loadingArchivos ? (
 <option disabled>Cargando archivos...</option>
 ) : (
 archivosData?.map((a) => (
 <option key={a.ID} value={a.ID}>{a.Archivo}</option>
 ))
 )}
 </select>
 </div>
 </div>
 </form>

 <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex items-center justify-end gap-3">
 <button
 type="button"
 onClick={onClose}
 className="px-5 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
 disabled={isLoadingMutation}
 >
 Cancelar
 </button>
 <button
 type="submit"
 onClick={handleSubmit}
 disabled={isLoadingMutation}
 className="px-6 py-2 text-sm font-semibold text-white bg-[#00472e] dark:bg-[#002618] rounded-lg hover:bg-[#003824] transition-colors flex items-center gap-2"
 >
 {isLoadingMutation ? <Loader2 size={16} className="animate-spin" /> : null}
 {isLoadingMutation ? 'Guardando...' : (initialData ? 'Actualizar' : 'Finalizar y Guardar')}
 </button>
 </div>

 </Dialog.Content>
 </Dialog.Portal>
 </Dialog.Root>
 );
}
