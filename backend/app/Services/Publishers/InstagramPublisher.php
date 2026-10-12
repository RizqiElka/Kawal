<?php

namespace App\Services\Publishers;

use App\Contracts\ChannelPublisher;
use App\Models\Konten;
use App\Models\Publikasi;

class InstagramPublisher implements ChannelPublisher
{
    /**
     * Adapter kerangka untuk Instagram Graph API.
     */
    public function publish(Konten $konten, Publikasi $publikasi): array
    {
        $credentials = $publikasi->kanal->kredensial ?? [];
        $token = $credentials['token'] ?? null;

        // Stub/Simulasi panggilan Instagram Graph API (Container & Media Publish)
        $simulatedPostId = 'IG_' . bin2hex(random_bytes(6));
        $postUrl = "https://instagram.com/p/{$simulatedPostId}";

        return [
            'success' => true,
            'url_post' => $postUrl,
            'external_id' => $simulatedPostId,
            'error_message' => null,
        ];
    }
}
