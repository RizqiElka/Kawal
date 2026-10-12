<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    /**
     * Role bawaan sistem yang tidak boleh dihapus.
     */
    protected array $systemRoles = [
        'admin',
        'user',
        'kabid',
        'editor',
        'sekretaris',
        'kepala',
        'publisher',
    ];

    /**
     * Daftar semua role beserta jumlah user dan permissions.
     */
    public function index(): JsonResponse
    {
        $roles = Role::where('guard_name', 'sanctum')
            ->with(['permissions'])
            ->withCount('users')
            ->get()
            ->map(function ($role) {
                return [
                    'id' => $role->id,
                    'name' => $role->name,
                    'guard_name' => $role->guard_name,
                    'is_system' => in_array($role->name, $this->systemRoles),
                    'users_count' => $role->users_count,
                    'permissions' => $role->permissions->pluck('name'),
                    'created_at' => $role->created_at,
                ];
            });

        return response()->json([
            'data' => $roles,
            'system_roles' => $this->systemRoles,
        ]);
    }

    /**
     * Tambah role baru.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50', 'unique:roles,name'],
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ], [
            'name.required' => 'Nama role wajib diisi.',
            'name.unique' => 'Nama role sudah terdaftar.',
            'name.max' => 'Nama role maksimal 50 karakter.',
        ]);

        $role = Role::create([
            'name' => strtolower(trim($validated['name'])),
            'guard_name' => 'sanctum',
        ]);

        // Juga buatkan di web guard agar konsisten
        Role::firstOrCreate([
            'name' => strtolower(trim($validated['name'])),
            'guard_name' => 'web',
        ]);

        if (! empty($validated['permissions'])) {
            $role->syncPermissions($validated['permissions']);
            $webRole = Role::where('name', $role->name)->where('guard_name', 'web')->first();
            $webRole?->syncPermissions($validated['permissions']);
        }

        return response()->json([
            'message' => 'Role berhasil ditambahkan.',
            'data' => [
                'id' => $role->id,
                'name' => $role->name,
                'is_system' => false,
                'permissions' => $role->permissions->pluck('name'),
            ],
        ], 201);
    }

    /**
     * Perbarui nama role.
     */
    public function update(Request $request, Role $role): JsonResponse
    {
        if (in_array($role->name, $this->systemRoles)) {
            return response()->json([
                'message' => 'Role bawaan sistem tidak boleh diubah namanya.',
            ], 422);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50', 'unique:roles,name,' . $role->id],
        ], [
            'name.required' => 'Nama role wajib diisi.',
            'name.unique' => 'Nama role sudah terdaftar.',
        ]);

        $oldName = $role->name;
        $newName = strtolower(trim($validated['name']));
        $role->update(['name' => $newName]);

        $webRole = Role::where('name', $oldName)->where('guard_name', 'web')->first();
        $webRole?->update(['name' => $newName]);

        return response()->json([
            'message' => 'Role berhasil diperbarui.',
            'data' => $role,
        ]);
    }

    /**
     * Hapus role (bukan role sistem dan tidak memiliki user).
     */
    public function destroy(Role $role): JsonResponse
    {
        if (in_array($role->name, $this->systemRoles)) {
            return response()->json([
                'message' => 'Role bawaan sistem tidak boleh dihapus.',
            ], 422);
        }

        if ($role->users()->count() > 0) {
            return response()->json([
                'message' => 'Role yang masih digunakan oleh pengguna tidak dapat dihapus.',
            ], 422);
        }

        $roleName = $role->name;
        $role->delete();

        Role::where('name', $roleName)->where('guard_name', 'web')->delete();

        return response()->json([
            'message' => 'Role berhasil dihapus.',
        ]);
    }

    /**
     * Daftar semua permission yang tersedia, dikelompokkan per modul.
     */
    public function permissions(): JsonResponse
    {
        $permissions = Permission::where('guard_name', 'sanctum')->get();

        $grouped = [];
        foreach ($permissions as $p) {
            $parts = explode('.', $p->name);
            $module = $parts[0] ?? 'lainnya';
            $grouped[$module][] = [
                'id' => $p->id,
                'name' => $p->name,
                'label' => $this->getPermissionLabel($p->name),
            ];
        }

        return response()->json([
            'data' => $permissions->map(fn($p) => ['id' => $p->id, 'name' => $p->name]),
            'grouped' => $grouped,
        ]);
    }

    /**
     * Sinkronisasi permissions ke suatu role (matriks permission).
     */
    public function syncPermissions(Request $request, Role $role): JsonResponse
    {
        $validated = $request->validate([
            'permissions' => ['present', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        $role->syncPermissions($validated['permissions']);

        $webRole = Role::where('name', $role->name)->where('guard_name', 'web')->first();
        $webRole?->syncPermissions($validated['permissions']);

        return response()->json([
            'message' => "Hak akses untuk role '{$role->name}' berhasil diperbarui.",
            'data' => [
                'role' => $role->name,
                'permissions' => $role->permissions()->pluck('name'),
            ],
        ]);
    }

    /**
     * Revoke specific permissions from a role.
     */
    public function revokePermissions(Request $request, Role $role): JsonResponse
    {
        $validated = $request->validate([
            'permissions' => ['required', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);

        foreach ($validated['permissions'] as $permission) {
            $role->revokePermissionTo($permission);
        }

        $webRole = Role::where('name', $role->name)->where('guard_name', 'web')->first();
        if ($webRole) {
            foreach ($validated['permissions'] as $permission) {
                $webRole->revokePermissionTo($permission);
            }
        }

        return response()->json([
            'message' => "Hak akses berhasil dicabut dari role '{$role->name}'.",
            'data' => [
                'role' => $role->name,
                'permissions' => $role->permissions()->pluck('name'),
            ],
        ]);
    }

    private function getPermissionLabel(string $name): string
    {
        $labels = [
            'konten.lihat' => 'Melihat Konten',
            'konten.buat' => 'Membuat Konten Baru',
            'konten.ubah' => 'Mengubah Konten',
            'konten.kirim' => 'Mengirim Konten ke Alur Persetujuan',
            'konten.setujui' => 'Menyetujui / Merevisi / Menolak Konten',
            'konten.lihat-semua-bidang' => 'Melihat Konten Lintas Bidang',
            'publikasi.terbitkan' => 'Mempublikasikan Konten ke Kanal',
            'pengguna.kelola' => 'Mengelola Data Pengguna',
            'role.kelola' => 'Mengelola Role & Matriks Hak Akses',
            'pengaturan.kelola' => 'Mengelola Konfigurasi Sistem',
            'dashboard.lihat-semua' => 'Melihat Statistik Komprehensif Dashboard',
        ];

        return $labels[$name] ?? $name;
    }
}
