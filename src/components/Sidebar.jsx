import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard, Package, AlertTriangle, ArrowLeftRight,
  QrCode, Users, Settings, ShieldCheck, LogOut, ChevronRight,
  Building2, ClipboardList, X
} from 'lucide-react';

// ─── 1 = Maestro,  2 = Administrador,  3 = Usuario Estándar, 4 = Sin Acceso ──
const NAV_BY_ROL = {
  1: [ // Maestro / SUPERADMIN
    { path: '/dashboard', label: 'Panel Principal', icon: LayoutDashboard, group: 'Principal' },
    { path: '/inventario', label: 'Inventario de Bienes', icon: Package, group: 'Gestión' },
    { path: '/incidencias', label: 'Incidencias', icon: AlertTriangle, group: 'Gestión' },
    { path: '/garantias', label: 'Garantías', icon: ShieldCheck, group: 'Gestión' },
    { path: '/movimientos', label: 'Traspasos y Salidas', icon: ArrowLeftRight, group: 'Gestión' },
    { path: '/escaner', label: 'Escáner QR', icon: QrCode, group: 'Operación' },
    { path: '/usuarios', label: 'Gestión de Usuarios', icon: Users, group: 'Sistema' },
    { path: '/auditoria', label: 'Bitácora de Auditoría', icon: ShieldCheck, group: 'Sistema' },
    { path: '/configuracion', label: 'Configuración', icon: Settings, group: 'Sistema' },
  ],
  2: [ // Administrador
    { path: '/dashboard', label: 'Panel Principal', icon: LayoutDashboard, group: 'Principal' },
    { path: '/inventario', label: 'Inventario de Bienes', icon: Package, group: 'Administración' },
    { path: '/incidencias', label: 'Incidencias', icon: AlertTriangle, group: 'Administración' },
    { path: '/garantias', label: 'Garantías', icon: ShieldCheck, group: 'Administración' },
    { path: '/movimientos', label: 'Traspasos y Salidas', icon: ArrowLeftRight, group: 'Operación' },
    { path: '/escaner', label: 'Escáner QR', icon: QrCode, group: 'Operación' },
  ],
  3: [ // Usuario Estándar (solo consulta)
    { path: '/dashboard', label: 'Panel Principal', icon: LayoutDashboard, group: 'Principal' },
    { path: '/inventario', label: 'Inventario', icon: Package, group: 'Consulta' },
    { path: '/incidencias', label: 'Mis Incidencias', icon: AlertTriangle, group: 'Consulta' },
    { path: '/escaner', label: 'Escáner QR', icon: QrCode, group: 'Consulta' },
  ],
  4: [], // Sin Acceso — no debería llegar aquí
};

export default function Sidebar() {
  const { currentPage, setSidebarOpen } = useApp();
  const usuario = useAuthStore((s) => s.usuario);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate = useNavigate();
  const location = useLocation();

  const idRol = usuario?.id_rol ?? 3;
  const navItems = NAV_BY_ROL[idRol] ?? NAV_BY_ROL[3];

  // Nombre del rol para la etiqueta
  const ROL_LABELS = { 1: 'Maestro', 2: 'Administrador', 3: 'Usuario Estándar', 4: 'Sin Acceso' };
  const rolLabel = ROL_LABELS[idRol] ?? 'Usuario';

  // Agrupar items por grupo
  const grouped = navItems.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  const handleNav = (path) => {
    navigate(path);
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
          {/* X solo en mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Badge de rol */}
        <div className="mt-3 px-2 py-1 rounded text-xs text-center"
          style={{ backgroundColor: 'rgba(201,162,39,0.15)', color: '#f0c040' }}>
          <ClipboardList size={10} className="inline mr-1" />
          {rolLabel}
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {Object.entries(grouped).map(([group, items]) => (
          <div key={group} className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider px-3 mb-2"
              style={{ color: 'rgba(187,247,208,0.5)' }}>
              {group}
            </p>
            {items.map((item) => {
              const Icon = item.icon;
              // Activo si la URL coincide con la ruta del item
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => handleNav(item.path)}
                  className={`sidebar-link w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium group
                    ${isActive
                      ? 'bg-white/15 text-white'
                      : 'text-green-100/80 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  <Icon
                    size={18}
                    className={isActive ? 'text-yellow-300' : 'text-green-200/60 group-hover:text-yellow-300'}
                  />
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
        {/* Info del usuario */}
        {usuario && (
          <div className="mb-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
            <p className="text-white text-xs font-semibold leading-tight truncate">{usuario.nombre_completo}</p>
            <p className="text-green-200/60 text-xs leading-tight truncate">{usuario.matricula}</p>
          </div>
        )}
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
