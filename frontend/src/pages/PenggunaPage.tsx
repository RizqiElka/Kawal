import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserPlus,
  Edit2,
  Trash2,
  Search,
  X,
  Save,
  CheckCircle,
  RotateCcw,
  User as UserIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  Info,
} from 'lucide-react';
import apiClient from '../api/client';
import type { User } from '../types';
import { useToast } from '../context/ToastContext';

// Helper untuk menghasilkan 2 huruf inisial avatar (misal: "AMALIA IDA GUNAWATI" -> "AG")
const getInitials = (name?: string): string => {
  if (!name) return 'PG';
  const clean = name.replace(/,.*$/, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return clean.substring(0, 2).toUpperCase() || 'PG';
};

const PenggunaPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  // Filters, Sort & Pagination State (Filter Bidang dihilangkan)
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 10;

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Fetch users with filters, sorting & pagination
  const {
    data: userResponse,
    isLoading,
    isError,
    refetch,
  } = useQuery<{
    data: User[];
    meta: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  }>({
    queryKey: ['users', search, selectedRole, sortOrder, page, perPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('per_page', String(perPage));
      if (search) params.append('search', search);
      if (selectedRole) params.append('role', selectedRole);
      if (sortOrder) {
        params.append('sort_by', 'nama');
        params.append('sort_order', sortOrder);
      }

      const res = await apiClient.get(`/pengguna?${params.toString()}`);
      return res.data;
    },
  });

  const users: User[] = userResponse?.data || [];
  const meta = userResponse?.meta || {
    current_page: 1,
    last_page: 1,
    per_page: perPage,
    total: 0,
  };

  const { data: roles } = useQuery<any[]>({
    queryKey: ['all-roles'],
    queryFn: async () => {
      const res = await apiClient.get('/roles');
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

  // Toggle pengurutan nama: Default -> Asc (A-Z) -> Desc (Z-A) -> Default
  const handleToggleSortName = () => {
    setSortOrder((prev) => {
      if (prev === null) return 'asc';
      if (prev === 'asc') return 'desc';
      return null;
    });
    setPage(1);
  };

  const handleReset = () => {
    setSearch('');
    setSelectedRole('');
    setSortOrder(null);
    setPage(1);
  };

  // Pagination Helper
  const total = meta.total || 0;
  const from = total === 0 ? 0 : (meta.current_page - 1) * meta.per_page + 1;
  const to = Math.min(meta.current_page * meta.per_page, total);
  const totalPages = meta.last_page || 1;

  const renderPaginationButtons = () => {
    if (totalPages <= 1) return null;

    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (page >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
      }
    }

    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none text-slate-600 dark:text-slate-300 transition"
          title="Halaman sebelumnya"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`dots-${idx}`} className="px-1.5 text-slate-400 text-xs">
                ...
              </span>
            );
          }
          const isCurrent = p === page;
          return (
            <button
              key={p}
              onClick={() => setPage(Number(p))}
              className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-semibold transition ${
                isCurrent
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700'
              }`}
            >
              {p}
            </button>
          );
        })}

        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none text-slate-600 dark:text-slate-300 transition"
          title="Halaman berikutnya"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Page Header dengan Button Tambah yang Proporsional */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Manajemen Pengguna & Role</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle className="w-3 h-3" />
              Auto-Sync SIPEG
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
            Data pegawai otomatis ditarik dari SIPEG Bapperida. Admin dapat mengatur role dan hak akses untuk alur persetujuan konten.
          </p>
        </div>

        {/* Tombol Tambah Pengguna Proporsional */}
        <div className="shrink-0">
          <button
            onClick={() => { setEditingUser(null); setShowModal(true); }}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl shadow-xs hover:shadow transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Pengguna</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar (Filter Bidang Dihilangkan) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, NIP, email, atau jabatan..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
            />
          </div>

          {/* Filter Role Dropdown */}
          <div className="relative w-full sm:w-56">
            <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
            >
              <option value="">Semua Role</option>
              {roles?.map((r) => {
                const roleName = typeof r === 'string' ? r : r.name || String(r);
                return (
                  <option key={roleName} value={roleName}>
                    {roleName.charAt(0).toUpperCase() + roleName.slice(1)}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Reset Button */}
          <button
            onClick={handleReset}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium flex items-center justify-center gap-1.5 transition shrink-0"
            title="Reset filter & pengurutan"
          >
            <RotateCcw className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Main Table Card - Referensi Screenshot */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-slate-800 dark:text-slate-200 font-bold mb-1">
              Gagal memuat data pengguna
            </div>
            <p className="text-slate-500 text-sm mb-4">
              Terjadi kendala koneksi ke server backend SIGAP.
            </p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition"
            >
              Coba Lagi
            </button>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700/80 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    {/* Header PENGGUNA yang Dapat Diurutkan */}
                    <th
                      onClick={handleToggleSortName}
                      className="px-6 py-4 text-left cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
                      title="Klik untuk mengurutkan berdasarkan nama (A-Z / Z-A)"
                    >
                      <div className="inline-flex items-center gap-1.5">
                        <span>PENGGUNA</span>
                        {sortOrder === 'asc' ? (
                          <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
                            <ArrowUp className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-semibold lowercase">(a-z)</span>
                          </span>
                        ) : sortOrder === 'desc' ? (
                          <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
                            <ArrowDown className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-semibold lowercase">(z-a)</span>
                          </span>
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100 group-hover:text-blue-500 transition" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left">JABATAN & BIDANG</th>
                    <th className="px-6 py-4 text-center">ROLE</th>
                    <th className="px-6 py-4 text-center">STATUS</th>
                    <th className="px-6 py-4 text-center">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                        Tidak ada pengguna yang sesuai dengan filter atau pencarian.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const roleList = Array.isArray(u.roles)
                        ? u.roles.map((r) => (typeof r === 'string' ? r : (r as any).name || ''))
                        : [];

                      return (
                        <tr
                          key={u.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition"
                        >
                          {/* 1. Pengguna (Avatar + Nama + Email + NIP) */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3.5">
                              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-sm flex items-center justify-center shrink-0 tracking-wide select-none">
                                {getInitials(u.nama)}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-snug">
                                  {u.nama}
                                </div>
                                <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                  {u.email}
                                </div>
                                {u.nip && (
                                  <div className="text-xs text-slate-400 dark:text-slate-500">
                                    NIP: {u.nip}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 2. Jabatan & Bidang */}
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-snug">
                                {u.jabatan || '-'}
                              </div>
                              <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                {u.bidang?.nama || '-'}
                              </div>
                            </div>
                          </td>

                          {/* 3. Role */}
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center flex-wrap gap-1">
                              {roleList.length === 0 ? (
                                <span className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-semibold bg-blue-100/80 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                                  User
                                </span>
                              ) : (
                                roleList.map((r) => (
                                  <span
                                    key={r}
                                    className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-semibold bg-blue-100/80 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 capitalize"
                                  >
                                    {r}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>

                          {/* 4. Status */}
                          <td className="px-6 py-4 text-center">
                            {u.is_active !== false ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Aktif
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                Nonaktif
                              </span>
                            )}
                          </td>

                          {/* 5. Aksi */}
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingUser(u);
                                  setShowModal(true);
                                }}
                                className="p-2 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition shadow-xs"
                                title="Atur Role Pengguna"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Hapus pengguna "${u.nama}"?`)) {
                                    deleteMutation.mutate(u.id);
                                  }
                                }}
                                className="p-2 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shadow-xs"
                                title="Hapus"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination & Count Footer */}
            <div className="border-t border-slate-100 dark:border-slate-700/80 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Menampilkan <span className="font-semibold text-slate-700 dark:text-slate-200">{from}–{to}</span> dari{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">{total}</span> pengguna
              </div>
              {renderPaginationButtons()}
            </div>
          </div>
        )}
      </div>

      {/* Modal Khusus Atur Role & Akses (Data Profil Readonly dari SIPEG) */}
      {showModal && (
        <UserRoleModal
          user={editingUser}
          roles={roles || []}
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

/**
 * Modal untuk penetapan Role & Hak Akses Pengguna di SIGAP.
 * Data identitas (Nama, NIP, Jabatan, Bidang, Email) bersifat READ-ONLY karena
 * dikelola terpusat dari SIPEG / Bapperida.
 */
const UserRoleModal: React.FC<{
  user: User | null;
  roles: any[];
  onClose: () => void;
  onSuccess: () => void;
}> = ({ user, roles, onClose, onSuccess }) => {
  const toast = useToast();

  const getInitialRole = () => {
    if (!user?.roles || user.roles.length === 0) return 'user';
    const firstRole = user.roles[0];
    return typeof firstRole === 'string' ? firstRole : (firstRole as any).name || 'user';
  };

  const [selectedRole, setSelectedRole] = useState(getInitialRole());
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await apiClient.put(`/pengguna/${user.id}`, {
        role: selectedRole,
        roles: selectedRole ? [selectedRole] : [],
      });
      toast.success(`Role untuk ${user.nama} berhasil diperbarui.`);
      onSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal memperbarui role pengguna.');
    } finally {
      setLoading(false);
    }
  };

  const formattedRoles = roles.map((r) => (typeof r === 'string' ? r : r.name || String(r)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Atur Role & Akses Pengguna
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Penetapan hak akses alur persetujuan konten di SIGAP
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 my-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Pemberitahuan Sinkronisasi SIPEG */}
          <div className="flex items-start gap-2.5 p-3 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 rounded-xl text-blue-900 dark:text-blue-300 text-xs leading-relaxed">
            <Info className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <span className="font-semibold">Data Pegawai Tersinkronisasi Otomatis</span>
              <p className="text-blue-700 dark:text-blue-300/80 text-[11px] mt-0.5">
                Profil pegawai (Nama, NIP, Jabatan, Bidang) ditarik dari SIPEG Bapperida. Perubahan data pegawai dilakukan melalui SIPEG. Di sini Anda hanya mengatur <b>Role di SIGAP</b>.
              </p>
            </div>
          </div>

          {/* Kartu Profil Pegawai (Read-Only) */}
          {user && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-sm flex items-center justify-center shrink-0">
                  {getInitials(user.nama)}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                    {user.nama}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {user.email}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">NIP</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200 font-mono">
                    {user.nip || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Bidang</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200 truncate block">
                    {user.bidang?.nama || '-'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 text-[11px] block">Jabatan</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {user.jabatan || '-'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Bagian Edit Role (Satu-satunya yang dapat diubah) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              Pilih Role di SIGAP <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 dark:text-blue-400 pointer-events-none" />
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold cursor-pointer appearance-none shadow-xs"
              >
                {formattedRoles.map((r) => (
                  <option key={r} value={r}>
                    {r.toUpperCase()}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Keterangan Hak Akses Role */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
              <div className="font-semibold text-slate-700 dark:text-slate-300">Deskripsi Alur:</div>
              <div>• <b>admin</b>: Akses penuh mengelola sistem dan seluruh konten.</div>
              <div>• <b>kepala / sekretaris / kabid</b>: Peninjauan dan persetujuan (approval) berjenjang.</div>
              <div>• <b>editor / publisher</b>: Penyuntingan dan publikasi ke kanal eksternal.</div>
              <div>• <b>user</b>: Kontributor penyusun draf konten awal.</div>
            </div>
          </div>
        </div>

        {/* Footer Tombol Aksi */}
        <div className="flex justify-end gap-2.5 pt-3.5 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition font-medium"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs disabled:opacity-50 transition"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Menyimpan...' : 'Simpan Role'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PenggunaPage;
