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
        // Admin, Kepala Dinas, dan Sekretaris dapat melihat seluruh konten
        if ($user->hasRole('admin') || $user->hasRole('kepala') || $user->hasRole('sekretaris')) {
            return true;
        }

        // Konten milik sendiri
        if ($konten->user_id === $user->id) {
            return true;
        }

        // Konten dalam bidang yang sama
        if ($user->bidang_id !== null && $konten->bidang_id === $user->bidang_id) {
            return true;
        }

        // Editor bisa melihat konten yang sedang di tahap persetujuan editor
        if ($user->hasRole('editor') && $konten->status === 'diproses' && $konten->tahap_saat_ini === 'editor') {
            return true;
        }

        // Publisher bisa melihat konten yang sudah disetujui atau sudah terbit
        if ($user->hasRole('publisher') && in_array($konten->status, ['disetujui', 'terbit'])) {
            return true;
        }

        // Kabid bisa melihat konten yang sedang di tahap persetujuan kabid
        if ($user->hasRole('kabid') && $konten->status === 'diproses' && $konten->tahap_saat_ini === 'kabid') {
            return true;
        }

        return false;
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
     * - Admin bisa edit semua.
     * - Editor bisa mengedit konten yang sedang di tahap editor (status diproses, tahap_saat_ini=editor).
     * - Penulis/pemilik konten bisa edit jika status draft atau revisi.
     */
    public function update(User $user, Konten $konten): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        // Editor bisa mengedit konten yang sedang di tahap editor untuk penyuntingan naskah
        if ($user->hasRole('editor') && $user->can('konten.ubah')) {
            if ($konten->status === 'diproses' && $konten->tahap_saat_ini === 'editor') {
                return true;
            }
        }

        // Pemilik konten bisa edit jika masih draft atau revisi
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
            return $user->hasRole('kabid');
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
