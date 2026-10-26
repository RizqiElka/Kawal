<?php

namespace App\Http\Controllers;

use App\Models\Bidang;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class SsoController extends Controller
{
    /**
     * LANGKAH 1: Redirect user ke halaman login SIPEG.
     * Route: GET /sso/login
     */
    public function login(Request $request)
    {
        $callbackUrl = config('sso.sipeg_callback_url', url('/sso/callback'));

        $sipegAuthorizeUrl = rtrim(config('sso.sipeg_url'), '/') . '/sso/authorize'
            . '?redirect_uri=' . urlencode($callbackUrl);

        return redirect()->away($sipegAuthorizeUrl);
    }

    /**
     * LANGKAH 2: SIPEG redirect balik ke sini dengan ?code=xxxx
     * Route: GET /sso/callback
     */
    public function callback(Request $request)
    {
        $code = $request->query('code');

        if (!$code) {
            Log::warning('SSO callback tanpa code', ['ip' => $request->ip()]);
            return $this->redirectWithError('SSO gagal: kode tidak ditemukan.');
        }

        // -- STEP 1: Tukar code ke token + data dari SIPEG ----------------------
        $sipegBaseUrl = rtrim(config('sso.sipeg_url'), '/');

        try {
            $sipegResponse = Http::timeout(10)
                ->post($sipegBaseUrl . '/api/sso/token', [
                    'code' => $code,
                ]);
        } catch (\Exception $e) {
            Log::error('SSO: Gagal koneksi ke SIPEG', ['error' => $e->getMessage()]);
            return $this->redirectWithError('Tidak dapat terhubung ke server SIPEG.');
        }

        if (!$sipegResponse->successful()) {
            Log::warning('SSO: Token tidak valid dari SIPEG', [
                'status' => $sipegResponse->status(),
                'body'   => $sipegResponse->body(),
            ]);
            return $this->redirectWithError('Kode SSO tidak valid atau sudah kedaluwarsa.');
        }

        $payload      = $sipegResponse->json();
        $sipegToken   = $payload['token'] ?? null;
        $sipegUser    = $payload['user'] ?? null;
        $sipegPegawai = $payload['pegawai'] ?? null;

        if (!$sipegToken || !$sipegUser) {
            Log::error('SSO: Payload SIPEG tidak lengkap', ['payload' => $payload]);
            return $this->redirectWithError('Data dari SIPEG tidak lengkap.');
        }

        // -- STEP 2 & 3: Cari atau buat user di SIGAP & otomatis update data pegawai --
        $user = User::firstOrNew(['email' => $sipegUser['email']]);
        $namaLengkap = $sipegPegawai['nama_lengkap'] ?? $sipegPegawai['nama'] ?? $sipegUser['username'];
        $nip = $sipegPegawai['nip'] ?? $sipegUser['username'] ?? ('PEG-' . $sipegUser['id']);

        $user->fill([
            'sipeg_user_id'  => $sipegUser['id'],
            'pegawai_id'     => $nip,
            'nama'           => $namaLengkap,
            'email'          => $sipegUser['email'],
            'nip'            => $sipegPegawai['nip'] ?? null,
            'jabatan'        => $sipegPegawai['jabatan']['nama_jabatan'] ?? null,
            'is_active'      => $sipegUser['is_active'] ?? true,
            'last_synced_at' => now(),
        ]);

        if (!$user->exists || !$user->password) {
            $user->password = Hash::make(Str::random(32));
        }

        // -- STEP 4: Otomatis sync bidang dari SIPEG --------------------------
        if ($sipegPegawai && isset($sipegPegawai['bidang']) && !empty($sipegPegawai['bidang']['nama_bidang'])) {
            $bidangSipeg = $sipegPegawai['bidang'];
            $bidang = Bidang::firstOrCreate(
                ['kode' => $bidangSipeg['singkatan'] ?? 'UMUM'],
                ['nama' => $bidangSipeg['nama_bidang'] ?? 'Umum']
            );
            $user->bidang_id = $bidang->id;
        }

        $user->save();

        // -- STEP 5: Penentuan Role di SIGAP ----------------------------------
        // Role mapping dikelola oleh Admin SIGAP melalui dashboard!
        // Jika user SUDAH memiliki role di SIGAP (diatur oleh Admin), JANGAN ditimpa/reset!
        // Hanya pasang role jika user BARU atau belum punya role sama sekali di SIGAP.
        if ($user->roles()->count() === 0) {
            $sipegRole = $sipegUser['role'] ?? 'user';
            
            if (in_array($sipegRole, ['superadmin', 'admin'], true)) {
                $sigapRole = 'admin';
            } else {
                $sigapRole = 'user';
            }

            if (!\Spatie\Permission\Models\Role::where('name', $sigapRole)->exists()) {
                $sigapRole = 'user';
            }

            $user->assignRole($sigapRole);
        } else {
            // Gunakan role yang sudah diatur oleh Admin SIGAP
            $sigapRole = $user->roles()->first()->name ?? 'user';
        }

        Log::info('SSO: User berhasil login otomatis dari SIPEG', [
            'email'      => $user->email,
            'sigap_role' => $sigapRole,
        ]);

        // -- STEP 6: Buat token SIGAP & redirect ke frontend ------------------
        $user->tokens()->where('name', 'sso-login')->delete();

        $sigapToken = $user->createToken(
            'sso-login',
            ['*'],
            now()->addHours(8)
        )->plainTextToken;

        $frontendUrl = config('sso.frontend_url', env('FRONTEND_URL', 'http://localhost:8001'));

        return redirect()->away(
            rtrim($frontendUrl, '/') . '/sso-callback'
            . '?token=' . urlencode($sigapToken)
            . '&role=' . urlencode($sigapRole)
        );
    }

    /**
     * Fungsi internal untuk sinkronisasi otomatis seluruh pegawai dari SIPEG.
     */
    public function syncFromSipegInternal(): int
    {
        $sipegUrl = rtrim(config('sso.sipeg_url', 'http://localhost/Sipeg_Bapperida-main/Sipeg_Bapperida-1/public'), '/');

        $response = Http::timeout(10)->get($sipegUrl . '/api/sso/master-pegawai');
        if (!$response->successful()) {
            return 0;
        }

        $pegawaiList = $response->json('data') ?? [];
        $syncedCount = 0;

        foreach ($pegawaiList as $p) {
            $email = $p['user']['email'] ?? ($p['nip'] ? $p['nip'] . '@bapperida.go.id' : null);
            if (!$email) {
                continue;
            }

            $user = User::firstOrNew(['email' => $email]);
            $namaLengkap = $p['nama_lengkap'] ?? $p['nama'] ?? ($p['user']['username'] ?? 'Pegawai');
            $nip = $p['nip'] ?? ($p['user']['username'] ?? ('PEG-' . ($p['id'] ?? Str::random(6))));

            $user->fill([
                'sipeg_user_id'  => $p['user']['id'] ?? null,
                'pegawai_id'     => $nip,
                'nama'           => $namaLengkap,
                'nip'            => $p['nip'] ?? null,
                'jabatan'        => $p['jabatan']['nama_jabatan'] ?? null,
                'is_active'      => ($p['status_kerja'] ?? '') === 'Aktif' || ($p['user']['is_active'] ?? true),
                'last_synced_at' => now(),
            ]);

            if (!$user->exists || !$user->password) {
                $user->password = Hash::make(Str::random(32));
            }

            if (isset($p['bidang']) && !empty($p['bidang']['nama_bidang'])) {
                $bidang = Bidang::firstOrCreate(
                    ['kode' => $p['bidang']['singkatan'] ?? 'UMUM'],
                    ['nama' => $p['bidang']['nama_bidang']]
                );
                $user->bidang_id = $bidang->id;
            }

            $user->save();

            // Set role default HANYA jika belum punya role (role admin SIGAP tidak ditimpa)
            if ($user->roles()->count() === 0) {
                $sipegRole = $p['user']['role'] ?? 'user';
                $defaultRole = in_array($sipegRole, ['superadmin', 'admin'], true) ? 'admin' : 'user';
                if (!\Spatie\Permission\Models\Role::where('name', $defaultRole)->exists()) {
                    $defaultRole = 'user';
                }
                $user->assignRole($defaultRole);
            }

            $syncedCount++;
        }

        return $syncedCount;
    }

    /**
     * Endpoint API (opsional/background)
     */
    public function syncFromSipeg(Request $request)
    {
        try {
            $syncedCount = $this->syncFromSipegInternal();
            return response()->json([
                'status'  => 'success',
                'message' => "Data {$syncedCount} pegawai berhasil disinkronkan otomatis dari SIPEG.",
                'total'   => $syncedCount,
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 502);
        }
    }

    /**
     * Webhook penerima event pegawai dari BAPERAN/SIPEG (Tambah, Ubah, Hapus).
     * Route: POST /api/webhook/pegawai-sync
     */
    public function handlePegawaiWebhook(Request $request)
    {
        $action    = $request->input('action', 'saved'); // 'saved', 'deleted'
        $pegawaiId = $request->input('pegawai_id');
        $nip       = $request->input('nip');

        if ($action === 'deleted') {
            // Jika dihapus di SIPEG, nonaktifkan akun di KAWAL
            $user = User::query()
                ->when($nip, fn($q) => $q->where('nip', $nip)->orWhere('pegawai_id', $nip))
                ->when($pegawaiId, fn($q) => $q->orWhere('sipeg_user_id', $pegawaiId))
                ->first();

            if ($user) {
                $user->update(['is_active' => false]);
                Log::info("Webhook BAPERAN: Akun {$user->nama} ({$user->email}) dinonaktifkan karena dihapus di BAPERAN.");
                return response()->json([
                    'status'  => 'success',
                    'action'  => 'deactivated',
                    'message' => "User {$user->nama} berhasil dinonaktifkan.",
                ]);
            }

            return response()->json([
                'status'  => 'ignored',
                'message' => 'User tidak ditemukan di KAWAL.',
            ]);
        }

        // Jika tambah atau ubah ('saved', 'created', 'updated'), jalankan sinkronisasi
        $syncedCount = $this->syncFromSipegInternal();

        return response()->json([
            'status'  => 'success',
            'action'  => 'synced',
            'message' => "Data pegawai berhasil disinkronkan otomatis ({$syncedCount} total).",
        ]);
    }

    /**
     * Logout dari SIGAP & invalidate token.
     * Route: POST /sso/logout
     */
    public function logout(Request $request)
    {
        if ($user = $request->user()) {
            $user->tokens()->where('name', 'sso-login')->delete();
        }

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        $sipegUrl = rtrim(config('sso.sipeg_url', env('SIPEG_URL', 'http://localhost:8000')), '/');

        return redirect()->away($sipegUrl . '/sso/logout');
    }

    /**
     * Logout via GET — dipanggil dari SPA tanpa perlu CSRF token.
     * Menghapus token KAWAL lalu redirect ke BAPERAN logout.
     * Route: GET /sso/baperan-logout
     */
    public function baperanLogout(Request $request)
    {
        // Hapus semua token Sanctum milik user (jika masih terautentikasi via header)
        if ($user = $request->user()) {
            $user->tokens()->where('name', 'sso-login')->delete();
        }

        $sipegUrl = rtrim(config('sso.sipeg_url', env('SIPEG_URL', 'http://localhost:8000')), '/');

        return redirect()->away($sipegUrl . '/sso/logout');
    }

    /**
     * Helper: redirect ke halaman login frontend dengan pesan error.
     */
    private function redirectWithError(string $message)
    {
        $frontendUrl = config('sso.frontend_url', env('FRONTEND_URL', 'http://localhost:8001'));

        return redirect()->away(
            rtrim($frontendUrl, '/') . '/login?error=' . urlencode($message)
        );
    }
}
