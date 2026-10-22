<?php

namespace App\Jobs;

use App\Models\Publikasi;
use App\Notifications\WorkflowNotification;
use App\Services\Publishers\ChannelPublisherFactory;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

class PublishContentToChannelJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Jumlah percobaan maksimal jika terjadi kegagalan koneksi.
     */
    public int $tries = 3;

    /**
     * Waktu tunggu (detik) antar percobaan ulang (backoff berjenjang).
     */
    public array $backoff = [5, 15, 30];

    public function __construct(
        public Publikasi $publikasi
    ) {}

    /**
     * Eksekusi penerbitan konten ke kanal target.
     */
    public function handle(): void
    {
        $this->publikasi->loadMissing(['konten.user', 'kanal']);
        $konten = $this->publikasi->konten;
        $kanal = $this->publikasi->kanal;

        $this->publikasi->increment('percobaan');

        try {
            $adapter = ChannelPublisherFactory::make($kanal->kode);
            $result = $adapter->publish($konten, $this->publikasi);

            if ($result['success']) {
                $this->publikasi->update([
                    'status' => 'berhasil',
                    'published_at' => now(),
                    'url_post' => $result['url_post'],
                    'external_id' => $result['external_id'],
                    'pesan_error' => null,
                ]);

                // Jika ada kanal berhasil diterbitkan, ubah status konten resmi menjadi 'terbit'
                if ($konten->status !== 'terbit') {
                    $konten->update([
                        'status' => 'terbit',
                        'published_at' => now(),
                    ]);

                    // Notifikasi ke pembuat konten
                    if ($konten->user) {
                        $konten->user->notify(new WorkflowNotification(
                            $konten,
                            'terbit',
                            "Konten Anda '{$konten->judul}' telah resmi diterbitkan ke {$kanal->nama}.",
                            null,
                            $result['url_post']
                        ));
                    }
                }
            } else {
                $this->publikasi->update([
                    'status' => 'gagal',
                    'pesan_error' => $result['error_message'] ?? 'Gagal mempublikasikan konten ke kanal.',
                ]);
            }
        } catch (Throwable $e) {
            $this->publikasi->update([
                'status' => 'gagal',
                'pesan_error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Tindakan saat job telah melampaui batas maksimal percobaan.
     */
    public function failed(?Throwable $exception): void
    {
        $this->publikasi->update([
            'status' => 'gagal',
            'pesan_error' => $exception ? $exception->getMessage() : 'Gagal setelah beberapa kali percobaan.',
        ]);
    }
}
