import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Settings, Save, Building, Database, Shield, Bell, Monitor, Key, Eye, EyeOff, MapPin, Clock } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { CHANGE_PASSWORD_MUTATION } from '../api/auth.queries';
import { SOLICITAR_CAMBIO_UNIDAD, GET_MI_SOLICITUD_CAMBIO_UNIDAD } from '../api/aprobaciones.queries';
import { GET_TODAS_LAS_UNIDADES_QUERY } from '../api/unidades.queries';

const ROL_MAESTRO = 1;
const ROL_ADMIN = 2;
const ROL_USUARIO = 3;

export default function Configuracion() {
  const { showToast, hoverZoomScale, updateHoverZoomScale } = useApp();
  const queryClient = useQueryClient();
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

  // ── Cambio de Unidad ──────────────────────────────────────────────────
  const [unidadSeleccionada, setUnidadSeleccionada] = useState('');
  const [unidadSearch, setUnidadSearch] = useState('');

  const { data: miSolicitudData } = useQuery({
    queryKey: ['miSolicitudCambioUnidad'],
    queryFn: () => gqlClient.request(GET_MI_SOLICITUD_CAMBIO_UNIDAD),
    enabled: [ROL_ADMIN, ROL_USUARIO].includes(usuario?.id_rol),
  });
  const solicitudPendiente = (() => {
    const s = miSolicitudData?.miSolicitudCambioUnidad;
    if (!s) return null;
    try {
      return typeof s.datos_nuevos === 'string' ? JSON.parse(s.datos_nuevos) : s.datos_nuevos;
    } catch { return null; }
  })();

  const { data: catUnidadesData } = useQuery({
    queryKey: ['todasLasUnidades'],
    queryFn: () => gqlClient.request(GET_TODAS_LAS_UNIDADES_QUERY),
    enabled: [ROL_ADMIN, ROL_USUARIO].includes(usuario?.id_rol),
  });
  const catUnidades = catUnidadesData?.todasLasUnidades || [];
  const unidadesFiltradas = catUnidades.filter(u => {
    if (!unidadSearch) return true;
    const q = unidadSearch.toLowerCase();
    return (
      u.descripcion?.toLowerCase().includes(q) ||
      u.clave?.toLowerCase().includes(q) ||
      u.desc_corta?.toLowerCase().includes(q)
    );
  });

  const solicitarUnidadMut = useMutation({
    mutationFn: (vars) => gqlClient.request(SOLICITAR_CAMBIO_UNIDAD, vars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['miSolicitudCambioUnidad'] });
      showToast('Solicitud enviada. Un Maestro debe aprobarla.', 'success');
    },
    onError: (e) => {
      showToast(e?.response?.errors?.[0]?.message ?? 'Error al enviar solicitud', 'error');
    }
  });

  const handleSolicitarUnidad = () => {
    if (!unidadSeleccionada) return showToast('Selecciona una unidad', 'warning');
    solicitarUnidadMut.mutate({ clave_unidad_nueva: unidadSeleccionada });
  };

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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 ">Configuración del Sistema</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Parámetros globales del Ecosistema de Gestión de Activos</p>
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
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-4 max-w-2xl">
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Key size={15} style={{ color: '#006341' }} />
            Cambiar Mi Contraseña
          </h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Contraseña Actual</label>
              <div className="relative">
                <input
                  type={showPass.current ? 'text' : 'password'}
                  value={passForm.current}
                  onChange={e => setPassForm(p => ({ ...p, current: e.target.value }))}
                  className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-green-500 pr-10"
                />
                <button type="button" onClick={() => setShowPass(p => ({ ...p, current: !p.current }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass.current ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Nueva Contraseña</label>
                <div className="relative">
                  <input
                    type={showPass.new ? 'text' : 'password'}
                    value={passForm.new}
                    onChange={e => setPassForm(p => ({ ...p, new: e.target.value }))}
                    className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-green-500 pr-10"
                  />
                  <button type="button" onClick={() => setShowPass(p => ({ ...p, new: !p.new }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPass.new ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Confirmar Nueva Contraseña</label>
                <div className="relative">
                  <input
                    type={showPass.confirm ? 'text' : 'password'}
                    value={passForm.confirm}
                    onChange={e => setPassForm(p => ({ ...p, confirm: e.target.value }))}
                    className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-green-500 pr-10"
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

        {/* Preferencias Visuales */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-4 max-w-2xl">
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Monitor size={15} style={{ color: '#006341' }} />
            Preferencias Visuales Personales
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Nivel de Zoom en Tablas</label>
              <p className="text-xs text-gray-500 mb-3">Ajusta el porcentaje de aumento al pasar el mouse por las celdas de las tablas.</p>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1.0"
                  max="1.5"
                  step="0.05"
                  value={hoverZoomScale}
                  onChange={(e) => updateHoverZoomScale(parseFloat(e.target.value))}
                  className="flex-1 accent-green-600"
                />
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300 w-12 text-right">
                  {Math.round(hoverZoomScale * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* Cambio de Unidad — solo Admin y Estándar */}
        {[ROL_ADMIN, ROL_USUARIO].includes(usuario?.id_rol) && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-4 max-w-2xl">
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <MapPin size={15} style={{ color: '#006341' }} />
              Solicitar Cambio de Unidad
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Selecciona la unidad a la que deseas pertenecer. La solicitud quedará pendiente hasta que un <strong>Maestro</strong> la apruebe.
            </p>

            {solicitudPendiente ? (
              <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl">
                <Clock size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Solicitud pendiente de aprobación</p>
                  <p className="text-xs text-amber-600 dark:text-amber-300 mt-0.5">
                    Unidad solicitada: <span className="font-medium">{solicitudPendiente.descripcion_unidad || solicitudPendiente.clave_unidad_nueva}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Buscar Unidad</label>
                  <input
                    type="text"
                    value={unidadSearch}
                    onChange={e => setUnidadSearch(e.target.value)}
                    placeholder="Nombre o clave de la unidad..."
                    className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-green-500 bg-white dark:bg-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Unidad</label>
                  <div className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900 focus-within:ring-2 focus-within:ring-green-500/20 focus-within:border-green-500 transition-all">
                    <div className="max-h-48 overflow-y-auto">
                      {unidadesFiltradas.length > 0 ? (
                        unidadesFiltradas.map(u => (
                          <button
                            key={u.clave}
                            type="button"
                            onClick={() => setUnidadSeleccionada(u.clave)}
                            className={`w-full text-left px-3 py-2.5 transition-colors border-b border-gray-50 dark:border-gray-800/50 last:border-0 ${
                              unidadSeleccionada === u.clave 
                                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-semibold' 
                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                          >
                            <span className="font-mono text-[11px] opacity-60 mr-1.5">[{u.clave}]</span>
                            <span className="truncate">{u.descripcion || u.desc_corta}</span>
                          </button>
                        ))
                      ) : (
                         <div className="px-4 py-6 text-center text-gray-400 text-xs">No se encontraron unidades con esa búsqueda</div>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleSolicitarUnidad}
                  disabled={solicitarUnidadMut.isPending || !unidadSeleccionada}
                  className="px-5 py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-all disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}
                >
                  {solicitarUnidadMut.isPending ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
