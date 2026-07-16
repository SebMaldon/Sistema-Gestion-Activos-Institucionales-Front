import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [currentRole, setCurrentRole] = useState('admin');
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isFichaOpen, setIsFichaOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [hoverZoomEnabled, setHoverZoomEnabled] = useState(() => {
    return localStorage.getItem('hoverZoomEnabled') !== 'false';
  });

  const [hoverZoomScale, setHoverZoomScale] = useState(() => {
    return localStorage.getItem('hoverZoomScale') || '1.15';
  });

  useEffect(() => {
    if (hoverZoomEnabled) {
      document.body.classList.add('zoom-tables-enabled');
      document.body.style.setProperty('--hover-zoom-scale', hoverZoomScale);
    } else {
      document.body.classList.remove('zoom-tables-enabled');
      document.body.style.removeProperty('--hover-zoom-scale');
    }
  }, [hoverZoomEnabled, hoverZoomScale]);

  const toggleHoverZoom = () => {
    const val = !hoverZoomEnabled;
    setHoverZoomEnabled(val);
    localStorage.setItem('hoverZoomEnabled', val);
  };

  const updateHoverZoomScale = (val) => {
    setHoverZoomScale(val);
    localStorage.setItem('hoverZoomScale', val);
  };

  // ── Toast queue ──────────────────────────────────────────────────────────────
  const [toastQueue, setToastQueue] = useState([]);

  // Duración según tipo
  const DURATIONS = { success: 3000, error: 7000, warning: 5000, info: 4000 };

  /**
   * showToast(message, type?, title?)
   * Backward-compatible: showToast(message, type) still works.
   * Returns a dismiss function for manual control.
   */
  const showToast = useCallback((message, type = 'success', title = '') => {
    if (!message) return; // guard: ignore showToast(null) legacy calls

    const id = Date.now() + Math.random();

    const dismiss = () => {
      // Mark exiting → trigger exit animation, then remove
      setToastQueue(q => q.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => setToastQueue(q => q.filter(t => t.id !== id)), 250);
    };

    const entry = { id, message, type, title, exiting: false, onDismiss: dismiss };
    setToastQueue(q => [...q, entry]);

    // Auto-dismiss
    const timer = setTimeout(dismiss, DURATIONS[type] ?? 4000);

    return dismiss; // caller can dismiss early if needed
  }, []);

  // Visible toast = head of queue (only show one at a time)
  const toast = toastQueue[0] ?? null;

  // Kept for backward compat: showToast(null) used to clear the toast
  // Now a no-op since queue handles lifecycle, but guard above handles it.

  // ── Confirm dialog (async, Promise-based) ────────────────────────────────────
  const [confirmState, setConfirmState] = useState(null);

  /**
   * showConfirm({ title, message, confirmText, cancelText, type }) → Promise<boolean>
   */
  const showConfirm = useCallback(({ title = '¿Está seguro?', message = '', confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'danger' } = {}) => {
    return new Promise(resolve => {
      setConfirmState({
        title, message, confirmText, cancelText, type,
        onConfirm: () => { setConfirmState(null); resolve(true); },
        onCancel:  () => { setConfirmState(null); resolve(false); },
      });
    });
  }, []);

  // ── Asset ficha ──────────────────────────────────────────────────────────────
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
      // Toast
      toast, toastQueue, showToast,
      // Confirm
      confirmState, showConfirm,
      // Ficha
      selectedAsset, isFichaOpen, openFicha, closeFicha,
      // Sidebar
      sidebarOpen, setSidebarOpen,
      sidebarCollapsed, setSidebarCollapsed,
      // Zoom
      hoverZoomEnabled, toggleHoverZoom,
      hoverZoomScale, updateHoverZoomScale,
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
