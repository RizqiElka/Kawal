<?php

namespace App\Policies;

use App\Models\Konten;
use App\Models\User;

class KontenPolicy
{
    /**
     * Boleh melihat daftar konten.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('konten.lihat');
    }

    /**
     * Boleh melihat detail konten.
     */
    public function view(User $user, Konten $konten): bool
    {
        if ($user->hasRole('admin') || $user->can('konten.lihat-semua-bidang')) {
            return true;
        }

        // Kabid hanya bisa melihat konten bidangnya
        if ($user->hasRole('kabid')) {
            return $konten->bidang_id === $user->bidang_id;
        }

        // User biasa melihat konten sendiri atau konten dalam bidangnya
        return $konten->user_id === $user->id || ($user->bidang_id !== null && $konten->bidang_id === $user->bidang_id);
    }

    /**
     * Boleh membuat konten baru.
     */
    public function create(User $user): bool
    {
        return $user->can('konten.buat');
    }

    /**
     * Boleh mengubah konten.
     * Hanya saat status 'draft' atau 'revisi' oleh pembuatnya atau admin.
     */
    public function update(User $user, Konten $konten): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        if (! in_array($konten->status, ['draft', 'revisi'])) {
            return false;
        }

        return $user->can('konten.ubah') && $konten->user_id === $user->id;
    }

    /**
     * Boleh mengirim konten ke alur persetujuan.
     */
    public function submit(User $user, Konten $konten): bool
    {
        if (! in_array($konten->status, ['draft', 'revisi'])) {
            return false;
        }

        return ($konten->user_id === $user->id || $user->hasRole('admin')) && $user->can('konten.kirim');
    }

    /**
     * Boleh menyetujui, merevisi, atau menolak konten.
     * Aturan:
     * - Status konten harus 'diproses'
     * - Kabid hanya bisa menyetujui jika tahap saat ini 'kabid' dan bidang sama
     * - Editor, Sekretaris, Kepala lintas bidang sesuai tahap_saat_ini
     */
    public function approve(User $user, Konten $konten): bool
    {
        if ($konten->status !== 'diproses') {
            return false;
        }

        if ($user->hasRole('admin')) {
            return true;
        }

        if (! $user->can('konten.setujui')) {
            return false;
        }

        $currentStage = $konten->tahap_saat_ini;

        if ($currentStage === 'kabid') {
            return $user->hasRole('kabid') && ($konten->bidang_id === $user->bidang_id);
        }

        if ($currentStage === 'editor') {
            return $user->hasRole('editor');
        }

        if ($currentStage === 'sekretaris') {
            return $user->hasRole('sekretaris');
        }

        if ($currentStage === 'kepala') {
            return $user->hasRole('kepala');
        }

        return false;
    }

    /**
     * Boleh mempublikasikan konten.
     */
    public function publish(User $user, Konten $konten): bool
    {
        if ($konten->status !== 'disetujui' && $konten->status !== 'terbit') {
            return false;
        }

        return $user->can('publikasi.terbitkan') || $user->hasRole('publisher') || $user->hasRole('admin');
    }

    /**
     * Boleh menghapus konten.
     */
    public function delete(User $user, Konten $konten): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        return $konten->status === 'draft' && $konten->user_id === $user->id;
    }
}
