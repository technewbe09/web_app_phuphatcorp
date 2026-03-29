import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/api/auth';
import { useAuthContext } from '@/contexts/AuthContext';
import type { User } from '@/types';

export function useUser() {
  const { setUser } = useAuthContext();

  return useQuery<{ user: User }, Error>({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const response = await authApi.getMe();
      return response;
    },
    enabled: !!localStorage.getItem('accessToken'),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    select: (data) => {
      setUser(data.user);
      return data;
    },
  });
}
