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
        return response()->json([
            'data' => KanalPublikasi::orderBy('id')->get(),
        ]);
    }

    /**
     * Memproses penerbitan konten ke kanal-kanal yang dipilih.
     */
    public function publish(Request $request, Konten $konten): JsonResponse
    {
        Gate::authorize('publish', $konten);

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
                // Jadwalkan job sesuai waktu yang ditentukan
                PublishContentToChannelJob::dispatch($publikasi)->delay($jadwalAt);
            } else {
                // Jalankan publikasi segera
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
