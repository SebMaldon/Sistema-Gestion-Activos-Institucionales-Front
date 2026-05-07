import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { ME_QUERY } from '../api/auth.queries';
import { useAuthStore } from '../store/auth.store';

export function useCurrentUser() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const query = useQuery({
    queryKey: ['me'],
    queryFn: () => gqlClient.request(ME_QUERY),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    retry: false,
    select: (data) => data.me,
  });

  // Efecto para cerrar sesión si el token no es válido
  useEffect(() => {
    if (query.error) {
      const code = query.error?.response?.errors?.[0]?.extensions?.code;
      if (code === 'UNAUTHENTICATED' || query.error?.response?.status === 401) {
        clearAuth();
      }
    }
  }, [query.error, clearAuth]);

  return query;
}
