<?php

namespace App\Http\Controllers;

use App\Http\Resources\KontenResource;
use App\Jobs\PublishContentToChannelJob;
use App\Models\KanalPublikasi;
use App\Models\Konten;
use App\Models\Publikasi;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class PublisherController extends Controller
{
    /**
     * Dapatkan daftar kanal publikasi yang aktif.
     */
    public function kanals(): JsonResponse
    {
        // Jalankan pengecekan publikasi terjadwal yang sudah jatuh tempo
        \App\Services\Publishers\ScheduledPublicationProcessor::processDue();

        return response()->json([
            'data' => KanalPublikasi::orderBy('id')->get(),
        ]);
    }

    /**
     * Memproses penerbitan konten ke kanal-kanal yang dipilih (otomatis/terjadwal/manual).
     */
    public function publish(Request $request, Konten $konten): JsonResponse
    {
        Gate::authorize('publish', $konten);

        // Dukung format publications baru
        if ($request->has('publications')) {
            $validated = $request->validate([
                'publications' => ['required', 'array', 'min:1'],
                'publications.*.kanal_id' => ['required', 'integer', 'exists:kanal_publikasi,id'],
                'publications.*.mode' => ['nullable', 'string', 'in:otomatis,manual'],
                'publications.*.is_scheduled' => ['nullable', 'boolean'],
                'publications.*.jadwal_at' => ['nullable', 'date'],
                'publications.*.url_post' => ['nullable', 'string', 'max:500'],
                'publications.*.published_at' => ['nullable', 'date'],
                'publications.*.status' => ['nullable', 'string', 'in:menunggu,terjadwal,berhasil,gagal'],
            ], [
                'publications.required' => 'Pilih minimal satu kanal publikasi.',
                'publications.*.kanal_id.required' => 'Kanal publikasi wajib dipilih.',
            ]);

            $scheduledCount = 0;
            $publishedCount = 0;

            foreach ($validated['publications'] as $item) {
                $mode = $item['mode'] ?? 'otomatis';
                $isScheduled = !empty($item['is_scheduled']) && !empty($item['jadwal_at']) && Carbon::parse($item['jadwal_at'])->isFuture();

                if ($mode === 'manual') {
                    // Mode manual: Catat URL link yang sudah diunggah oleh publisher
                    Publikasi::updateOrCreate(
                        [
                            'konten_id' => $konten->id,
                            'kanal_id' => $item['kanal_id'],
                        ],
                        [
                            'url_post' => $item['url_post'] ?? null,
                            'published_at' => !empty($item['published_at']) ? Carbon::parse($item['published_at']) : Carbon::now(),
                            'status' => 'berhasil',
                            'jadwal_at' => null,
                            'pesan_error' => null,
                        ]
                    );
                    $publishedCount++;
                } elseif ($isScheduled) {
                    // Mode otomatis: Terjadwal di waktu mendatang
                    $jadwalAt = Carbon::parse($item['jadwal_at']);
                    $publikasi = Publikasi::updateOrCreate(
                        [
                            'konten_id' => $konten->id,
                            'kanal_id' => $item['kanal_id'],
                        ],
                        [
                            'status' => 'terjadwal',
                            'jadwal_at' => $jadwalAt,
                            'url_post' => null,
                            'pesan_error' => null,
                        ]
                    );

                    // Kirim ke antrean background dengan delay
                    PublishContentToChannelJob::dispatch($publikasi)->delay($jadwalAt);
                    $scheduledCount++;
                } else {
                    // Mode otomatis: Terbitkan SEKARANG juga secara otomatis
                    $publikasi = Publikasi::updateOrCreate(
                        [
                            'konten_id' => $konten->id,
                            'kanal_id' => $item['kanal_id'],
                        ],
                        [
                            'status' => 'menunggu',
                            'jadwal_at' => null,
                            'pesan_error' => null,
                        ]
                    );

                    // Langsung eksekusi adapter kanal
                    PublishContentToChannelJob::dispatchSync($publikasi);
                    $publishedCount++;
                }
            }

            // Jika ada minimal 1 kanal yang berhasil dipublikasi, ubah status konten jadi 'terbit'
            $hasSuccess = $konten->publikasi()->where('status', 'berhasil')->exists();
            if ($hasSuccess) {
                $konten->update([
                    'status' => 'terbit',
                    'published_at' => $konten->published_at ?? Carbon::now(),
                ]);
            }

            $message = 'Data publikasi berhasil diproses.';
            if ($scheduledCount > 0 && $publishedCount === 0) {
                $message = "Publikasi otomatis untuk {$scheduledCount} kanal berhasil dijadwalkan!";
            } elseif ($publishedCount > 0 && $scheduledCount === 0) {
                $message = "Konten berhasil dipublikasikan ke {$publishedCount} kanal secara otomatis!";
            } elseif ($scheduledCount > 0 && $publishedCount > 0) {
                $message = "Publikasi diproses: {$publishedCount} terbit sekarang, {$scheduledCount} dijadwalkan.";
            }

            return response()->json([
                'message' => $message,
                'data' => new KontenResource($konten->fresh(['user', 'bidang', 'jenisKonten', 'foto', 'persetujuan.reviewer', 'publikasi.kanal'])),
            ]);
        }

        $validated = $request->validate([
            'channels' => ['required', 'array', 'min:1'],
            'channels.*.kanal_id' => ['required', 'integer', 'exists:kanal_publikasi,id'],
            'channels.*.jadwal_at' => ['nullable', 'date'],
        ], [
            'channels.required' => 'Pilih minimal satu kanal publikasi tujuan.',
            'channels.*.kanal_id.required' => 'ID kanal publikasi wajib disertakan.',
        ]);

        $publishedItems = [];

        foreach ($validated['channels'] as $item) {
            $kanal = KanalPublikasi::findOrFail($item['kanal_id']);
            $jadwalAt = ! empty($item['jadwal_at']) ? Carbon::parse($item['jadwal_at']) : null;
            $isScheduled = $jadwalAt && $jadwalAt->isFuture();

            $publikasi = Publikasi::updateOrCreate(
                [
                    'konten_id' => $konten->id,
                    'kanal_id' => $kanal->id,
                ],
                [
                    'status' => $isScheduled ? 'terjadwal' : 'menunggu',
                    'jadwal_at' => $jadwalAt,
                    'pesan_error' => null,
                ]
            );

            if ($isScheduled) {
                PublishContentToChannelJob::dispatch($publikasi)->delay($jadwalAt);
            } else {
                PublishContentToChannelJob::dispatch($publikasi);
            }

            $publishedItems[] = $publikasi;
        }

        return response()->json([
            'message' => 'Tugas publikasi konten berhasil dijadwalkan / dikirim ke antrean.',
            'data' => new KontenResource($konten->fresh(['user', 'bidang', 'jenisKonten', 'foto', 'persetujuan.reviewer', 'publikasi.kanal'])),
        ]);
    }

    /**
     * Hapus satu data publikasi kanal pada konten.
     */
    public function destroy(Request $request, Publikasi $publikasi): JsonResponse
    {
        $user = $request->user();
        if (! $user->can('publikasi.terbitkan') && ! $user->hasRole('admin')) {
            abort(403, 'Anda tidak memiliki hak akses untuk menghapus data publikasi.');
        }

        $konten = $publikasi->konten;
        $publikasi->delete();

        // Jika tidak ada publikasi lagi dan statusnya terbit, kembalikan ke disetujui
        if ($konten && $konten->publikasi()->count() === 0 && $konten->status === 'terbit') {
            $konten->update(['status' => 'disetujui']);
        }

        return response()->json([
            'message' => 'Data publikasi kanal berhasil dihapus.',
        ]);
    }

    /**
     * Coba lagi publikasi kanal yang sebelumnya berstatus gagal.
     */
    public function retry(Request $request, Publikasi $publikasi): JsonResponse
    {
        $user = $request->user();
        if (! $user->can('publikasi.terbitkan') && ! $user->hasRole('admin')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mempublikasikan konten.');
        }

        $publikasi->update([
            'status' => 'menunggu',
            'pesan_error' => null,
        ]);

        PublishContentToChannelJob::dispatch($publikasi);

        return response()->json([
            'message' => 'Proses publikasi ulang telah dimasukkan ke dalam antrean.',
            'data' => $publikasi->fresh('kanal'),
        ]);
    }

    /**
     * Perbarui konfigurasi kanal publikasi (admin / pengaturan.kelola).
     */
    public function updateKanal(Request $request, KanalPublikasi $kanal): JsonResponse
    {
        $validated = $request->validate([
            'nama' => ['required', 'string', 'max:100'],
            'aktif' => ['boolean'],
            'kredensial' => ['nullable', 'array'],
        ]);

        $kanal->update($validated);

        return response()->json([
            'message' => "Pengaturan kanal '{$kanal->nama}' berhasil diperbarui.",
            'data' => $kanal,
        ]);
    }
}
