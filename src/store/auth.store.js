import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Importar queryClient directamente para limpiar cache al cambiar sesión
// Se asigna desde main.jsx para evitar import circular
let _queryClient = null;
export const setQueryClientRef = (qc) => { _queryClient = qc; };

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      usuario: null,
      expiresIn: null,
      isAuthenticated: false,

      setAuth: ({ token, usuario, expiresIn }) => {
        // Limpiar cache del usuario anterior antes de setear nueva sesión
        _queryClient?.clear();
        set({ token, usuario, expiresIn, isAuthenticated: true });
      },

      clearAuth: () => {
        _queryClient?.clear();
        set({ token: null, usuario: null, expiresIn: null, isAuthenticated: false });
      },
    }),
    {
      name: 'imss-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        usuario: state.usuario,
        expiresIn: state.expiresIn,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
