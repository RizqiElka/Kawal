import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserPlus, Edit2, Trash2, Search, X, Save
} from 'lucide-react';
import apiClient from '../api/client';
import type { User } from '../types';
import { useToast } from '../context/ToastContext';

const PenggunaPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['users', search],
    queryFn: async () => {
      const params = search ? `?search=${search}` : '';
      const res = await apiClient.get(`/pengguna${params}`);
      return res.data.data;
    },
  });

  const { data: roles } = useQuery<string[]>({
    queryKey: ['all-roles'],
    queryFn: async () => {
      const res = await apiClient.get('/roles');
      return res.data.data;
    },
  });

  const { data: bidangs } = useQuery<{ id: number; nama: string }[]>({
    queryKey: ['bidangs'],
    queryFn: async () => {
      const res = await apiClient.get('/bidang');
      return res.data.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/pengguna/${id}`),
    onSuccess: () => {
      toast.success('Pengguna berhasil dihapus.');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Gagal menghapus.'),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manajemen Pengguna</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Kelola akun pengguna dan hak akses sistem.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setEditingUser(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-sigap-700 text-white font-semibold text-sm rounded-xl hover:bg-sigap-800 shadow-md shadow-sigap-200 transition"
          >
            <UserPlus className="w-4 h-4" />
            Tambah Pengguna
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, NIP, atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sigap-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  <th className="px-5 py-3 text-left font-semibold">Pengguna</th>
                  <th className="px-5 py-3 text-left font-semibold">Bidang</th>
                  <th className="px-5 py-3 text-left font-semibold">Role</th>
                  <th className="px-5 py-3 text-left font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {users?.map((u) => {
                  const roleList = Array.isArray(u.roles)
                    ? u.roles.map((r: any) => (typeof r === 'string' ? r : r.name || String(r)))
                    : [];

                  return (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gradient-to-br from-sigap-400 to-sigap-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {u.nama?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{u.nama}</div>
                            <div className="text-xs text-slate-400 dark:text-slate-500">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {u.bidang?.nama || '-'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {roleList.map((r) => (
                            <span key={r} className="text-xs bg-sigap-50 dark:bg-sigap-900/40 text-sigap-700 dark:text-sigap-300 border border-sigap-100 dark:border-sigap-800 px-2 py-0.5 rounded-full font-medium capitalize">
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => { setEditingUser(u); setShowModal(true); }}
                            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-600 dark:hover:text-amber-400 transition"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Hapus pengguna "${u.nama}"?`)) deleteMutation.mutate(u.id);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-600 dark:hover:text-rose-400 transition"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Form Modal */}
      {showModal && (
        <UserFormModal
          user={editingUser}
          roles={roles || []}
          bidangs={bidangs || []}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            queryClient.invalidateQueries({ queryKey: ['users'] });
          }}
        />
      )}
    </div>
  );
};

const UserFormModal: React.FC<{
  user: User | null;
  roles: any[];
  bidangs: { id: number; nama: string }[];
  onClose: () => void;
  onSuccess: () => void;
}> = ({ user, roles, bidangs, onClose, onSuccess }) => {
  const toast = useToast();

  const getInitialRole = () => {
    if (!user?.roles || user.roles.length === 0) return '';
    const firstRole = user.roles[0];
    return typeof firstRole === 'string' ? firstRole : (firstRole as any).name || '';
  };

  const [form, setForm] = useState({
    nama: user?.nama || '',
    email: user?.email || '',
    password: '',
    role: getInitialRole(),
    bidang_id: user?.bidang_id?.toString() || user?.bidang?.id?.toString() || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (user) {
        await apiClient.put(`/pengguna/${user.id}`, form);
        toast.success('Data pengguna berhasil diperbarui.');
      } else {
        await apiClient.post('/pengguna', form);
        toast.success('Pengguna baru berhasil ditambahkan.');
      }
      onSuccess();
    } catch (err: any) {
      const errMsg = err?.response?.data?.errors;
      if (errMsg) {
        const first = Object.values(errMsg)[0] as string[];
        toast.error(first[0]);
      } else {
        toast.error(err?.response?.data?.message || 'Gagal menyimpan.');
      }
    } finally {
      setLoading(false);
    }
  };

  const formattedRoles = roles.map((r) => (typeof r === 'string' ? r : r.name || String(r)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-800 dark:text-slate-200">{user ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Nama Lengkap', key: 'nama', type: 'text' },
            { label: 'Email', key: 'email', type: 'email' },
            { label: user ? 'Kata Sandi Baru (biarkan kosong)' : 'Kata Sandi', key: 'password', type: 'password' },
          ].map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{field.label}</label>
              <input
                type={field.type}
                value={(form as any)[field.key]}
                onChange={(e) => setForm((p) => ({ ...p, [field.key]: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sigap-500"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sigap-500"
            >
              <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">-- Pilih Role --</option>
              {formattedRoles.map((r) => (
                <option key={r} value={r} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Bidang</label>
            <select
              value={form.bidang_id}
              onChange={(e) => setForm((p) => ({ ...p, bidang_id: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sigap-500"
            >
              <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">-- Pilih Bidang --</option>
              {bidangs.map((b) => (
                <option key={b.id} value={b.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{b.nama}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition">Batal</button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-sigap-700 rounded-xl hover:bg-sigap-800 disabled:opacity-50 transition"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PenggunaPage;
