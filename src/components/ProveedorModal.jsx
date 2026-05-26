import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { CREATE_PROVEEDOR } from '../api/garantias.queries';
import { useApp } from '../context/AppContext';
import { X, Save, Phone, Mail, User, MapPin, Loader2, Building } from 'lucide-react';

export default function ProveedorModal({ onClose, onSuccess }) {
  const { showToast } = useApp();
  const qc = useQueryClient();

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [contactoNombre, setContactoNombre] = useState('');
  const [direccion, setDireccion] = useState('');

  const createProveedorMut = useMutation({
    mutationFn: (vars) => gqlClient.request(CREATE_PROVEEDOR, vars),
    onSuccess: (data) => {
      const nuevo = data.createProveedor;
      qc.invalidateQueries({ queryKey: ['proveedores'] });
      showToast(`Proveedor "${nuevo.nombre_proveedor}" registrado correctamente`, 'success');
      if (onSuccess) {
        onSuccess(nuevo.id_proveedor);
      }
      onClose();
    },
    onError: (e) => {
      showToast(e?.response?.errors?.[0]?.message ?? 'Error al registrar el proveedor', 'error');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedNombre = nombre.trim();
    if (!trimmedNombre) {
      showToast('El nombre del proveedor es obligatorio', 'warning');
      return;
    }

    const contactos = [];
    if (telefono.trim()) contactos.push({ contacto: telefono.trim(), tipo_contacto: 'Teléfono' });
    if (email.trim()) contactos.push({ contacto: email.trim(), tipo_contacto: 'Correo' });
    if (contactoNombre.trim()) contactos.push({ contacto: contactoNombre.trim(), tipo_contacto: 'Nombre de Contacto' });
    if (direccion.trim()) contactos.push({ contacto: direccion.trim(), tipo_contacto: 'Dirección' });

    createProveedorMut.mutate({
      nombre_proveedor: trimmedNombre,
      contactos: contactos.length > 0 ? contactos : undefined
    });
  };

  const labelCls = 'block text-xs font-bold text-gray-600 mb-1.5';
  const inputCls = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white pl-9';

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-gray-900/70 fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-green-50 text-green-700 flex items-center justify-center border border-green-100">
              <Building size={16} />
            </div>
            <h2 className="text-base font-bold text-gray-900">Registrar Proveedor</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
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
                className={inputCls}
              />
            </div>
          </div>

          {/* Ejecutivo / Contacto */}
          <div>
            <label className={labelCls}>Persona de Contacto</label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Ej: Ing. Juan Pérez"
                value={contactoNombre}
                onChange={e => setContactoNombre(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Teléfono */}
          <div>
            <label className={labelCls}>Teléfono</label>
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                placeholder="Ej: 311 123 4567"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className={labelCls}>Correo Electrónico</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                placeholder="Ej: contacto@proveedor.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Dirección */}
          <div>
            <label className={labelCls}>Dirección Física</label>
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-3 text-gray-400" />
              <textarea
                placeholder="Calle, Número, Colonia, Ciudad..."
                value={direccion}
                onChange={e => setDireccion(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white pl-9 h-20 resize-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createProveedorMut.isPending || !nombre.trim()}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-1.5 shadow-sm"
              style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}
            >
              {createProveedorMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {createProveedorMut.isPending ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
