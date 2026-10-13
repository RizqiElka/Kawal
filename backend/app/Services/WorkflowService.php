<?php

namespace App\Services;

use App\Models\AlurTahap;
use App\Models\Konten;
use App\Models\Persetujuan;
use App\Models\User;
use App\Notifications\WorkflowNotification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class WorkflowService
{
    /**
     * Mengirim konten ke alur persetujuan: draft / revisi -> diproses (tahap: alur pertama, default kabid).
     */
    public function submit(Konten $konten, User $actor): Konten
    {
        return DB::transaction(function () use ($konten, $actor) {
            if (! in_array($konten->status, ['draft', 'revisi'])) {
                throw ValidationException::withMessages([
                    'status' => ['Hanya konten dengan status draft atau revisi yang dapat diajukan ke persetujuan.'],
                ]);
            }

            // Dapatkan tahap aktif pertama dari tabel konfigurasi alur_tahap
            $firstTahap = AlurTahap::where('aktif', true)
                ->orderBy('urutan')
                ->first();

            if (! $firstTahap) {
                throw ValidationException::withMessages([
                    'alur' => ['Tahapan alur persetujuan belum dikonfigurasi dalam sistem.'],
                ]);
            }

            // Jika sebelumnya berstatus revisi, revisi_ke bertambah 1
            if ($konten->status === 'revisi') {
                $konten->revisi_ke += 1;
            }

            $konten->status = 'diproses';
            $konten->tahap_saat_ini = $firstTahap->kode_tahap;
            $konten->submitted_at = now();
            $konten->save();

            // Kirim notifikasi database ke reviewer tahap pertama
            $reviewers = $this->getReviewersForStage($firstTahap->kode_tahap, $konten->bidang_id);
            foreach ($reviewers as $reviewer) {
                $reviewer->notify(new WorkflowNotification(
                    $konten,
                    'tahap_baru',
                    "Konten '{$konten->judul}' membutuhkan persetujuan Anda ({$firstTahap->nama}).",
                    $actor->nama
                ));
            }

            return $konten->fresh(['persetujuan', 'user', 'bidang']);
        });
    }

    /**
     * Menyetujui konten: catat persetujuan, maju ke tahap berikutnya.
     * Jika tahap terakhir, status berubah menjadi 'disetujui' dan tahap menjadi 'publisher'.
     */
    public function approve(Konten $konten, User $actor, ?string $catatan = null): Konten
    {
        return DB::transaction(function () use ($konten, $actor, $catatan) {
            if ($konten->status !== 'diproses') {
                throw ValidationException::withMessages([
                    'status' => ['Hanya konten yang sedang diproses yang dapat disetujui.'],
                ]);
            }

            $currentKode = $konten->tahap_saat_ini;
            $currentTahap = AlurTahap::where('kode_tahap', $currentKode)->first();

            if (! $currentTahap) {
                throw ValidationException::withMessages([
                    'tahap' => ["Tahap persetujuan '{$currentKode}' tidak valid."],
                ]);
            }

            // Catat di riwayat persetujuan
            Persetujuan::create([
                'konten_id' => $konten->id,
                'tahap' => $currentKode,
                'reviewer_id' => $actor->id,
                'aksi' => 'setujui',
                'catatan' => $catatan,
                'revisi_ke' => $konten->revisi_ke,
                'acted_at' => now(),
            ]);

            // Cari tahap aktif berikutnya
            $nextTahap = AlurTahap::where('aktif', true)
                ->where('urutan', '>', $currentTahap->urutan)
                ->orderBy('urutan')
                ->first();

            if ($nextTahap) {
                // Maju ke tahap berikutnya
                $konten->tahap_saat_ini = $nextTahap->kode_tahap;
                $konten->save();

                // Notifikasi ke reviewer tahap berikutnya
                $nextReviewers = $this->getReviewersForStage($nextTahap->kode_tahap, $konten->bidang_id);
                foreach ($nextReviewers as $reviewer) {
                    $reviewer->notify(new WorkflowNotification(
                        $konten,
                        'tahap_baru',
                        "Konten '{$konten->judul}' telah disetujui {$currentTahap->nama} dan kini menunggu persetujuan Anda ({$nextTahap->nama}).",
                        $actor->nama,
                        $catatan
                    ));
                }
            } else {
                // Semua tahap selesai (misal Kepala Dinas sudah setuju) -> disetujui
                $konten->status = 'disetujui';
                $konten->tahap_saat_ini = 'publisher';
                $konten->save();

                // Notifikasi ke pembuat konten bahwa konten disetujui penuh
                $konten->user->notify(new WorkflowNotification(
                    $konten,
                    'disetujui',
                    "Selamat! Konten '{$konten->judul}' telah disetujui oleh seluruh pejabat berwenang dan siap dipublikasikan.",
                    $actor->nama,
                    $catatan
                ));

                // Notifikasi ke tim Publisher
                $publishers = User::role('publisher')->where('is_active', true)->get();
                foreach ($publishers as $pub) {
                    $pub->notify(new WorkflowNotification(
                        $konten,
                        'disetujui',
                        "Konten baru '{$konten->judul}' telah disetujui penuh dan siap diterbitkan ke kanal publikasi.",
                        $actor->nama
                    ));
                }
            }

            return $konten->fresh(['persetujuan', 'user', 'bidang']);
        });
    }

    /**
     * Mengembalikan konten untuk direvisi: catatan wajib, status menjadi 'revisi' atau dikembalikan ke tahap sebelumnya.
     * Jika targetTahap diset (misal 'penulis', 'kabid', dsb), disimpan di target_tahap dan notifikasi dikirimkan ke pihak terkait.
     */
    public function revisi(Konten $konten, User $actor, string $catatan, ?string $targetTahap = null): Konten
    {
        return DB::transaction(function () use ($konten, $actor, $catatan, $targetTahap) {
            if ($konten->status !== 'diproses') {
                throw ValidationException::withMessages([
                    'status' => ['Hanya konten yang sedang diproses yang dapat direvisi.'],
                ]);
            }

            if (empty(trim($catatan))) {
                throw ValidationException::withMessages([
                    'catatan' => ['Catatan revisi wajib diisi agar pembuat dapat mengetahui perbaikan yang diperlukan.'],
                ]);
            }

            $currentKode = $konten->tahap_saat_ini;

            // Catat persetujuan (aksi: revisi)
            Persetujuan::create([
                'konten_id' => $konten->id,
                'tahap' => $currentKode,
                'reviewer_id' => $actor->id,
                'aksi' => 'revisi',
                'target_tahap' => $targetTahap ?: 'penulis',
                'catatan' => $catatan,
                'revisi_ke' => $konten->revisi_ke,
                'acted_at' => now(),
            ]);

            // Jika target adalah tahap sebelumnya (misal kabid) selain penulis:
            if ($targetTahap && $targetTahap !== 'penulis') {
                $konten->status = 'diproses';
                $konten->tahap_saat_ini = $targetTahap;
                $konten->revisi_ke += 1;
                $konten->save();

                // Notifikasi ke reviewer tahap target (misal Kabid)
                $targetReviewers = $this->getReviewersForStage($targetTahap, $konten->bidang_id);
                foreach ($targetReviewers as $reviewer) {
                    $reviewer->notify(new WorkflowNotification(
                        $konten,
                        'revisi',
                        "Konten '{$konten->judul}' dikembalikan untuk perbaikan/peninjauan ulang oleh {$actor->nama} ke tahap {$targetTahap}.",
                        $actor->nama,
                        $catatan
                    ));
                }
            } else {
                $konten->status = 'revisi';
                $konten->tahap_saat_ini = null;
                $konten->save();

                // Notifikasi ke pembuat konten
                $konten->user->notify(new WorkflowNotification(
                    $konten,
                    'revisi',
                    "Konten '{$konten->judul}' memerlukan perbaikan dari Anda pada tahap {$currentKode}.",
                    $actor->nama,
                    $catatan
                ));
            }

            return $konten->fresh(['persetujuan', 'user', 'bidang']);
        });
    }

    /**
     * Menolak konten: catatan wajib, status menjadi 'ditolak', alur berhenti permanen.
     */
    public function tolak(Konten $konten, User $actor, string $catatan): Konten
    {
        return DB::transaction(function () use ($konten, $actor, $catatan) {
            if ($konten->status !== 'diproses') {
                throw ValidationException::withMessages([
                    'status' => ['Hanya konten yang sedang diproses yang dapat ditolak.'],
                ]);
            }

            if (empty(trim($catatan))) {
                throw ValidationException::withMessages([
                    'catatan' => ['Alasan penolakan konten wajib diisi.'],
                ]);
            }

            $currentKode = $konten->tahap_saat_ini;

            // Catat persetujuan (aksi: tolak)
            Persetujuan::create([
                'konten_id' => $konten->id,
                'tahap' => $currentKode,
                'reviewer_id' => $actor->id,
                'aksi' => 'tolak',
                'catatan' => $catatan,
                'revisi_ke' => $konten->revisi_ke,
                'acted_at' => now(),
            ]);

            $konten->status = 'ditolak';
            $konten->tahap_saat_ini = null;
            $konten->save();

            // Notifikasi ke pembuat konten
            $konten->user->notify(new WorkflowNotification(
                $konten,
                'tolak',
                "Konten '{$konten->judul}' telah ditolak pada tahap {$currentKode}.",
                $actor->nama,
                $catatan
            ));

            return $konten->fresh(['persetujuan', 'user', 'bidang']);
        });
    }

    /**
     * Mencari pengguna reviewer yang berwenang untuk suatu tahap.
     */
    public function getReviewersForStage(string $kodeTahap, ?int $bidangId = null): Collection
    {
        $tahap = AlurTahap::where('kode_tahap', $kodeTahap)->first();
        if (! $tahap) {
            return collect();
        }

        $query = User::role($tahap->role_penyetuju)->where('is_active', true);

        // Khusus Kabid: dibatasi sesuai bidang yang bersangkutan
        if ($kodeTahap === 'kabid' && $bidangId) {
            $query->where('bidang_id', $bidangId);
        }

        return $query->get();
    }
}
