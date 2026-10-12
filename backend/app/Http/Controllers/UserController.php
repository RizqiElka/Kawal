<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * Tampilkan daftar pengguna dengan filter dan pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::with(['bidang', 'roles'])->latest();

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('nama', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('pegawai_id', 'like', "%{$search}%")
                    ->orWhere('jabatan', 'like', "%{$search}%");
            });
        }

        if ($request->filled('bidang_id')) {
            $query->where('bidang_id', $request->input('bidang_id'));
        }

        if ($request->filled('role')) {
            $query->role($request->input('role'));
        }

        if ($request->has('is_active') && $request->input('is_active') !== '') {
            $query->where('is_active', filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        $perPage = (int) $request->input('per_page', 15);
        $users = $query->paginate($perPage);

        return response()->json([
            'data' => UserResource::collection($users->items()),
            'meta' => [
                'current_page' => $users->currentPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
                'last_page' => $users->lastPage(),
            ],
        ]);
    }

    /**
     * Tambah pengguna baru.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'pegawai_id' => ['required', 'string', 'max:50', 'unique:users,pegawai_id'],
            'nama' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'bidang_id' => ['nullable', 'exists:bidang,id'],
            'jabatan' => ['nullable', 'string', 'max:100'],
            'is_active' => ['boolean'],
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => ['string', 'exists:roles,name'],
        ], [
            'pegawai_id.required' => 'NIP / ID Pegawai wajib diisi.',
            'pegawai_id.unique' => 'NIP / ID Pegawai sudah terdaftar.',
            'nama.required' => 'Nama pengguna wajib diisi.',
            'email.required' => 'Email wajib diisi.',
            'email.unique' => 'Email sudah terdaftar.',
            'password.required' => 'Kata sandi wajib diisi.',
            'password.min' => 'Kata sandi minimal 6 karakter.',
            'roles.required' => 'Minimal pilih 1 role untuk pengguna.',
        ]);

        $user = User::create([
            'pegawai_id' => $validated['pegawai_id'],
            'nama' => $validated['nama'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'bidang_id' => $validated['bidang_id'] ?? null,
            'jabatan' => $validated['jabatan'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'last_synced_at' => now(),
        ]);

        $user->syncRoles($validated['roles']);

        return response()->json([
            'message' => 'Pengguna berhasil ditambahkan.',
            'data' => new UserResource($user->load(['bidang', 'roles'])),
        ], 201);
    }

    /**
     * Tampilkan detail pengguna.
     */
    public function show(User $user): JsonResponse
    {
        return response()->json([
            'data' => new UserResource($user->load(['bidang', 'roles'])),
        ]);
    }

    /**
     * Perbarui data pengguna dan role.
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'pegawai_id' => ['required', 'string', 'max:50', Rule::unique('users', 'pegawai_id')->ignore($user->id)],
            'nama' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:6'],
            'bidang_id' => ['nullable', 'exists:bidang,id'],
            'jabatan' => ['nullable', 'string', 'max:100'],
            'is_active' => ['boolean'],
            'roles' => ['nullable', 'array'],
            'roles.*' => ['string', 'exists:roles,name'],
        ], [
            'pegawai_id.required' => 'NIP / ID Pegawai wajib diisi.',
            'pegawai_id.unique' => 'NIP / ID Pegawai sudah terdaftar.',
            'nama.required' => 'Nama pengguna wajib diisi.',
            'email.required' => 'Email wajib diisi.',
            'email.unique' => 'Email sudah terdaftar.',
            'password.min' => 'Kata sandi minimal 6 karakter.',
        ]);

        $updateData = [
            'pegawai_id' => $validated['pegawai_id'],
            'nama' => $validated['nama'],
            'email' => $validated['email'],
            'bidang_id' => $validated['bidang_id'] ?? null,
            'jabatan' => $validated['jabatan'] ?? null,
        ];

        if (isset($validated['is_active'])) {
            $updateData['is_active'] = $validated['is_active'];
        }

        if (! empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        $user->update($updateData);

        if (isset($validated['roles'])) {
            $user->syncRoles($validated['roles']);
        }

        return response()->json([
            'message' => 'Data pengguna berhasil diperbarui.',
            'data' => new UserResource($user->load(['bidang', 'roles'])),
        ]);
    }

    /**
     * Toggle status aktif/nonaktif pengguna.
     */
    public function toggleActive(Request $request, User $user): JsonResponse
    {
        if ($request->user()->id === $user->id) {
            return response()->json([
                'message' => 'Anda tidak dapat menonaktifkan akun Anda sendiri.',
            ], 422);
        }

        $user->update(['is_active' => ! $user->is_active]);

        $statusText = $user->is_active ? 'diaktifkan' : 'dinonaktifkan';

        return response()->json([
            'message' => "Pengguna berhasil {$statusText}.",
            'data' => new UserResource($user->load(['bidang', 'roles'])),
        ]);
    }

    /**
     * Hapus akun pengguna.
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($request->user()->id === $user->id) {
            return response()->json([
                'message' => 'Anda tidak dapat menghapus akun Anda sendiri.',
            ], 422);
        }

        $user->delete();

        return response()->json([
            'message' => 'Pengguna berhasil dihapus.',
        ]);
    }
}
