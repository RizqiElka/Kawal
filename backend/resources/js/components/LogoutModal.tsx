import React, { useState } from 'react';
import { LogOut, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogoutModal: React.FC<LogoutModalProps> = ({ isOpen, onClose }) => {
  const { isSsoUser, logout } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleLogout = async () => {
    setIsSubmitting(true);
    try {
      await logout();
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-700 p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <LogOut className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Keluar dari KAWAL
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Konfirmasi pengakhiran sesi
            </p>
          </div>
        </div>

        <div className="my-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {isSsoUser
              ? 'Apakah Anda yakin ingin keluar? Sesi Anda akan diakhiri dan otomatis diarahkan ke halaman login BAPERAN.'
              : 'Apakah Anda yakin ingin keluar dari sistem KAWAL?'}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-700">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleLogout}
            className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition disabled:opacity-50"
          >
            {isSubmitting ? 'Memproses...' : 'Ya, Keluar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;
