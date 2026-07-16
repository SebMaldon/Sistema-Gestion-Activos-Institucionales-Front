import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuthStore } from '../store/auth.store';
import { useThemeStore } from '../store/theme.store';
import { Bell, User, Shield, UserCog, Menu, MousePointerClick, Moon, Sun } from 'lucide-react';
import { gqlClient } from '../api/client';
import {
 OBTENER_MIS_NOTIFICACIONES,
 NOTIFICACIONES_NO_LEIDAS_QUERY,
 MARCAR_LEIDA_MUTATION,
 OCULTAR_NOTIFICACION_MUTATION,
 MARCAR_TODAS_LEIDAS_MUTATION
} from '../api/notificaciones.queries';

// Roles reales de BD: 1=Maestro, 2=Administrador, 3=Usuario Estándar, 4=Sin Acceso
const ROL_CONFIG = {
 1: { label: 'Maestro', sublabel: 'Gestión y configuración', icon: Shield, color: '#006341', bg: '#dcfce7' },
 2: { label: 'Administrador', sublabel: 'Control de inventario', icon: UserCog, color: '#7c3aed', bg: '#ede9fe' },
 3: { label: 'Usuario Estándar', sublabel: 'Consulta y reporte', icon: User, color: '#2563eb', bg: '#dbeafe' },
 4: { label: 'Sin Acceso', sublabel: '', icon: User, color: '#6b7280', bg: '#f3f4f6' },
};

