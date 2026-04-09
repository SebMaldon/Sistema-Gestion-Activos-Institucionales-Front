import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { useAuthStore } from './store/auth.store';

import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Toast from './components/Toast';
import FichaTecnica from './pages/FichaTecnica';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventario from './pages/Inventario';
import Incidencias from './pages/Incidencias';
import Movimientos from './pages/Movimientos';
import EscanerQR from './pages/EscanerQR';
import GestionUsuarios from './pages/GestionUsuarios';
import Auditoria from './pages/Auditoria';
import Configuracion from './pages/Configuracion';

// ─── Roles reales de BD ──────────────────────────────────────────────────────
// 1 = Administrador, 2 = Maestro, 3 = Usuario Estándar, 4 = Sin Acceso
const ROL_ADMIN    = 1;
const ROL_MAESTRO  = 2;
const ROL_USUARIO  = 3;

// ─── Guard: solo requiere sesión activa ─────────────────────────────────────
function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

// ─── Guard: sesión + rol específico ─────────────────────────────────────────
function RoleRoute({ allowedRoles, children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const usuario = useAuthStore((s) => s.usuario);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!allowedRoles.includes(usuario?.id_rol)) {
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
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
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

// ─── Raíz de la app ────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          {/* Pública */}
          <Route path="/login" element={<LoginRoute />} />

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

          {/* Rutas restringidas: Admin (1) y Maestro (2) */}
          <Route path="/movimientos" element={
            <RoleRoute allowedRoles={[ROL_ADMIN, ROL_MAESTRO]}>
              <AppLayout page="movimientos"><Movimientos /></AppLayout>
            </RoleRoute>
          } />
          <Route path="/usuarios" element={
            <RoleRoute allowedRoles={[ROL_ADMIN, ROL_MAESTRO]}>
              <AppLayout page="usuarios"><GestionUsuarios /></AppLayout>
            </RoleRoute>
          } />
          <Route path="/auditoria" element={
            <RoleRoute allowedRoles={[ROL_ADMIN, ROL_MAESTRO]}>
              <AppLayout page="auditoria"><Auditoria /></AppLayout>
            </RoleRoute>
          } />
          <Route path="/configuracion" element={
            <RoleRoute allowedRoles={[ROL_ADMIN, ROL_MAESTRO]}>
              <AppLayout page="configuracion"><Configuracion /></AppLayout>
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
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />;
}

function RootRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
}
