import { createContext, useEffect, useState, type ReactNode } from 'react';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../stores/authStore';
import type { UserPublic } from '../types/user';

interface AuthContextType {
  user: UserPublic | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<UserPublic>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  hasPermission: (code: string) => boolean;
  hasAnyPermission: (codes: string[]) => boolean;
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

  const login = async (username: string, password: string): Promise<UserPublic> => {
    const response = await authApi.login({ username, password });
    localStorage.setItem('access_token', response.accessToken);
    setUser(response.user);
    return response.user;
  };

  const logout = () => {
    authApi.logout().catch(() => {});
    storeLogout();
  };

  const hasPermission = (code: string): boolean => {
    if (!user) return false;
    // Fallback: ADMIN role always has all permissions
    if (user.role === 'ADMIN') return true;
    return user.permissions?.includes(code) ?? false;
  };

  const hasAnyPermission = (codes: string[]): boolean =>
    codes.some((code) => hasPermission(code));

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, isLoading, login, logout, refreshUser, hasPermission, hasAnyPermission }}
    >
      {children}
    </AuthContext.Provider>
  );
}
