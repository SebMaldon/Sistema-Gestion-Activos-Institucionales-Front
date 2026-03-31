import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuthStore } from '../store/auth.store';
import { Bell, User, Shield, UserCog, Menu } from 'lucide-react';

// Configuración visual por id_rol: 1=Admin, 2=Supervisor, 3=Usuario
const ROL_CONFIG = {
  1: { label: 'Administrador',  sublabel: 'Jefe / Coordinador',      icon: Shield,  color: '#006341', bg: '#dcfce7' },
  2: { label: 'Supervisor',     sublabel: 'Coordinador de área',      icon: UserCog, color: '#7c3aed', bg: '#ede9fe' },
  3: { label: 'Usuario',        sublabel: 'Técnico / Auditor',        icon: User,    color: '#2563eb', bg: '#dbeafe' },
};

export default function Topbar() {
  const { sidebarOpen, setSidebarOpen } = useApp();
  const usuario = useAuthStore((s) => s.usuario);
  const [showNotif, setShowNotif] = useState(false);

  const idRol  = usuario?.id_rol ?? 3;
  const rolConf = ROL_CONFIG[idRol] ?? ROL_CONFIG[3];
  const RoleIcon = rolConf.icon;

  // Iniciales del nombre completo para el avatar
  const initials = usuario?.nombre_completo
    ? usuario.nombre_completo.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
    : '?';

  const displayName = usuario?.nombre_completo ?? 'Usuario';
  const unidad      = usuario?.unidad?.nombre ?? '';

  return (
    <header className="h-14 sm:h-16 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-6 flex-shrink-0 z-20">
      {/* Left: Hamburger + Search */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu size={20} className="text-gray-600" />
        </button>

        {/* Search */}
        <div className="relative hidden sm:flex items-center">
          <svg className="absolute left-3 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar activo, serie, usuario..."
            className="pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg w-48 md:w-64 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
          />
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2 sm:gap-3">

        {/* Badge de rol */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white">
          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: rolConf.bg }}>
            <RoleIcon size={11} style={{ color: rolConf.color }} />
          </div>
          <div className="hidden md:block text-left">
            <p className="font-semibold text-gray-800 text-xs leading-tight">{rolConf.label}</p>
            <p className="text-gray-400 text-xs leading-tight">{rolConf.sublabel}</p>
          </div>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotif(!showNotif)}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors"
          >
            <Bell size={17} className="text-gray-600" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
          </button>

          {showNotif && (
            <div className="absolute right-0 top-12 w-[calc(100vw-1.5rem)] sm:w-80 max-w-sm bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden fade-in">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notificaciones</p>
                <span className="text-xs text-white bg-red-500 rounded-full px-2 py-0.5">3</span>
              </div>
              {[
                { title: 'Garantía por vencer',         desc: 'ACT-002 vence en 6 meses',                t: 'hace 2h',  color: '#f59e0b' },
                { title: 'Nueva incidencia reportada',  desc: 'INC-004: Falla de batería en ACT-001',    t: 'hace 5h',  color: '#ef4444' },
                { title: 'Transferencia pendiente',     desc: 'Traspaso ACT-004 requiere aprobación',    t: 'Ayer',     color: '#3b82f6' },
              ].map((n, i) => (
                <div key={i} className="px-4 py-3 hover:bg-gray-50 flex gap-3 border-b border-gray-50 transition-colors cursor-pointer">
                  <div className="w-2 h-2 mt-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: n.color }} />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{n.title}</p>
                    <p className="text-xs text-gray-500">{n.desc}</p>
                    <p className="text-xs text-gray-400 mt-1">{n.t}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
            {initials}
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-semibold text-gray-800 leading-tight">{displayName}</p>
            <p className="text-xs text-gray-400 leading-tight">{unidad || rolConf.sublabel}</p>
          </div>
        </div>
      </div>

      {/* Click outside to close */}
      {showNotif && (
        <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)} />
      )}
    </header>
  );
}
