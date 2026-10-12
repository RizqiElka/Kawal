<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('jenis_konten', function (Blueprint $table) {
            $table->id();
            $table->string('nama');
            $table->boolean('wajib_cek_5w1h')->default(false);
            $table->timestamps();
        });

        Schema::create('alur_tahap', function (Blueprint $table) {
            $table->id();
            $table->integer('urutan');
            $table->string('kode_tahap')->unique();
            $table->string('nama');
            $table->string('role_penyetuju');
            $table->boolean('aktif')->default(true);
            $table->timestamps();
        });

        Schema::create('konten', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('bidang_id')->nullable()->constrained('bidang')->nullOnDelete();
            $table->foreignId('jenis_konten_id')->constrained('jenis_konten');
            $table->string('judul', 100);
            $table->string('slug');
            $table->longText('isi');
            $table->enum('status', ['draft', 'diproses', 'revisi', 'ditolak', 'disetujui', 'terbit'])->default('draft');
            $table->string('tahap_saat_ini')->nullable();
            $table->integer('revisi_ke')->default(0);
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('konten_foto', function (Blueprint $table) {
            $table->id();
            $table->foreignId('konten_id')->constrained('konten')->cascadeOnDelete();
            $table->string('path');
            $table->integer('urutan');
            $table->string('caption')->nullable();
            $table->unique(['konten_id', 'urutan']);
            $table->timestamps();
        });

        Schema::create('persetujuan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('konten_id')->constrained('konten')->cascadeOnDelete();
            $table->string('tahap');
            $table->foreignId('reviewer_id')->constrained('users');
            $table->enum('aksi', ['setujui', 'revisi', 'tolak']);
            $table->text('catatan')->nullable();
            $table->integer('revisi_ke')->default(0);
            $table->timestamp('acted_at');
            $table->timestamps();
        });

        Schema::create('ai_check_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('konten_id')->constrained('konten')->cascadeOnDelete();
            $table->integer('revisi_ke')->default(0);
            $table->integer('skor')->nullable();
            $table->json('hasil')->nullable();
            $table->text('saran')->nullable();
            $table->string('model')->nullable();
            $table->enum('status', ['menunggu', 'selesai', 'gagal'])->default('menunggu');
            $table->string('isi_hash')->nullable();
            $table->timestamps();
        });

        Schema::create('kanal_publikasi', function (Blueprint $table) {
            $table->id();
            $table->string('kode')->unique(); // web, instagram, facebook, x, tiktok
            $table->string('nama');
            $table->boolean('aktif')->default(true);
            $table->text('kredensial')->nullable();
            $table->timestamps();
        });

        Schema::create('publikasi', function (Blueprint $table) {
            $table->id();
            $table->foreignId('konten_id')->constrained('konten')->cascadeOnDelete();
            $table->foreignId('kanal_id')->constrained('kanal_publikasi')->cascadeOnDelete();
            $table->enum('status', ['menunggu', 'terjadwal', 'berhasil', 'gagal'])->default('menunggu');
            $table->timestamp('jadwal_at')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->string('url_post')->nullable();
            $table->string('external_id')->nullable();
            $table->integer('percobaan')->default(0);
            $table->text('pesan_error')->nullable();
            $table->unique(['konten_id', 'kanal_id']);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('publikasi');
        Schema::dropIfExists('kanal_publikasi');
        Schema::dropIfExists('ai_check_results');
        Schema::dropIfExists('persetujuan');
        Schema::dropIfExists('konten_foto');
        Schema::dropIfExists('konten');
        Schema::dropIfExists('alur_tahap');
        Schema::dropIfExists('jenis_konten');
    }
};
