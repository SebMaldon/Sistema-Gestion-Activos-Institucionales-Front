import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Settings, Save, Building, Database, Shield, Bell, Monitor, Key, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { useMutation } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { CHANGE_PASSWORD_MUTATION } from '../api/auth.queries';

export default function Configuracion() {
  const { showToast } = useApp();
  const [config, setConfig] = useState({
    institucion: 'IMSS — Delegación Nayarit',
    delegacion: 'Delegación Nayarit',
    coordinacion: 'Coordinación de Informática',
    jefe: 'Ing. Carlos Morales Vega',
    emailAlerts: true,
    alertGarantia: 90,
    backupAuto: true,
    logoImss: true,
    agentSync: true,
    syncInterval: 60,
    maxUsers: 50,
    sessionTimeout: 30,
  });

  const [passForm, setPassForm] = useState({ current: '', new: '', confirm: '' });
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });
  const usuario = useAuthStore(s => s.usuario);

  const changePassMut = useMutation({
    mutationFn: (vars) => gqlClient.request(CHANGE_PASSWORD_MUTATION, vars),
    onSuccess: () => {
      showToast('Contraseña actualizada correctamente', 'success');
      setPassForm({ current: '', new: '', confirm: '' });
    },
    onError: (e) => {
      showToast(e?.response?.errors?.[0]?.message ?? 'Error al cambiar contraseña', 'error');
    }
  });

  const handleSave = () => {
    showToast('Configuración del sistema guardada correctamente.', 'success');
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (!passForm.current || !passForm.new || !passForm.confirm) {
      return showToast('Completa todos los campos', 'warning');
    }
    if (passForm.new !== passForm.confirm) {
      return showToast('Las contraseñas nuevas no coinciden', 'error');
    }
    if (passForm.new.length < 6) {
      return showToast('La nueva contraseña debe tener al menos 6 caracteres', 'error');
    }
    changePassMut.mutate({
      id_usuario: usuario.id_usuario,
      currentPassword: passForm.current,
      newPassword: passForm.new,
    });
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Configuración del Sistema</h1>
          <p className="text-sm text-gray-500 mt-1">Parámetros globales del Ecosistema de Gestión de Activos</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-all"
          style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
          <Save size={15} />
          Guardar Cambios
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Password Change */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4 max-w-2xl">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Key size={15} style={{ color: '#006341' }} />
            Cambiar Mi Contraseña
          </h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Contraseña Actual</label>
              <div className="relative">
                <input
                  type={showPass.current ? 'text' : 'password'}
                  value={passForm.current}
                  onChange={e => setPassForm(p => ({ ...p, current: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-green-500 pr-10"
                />
                <button type="button" onClick={() => setShowPass(p => ({ ...p, current: !p.current }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass.current ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nueva Contraseña</label>
                <div className="relative">
                  <input
                    type={showPass.new ? 'text' : 'password'}
                    value={passForm.new}
                    onChange={e => setPassForm(p => ({ ...p, new: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-green-500 pr-10"
                  />
                  <button type="button" onClick={() => setShowPass(p => ({ ...p, new: !p.new }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPass.new ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Confirmar Nueva Contraseña</label>
                <div className="relative">
                  <input
                    type={showPass.confirm ? 'text' : 'password'}
                    value={passForm.confirm}
                    onChange={e => setPassForm(p => ({ ...p, confirm: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-green-500 pr-10"
                  />
                  <button type="button" onClick={() => setShowPass(p => ({ ...p, confirm: !p.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPass.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={changePassMut.isPending}
              className="px-5 py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
              {changePassMut.isPending ? 'Cambiando...' : 'Actualizar Contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
