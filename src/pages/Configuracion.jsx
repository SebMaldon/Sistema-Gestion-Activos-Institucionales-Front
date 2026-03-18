import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Settings, Save, Building, Database, Shield, Bell, Monitor } from 'lucide-react';

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

  const handleSave = () => {
    showToast('Configuración del sistema guardada correctamente.', 'success');
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
        {/* Institutional Data */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Building size={15} style={{ color: '#006341' }} />
            Datos Institucionales
          </h2>
          {[
            { label: 'Nombre de la Institución', key: 'institucion' },
            { label: 'Delegación', key: 'delegacion' },
            { label: 'Coordinación de Informática', key: 'coordinacion' },
            { label: 'Jefe de Coord. de Informática', key: 'jefe' },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
              <input
                type="text"
                value={config[key]}
                onChange={e => setConfig(prev => ({ ...prev, [key]: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
          ))}
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Bell size={15} style={{ color: '#006341' }} />
            Alertas y Notificaciones
          </h2>
          {[
            { label: 'Notificaciones por correo electrónico', key: 'emailAlerts' },
            { label: 'Respaldo automático de datos', key: 'backupAuto' },
            { label: 'Mostrar logo IMSS en reportes', key: 'logoImss' },
          ].map(({ label, key }) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-700">{label}</span>
              <button
                onClick={() => setConfig(prev => ({ ...prev, [key]: !prev[key] }))}
                className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
                style={{ backgroundColor: config[key] ? '#006341' : '#d1d5db' }}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${config[key] ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Días de aviso previo a vencimiento de garantía</label>
            <div className="flex items-center gap-3">
              <input
                type="range" min={30} max={180} step={30}
                value={config.alertGarantia}
                onChange={e => setConfig(prev => ({ ...prev, alertGarantia: +e.target.value }))}
                className="flex-1 accent-green-700"
              />
              <span className="text-sm font-bold text-gray-700 w-16 text-right">{config.alertGarantia} días</span>
            </div>
          </div>
        </div>

        {/* Agent & Sync */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Monitor size={15} style={{ color: '#006341' }} />
            Agente Windows & Sincronización
          </h2>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-700">Sincronización automática con Agente</span>
            <button
              onClick={() => setConfig(prev => ({ ...prev, agentSync: !prev.agentSync }))}
              className="relative w-11 h-6 rounded-full transition-colors"
              style={{ backgroundColor: config.agentSync ? '#006341' : '#d1d5db' }}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${config.agentSync ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Intervalo de sincronización (minutos)</label>
            <select
              value={config.syncInterval}
              onChange={e => setConfig(prev => ({ ...prev, syncInterval: +e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-green-500 bg-white">
              {[15, 30, 60, 120, 240].map(v => <option key={v} value={v}>{v} minutos</option>)}
            </select>
          </div>
          <div className="bg-green-50 rounded-xl p-3 flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 pulse-ring flex-shrink-0" />
            <p className="text-xs text-green-700 font-medium">Agente IMSS-Asset v1.3 activo — Última sincronización: hoy 17:30</p>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <Shield size={15} style={{ color: '#006341' }} />
            Seguridad del Sistema
          </h2>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tiempo de sesión máxima (minutos)</label>
            <input
              type="number" min={10} max={120}
              value={config.sessionTimeout}
              onChange={e => setConfig(prev => ({ ...prev, sessionTimeout: +e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Máximo de usuarios simultáneos</label>
            <input
              type="number" min={10} max={200}
              value={config.maxUsers}
              onChange={e => setConfig(prev => ({ ...prev, maxUsers: +e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          <div className="p-3 rounded-xl border border-red-100 bg-red-50 text-xs text-red-700">
            <p className="font-bold mb-1">⚠ Zona Crítica</p>
            <p>Modificar parámetros de seguridad afecta a todos los usuarios del sistema. Se requiere confirmación de Dirección General.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
