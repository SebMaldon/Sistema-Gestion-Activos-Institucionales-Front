import { useQuery } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { ME_QUERY } from '../api/auth.queries';
import { useAuthStore } from '../store/auth.store';

export function useCurrentUser() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useQuery({
    queryKey: ['me'],
    queryFn: () => gqlClient.request(ME_QUERY),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutos sin refetch
    retry: false,
    select: (data) => data.me,
    throwOnError: (error) => {
      const code = error?.response?.errors?.[0]?.extensions?.code;
      if (code === 'UNAUTHENTICATED') {
        clearAuth();
      }
      return false;
    },
  });
}
