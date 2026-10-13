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
        Schema::table('konten', function (Blueprint $table) {
            $table->string('foto_sosmed_path')->nullable()->after('isi');
        });

        Schema::table('persetujuan', function (Blueprint $table) {
            $table->string('target_tahap')->nullable()->after('aksi');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('konten', function (Blueprint $table) {
            $table->dropColumn('foto_sosmed_path');
        });

        Schema::table('persetujuan', function (Blueprint $table) {
            $table->dropColumn('target_tahap');
        });
    }
};
