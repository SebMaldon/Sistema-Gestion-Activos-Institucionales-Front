import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ROLES } from './data/mockData';
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

function PageRouter() {
  const { currentPage } = useApp();

  const pages = {
    dashboard: <Dashboard />,
    inventario: <Inventario />,
    incidencias: <Incidencias />,
    movimientos: <Movimientos />,
    escaner: <EscanerQR />,
    usuarios: <GestionUsuarios />,
    auditoria: <Auditoria />,
    configuracion: <Configuracion />,
  };

  return pages[currentPage] || <Dashboard />;
}

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

function AppRouter() {
  const { isLoggedIn } = useApp();
  return isLoggedIn ? <AppLayout /> : <Login />;
}

export default function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}
