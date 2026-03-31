import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      usuario: null,
      expiresIn: null,
      isAuthenticated: false,

      setAuth: ({ token, usuario, expiresIn }) =>
        set({ token, usuario, expiresIn, isAuthenticated: true }),

      clearAuth: () =>
        set({ token: null, usuario: null, expiresIn: null, isAuthenticated: false }),
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
