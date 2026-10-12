<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Otentikasi pengguna dan buat token Sanctum.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $loginInput = $request->input('login');
        $password = $request->input('password');

        $user = User::with('bidang')
            ->where('email', $loginInput)
            ->first();

        if (! $user || ! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'login' => ['Kredensial yang diberikan tidak cocok dengan data kami.'],
            ]);
        }

        if (! $user->is_active) {
            return response()->json([
                'message' => 'Akun Anda sedang dinonaktifkan. Silakan hubungi administrator.',
            ], 403);
        }

        // Hapus token lama jika diperlukan atau buat token baru
        $token = $user->createToken('sigap-auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Login berhasil.',
            'data' => [
                'user' => new UserResource($user),
                'token' => $token,
            ],
        ]);
    }

    /**
     * Dapatkan data profil pengguna yang sedang login.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('bidang');

        return response()->json([
            'data' => new UserResource($user),
        ]);
    }

    /**
     * Keluar dari sistem dan cabut token aktif.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Berhasil keluar dari sistem.',
        ]);
    }
}
