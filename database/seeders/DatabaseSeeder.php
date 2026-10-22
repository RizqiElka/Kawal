<?php

namespace Database\Seeders;

use App\Models\AlurTahap;
use App\Models\Bidang;
use App\Models\JenisKonten;
use App\Models\KanalPublikasi;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Bidang Contoh
        $bidangSekretariat = Bidang::firstOrCreate(
            ['kode' => 'SEKRETARIAT'],
            ['nama' => 'Sekretariat']
        );
        $bidangIkp = Bidang::firstOrCreate(
            ['kode' => 'IKP'],
            ['nama' => 'Bidang Informasi dan Komunikasi Publik']
        );
        $bidangEgov = Bidang::firstOrCreate(
            ['kode' => 'EGOV'],
            ['nama' => 'Bidang Layanan E-Government']
        );
        $bidangStatistik = Bidang::firstOrCreate(
            ['kode' => 'STATISTIK'],
            ['nama' => 'Bidang Statistik dan Persandian']
        );

        // 2. Jenis Konten
        $jenisList = [
            ['nama' => 'Berita', 'wajib_cek_5w1h' => true],
            ['nama' => 'Pengumuman', 'wajib_cek_5w1h' => false],
            ['nama' => 'Artikel', 'wajib_cek_5w1h' => true],
        ];
        foreach ($jenisList as $j) {
            JenisKonten::firstOrCreate(['nama' => $j['nama']], $j);
        }

        // 3. Alur Tahap Persetujuan
        $alurList = [
            ['urutan' => 1, 'kode_tahap' => 'kabid', 'nama' => 'Persetujuan Kepala Bidang', 'role_penyetuju' => 'kabid', 'aktif' => true],
            ['urutan' => 2, 'kode_tahap' => 'editor', 'nama' => 'Review Redaksi / Editor', 'role_penyetuju' => 'editor', 'aktif' => true],
            ['urutan' => 3, 'kode_tahap' => 'sekretaris', 'nama' => 'Persetujuan Sekretaris', 'role_penyetuju' => 'sekretaris', 'aktif' => true],
            ['urutan' => 4, 'kode_tahap' => 'kepala', 'nama' => 'Persetujuan Kepala Dinas', 'role_penyetuju' => 'kepala', 'aktif' => true],
        ];
        foreach ($alurList as $a) {
            AlurTahap::updateOrCreate(['kode_tahap' => $a['kode_tahap']], $a);
        }

        // 4. Kanal Publikasi
        $kanalList = [
            [
                'kode' => 'web',
                'nama' => 'Portal Berita Resmi',
                'aktif' => true,
                'kredensial' => ['endpoint' => 'https://portal.instansi.go.id/api/posts', 'token' => 'mock_web_token_secret'],
            ],
            [
                'kode' => 'instagram',
                'nama' => 'Instagram Official',
                'aktif' => true,
                'kredensial' => ['page_id' => 'instansi_ig_official', 'token' => 'mock_ig_token_secret'],
            ],
            [
                'kode' => 'facebook',
                'nama' => 'Facebook Page Resmi',
                'aktif' => true,
                'kredensial' => ['page_id' => 'instansi_fb_page', 'token' => 'mock_fb_token_secret'],
            ],
            [
                'kode' => 'x',
                'nama' => 'X / Twitter Official',
                'aktif' => true,
                'kredensial' => ['account' => '@instansi_official', 'token' => 'mock_x_token_secret'],
            ],
            [
                'kode' => 'tiktok',
                'nama' => 'TikTok Official',
                'aktif' => true,
                'kredensial' => ['channel' => '@instansi_tiktok', 'token' => 'mock_tiktok_token_secret'],
            ],
        ];
        foreach ($kanalList as $k) {
            KanalPublikasi::updateOrCreate(['kode' => $k['kode']], $k);
        }

        // 5. Permissions
        $permissions = [
            'konten.lihat',
            'konten.buat',
            'konten.ubah',
            'konten.kirim',
            'konten.setujui',
            'konten.lihat-semua-bidang',
            'publikasi.terbitkan',
            'pengguna.kelola',
            'role.kelola',
            'pengaturan.kelola',
            'dashboard.lihat-semua',
        ];

        foreach ($permissions as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'sanctum']);
            // Also register in web guard if needed
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }

        // 6. Roles & Role Permissions
        $rolePermissions = [
            'admin' => $permissions,
            'user' => [
                'konten.lihat',
                'konten.buat',
                'konten.ubah',
                'konten.kirim',
            ],
            'kabid' => [
                'konten.lihat',
                'konten.buat',
                'konten.ubah',
                'konten.kirim',
                'konten.setujui',
            ],
            'editor' => [
                'konten.lihat',
                'konten.ubah',
                'konten.setujui',
                'konten.lihat-semua-bidang',
                'dashboard.lihat-semua',
            ],
            'sekretaris' => [
                'konten.lihat',
                'konten.setujui',
                'konten.lihat-semua-bidang',
                'dashboard.lihat-semua',
            ],
            'kepala' => [
                'konten.lihat',
                'konten.setujui',
                'konten.lihat-semua-bidang',
                'dashboard.lihat-semua',
            ],
            'publisher' => [
                'konten.lihat',
                'konten.lihat-semua-bidang',
                'publikasi.terbitkan',
                'dashboard.lihat-semua',
            ],
        ];

        foreach ($rolePermissions as $roleName => $perms) {
            $roleSanctum = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'sanctum']);
            $roleSanctum->syncPermissions($perms);

            $roleWeb = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
            $roleWeb->syncPermissions($perms);
        }

        // 7. Akun Demo per Role
        $defaultPassword = Hash::make('password');

        $usersData = [
            [
                'nama' => 'Administrator SIGAP',
                'email' => 'admin@sigap.go.id',
                'bidang_id' => $bidangSekretariat->id,
                'jabatan' => 'Pranata Komputer Ahli Muda',
                'role' => 'admin',
            ],
            [
                'nama' => 'Ahmad Staf IKP',
                'email' => 'user@sigap.go.id',
                'bidang_id' => $bidangIkp->id,
                'jabatan' => 'Pengelola Konten Informasi',
                'role' => 'user',
            ],
            [
                'nama' => 'Budi Kepala Bidang IKP',
                'email' => 'kabid@sigap.go.id',
                'bidang_id' => $bidangIkp->id,
                'jabatan' => 'Kepala Bidang IKP',
                'role' => 'kabid',
            ],
            [
                'nama' => 'Citra Redaksi Editor',
                'email' => 'editor@sigap.go.id',
                'bidang_id' => $bidangSekretariat->id,
                'jabatan' => 'Editor Publikasi',
                'role' => 'editor',
            ],
            [
                'nama' => 'Dedi Sekretaris Dinas',
                'email' => 'sekretaris@sigap.go.id',
                'bidang_id' => $bidangSekretariat->id,
                'jabatan' => 'Sekretaris Dinas',
                'role' => 'sekretaris',
            ],
            [
                'nama' => 'Dr. Eko Kepala Dinas',
                'email' => 'kepala@sigap.go.id',
                'bidang_id' => $bidangSekretariat->id,
                'jabatan' => 'Kepala Dinas',
                'role' => 'kepala',
            ],
            [
                'nama' => 'Fani Tim Publikasi',
                'email' => 'publisher@sigap.go.id',
                'bidang_id' => $bidangIkp->id,
                'jabatan' => 'Pranata Humas Publikasi',
                'role' => 'publisher',
            ],
        ];

        foreach ($usersData as $u) {
            $roleName = $u['role'];
            unset($u['role']);

            $user = User::updateOrCreate(
                ['email' => $u['email']],
                array_merge($u, [
                    'password' => $defaultPassword,
                    'is_active' => true,
                ])
            );

            $user->syncRoles([$roleName]);
        }
    }
}
