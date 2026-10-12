import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/client';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (login: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
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
    queryClient.clear();
    setToken(tokenData);
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Abaikan jika token sudah kedaluwarsa
    } finally {
      localStorage.removeItem('sigap_token');
      localStorage.removeItem('sigap_user');
      queryClient.clear();
      setUser(null);
      setToken(null);
    }
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
