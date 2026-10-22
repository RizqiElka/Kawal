import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Plus, Trash2, ChevronDown, ChevronRight, Check, Save, RotateCcw } from 'lucide-react';
import apiClient from '../api/client';
import { useToast } from '../context/ToastContext';

interface Role {
  id: number;
  name: string;
  is_system?: boolean;
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

  // State draft per role: roleId -> list of selected permission names
  const [draftPermissions, setDraftPermissions] = useState<Record<number, string[]>>({});

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

  // Inisialisasi draft permissions dari data server
  useEffect(() => {
    if (roles) {
      setDraftPermissions((prev) => {
        const next: Record<number, string[]> = { ...prev };
        roles.forEach((r) => {
          if (!next[r.id]) {
            next[r.id] = [...(r.permissions || [])];
          }
        });
        return next;
      });
    }
  }, [roles]);

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

  const savePermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissions }: { roleId: number; permissions: string[] }) => {
      return apiClient.post(`/roles/${roleId}/permissions`, { permissions });
    },
    onSuccess: (_, vars) => {
      toast.success('Hak akses berhasil disimpan.');
      queryClient.invalidateQueries({ queryKey: ['roles-with-permissions'] });
      // Perbarui draft agar sinkron
      setDraftPermissions((prev) => ({
        ...prev,
        [vars.roleId]: [...vars.permissions],
      }));
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Gagal menyimpan hak akses.'),
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/roles/${id}`),
    onSuccess: () => {
      toast.success('Role berhasil dihapus.');
      queryClient.invalidateQueries({ queryKey: ['roles-with-permissions'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Gagal menghapus role.'),
  });

  const toggleDraftPermission = (roleId: number, permName: string) => {
    setDraftPermissions((prev) => {
      const current = prev[roleId] ?? [];
      const exists = current.includes(permName);
      const updated = exists ? current.filter((p) => p !== permName) : [...current, permName];
      return {
        ...prev,
        [roleId]: updated,
      };
    });
  };

  const resetRoleDraft = (role: Role) => {
    setDraftPermissions((prev) => ({
      ...prev,
      [role.id]: [...(role.permissions || [])],
    }));
  };

  const isRoleDirty = (role: Role) => {
    const draft = draftPermissions[role.id];
    if (!draft) return false;
    const original = role.permissions || [];
    if (draft.length !== original.length) return true;
    return draft.some((p) => !original.includes(p));
  };

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
          : roles?.map((role) => {
              const currentActivePerms = draftPermissions[role.id] ?? role.permissions ?? [];
              const dirty = isRoleDirty(role);

              return (
                <div key={role.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                  <div className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                    <button
                      type="button"
                      className="flex-1 flex items-center gap-4 text-left"
                      onClick={() => {
                        // Jika belum ada draft, isi dari role.permissions
                        if (!draftPermissions[role.id]) {
                          setDraftPermissions((prev) => ({ ...prev, [role.id]: [...(role.permissions || [])] }));
                        }
                        setExpandedRole(expandedRole === role.id ? null : role.id);
                      }}
                    >
                      <div className="w-9 h-9 bg-sigap-50 dark:bg-sigap-900/30 rounded-xl flex items-center justify-center">
                        <Shield className="w-5 h-5 text-sigap-700 dark:text-sigap-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{role.name}</span>
                          {dirty && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                              Ada perubahan
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">
                          {currentActivePerms.length} hak akses dipilih ({role.permissions?.length || 0} tersimpan)
                        </div>
                      </div>
                      {expandedRole === role.id ? (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                    </button>

                    {!role.is_system && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Hapus role "${role.name}"?`)) deleteRoleMutation.mutate(role.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-600 transition"
                        title="Hapus Role"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {expandedRole === role.id && (
                    <div className="border-t border-slate-100 dark:border-slate-700 px-5 py-4 space-y-5 bg-slate-50/40 dark:bg-slate-900/20">
                      {/* Bar Informasi & Tombol Simpan */}
                      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="text-xs text-slate-600 dark:text-slate-300">
                          Pilih izin hak akses di bawah, lalu klik <strong className="text-sigap-700 dark:text-sigap-400">Simpan Perubahan</strong> untuk menerapkan ke sistem.
                        </div>
                        <div className="flex items-center gap-2">
                          {dirty && (
                            <button
                              type="button"
                              onClick={() => resetRoleDraft(role)}
                              disabled={savePermissionsMutation.isPending}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Reset
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              savePermissionsMutation.mutate({
                                roleId: role.id,
                                permissions: currentActivePerms,
                              })
                            }
                            disabled={!dirty || savePermissionsMutation.isPending}
                            className="flex items-center gap-1.5 px-4 py-2 bg-sigap-700 text-white font-semibold text-xs rounded-lg hover:bg-sigap-800 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition"
                          >
                            <Save className="w-3.5 h-3.5" />
                            {savePermissionsMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                          </button>
                        </div>
                      </div>

                      {Object.entries(groupedPermissions).map(([group, perms]) => (
                        <div key={group}>
                          <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2 capitalize">{group}</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {perms.map((perm) => {
                              const granted = currentActivePerms.includes(perm.name);
                              return (
                                <button
                                  key={perm.id}
                                  type="button"
                                  onClick={() => toggleDraftPermission(role.id, perm.name)}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border text-left transition ${
                                    granted
                                      ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-semibold shadow-xs'
                                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-sigap-300 dark:hover:border-sigap-600'
                                  }`}
                                >
                                  {granted ? (
                                    <div className="w-4 h-4 rounded-md bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                      <Check className="w-3 h-3 stroke-[3]" />
                                    </div>
                                  ) : (
                                    <div className="w-4 h-4 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 shrink-0" />
                                  )}
                                  <span className="truncate">{perm.name.split('.')[1] || perm.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      {/* Tombol Simpan di Bagian Bawah juga */}
                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={() =>
                            savePermissionsMutation.mutate({
                              roleId: role.id,
                              permissions: currentActivePerms,
                            })
                          }
                          disabled={!dirty || savePermissionsMutation.isPending}
                          className="flex items-center gap-2 px-4 py-2 bg-sigap-700 text-white font-semibold text-xs rounded-xl hover:bg-sigap-800 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition"
                        >
                          <Save className="w-4 h-4" />
                          {savePermissionsMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan Role'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
      </div>
    </div>
  );
};

export default RolesPage;

