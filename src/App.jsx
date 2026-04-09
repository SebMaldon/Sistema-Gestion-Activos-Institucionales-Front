import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ProtectedRoute } from './components/ProtectedRoute';
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
import Garantias from './pages/Garantias';

// ─── Router de páginas internas ────────────────────────────────────
function PageRouter() {
  const { currentPage } = useApp();

  const pages = {
    dashboard: <Dashboard />,
    inventario: <Inventario />,
    incidencias: <Incidencias />,
    garantias: <Garantias />,
    movimientos: <Movimientos />,
    escaner: <EscanerQR />,
    usuarios: <GestionUsuarios />,
    auditoria: <Auditoria />,
    configuracion: <Configuracion />,
  };

  return pages[currentPage] || <Dashboard />;
}

// ─── Layout principal (requiere auth) ───────────────────────────────
function AppLayout() {
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

      {/* Sidebar: drawer on mobile, pinned on desktop */}
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
          <PageRouter />
        </main>
      </div>

      {/* Global overlay components */}
      <FichaTecnica />
      <Toast />
    </div>
  );
}

// ─── Raíz de la app con React Router ───────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          {/* Ruta pública: login */}
          <Route path="/login" element={<LoginRoute />} />

          {/* Rutas protegidas */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<AppLayout />} />
            <Route path="/inventario" element={<AppLayout />} />
            <Route path="/incidencias" element={<AppLayout />} />
            <Route path="/garantias" element={<AppLayout />} />
            <Route path="/movimientos" element={<AppLayout />} />
            <Route path="/escaner" element={<AppLayout />} />
            <Route path="/usuarios" element={<AppLayout />} />
            <Route path="/auditoria" element={<AppLayout />} />
            <Route path="/configuracion" element={<AppLayout />} />
          </Route>

          {/* Raíz: redirige según auth */}
          <Route path="/" element={<RootRedirect />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}

/** Si ya está autenticado y entra a /login, lo manda al dashboard */
function LoginRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />;
}

/** / → redirige a /dashboard si autenticado, o /login si no */
function RootRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
}
