<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Menambahkan kolom-kolom untuk integrasi SSO dengan SIPEG:
 * - sipeg_user_id : ID user di SIPEG (untuk referensi)
 * - nip           : NIP pegawai (diambil dari SIPEG saat SSO)
 * - last_synced_at: Kapan terakhir data disinkronkan dari SIPEG
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Cek dulu supaya tidak error jika sudah ada
            if (!Schema::hasColumn('users', 'sipeg_user_id')) {
                $table->unsignedBigInteger('sipeg_user_id')->nullable()->after('id');
            }
            if (!Schema::hasColumn('users', 'nip')) {
                $table->string('nip', 30)->nullable()->after('email');
            }
            if (!Schema::hasColumn('users', 'last_synced_at')) {
                $table->timestamp('last_synced_at')->nullable()->after('is_active');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['sipeg_user_id', 'nip', 'last_synced_at']);
        });
    }
};
