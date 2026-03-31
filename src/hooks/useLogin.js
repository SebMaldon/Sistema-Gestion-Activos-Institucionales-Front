import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { gqlClient } from '../api/client';
import { LOGIN_MUTATION } from '../api/auth.queries';
import { useAuthStore } from '../store/auth.store';

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (vars) =>
      gqlClient.request(LOGIN_MUTATION, vars),

    onSuccess: (data) => {
      const { token, usuario, expiresIn } = data.login;
      setAuth({ token, usuario, expiresIn });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      navigate('/dashboard', { replace: true });
    },
  });
}
