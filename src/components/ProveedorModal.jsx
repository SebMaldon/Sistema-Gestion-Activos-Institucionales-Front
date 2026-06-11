import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { CREATE_PROVEEDOR, UPDATE_PROVEEDOR } from '../api/garantias.queries';
import { useApp } from '../context/AppContext';
import { X, Save, Phone, Mail, User, MapPin, Loader2, Building, Plus, Trash2 } from 'lucide-react';

export default function ProveedorModal({ onClose, onSuccess, proveedor = null }) {
  const { showToast } = useApp();
  const qc = useQueryClient();
  const isEdit = !!proveedor;

  const [nombre, setNombre] = useState(proveedor?.nombre_proveedor || '');
  const [contactos, setContactos] = useState([]);

  useEffect(() => {
    if (proveedor && proveedor.contactos) {
      setContactos(proveedor.contactos.map(c => ({
        tipo_contacto: c.tipo_contacto,
        contacto: c.contacto
      })));
    }
  }, [proveedor]);

  const createProveedorMut = useMutation({
    mutationFn: (vars) => gqlClient.request(CREATE_PROVEEDOR, vars),
    onSuccess: (data) => {
      const nuevo = data.createProveedor;
      qc.setQueryData(['proveedores'], old => {
        if (!old || !old.proveedores) return { proveedores: [nuevo] };
        return { ...old, proveedores: [...old.proveedores, nuevo] };
      });
      if (onSuccess) onSuccess(nuevo.id_proveedor);
      onClose();
    },
    onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al registrar el proveedor', 'error'),
  });

  const updateProveedorMut = useMutation({
    mutationFn: (vars) => gqlClient.request(UPDATE_PROVEEDOR, vars),
    onSuccess: (data) => {
      const actualizado = data.updateProveedor;
      qc.setQueryData(['proveedores'], old => {
        if (!old || !old.proveedores) return { proveedores: [] };
        return {
          ...old,
          proveedores: old.proveedores.map(p => 
            String(p.id_proveedor) === String(actualizado.id_proveedor) ? actualizado : p
          )
        };
      });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al actualizar el proveedor', 'error'),
  });

  const handleAddContacto = () => {
    setContactos([...contactos, { tipo_contacto: 'Teléfono', contacto: '' }]);
  };

  const handleUpdateContacto = (index, field, value) => {
    const newContactos = [...contactos];
    newContactos[index][field] = value;
    setContactos(newContactos);
  };

  const handleRemoveContacto = (index) => {
    setContactos(contactos.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedNombre = nombre.trim();
    if (!trimmedNombre) {
      showToast('El nombre del proveedor es obligatorio', 'warning');
      return;
    }

    const validContactos = contactos.filter(c => c.contacto.trim());

    if (isEdit) {
      updateProveedorMut.mutate({
        id_proveedor: String(proveedor.id_proveedor),
        nombre_proveedor: trimmedNombre,
        contactos: validContactos
      });
    } else {
      createProveedorMut.mutate({
        nombre_proveedor: trimmedNombre,
        contactos: validContactos.length > 0 ? validContactos : undefined
      });
    }
  };

  const labelCls = 'block text-xs font-bold text-gray-600 mb-1.5';
  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white';
  const isPending = createProveedorMut.isPending || updateProveedorMut.isPending;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-gray-900/70 fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-green-50 text-green-700 flex items-center justify-center border border-green-100">
              <Building size={16} />
            </div>
            <h2 className="text-base font-bold text-gray-900">{isEdit ? 'Editar Proveedor' : 'Registrar Proveedor'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Nombre */}
          <div>
            <label className={labelCls}>Nombre / Razón Social *</label>
            <div className="relative">
              <Building size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                required
                placeholder="Ej: Proveedora Médica e Industrial S.A."
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                className={`${inputCls} pl-9 py-2.5`}
              />
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Contactos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-gray-800">Contactos del Proveedor</label>
              <button 
                type="button" 
                onClick={handleAddContacto}
                className="text-xs flex items-center gap-1 text-green-700 bg-green-50 px-2.5 py-1.5 rounded-lg hover:bg-green-100 transition-colors font-semibold border border-green-200"
              >
                <Plus size={14} /> Agregar Contacto
              </button>
            </div>

            {contactos.length === 0 ? (
              <p className="text-xs text-gray-500 bg-gray-50 p-4 rounded-xl border border-gray-100 text-center border-dashed">
                Aún no hay contactos registrados.
              </p>
            ) : (
              <div className="space-y-3">
                {contactos.map((c, i) => (
                  <div key={i} className="flex gap-2 items-start bg-gray-50 p-2 rounded-xl border border-gray-100">
                    <select
                      value={c.tipo_contacto}
                      onChange={e => handleUpdateContacto(i, 'tipo_contacto', e.target.value)}
                      className="px-2.5 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-green-500 bg-white min-w-[120px]"
                    >
                      <option value="Teléfono">Teléfono</option>
                      <option value="Correo">Correo</option>
                      <option value="Nombre de Contacto">Contacto (Nombre)</option>
                      <option value="Dirección">Dirección</option>
                      <option value="Otro">Otro</option>
                    </select>
                    
                    {c.tipo_contacto === 'Dirección' ? (
                      <textarea
                        value={c.contacto}
                        onChange={e => handleUpdateContacto(i, 'contacto', e.target.value)}
                        placeholder="Valor del contacto..."
                        className={`${inputCls} flex-1 resize-none h-9`}
                        rows={1}
                      />
                    ) : (
                      <input
                        type={c.tipo_contacto === 'Correo' ? 'email' : 'text'}
                        value={c.contacto}
                        onChange={e => handleUpdateContacto(i, 'contacto', e.target.value)}
                        placeholder="Valor del contacto..."
                        className={`${inputCls} flex-1`}
                      />
                    )}
                    
                    <button
                      type="button"
                      onClick={() => handleRemoveContacto(i)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                      title="Eliminar contacto"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-6 pt-0 mt-auto shrink-0 bg-white border-t border-gray-50 flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isPending || !nombre.trim()}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-1.5 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isPending ? 'Guardando...' : (isEdit ? 'Guardar Cambios' : 'Registrar')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
