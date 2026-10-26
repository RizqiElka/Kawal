import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isSsoUser: boolean;
  login: (login: string, password: string) => Promise<User>;
  logout: (mode?: 'sipeg_dashboard' | 'sipeg_logout' | 'local') => Promise<void>;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('sigap_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('sigap_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const response = await apiClient.get('/auth/me');
      const userData = response.data.data;
      setUser(userData);
      localStorage.setItem('sigap_user', JSON.stringify(userData));
    } catch (error: any) {
      if (error?.response?.status === 401) {
        localStorage.removeItem('sigap_token');
        localStorage.removeItem('sigap_user');
        setUser(null);
        setToken(null);
        queryClient.clear();
      }
    }
  };

  useEffect(() => {
    if (token) {
      refreshUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (loginInput: string, password: string): Promise<User> => {
    const response = await apiClient.post('/auth/login', {
      login: loginInput,
      password,
    });
    const { user: userData, token: tokenData } = response.data.data;
    localStorage.setItem('sigap_token', tokenData);
    localStorage.setItem('sigap_user', JSON.stringify(userData));
    localStorage.setItem('kawal_login_source', 'local');
    queryClient.clear();
    setToken(tokenData);
    setUser(userData);
    return userData;
  };

  const isSsoUser = Boolean(
    user?.sipeg_user_id ||
    localStorage.getItem('kawal_login_source') === 'sipeg'
  );
  const logout = async (mode?: 'sipeg_dashboard' | 'sipeg_logout' | 'local') => {
    const sipegUrl = import.meta.env.VITE_SIPEG_URL || 'http://localhost:8000';
    const isSso = Boolean(
      user?.sipeg_user_id ||
      localStorage.getItem('kawal_login_source') === 'sipeg' ||
      mode === 'sipeg_logout'
    );

    // Tandai proses logout agar interceptor 401 tidak ikut redirect
    (window as any).__sigap_logging_out = true;

    // Bersihkan storage KAWAL (localStorage saja, belum setState)
    localStorage.removeItem('sigap_token');
    localStorage.removeItem('sigap_user');
    localStorage.removeItem('kawal_login_source');

    if (isSso) {
      // Langsung redirect — jangan setState dulu agar ProtectedRoute
      // tidak sempat render <Navigate to="/login">
      window.location.replace('/sso/baperan-logout');
      return;
    }

    // User lokal: logout API lalu redirect — juga tanpa setState dulu
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Abaikan
    }
    window.location.replace(`${sipegUrl}/login`);
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    return user.roles.includes('admin') || user.roles.includes(role);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return user.roles.includes('admin') || user.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isSsoUser,
        login,
        logout,
        hasRole,
        hasPermission,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
