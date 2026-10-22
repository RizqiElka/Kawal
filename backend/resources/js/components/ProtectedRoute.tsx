import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: string;
  role?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, permission, role }) => {
  const { user, isLoading, hasPermission, hasRole } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900/50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-sigap-200 border-t-sigap-600 rounded-full animate-spin" />
          <span className="text-slate-500 dark:text-slate-400 text-sm">Memuat...</span>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (permission && !hasPermission(permission)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-5xl mb-4">🔒</p>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Akses Ditolak</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
        </div>
      </div>
    );
  }

  if (role && !hasRole(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
