import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Clock, CheckCircle2, XCircle, RotateCcw, Globe, FileText, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import type { Notifikasi } from '../types';
import { useToast } from '../context/ToastContext';

// Gunakan data.tipe (bukan type) karena type di DB adalah nama class penuh
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

const NotifikasiPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications, isLoading } = useQuery<Notifikasi[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiClient.get('/notifikasi');
      return res.data.data;
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiClient.post('/notifikasi/baca-semua'),
    onSuccess: () => {
      toast.success('Semua notifikasi telah ditandai sudah dibaca.');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/notifikasi/${id}/baca`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleNotifClick = (notif: Notifikasi) => {
    if (!notif.read_at) {
      markReadMutation.mutate(notif.id);
    }
    if (notif.data?.konten_id) {
      navigate(`/konten/${notif.data.konten_id}`);
    }
  };

  const unreadCount = notifications?.filter((n) => !n.read_at).length || 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notifikasi</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : 'Semua notifikasi sudah dibaca'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-sigap-700 dark:text-sigap-400 border border-sigap-200 dark:border-sigap-800 bg-sigap-50 dark:bg-sigap-900/50 rounded-xl hover:bg-sigap-100 dark:hover:bg-sigap-900 transition"
          >
            <CheckCheck className="w-4 h-4" />
            Tandai Semua Dibaca
          </button>
        )}
      </div>

      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-white dark:bg-slate-800 rounded-2xl border dark:border-slate-700 animate-pulse" />
          ))
        ) : !notifications?.length ? (
          <div className="py-16 text-center">
            <Bell className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">Belum ada notifikasi</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Notifikasi akan muncul saat ada aktivitas baru.</p>
          </div>
        ) : (
          notifications.map((notif) => {
            // data.tipe adalah tipe sebenarnya (konten_diajukan, dll)
            const tipe = notif.data?.tipe || '';
            const colorConfig = NOTIF_COLORS[tipe];
            const icon = NOTIF_ICONS[tipe] || NOTIF_ICONS.default;

            const cardClass = notif.read_at
              ? 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 opacity-70'
              : colorConfig
              ? `${colorConfig.light} ${colorConfig.dark}`
              : 'bg-sigap-50 dark:bg-sigap-900/30 border-sigap-100 dark:border-sigap-800';

            return (
              <button
                key={notif.id}
                onClick={() => handleNotifClick(notif)}
                className={`w-full text-left px-5 py-4 rounded-2xl border transition hover:shadow-sm ${cardClass}`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 flex items-center justify-center shrink-0 shadow-sm">
                    {icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {/* Badge tipe */}
                        {colorConfig && (
                          <span className={`inline-block text-xs font-bold uppercase tracking-wide mb-0.5 ${colorConfig.accent}`}>
                            {colorConfig.label}
                          </span>
                        )}
                        {/* Judul konten */}
                        <p className={`text-sm font-semibold truncate ${notif.read_at ? 'text-slate-600 dark:text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
                          {notif.data?.judul || 'Notifikasi baru'}
                        </p>
                      </div>
                      {!notif.read_at && (
                        <div className="w-2.5 h-2.5 bg-sigap-600 rounded-full shrink-0 mt-1" />
                      )}
                    </div>

                    {/* Pesan */}
                    {notif.data?.pesan && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{notif.data.pesan}</p>
                    )}

                    {/* Catatan revisi/tolak */}
                    {notif.data?.catatan && (
                      <div className="flex items-start gap-1 mt-1">
                        <AlertCircle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 dark:text-amber-400 italic">{notif.data.catatan}</p>
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                      <Clock className="w-3 h-3" />
                      {new Date(notif.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NotifikasiPage;
