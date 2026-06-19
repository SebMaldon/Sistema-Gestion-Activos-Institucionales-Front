import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider, QueryCache } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useAuthStore } from './store/auth.store';
import './index.css';
import App from './App.jsx';

const queryClient = new QueryClient({
 queryCache: new QueryCache({
 onError: (error) => {
 // Manejo global de errores de autenticación (JWT expirado, etc)
 const gqlError = error?.response?.errors?.[0];
 if (gqlError?.extensions?.code === 'UNAUTHENTICATED') {
 useAuthStore.getState().clearAuth();
 // Opcional: recargar para limpiar estados de memoria si es necesario
 // window.location.href = '/login'; 
 }
 },
 }),
 defaultOptions: {
 queries: {
 staleTime: 2 * 60 * 1000, // 2 minutos por defecto
 gcTime: 10 * 60 * 1000, // 10 minutos en caché
 retry: (failureCount, error) => {
 // No reintentar si es error de autenticación
 const code = error?.response?.errors?.[0]?.extensions?.code;
 if (code === 'UNAUTHENTICATED') return false;
 return failureCount < 1;
 },
 refetchOnWindowFocus: false,
 },
 },
});

createRoot(document.getElementById('root')).render(
 <StrictMode>
 <QueryClientProvider client={queryClient}>
 <App />
 </QueryClientProvider>
 </StrictMode>,
);
