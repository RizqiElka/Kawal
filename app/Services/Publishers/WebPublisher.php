<?php

namespace App\Services\Publishers;

use App\Contracts\ChannelPublisher;
use App\Models\Konten;
use App\Models\Publikasi;

class WebPublisher implements ChannelPublisher
{
    /**
     * Mempublikasikan konten ke Portal Web Resmi instansi.
     */
    public function publish(Konten $konten, Publikasi $publikasi): array
    {
        // Publikasi web nyata: Menghasilkan URL publik dan ID publikasi
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
        $publicUrl = "{$frontendUrl}/portal/berita/{$konten->slug}";
        $externalId = "WEB-SIGAP-{$konten->id}-" . time();

        return [
            'success' => true,
            'url_post' => $publicUrl,
            'external_id' => $externalId,
            'error_message' => null,
        ];
    }
}
