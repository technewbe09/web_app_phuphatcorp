import { createContext, useEffect, useState, type ReactNode } from 'react';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../stores/authStore';
import type { UserPublic } from '../types/user';

interface AuthContextType {
  user: UserPublic | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<UserPublic>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthenticated, setUser, logout: storeLogout } = useAuthStore();

  const refreshUser = async () => {
    try {
      const userData = await authApi.getMe();
      setUser(userData);
    } catch {
      storeLogout();
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token && !user) {
      authApi
        .getMe()
        .then((userData) => setUser(userData))
        .catch(() => {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [user, setUser]);

  const login = async (email: string, password: string): Promise<UserPublic> => {
    const response = await authApi.login({ email, password });
    localStorage.setItem('access_token', response.accessToken);
    setUser(response.user);
    return response.user;
  };

  const logout = () => {
    authApi.logout().catch(() => {});
    storeLogout();
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, isLoading, login, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
