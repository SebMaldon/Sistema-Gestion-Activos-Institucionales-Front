import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ROLES } from '../data/mockData';
import { Bell, ChevronDown, User, Shield, UserCog, Menu } from 'lucide-react';

const ROLE_CONFIG = {
  [ROLES.COMMON]: {
    label: 'Usuario Común',
    sublabel: 'Técnico / Auditor',
    icon: User,
    color: '#3b82f6',
    bg: '#eff6ff',
  },
  [ROLES.ADMIN]: {
    label: 'Administrador',
    sublabel: 'Jefe / Coordinador',
    icon: Shield,
    color: '#006341',
    bg: '#dcfce7',
  },
  [ROLES.SUPERADMIN]: {
    label: 'Usuario Maestro',
    sublabel: 'Super Administrador',
    icon: UserCog,
    color: '#7c3aed',
    bg: '#ede9fe',
  },
};

const FAKE_USER = {
  [ROLES.COMMON]: 'L.C. Patricia Ríos H.',
  [ROLES.ADMIN]: 'Ing. Carlos Morales V.',
  [ROLES.SUPERADMIN]: 'Admin. Sistema IMSS',
};

export default function Topbar() {
  const { currentRole, setCurrentRole, setCurrentPage, sidebarOpen, setSidebarOpen } = useApp();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

  const roleConf = ROLE_CONFIG[currentRole];
  const RoleIcon = roleConf.icon;

  const handleRoleChange = (role) => {
    setCurrentRole(role);
    setShowRoleMenu(false);
    if (role === ROLES.COMMON) setCurrentPage('escaner');
    else setCurrentPage('dashboard');
  };

  return (
    <header className="h-14 sm:h-16 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-6 flex-shrink-0 z-20">
      {/* Left: Hamburger (mobile) + Search (desktop) */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu size={20} className="text-gray-600" />
        </button>

        {/* Search — tablet/desktop */}
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

        {/* Role Switcher */}
        <div className="relative">
          <button
            onClick={() => { setShowRoleMenu(!showRoleMenu); setShowNotif(false); }}
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 bg-white transition-all text-sm"
          >
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: roleConf.bg }}>
              <RoleIcon size={13} style={{ color: roleConf.color }} />
            </div>
            <div className="hidden md:block text-left">
              <p className="font-semibold text-gray-800 text-xs leading-tight">{roleConf.label}</p>
              <p className="text-gray-400 text-xs leading-tight">{roleConf.sublabel}</p>
            </div>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 top-12 w-64 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden fade-in">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Simular Rol de Usuario</p>
              </div>
              {Object.entries(ROLE_CONFIG).map(([roleKey, conf]) => {
                const Icon = conf.icon;
                const isActive = currentRole === roleKey;
                return (
                  <button
                    key={roleKey}
                    onClick={() => handleRoleChange(roleKey)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${isActive ? 'bg-green-50' : ''}`}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: conf.bg }}>
                      <Icon size={16} style={{ color: conf.color }} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${isActive ? 'text-green-700' : 'text-gray-700'}`}>{conf.label}</p>
                      <p className="text-xs text-gray-400">{conf.sublabel}</p>
                    </div>
                    {isActive && <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotif(!showNotif); setShowRoleMenu(false); }}
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
                { title: 'Garantía por vencer', desc: 'ACT-002 vence en 6 meses', t: 'hace 2h', color: '#f59e0b' },
                { title: 'Nueva incidencia reportada', desc: 'INC-004: Falla de batería en ACT-001', t: 'hace 5h', color: '#ef4444' },
                { title: 'Transferencia pendiente', desc: 'Traspaso ACT-004 requiere aprobación', t: 'Ayer', color: '#3b82f6' },
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
            {FAKE_USER[currentRole].charAt(0)}
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-semibold text-gray-800 leading-tight">{FAKE_USER[currentRole]}</p>
            <p className="text-xs text-gray-400 leading-tight">{ROLE_CONFIG[currentRole].sublabel}</p>
          </div>
        </div>
      </div>

      {/* Click outside to close */}
      {(showRoleMenu || showNotif) && (
        <div className="fixed inset-0 z-40" onClick={() => { setShowRoleMenu(false); setShowNotif(false); }} />
      )}
    </header>
  );
}
