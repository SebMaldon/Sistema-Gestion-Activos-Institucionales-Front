import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getArchivos, crearMesaCorrespondencia } from '../api/correspondencia.queries';
import { GET_CAT_UNIDADES_QUERY } from '../api/unidades.queries';
import { GET_UBICACIONES_POR_UNIDAD } from '../api/inventario.queries';
import { gqlClient } from '../api/client';
import { useAuthStore } from '../store/auth.store';
import { useApp } from '../context/AppContext';

export default function FormCorrespondenciaModal({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const { showToast } = useApp();
  const usuario = useAuthStore((s) => s.usuario);

  const [formData, setFormData] = useState({
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

  const mutation = useMutation({
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

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      setFormData({
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
  }, [isOpen, usuario]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'Tipo' || name === 'Archivo' ? parseInt(value) : value,
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
      Tipo: formData.Tipo,
      FechaOficio: new Date(formData.FechaOficio).toISOString(),
      Remitente: formData.Remitente,
      Descripcion: formData.Descripcion,
      Clave_unidad: formData.Clave_unidad || undefined,
      id_ubicacion: formData.id_ubicacion ? parseInt(formData.id_ubicacion) : undefined,
      Archivo: parseInt(formData.Archivo),
    };

    if (formData.Tipo === 2) {
      input.NoOficio = formData.NoOficio;
    }

    mutation.mutate(input);
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 transition-opacity" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[90vh]">
          
          <div className="bg-[#00472e] p-5 flex justify-between items-center text-white shrink-0">
            <div>
              <Dialog.Title className="text-xl font-bold">Control de Correspondencia</Dialog.Title>
              <p className="text-green-100 text-sm mt-1">Registrar un nuevo oficio o correspondencia</p>
            </div>
            <Dialog.Close asChild>
              <button className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo</label>
                <select
                  name="Tipo"
                  value={formData.Tipo}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value={1}>Enviada</option>
                  <option value={2}>Recibida</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">No. Oficio</label>
                {formData.Tipo === 1 ? (
                  <input
                    type="text"
                    value="Autogenerado"
                    disabled
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-100 text-gray-500 italic"
                  />
                ) : (
                  <input
                    type="text"
                    name="NoOficio"
                    value={formData.NoOficio}
                    onChange={handleChange}
                    placeholder="Ingrese el número de oficio..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha de Oficio</label>
                <input
                  type="date"
                  name="FechaOficio"
                  value={formData.FechaOficio}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Remitente</label>
                <input
                  type="text"
                  name="Remitente"
                  value={formData.Remitente}
                  onChange={handleChange}
                  placeholder="Nombre del remitente..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Descripción</label>
              <textarea
                name="Descripcion"
                value={formData.Descripcion}
                onChange={handleChange}
                rows={4}
                placeholder="Detalles de la correspondencia..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Unidad</label>
                <select
                  name="Clave_unidad"
                  value={formData.Clave_unidad}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Ubicación
                  {formData.Clave_unidad && loadingUbicaciones && <span className="text-xs text-gray-400 ml-2">Cargando...</span>}
                  {formData.Clave_unidad && !loadingUbicaciones && ubicaciones.length === 0 && !errorUbicaciones && (
                    <span className="text-xs text-amber-500 ml-2">(Sin ubicaciones registradas para esta unidad)</span>
                  )}
                  {errorUbicaciones && <span className="text-xs text-red-500 ml-2">(Error al cargar)</span>}
                </label>
                <select
                  name="id_ubicacion"
                  value={formData.id_ubicacion}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                  disabled={!formData.Clave_unidad}
                >
                  <option value="">{!formData.Clave_unidad ? 'Primero seleccione una unidad' : 'Seleccione una ubicación (Opcional)'}</option>
                  {ubicaciones.map((u) => (
                    <option key={u.id_ubicacion} value={u.id_ubicacion}>{u.nombre_ubicacion}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Archivo</label>
                <select
                  name="Archivo"
                  value={formData.Archivo}
                  onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={mutation.isPending}
            >
              Cancelar
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={mutation.isPending}
              className="px-6 py-2 text-sm font-semibold text-white bg-[#00472e] rounded-lg hover:bg-[#003824] transition-colors flex items-center gap-2"
            >
              {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
              {mutation.isPending ? 'Guardando...' : 'Finalizar y Guardar'}
            </button>
          </div>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
