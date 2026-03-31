import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuthStore } from '../store/auth.store';
import {
  LayoutDashboard, Package, AlertTriangle, ArrowLeftRight,
  QrCode, Users, Settings, ShieldCheck, LogOut, ChevronRight,
  Building2, ClipboardList, X
} from 'lucide-react';

// Menú por id_rol real del backend: 1=Admin, 2=Supervisor, 3=Usuario
const NAV_BY_ROL = {
  1: [ // Admin / SUPERADMIN
    { id: 'dashboard',     label: 'Panel Principal',         icon: LayoutDashboard, group: 'Principal' },
    { id: 'inventario',    label: 'Inventario de Bienes',    icon: Package,         group: 'Gestión' },
    { id: 'incidencias',   label: 'Incidencias y Garantías', icon: AlertTriangle,   group: 'Gestión' },
    { id: 'movimientos',   label: 'Traspasos y Salidas',     icon: ArrowLeftRight,  group: 'Gestión' },
    { id: 'escaner',       label: 'Escáner QR',              icon: QrCode,          group: 'Operación' },
    { id: 'usuarios',      label: 'Gestión de Usuarios',     icon: Users,           group: 'Sistema' },
    { id: 'auditoria',     label: 'Bitácora de Auditoría',   icon: ShieldCheck,     group: 'Sistema' },
    { id: 'configuracion', label: 'Configuración',           icon: Settings,        group: 'Sistema' },
  ],
  2: [ // Supervisor
    { id: 'dashboard',   label: 'Panel Principal',         icon: LayoutDashboard, group: 'Administración' },
    { id: 'inventario',  label: 'Inventario de Bienes',    icon: Package,         group: 'Administración' },
    { id: 'incidencias', label: 'Incidencias y Garantías', icon: AlertTriangle,   group: 'Administración' },
    { id: 'movimientos', label: 'Traspasos y Salidas',     icon: ArrowLeftRight,  group: 'Operación' },
    { id: 'escaner',     label: 'Escáner QR',              icon: QrCode,          group: 'Operación' },
  ],
  3: [ // Usuario común
    { id: 'escaner',     label: 'Escáner QR',    icon: QrCode,        group: 'Principal' },
    { id: 'incidencias', label: 'Mis Incidencias', icon: AlertTriangle, group: 'Principal' },
  ],
};

export default function Sidebar() {
  const { currentPage, setCurrentPage, setSidebarOpen } = useApp();
  const usuario  = useAuthStore((s) => s.usuario);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate  = useNavigate();

  const idRol    = usuario?.id_rol ?? 3;
  const navItems = NAV_BY_ROL[idRol] ?? NAV_BY_ROL[3];

  // Agrupar
  const grouped = navItems.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  const handleNav = (id) => {
    setCurrentPage(id);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    clearAuth();
    setSidebarOpen(false);
    navigate('/login', { replace: true });
  };

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col h-screen"
      style={{ backgroundColor: '#00472e' }}>

      {/* Logo */}
      <div className="flex-shrink-0 px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: '#006341' }}>
            <Building2 size={22} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-sm leading-tight">IMSS</p>
            <p className="text-green-200 text-xs leading-tight">Gestión de Activos</p>
          </div>
          {/* X button — only visible on mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-3 px-2 py-1 rounded text-xs text-center"
          style={{ backgroundColor: 'rgba(201,162,39,0.15)', color: '#f0c040' }}>
          <ClipboardList size={10} className="inline mr-1" />
          Ecosistema IMSS v2.4.1
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group} className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider px-3 mb-2"
              style={{ color: 'rgba(187,247,208,0.5)' }}>
              {group}
            </p>
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`sidebar-link w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium group
                    ${isActive
                      ? 'bg-white/15 text-white'
                      : 'text-green-100/80 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  <Icon size={18} className={isActive ? 'text-yellow-300' : 'text-green-200/60 group-hover:text-yellow-300'} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {isActive && <ChevronRight size={14} className="text-yellow-300" />}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 p-3 border-t border-white/10">
        <button
          id="btn-logout"
          onClick={handleLogout}
          className="sidebar-link w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-300/80 hover:bg-red-900/30 hover:text-red-200"
        >
          <LogOut size={16} />
          <span>Cerrar Sesión</span>
        </button>
        <p className="text-center mt-2 text-green-200/30 text-xs">
          © 2026 IMSS — DGSTI
        </p>
      </div>
    </aside>
  );
}
