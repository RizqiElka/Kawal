import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Plus, Trash2, ChevronDown, ChevronRight, Check } from 'lucide-react';
import apiClient from '../api/client';
import { useToast } from '../context/ToastContext';

interface Role {
  id: number;
  name: string;
  permissions: string[];
}

interface Permission {
  id: number;
  name: string;
}

const RolesPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [expandedRole, setExpandedRole] = useState<number | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [showAddRole, setShowAddRole] = useState(false);

  const { data: roles, isLoading } = useQuery<Role[]>({
    queryKey: ['roles-with-permissions'],
    queryFn: async () => {
      const res = await apiClient.get('/roles');
      return res.data.data;
    },
  });

  const { data: allPermissions } = useQuery<Permission[]>({
    queryKey: ['all-permissions'],
    queryFn: async () => {
      const res = await apiClient.get('/permissions');
      return res.data.data;
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: () => apiClient.post('/roles', { name: newRoleName }),
    onSuccess: () => {
      toast.success(`Role "${newRoleName}" berhasil dibuat.`);
      setNewRoleName('');
      setShowAddRole(false);
      queryClient.invalidateQueries({ queryKey: ['roles-with-permissions'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Gagal membuat role.'),
  });

  const togglePermissionMutation = useMutation({
    mutationFn: async ({ roleId, permission, grant }: { roleId: number; permission: string; grant: boolean }) => {
      if (grant) {
        return apiClient.post(`/roles/${roleId}/permissions`, { permissions: [permission] });
      } else {
        return apiClient.delete(`/roles/${roleId}/permissions`, { data: { permissions: [permission] } });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-with-permissions'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Gagal memperbarui izin.'),
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/roles/${id}`),
    onSuccess: () => {
      toast.success('Role berhasil dihapus.');
      queryClient.invalidateQueries({ queryKey: ['roles-with-permissions'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Gagal menghapus role.'),
  });

  // Group permissions by prefix (e.g., "konten.lihat" → group "konten")
  const groupedPermissions: Record<string, Permission[]> = {};
  allPermissions?.forEach((p) => {
    const group = p.name.includes('.') ? p.name.split('.')[0] : 'lainnya';
    if (!groupedPermissions[group]) groupedPermissions[group] = [];
    groupedPermissions[group].push(p);
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Role & Hak Akses</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Atur permission untuk setiap role pengguna sistem.</p>
        </div>
        <button
          onClick={() => setShowAddRole(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-sigap-700 text-white font-semibold text-sm rounded-xl hover:bg-sigap-800 shadow-md shadow-sigap-200 transition"
        >
          <Plus className="w-4 h-4" />
          Tambah Role
        </button>
      </div>

      {/* Add Role Modal */}
      {showAddRole && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Buat Role Baru</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="Nama role (contoh: reviewer)"
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-sigap-500 placeholder-slate-400 dark:placeholder-slate-500"
            />
            <button
              onClick={() => createRoleMutation.mutate()}
              disabled={!newRoleName.trim() || createRoleMutation.isPending}
              className="px-4 py-2.5 bg-sigap-700 text-white font-semibold text-sm rounded-xl hover:bg-sigap-800 disabled:opacity-50 transition"
            >
              Simpan
            </button>
            <button onClick={() => setShowAddRole(false)} className="px-4 py-2.5 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition text-sm">
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Roles List */}
      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 animate-pulse" />
            ))
          : roles?.map((role) => (
              <div key={role.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <button
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
                  onClick={() => setExpandedRole(expandedRole === role.id ? null : role.id)}
                >
                  <div className="w-9 h-9 bg-sigap-50 rounded-xl flex items-center justify-center">
                    <Shield className="w-5 h-5 text-sigap-700" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{role.name}</div>
                    <div className="text-xs text-slate-400">{role.permissions?.length || 0} hak akses aktif</div>
                  </div>
                  {expandedRole === role.id ? (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Hapus role "${role.name}"?`)) deleteRoleMutation.mutate(role.id);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </button>

                {expandedRole === role.id && (
                  <div className="border-t border-slate-100 dark:border-slate-700 px-5 py-4 space-y-4">
                    {Object.entries(groupedPermissions).map(([group, perms]) => (
                      <div key={group}>
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 capitalize">{group}</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {perms.map((perm) => {
                            const granted = role.permissions?.includes(perm.name);
                            return (
                              <button
                                key={perm.id}
                                onClick={() =>
                                  togglePermissionMutation.mutate({
                                    roleId: role.id,
                                    permission: perm.name,
                                    grant: !granted,
                                  })
                                }
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition ${
                                  granted
                                    ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-sigap-300 dark:hover:border-sigap-600'
                                }`}
                              >
                                {granted ? (
                                  <Check className="w-3.5 h-3.5 shrink-0" />
                                ) : (
                                  <div className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                                )}
                                <span className="truncate">{perm.name.split('.')[1] || perm.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
      </div>
    </div>
  );
};

export default RolesPage;
