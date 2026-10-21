<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * Tampilkan daftar pengguna.
     * Otomatis sinkron data pegawai dari SIPEG jika diperlukan secara transparan.
     */
    public function index(Request $request): JsonResponse
    {


        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = strtolower($request->input('sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';
        $allowedSort = ['nama', 'email', 'nip', 'jabatan', 'created_at'];
        if (!in_array($sortBy, $allowedSort, true)) {
            $sortBy = 'created_at';
        }

        $query = User::with(['bidang', 'roles'])->orderBy($sortBy, $sortOrder);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('nama', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('nip', 'like', "%{$search}%")
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
        if ($request->has('role') && !$request->has('roles')) {
            $roleVal = $request->input('role');
            if ($roleVal) {
                $request->merge(['roles' => [$roleVal]]);
            }
        }

        $validated = $request->validate([
            'nip' => ['nullable', 'string', 'max:50'],
            'pegawai_id' => ['nullable', 'string', 'max:50'],
            'nama' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'bidang_id' => ['nullable', 'exists:bidang,id'],
            'jabatan' => ['nullable', 'string', 'max:100'],
            'is_active' => ['boolean'],
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => ['string', 'exists:roles,name'],
        ], [
            'nama.required' => 'Nama pengguna wajib diisi.',
            'email.required' => 'Email wajib diisi.',
            'email.unique' => 'Email sudah terdaftar.',
            'password.required' => 'Kata sandi wajib diisi.',
            'password.min' => 'Kata sandi minimal 6 karakter.',
            'roles.required' => 'Minimal pilih 1 role untuk pengguna.',
        ]);

        $nip = $validated['nip'] ?? $validated['pegawai_id'] ?? null;

        $user = User::create([
            'nip' => $nip,
            'pegawai_id' => $nip,
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
     * Perbarui data pengguna dan penentuan role di SIGAP.
     */
    public function update(Request $request, User $user): JsonResponse
    {
        if ($request->has('role') && !$request->has('roles')) {
            $roleVal = $request->input('role');
            if ($roleVal) {
                $request->merge(['roles' => [$roleVal]]);
            }
        }

        $validated = $request->validate([
            'nip' => ['nullable', 'string', 'max:50'],
            'pegawai_id' => ['nullable', 'string', 'max:50'],
            'nama' => ['sometimes', 'required', 'string', 'max:150'],
            'email' => ['sometimes', 'required', 'email', 'max:150', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:6'],
            'bidang_id' => ['nullable', 'exists:bidang,id'],
            'jabatan' => ['nullable', 'string', 'max:100'],
            'is_active' => ['boolean'],
            'roles' => ['nullable', 'array'],
            'roles.*' => ['string', 'exists:roles,name'],
        ], [
            'nama.required' => 'Nama pengguna wajib diisi.',
            'email.required' => 'Email wajib diisi.',
            'email.unique' => 'Email sudah terdaftar.',
            'password.min' => 'Kata sandi minimal 6 karakter.',
        ]);

        $updateData = [];

        if (isset($validated['nama'])) $updateData['nama'] = $validated['nama'];
        if (isset($validated['email'])) $updateData['email'] = $validated['email'];
        if (array_key_exists('bidang_id', $validated)) $updateData['bidang_id'] = $validated['bidang_id'];
        if (array_key_exists('jabatan', $validated)) $updateData['jabatan'] = $validated['jabatan'];

        if (isset($validated['nip']) || isset($validated['pegawai_id'])) {
            $nipVal = $validated['nip'] ?? $validated['pegawai_id'];
            $updateData['nip'] = $nipVal;
            $updateData['pegawai_id'] = $nipVal;
        }

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
            'message' => 'Data pengguna & role berhasil diperbarui.',
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

