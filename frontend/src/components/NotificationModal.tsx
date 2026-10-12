import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Clock, CheckCircle2, XCircle, RotateCcw, Globe, FileText, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import type { Notifikasi } from '../types';
import { useToast } from '../context/ToastContext';

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  konten_diajukan: <FileText className="w-4 h-4 text-sigap-600" />,
  konten_disetujui: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
  konten_ditolak: <XCircle className="w-4 h-4 text-rose-600" />,
  konten_revisi: <RotateCcw className="w-4 h-4 text-amber-600" />,
  konten_terbit: <Globe className="w-4 h-4 text-blue-600" />,
  default: <Bell className="w-4 h-4 text-slate-500" />,
};

const NOTIF_COLORS: Record<string, { light: string; dark: string; label: string; accent: string }> = {
  konten_diajukan: {
    light: 'bg-sigap-50 border-sigap-200',
    dark: 'dark:bg-sigap-900/30 dark:border-sigap-800',
    label: 'Konten Diajukan',
    accent: 'text-sigap-700 dark:text-sigap-400',
  },
  konten_disetujui: {
    light: 'bg-emerald-50 border-emerald-200',
    dark: 'dark:bg-emerald-900/20 dark:border-emerald-800',
    label: 'Konten Disetujui',
    accent: 'text-emerald-700 dark:text-emerald-400',
  },
  konten_ditolak: {
    light: 'bg-rose-50 border-rose-200',
    dark: 'dark:bg-rose-900/20 dark:border-rose-800',
    label: 'Konten Ditolak',
    accent: 'text-rose-700 dark:text-rose-400',
  },
  konten_revisi: {
    light: 'bg-amber-50 border-amber-200',
    dark: 'dark:bg-amber-900/20 dark:border-amber-800',
    label: 'Perlu Revisi',
    accent: 'text-amber-700 dark:text-amber-400',
  },
  konten_terbit: {
    light: 'bg-blue-50 border-blue-200',
    dark: 'dark:bg-blue-900/20 dark:border-blue-800',
    label: 'Konten Terbit',
    accent: 'text-blue-700 dark:text-blue-400',
  },
};

export const NotificationModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications, isLoading } = useQuery<Notifikasi[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiClient.get('/notifikasi');
      return res.data.data;
    },
    enabled: isOpen,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiClient.post('/notifikasi/baca-semua'),
    onSuccess: () => {
      toast.success('Semua notifikasi telah ditandai dibaca.');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/notifikasi/${id}/baca`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  if (!isOpen) return null;

  const handleNotifClick = (notif: Notifikasi) => {
    if (!notif.read_at) {
      markReadMutation.mutate(notif.id);
    }
    onClose();
    if (notif.data?.konten_id) {
      navigate(`/konten/${notif.data.konten_id}`);
    }
  };

  const unreadCount = notifications?.filter((n) => !n.read_at).length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/80">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-sigap-600 dark:text-sigap-400" />
            <h3 className="font-bold text-slate-800 dark:text-white text-base">Notifikasi</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-rose-500 text-white rounded-full">
                {unreadCount} baru
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="text-xs font-semibold text-sigap-600 dark:text-sigap-400 hover:underline flex items-center gap-1"
                title="Tandai Semua Dibaca"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Semua dibaca
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700/50 rounded-xl animate-pulse" />
            ))
          ) : !notifications?.length ? (
            <div className="py-12 text-center">
              <Bell className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Belum ada notifikasi</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const tipeKey = notif.data?.tipe || 'default';
              const icon = NOTIF_ICONS[tipeKey] || NOTIF_ICONS.default;
              const styleConfig = NOTIF_COLORS[tipeKey] || {
                light: 'bg-slate-50 border-slate-200',
                dark: 'dark:bg-slate-800 dark:border-slate-700',
                label: 'Notifikasi',
                accent: 'text-slate-700 dark:text-slate-300',
              };
              const isUnread = !notif.read_at;

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  className={`p-3.5 rounded-xl border text-left transition cursor-pointer relative ${
                    isUnread
                      ? `${styleConfig.light} ${styleConfig.dark} shadow-xs`
                      : 'bg-white dark:bg-slate-800/40 border-slate-100 dark:border-slate-700/60 opacity-80 hover:opacity-100'
                  } hover:scale-[1.01]`}
                >
                  {isUnread && (
                    <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-sigap-600 ring-4 ring-sigap-100 dark:ring-sigap-900" />
                  )}
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-2xs shrink-0">
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-xs font-semibold ${styleConfig.accent}`}>
                          {styleConfig.label}
                        </span>
                        <span className="text-slate-400 text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {notif.created_at}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                        {notif.data?.judul || notif.data?.judul_konten || 'Informasi Konten'}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">
                        {notif.data?.pesan}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
