import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

/**
 * Protege las rutas que requieren autenticación.
 * Si el usuario NO está logueado → redirige a /login.
 * Si está logueado → renderiza el Outlet (ruta hija).
 */
export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
