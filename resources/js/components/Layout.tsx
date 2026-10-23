import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Users,
  ShieldCheck,
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  X,
  Globe,
  ShieldAlert,
  Sun,
  Moon,
  Tags,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import apiClient from '../api/client';
import type { Notifikasi } from '../types';
import { NotificationModal } from './NotificationModal';
import { LogoutModal } from './LogoutModal';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  permission?: string;
  role?: string;
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: <LayoutDashboard className="w-4.5 h-4.5" />, label: 'Dashboard', permission: 'konten.lihat' },
  { to: '/konten', icon: <FileText className="w-4.5 h-4.5" />, label: 'Daftar Konten', permission: 'konten.lihat' },
  { to: '/konten/buat', icon: <PlusCircle className="w-4.5 h-4.5" />, label: 'Buat Konten', permission: 'konten.buat' },
  { to: '/publisher', icon: <Globe className="w-4.5 h-4.5" />, label: 'Publikasi', permission: 'publikasi.terbitkan' },
  { to: '/pengguna', icon: <Users className="w-4.5 h-4.5" />, label: 'Pengguna', permission: 'pengguna.kelola' },
  { to: '/roles', icon: <ShieldAlert className="w-4.5 h-4.5" />, label: 'Role & Hak Akses', permission: 'role.kelola' },
  { to: '/jenis-konten', icon: <Tags className="w-4.5 h-4.5" />, label: 'Jenis Konten', permission: 'pengaturan.kelola' },
];

const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void; onLogout: () => void }> = ({ isOpen, onClose, onLogout }) => {
  const { user, hasPermission } = useAuth();
  const location = useLocation();

  const visibleNavItems = navItems.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  const isItemActive = (to: string) => {
    const currentPath = location.pathname.replace(/\/+$/, '') || '/';
    if (to === '/konten/buat') {
      return currentPath === '/konten/buat';
    }
    if (to === '/konten') {
      return currentPath.startsWith('/konten') && currentPath !== '/konten/buat';
    }
    return currentPath === to || currentPath.startsWith(`${to}/`);
  };

  return (
    <>
      {/* Overlay Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-sigap-950 text-white z-40 flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 h-18 border-b border-sigap-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5.5 h-5.5 text-sigap-300" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-wide text-white">KAWAL</div>
              <div className="text-sigap-400 text-xs leading-tight">Kelola Alur Warta, Artikel, dan Laporan </div>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-sigap-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-5 px-3.5 space-y-1">
          {visibleNavItems.map((item) => {
            const isActive = isItemActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-sigap-700 text-white shadow-md shadow-sigap-900/50'
                    : 'text-sigap-300 hover:bg-sigap-800/60 hover:text-white'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="px-4 py-4 border-t border-sigap-800/80">
          <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-sigap-800/50 transition">
            <div className="w-9 h-9 bg-gradient-to-br from-sigap-400 to-sigap-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs">
              {user?.nama?.charAt(0).toUpperCase() || 'S'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">{user?.nama}</div>
              <div className="text-xs text-sigap-400 truncate capitalize">
                {user?.roles?.[0] || 'pengguna'}
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Keluar"
              className="text-sigap-400 hover:text-rose-400 transition p-1"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

// Topbar Component
export const Topbar: React.FC<{ onMenuClick: () => void; onLogout: () => void }> = ({ onMenuClick, onLogout }) => {
  const { user } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const { data: notifications } = useQuery<Notifikasi[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiClient.get('/notifikasi');
      return res.data.data;
    },
  });

  const unreadCount = notifications?.filter((n) => !n.read_at).length || 0;

  return (
    <>
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-20 transition-colors">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden lg:block" />

        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>

          {/* Notification Bell */}
          <button
            onClick={() => setIsNotifModalOpen(true)}
            className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
            title="Notifikasi"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

        {/* User Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <div className="w-7 h-7 bg-gradient-to-br from-sigap-500 to-sigap-700 rounded-full flex items-center justify-center text-white font-bold text-xs">
              {user?.nama?.charAt(0).toUpperCase() || 'S'}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-slate-800 dark:text-white">{user?.nama}</div>
              <div className="text-xs text-slate-400 capitalize">{user?.roles?.[0]}</div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-12 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 w-48 z-50">
              <button
                onClick={() => {
                  setShowDropdown(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-700 transition"
              >
                <LogOut className="w-4 h-4" />
                Keluar dari KAWAL
              </button>
            </div>
          )}
        </div>
      </div>

      <NotificationModal
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
      />
    </header>
  </>
  );
};

// AppLayout wrapping sidebar + topbar
export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={() => setLogoutModalOpen(true)}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64 overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors">
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          onLogout={() => setLogoutModalOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>

      <LogoutModal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
      />
    </div>
  );
};

export default Sidebar;
