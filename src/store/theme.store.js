import { create } from 'zustand';

export const useThemeStore = create((set) => ({
  darkMode: typeof window !== 'undefined' ? localStorage.getItem('darkMode') === 'true' : false,
  toggleDarkMode: () => set((state) => {
    const newDarkMode = !state.darkMode;
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
    return { darkMode: newDarkMode };
  }),
  initDarkMode: () => {
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ darkMode: isDark });
  }
}));