export default function Topbar() {
 const navigate = useNavigate();
 const { sidebarOpen, setSidebarOpen, sidebarCollapsed, setSidebarCollapsed, hoverZoomEnabled, toggleHoverZoom } = useApp();
 const usuario = useAuthStore((s) => s.usuario);
 const { darkMode, toggleDarkMode } = useThemeStore();
 const [showNotif, setShowNotif] = useState(false);
 const [notificaciones, setNotificaciones] = useState([]);
 const [noLeidas, setNoLeidas] = useState(0);

 const idRol = usuario?.id_rol ?? 3;
 const rolConf = ROL_CONFIG[idRol] ?? ROL_CONFIG[3];
 const RoleIcon = rolConf.icon;

 const cargarNotificaciones = async () => {
    try {
      const [res, countRes] = await Promise.all([
        gqlClient.request(OBTENER_MIS_NOTIFICACIONES, { mostrarOcultas: false }),
        gqlClient.request(NOTIFICACIONES_NO_LEIDAS_QUERY)
      ]);
      setNotificaciones(res.misNotificaciones || []);
      setNoLeidas(countRes.notificacionesNoLeidas ?? 0);
    } catch (err) {
      console.error('Error cargando notificaciones:', err);
    }
  };

 useEffect(() => {
 cargarNotificaciones();
 const interval = setInterval(cargarNotificaciones, 15000); // Polling cada 15s
 return () => clearInterval(interval);
 }, []);

 const handleNotificationClick = async (n) => {
    setShowNotif(false);
    
    // Optimistic UI
    if (!n.leida) {
      setNotificaciones(prev => prev.map(x => x.id_notificacion === n.id_notificacion ? { ...x, leida: true } : x));
      setNoLeidas(prev => Math.max(0, prev - 1));
      
      // Fire and forget
      gqlClient.request(MARCAR_LEIDA_MUTATION, { idNotificacion: parseInt(n.id_notificacion, 10) }).catch(console.error);
    }

    const titulo = (n.titulo || '').toLowerCase();
    const mensaje = (n.mensaje || '').toLowerCase();

    if (titulo.includes('solicitud') || titulo.includes('cambio') || mensaje.includes('solicitud') || mensaje.includes('cambio')) {
      navigate('/aprobaciones');
    } else if (titulo.includes('incidencia') || mensaje.includes('incidencia')) {
      navigate('/incidencias');
    } else if (titulo.includes('garantía') || mensaje.includes('garantía') || titulo.includes('garantia') || mensaje.includes('garantia')) {
      navigate('/garantias');
    }
  };

 const handleOcultar = async (e, idNotif) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Optimistic UI
    const targetNotif = notificaciones.find(x => x.id_notificacion === idNotif);
    setNotificaciones(prev => prev.filter(x => x.id_notificacion !== idNotif));
    if (targetNotif && !targetNotif.leida) {
      setNoLeidas(prev => Math.max(0, prev - 1));
    }

    try {
      await gqlClient.request(OCULTAR_NOTIFICACION_MUTATION, { idNotificacion: parseInt(idNotif, 10) });
    } catch (err) {
      console.error('Error al ocultar notificacion:', err);
      cargarNotificaciones(); // revert on fail
    }
  };

 const handleMarcarTodasLeidas = async () => {
    // Optimistic UI
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
    setNoLeidas(0);

    try {
      await gqlClient.request(MARCAR_TODAS_LEIDAS_MUTATION);
    } catch (err) {
      console.error(err);
      cargarNotificaciones(); // revert on fail
    }
  };

 const formatTime = (dateStr) => {
 try {
 const date = new Date(dateStr);
 return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
 } catch {
 return '';
 }
 };

 // Iniciales del nombre completo para el avatar
 const initials = usuario?.nombre_completo
 ? usuario.nombre_completo.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
 : '?';

 const displayName = usuario?.nombre_completo ?? 'Usuario';
 const unidad = usuario?.unidad?.nombre ?? '';

 return (
 <header className="h-14 sm:h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-3 sm:px-6 flex-shrink-0 z-20">
 {/* Left: Hamburger + Search */}
 <div className="flex items-center gap-2 sm:gap-3">
 {/* Hamburger / Toggle Sidebar */}
 <button
 onClick={() => {
 if (window.innerWidth < 1024) {
 setSidebarOpen(!sidebarOpen);
 } else {
 setSidebarCollapsed(!sidebarCollapsed);
 }
 }}
 className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
 aria-label="Alternar menú"
 >
 <Menu size={20} className="text-gray-600 dark:text-gray-400 " />
 </button>
 </div>

 {/* Right: Controls */}
 <div className="flex items-center gap-2 sm:gap-3">

 {/* Badge de rol */}
 <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ">
 <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: rolConf.bg }}>
 <RoleIcon size={11} style={{ color: rolConf.color }} />
 </div>
 <div className="hidden md:block text-left">
 <p className="font-semibold text-gray-800 dark:text-gray-200 text-xs leading-tight">{rolConf.label}</p>
 <p className="text-gray-400 text-xs leading-tight">{rolConf.sublabel}</p>
 </div>
 </div>

 {/* Hover Zoom Toggle */}
 <button
 onClick={toggleHoverZoom}
 className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${hoverZoomEnabled ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:bg-indigo-900 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-800' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 '}`}
 title="Activar o desactivar zoom en celdas de las tablas"
 >
 <MousePointerClick size={14} />
 <span className="text-xs font-semibold">{hoverZoomEnabled ? 'Zoom ON' : 'Zoom OFF'}</span>
 </button>

 {/* Dark Mode Toggle */}
 <button
 onClick={toggleDarkMode}
 className="relative w-9 h-9 flex items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-700 transition-colors "
 title={darkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
 >
 {darkMode ? (
 <Sun size={17} className="text-yellow-500" />
 ) : (
 <Moon size={17} className="text-gray-600 dark:text-gray-400 " />
 )}
 </button>

 {/* Notifications */}
 <div className="relative">
 <button
 onClick={() => setShowNotif(!showNotif)}
 className="relative w-9 h-9 flex items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-700 transition-colors"
 >
 <Bell size={17} className="text-gray-600 dark:text-gray-400 " />
 {noLeidas > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-white dark:border-gray-800 shadow-sm">
            {noLeidas > 99 ? '99+' : noLeidas}
          </span>
        )}
 </button>

 {showNotif && (
 <div className="absolute right-0 top-12 w-[calc(100vw-1.5rem)] sm:w-80 max-w-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden fade-in">
 <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
 <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Notificaciones</p>
 <div className="flex items-center gap-2">
 {noLeidas > 0 && (
 <>
 <button 
 onClick={handleMarcarTodasLeidas} 
 className="text-[10px] text-green-700 dark:text-green-400 dark:text-green-300 hover:text-green-800 font-bold"
 >
 Marcar todo leído
 </button>
 <span className="text-xs text-white font-bold bg-red-500 rounded-full px-2 py-0.5">{noLeidas > 99 ? '99+' : noLeidas}</span>
 </>
 )}
 </div>
 </div>
 <div className="max-h-80 overflow-y-auto custom-scrollbar">
 {notificaciones.length === 0 ? (
 <div className="p-4 text-center text-xs text-gray-400 italic">
 Sin notificaciones
 </div>
 ) : (
 notificaciones.map((n) => (
 <div 
 key={n.id_notificacion} 
 onClick={() => handleNotificationClick(n)}
 className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 flex text-left gap-3 border-b border-gray-50 dark:border-gray-800 transition-colors cursor-pointer relative ${!n.leida ? 'bg-green-50 dark:bg-green-900/20' : ''}`}
 >
 <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${!n.leida ? 'bg-green-600 animate-pulse' : 'bg-gray-300'}`} />
 <div className="flex-1 pr-6">
 <p className={`text-xs sm:text-sm ${!n.leida ? 'font-bold text-gray-800 dark:text-gray-200 ' : 'text-gray-600 dark:text-gray-400 '}`}>{n.titulo}</p>
 <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{n.mensaje}</p>
 <p className="text-[10px] text-gray-400 mt-1">{formatTime(n.fecha_creacion)}</p>
 </div>
 <button
 onClick={(e) => handleOcultar(e, n.id_notificacion)}
 className="absolute right-3 top-3 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-600 p-1.5 rounded-lg transition-colors z-20 pointer-events-auto flex items-center justify-center"
 title="Ocultar"
 >
 <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
 </svg>
 </button>
 </div>
 ))
 )}
 </div>
 </div>
 )}
 </div>

 {/* User Avatar */}
 <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-gray-700 ">
 <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
 style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
 {initials}
 </div>
 <div className="hidden md:block">
 <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-tight">{displayName}</p>
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
