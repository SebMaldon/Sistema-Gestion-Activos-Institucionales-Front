import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { useAuthStore } from './store/auth.store';

import { useThemeStore } from './store/theme.store';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Toast from './components/Toast';
import FichaTecnica from './pages/FichaTecnica';
import Login from './pages/Login';
import Documentacion from './pages/Documentacion';
import Dashboard from './pages/Dashboard';
import Inventario from './pages/Inventario';
import Incidencias from './pages/Incidencias';
import Movimientos from './pages/Movimientos';
import EscanerQR from './pages/EscanerQR';
import GestionUsuarios from './pages/GestionUsuarios';
import Auditoria from './pages/Auditoria';
import Configuracion from './pages/Configuracion';
import Garantias from './pages/Garantias';
import Unidades from './pages/Unidades';
import Aprobaciones from './pages/Aprobaciones';
import Correspondencia from './pages/Correspondencia';
import SinAcceso from './pages/SinAcceso';
import { useCurrentUser } from './hooks/useCurrentUser';


// ─── Roles reales de BD ──────────────────────────────────────────────────────
// 1 = Maestro, 2 = Administrador, 3 = Usuario Estándar, 4 = Sin Acceso
const ROL_ADMIN = 2;
const ROL_MAESTRO = 1;
const ROL_USUARIO = 3;
const ROL_SIN_ACCESO = 4;

// ─── Guard: solo requiere sesión activa ─────────────────────────────────────
function ProtectedRoute({ children }) {
 const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
 const usuario = useAuthStore((s) => s.usuario);
 const location = useLocation();

 if (!isAuthenticated || !usuario) {
 return <Navigate to="/login" state={{ from: location }} replace />;
 }
 if (usuario.id_rol === ROL_SIN_ACCESO) {
 return <Navigate to="/sin-acceso" replace />;
 }
 return children;
}

// ─── Guard: sesión + rol específico ─────────────────────────────────────────
function RoleRoute({ allowedRoles, children }) {
 const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
 const usuario = useAuthStore((s) => s.usuario);
 const location = useLocation();

 if (!isAuthenticated || !usuario) {
 return <Navigate to="/login" state={{ from: location }} replace />;
 }
 if (usuario.id_rol === ROL_SIN_ACCESO) {
 return <Navigate to="/sin-acceso" replace />;
 }
 if (!allowedRoles.includes(usuario.id_rol)) {
 // Sesión válida pero rol insuficiente → Dashboard
 return <Navigate to="/dashboard" replace />;
 }
 return children;
}

// ─── Adaptador: sincroniza la URL con currentPage del contexto ────────────────
function PageSync({ page, children }) {
 const { setCurrentPage } = useApp();
 React.useEffect(() => { setCurrentPage(page); }, [page]);
 return children;
}

// ─── Layout principal ─────────────────────────────────────────────────────────
function AppLayout({ page, children }) {
 const { sidebarOpen, setSidebarOpen } = useApp();
 return (
 <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 ">
 {/* Mobile overlay */}
 {sidebarOpen && (
 <div
 className="fixed inset-0 bg-black/50 dark:bg-black/70 z-30 lg:hidden"
 onClick={() => setSidebarOpen(false)}
 />
 )}
 {/* Sidebar */}
 <div className={`
 fixed inset-y-0 left-0 z-40 lg:static lg:z-auto
 transform transition-transform duration-300 ease-in-out
 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
 lg:translate-x-0 lg:flex-shrink-0
 `}>
 <Sidebar />
 </div>
 {/* Main content */}
 <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
 <Topbar />
 <main className="flex-1 overflow-y-auto">
 <PageSync page={page}>{children}</PageSync>
 </main>
 </div>
 {/* Globales */}
 <FichaTecnica />
 <Toast />
 </div>
 );
}



