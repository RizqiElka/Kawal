import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, Eye, Edit, Trash2,
  ChevronLeft, ChevronRight, FileText
} from 'lucide-react';
import apiClient from '../api/client';
import type { Konten } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const STATUSES = [
  { value: '', label: 'Semua Status' },
  { value: 'draft', label: 'Draf' },
  { value: 'diproses', label: 'Diproses' },
  { value: 'revisi', label: 'Perlu Revisi' },
  { value: 'ditolak', label: 'Ditolak' },
  { value: 'disetujui', label: 'Disetujui' },
  { value: 'terbit', label: 'Terbit' },
];

const KontenListPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['konten-list', search, status, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), per_page: '10' });
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      const res = await apiClient.get(`/konten?${params}`);
      return res.data as { data: Konten[]; meta: { total: number; last_page: number; current_page: number } };
    },
    placeholderData: (prev) => prev,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/konten/${id}`),
    onSuccess: () => {
      toast.success('Konten berhasil dihapus.');
      queryClient.invalidateQueries({ queryKey: ['konten-list'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menghapus konten.');
    },
  });

  const handleDelete = (konten: Konten) => {
    if (!konten.permissions?.can_delete) {
      toast.error('Anda tidak dapat menghapus konten ini.');
      return;
    }
    if (window.confirm(`Hapus konten "${konten.judul}"?`)) {
      deleteMutation.mutate(konten.id);
    }
  };

  const skeletonRows = Array.from({ length: 6 });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Daftar Konten</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            {data?.meta?.total ? `${data.meta.total} konten ditemukan` : 'Kelola seluruh konten instansi'}
          </p>
        </div>
        {hasPermission('konten.buat') && (
          <button
            onClick={() => navigate('/konten/buat')}
            id="btn-buat-konten"
            className="flex items-center gap-2 px-4 py-2.5 bg-sigap-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-sigap-200 hover:bg-sigap-800 transition"
          >
            <Plus className="w-4 h-4" />
            Buat Konten
          </button>
        )}
      </div>

      {/* Search + Filter */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari judul atau isi konten..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sigap-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="px-3 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sigap-500 focus:border-transparent"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left font-semibold">Judul</th>
                  <th className="px-5 py-3 text-left font-semibold">Jenis</th>
                  <th className="px-5 py-3 text-left font-semibold">Penulis</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-left font-semibold">Tanggal</th>
                  <th className="px-5 py-3 text-left font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {skeletonRows.map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4"><div className="h-4 bg-slate-200 rounded w-56" /></td>
                    <td className="px-5 py-4"><div className="h-4 bg-slate-200 rounded w-16" /></td>
                    <td className="px-5 py-4"><div className="h-4 bg-slate-200 rounded w-24" /></td>
                    <td className="px-5 py-4"><div className="h-5 bg-slate-200 rounded-full w-20" /></td>
                    <td className="px-5 py-4"><div className="h-4 bg-slate-200 rounded w-20" /></td>
                    <td className="px-5 py-4"><div className="h-4 bg-slate-200 rounded w-16" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : !data?.data?.length ? (
          <div className="py-16 text-center">
            <FileText className="w-14 h-14 text-slate-200 mx-auto mb-4" />
            <p className="font-semibold text-slate-600">Tidak ada konten ditemukan</p>
            <p className="text-slate-400 text-sm mt-1">Ubah filter pencarian atau buat konten baru.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left font-semibold">Judul</th>
                  <th className="px-5 py-3 text-left font-semibold">Jenis</th>
                  <th className="px-5 py-3 text-left font-semibold">Penulis</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-left font-semibold">Tanggal</th>
                  <th className="px-5 py-3 text-left font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {data.data.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate max-w-xs">{k.judul}</div>
                      {k.revisi_ke > 0 && (
                        <span className="text-xs text-rose-500 font-medium">Revisi ke-{k.revisi_ke}</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-full font-medium">
                        {k.jenis_konten?.nama || '-'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-sigap-400 to-sigap-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {k.user?.nama?.charAt(0)}
                        </div>
                        <span className="text-sm text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{k.user?.nama}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={k.status} tahapSaatIni={k.tahap_saat_ini} />
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400">
                      {new Date(k.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => navigate(`/konten/${k.id}`)}
                          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-700 hover:text-sigap-700 transition"
                          title="Lihat Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {k.permissions?.can_update && (
                          <button
                            onClick={() => navigate(`/konten/${k.id}/edit`)}
                            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {k.permissions?.can_delete && (
                          <button
                            onClick={() => handleDelete(k)}
                            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data?.meta && data.meta.last_page > 1 && (
          <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Halaman {data.meta.current_page} dari {data.meta.last_page}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-700 disabled:opacity-30 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.meta.last_page, p + 1))}
                disabled={page === data.meta.last_page}
                className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-700 disabled:opacity-30 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KontenListPage;
