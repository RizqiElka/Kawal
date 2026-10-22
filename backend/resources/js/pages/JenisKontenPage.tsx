import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, X, Check, Tags } from 'lucide-react';
import apiClient from '../api/client';
import { useToast } from '../context/ToastContext';

interface JenisKonten {
  id: number;
  nama: string;
  wajib_cek_5w1h: boolean;
  created_at: string;
  updated_at: string;
}

const JenisKontenPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState<JenisKonten | null>(null);
  const [formData, setFormData] = useState({ nama: '', wajib_cek_5w1h: true });

  const toast = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['jenis-konten'],
    queryFn: async () => {
      const response = await apiClient.get('/jenis-konten');
      return response.data.data as JenisKonten[];
    },
  });

  const mutation = useMutation({
    mutationFn: async (payload: { id?: number; data: typeof formData }) => {
      if (payload.id) {
        return apiClient.put(`/jenis-konten/${payload.id}`, payload.data);
      }
      return apiClient.post('/jenis-konten', payload.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jenis-konten'] });
      toast.success('Jenis konten berhasil disimpan');
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal menyimpan jenis konten');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.delete(`/jenis-konten/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jenis-konten'] });
      toast.success('Jenis konten berhasil dihapus');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal menghapus jenis konten');
    },
  });

  const openModal = (item?: JenisKonten) => {
    if (item) {
      setEditData(item);
      setFormData({ nama: item.nama, wajib_cek_5w1h: item.wajib_cek_5w1h });
    } else {
      setEditData(null);
      setFormData({ nama: '', wajib_cek_5w1h: true });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditData(null);
    setFormData({ nama: '', wajib_cek_5w1h: true });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama) return toast.error('Nama jenis konten wajib diisi');
    mutation.mutate({ id: editData?.id, data: formData });
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Yakin ingin menghapus jenis konten ini?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="w-8 h-8 border-4 border-sigap-200 border-t-sigap-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Tags className="w-6 h-6 text-sigap-500" />
            Jenis Konten
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola daftar jenis konten secara dinamis.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-sigap-600 hover:bg-sigap-700 text-white rounded-xl transition shadow-md shadow-sigap-600/20 font-medium"
        >
          <Plus className="w-5 h-5" />
          Tambah Jenis
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4">Nama Jenis Konten</th>
                <th className="px-6 py-4 text-center">Cek 5W1H</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {data?.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                  <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">
                    {item.nama}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {item.wajib_cek_5w1h ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <Check className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                    <button
                      onClick={() => openModal(item)}
                      className="p-2 text-slate-400 hover:text-sigap-600 hover:bg-sigap-50 dark:hover:bg-slate-700 rounded-lg transition"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-lg transition"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {data?.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    Belum ada data jenis konten
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                {editData ? 'Edit Jenis Konten' : 'Tambah Jenis Konten'}
              </h3>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Nama Jenis Konten
                </label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Misal: Berita, Artikel, Pengumuman"
                  className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sigap-500 focus:border-sigap-500 outline-none transition text-slate-800 dark:text-white"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="wajib_cek_5w1h"
                  checked={formData.wajib_cek_5w1h}
                  onChange={(e) => setFormData({ ...formData, wajib_cek_5w1h: e.target.checked })}
                  className="w-4 h-4 text-sigap-600 rounded border-slate-300 focus:ring-sigap-500"
                />
                <label htmlFor="wajib_cek_5w1h" className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                  Wajib Cek Kelengkapan 5W1H (AI)
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="px-4 py-2 bg-sigap-600 hover:bg-sigap-700 text-white font-medium rounded-xl transition shadow-md shadow-sigap-600/20 disabled:opacity-70"
                >
                  {mutation.isPending ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default JenisKontenPage;