export default function App() {
 const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
 const { isLoading } = useCurrentUser();
 const initDarkMode = useThemeStore((s) => s.initDarkMode);

 React.useEffect(() => {
 initDarkMode();
 }, [initDarkMode]);

 if (isAuthenticated && isLoading) {
 return (
 <div className="h-screen w-screen flex flex-col items-center justify-center bg-white dark:bg-gray-800 gap-4">
 <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
 <p className="text-sm font-medium text-gray-500 dark:text-gray-400 animate-pulse">Verificando sesión...</p>
 </div>
 );
 }

 return (
 <BrowserRouter>
 <AppProvider>
 <Routes>
 {/* Pública */}
 <Route path="/login" element={<LoginRoute />} />
 <Route path="/documentacion" element={<Documentacion />} />
 <Route path="/sin-acceso" element={
 <SinAccesoRoute>
 <SinAcceso />
 </SinAccesoRoute>
 } />

 {/* Rutas accesibles para todos los roles autenticados (1,2,3) */}
 <Route path="/dashboard" element={
 <ProtectedRoute>
 <AppLayout page="dashboard"><Dashboard /></AppLayout>
 </ProtectedRoute>
 } />
 <Route path="/inventario" element={
 <ProtectedRoute>
 <AppLayout page="inventario"><Inventario /></AppLayout>
 </ProtectedRoute>
 } />
 <Route path="/incidencias" element={
 <ProtectedRoute>
 <AppLayout page="incidencias"><Incidencias /></AppLayout>
 </ProtectedRoute>
 } />
 <Route path="/escaner" element={
 <ProtectedRoute>
 <AppLayout page="escaner"><EscanerQR /></AppLayout>
 </ProtectedRoute>
 } />
 <Route path="/unidades" element={
 <ProtectedRoute>
 <AppLayout page="unidades"><Unidades /></AppLayout>
 </ProtectedRoute>
 } />
 <Route path="/configuracion" element={
 <ProtectedRoute>
 <AppLayout page="configuracion"><Configuracion /></AppLayout>
 </ProtectedRoute>
 } />

 {/* Rutas restringidas: Admin (1) y Maestro (2) */}
 <Route path="/garantias" element={
 <RoleRoute allowedRoles={[ROL_ADMIN, ROL_MAESTRO]}>
 <AppLayout page="garantias"><Garantias /></AppLayout>
 </RoleRoute>
 } />
 <Route path="/movimientos" element={
 <RoleRoute allowedRoles={[ROL_ADMIN, ROL_MAESTRO]}>
 <AppLayout page="movimientos"><Movimientos /></AppLayout>
 </RoleRoute>
 } />
 <Route path="/correspondencia" element={
 <RoleRoute allowedRoles={[ROL_ADMIN, ROL_MAESTRO]}>
 <AppLayout page="correspondencia"><Correspondencia /></AppLayout>
 </RoleRoute>
 } />

 {/* Rutas restringidas de Sistema: Solo Maestro (1) */}
 <Route path="/usuarios" element={
 <RoleRoute allowedRoles={[ROL_MAESTRO]}>
 <AppLayout page="usuarios"><GestionUsuarios /></AppLayout>
 </RoleRoute>
 } />
 <Route path="/aprobaciones" element={
 <RoleRoute allowedRoles={[ROL_MAESTRO]}>
 <AppLayout page="aprobaciones"><Aprobaciones /></AppLayout>
 </RoleRoute>
 } />
 <Route path="/auditoria" element={
 <RoleRoute allowedRoles={[ROL_MAESTRO]}>
 <AppLayout page="auditoria"><Auditoria /></AppLayout>
 </RoleRoute>
 } />

 {/* Raíz */}
 <Route path="/" element={<RootRedirect />} />

 {/* Catch-all */}
 <Route path="*" element={<Navigate to="/" replace />} />
 </Routes>
 </AppProvider>
 </BrowserRouter>
 );
}

function LoginRoute() {
 const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
 const usuario = useAuthStore((s) => s.usuario);
 
 if (isAuthenticated) {
 if (usuario?.id_rol === ROL_SIN_ACCESO) return <Navigate to="/sin-acceso" replace />;
 return <Navigate to="/dashboard" replace />;
 }
 return <Login />;
}

function SinAccesoRoute({ children }) {
 const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
 const usuario = useAuthStore((s) => s.usuario);
 
 if (!isAuthenticated) return <Navigate to="/login" replace />;
 if (usuario?.id_rol !== ROL_SIN_ACCESO) return <Navigate to="/dashboard" replace />;
 return children;
}

function RootRedirect() {
 const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
 const usuario = useAuthStore((s) => s.usuario);
 
 if (!isAuthenticated) return <Navigate to="/login" replace />;
 if (usuario?.id_rol === ROL_SIN_ACCESO) return <Navigate to="/sin-acceso" replace />;
 return <Navigate to="/dashboard" replace />;
}
