import React, { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [currentRole, setCurrentRole] = useState('admin'); // se sobreescribirá con el rol real del store
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isFichaOpen, setIsFichaOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 3500);
  };

  const openFicha = (asset) => {
    setSelectedAsset(asset);
    setIsFichaOpen(true);
  };

  const closeFicha = () => {
    setIsFichaOpen(false);
    setTimeout(() => setSelectedAsset(null), 300);
  };

  return (
    <AppContext.Provider value={{
      currentRole, setCurrentRole,
      currentPage, setCurrentPage,
      toast, showToast,
      selectedAsset, isFichaOpen,
      openFicha, closeFicha,
      sidebarOpen, setSidebarOpen,
      sidebarCollapsed, setSidebarCollapsed,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
