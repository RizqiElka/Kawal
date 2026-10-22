<?php

namespace App\Services\Publishers;

use App\Contracts\ChannelPublisher;
use App\Models\Konten;
use App\Models\Publikasi;

class TikTokPublisher implements ChannelPublisher
{
    /**
     * Adapter kerangka untuk TikTok Content Posting API.
     */
    public function publish(Konten $konten, Publikasi $publikasi): array
    {
        $simulatedPublishId = 'TT_' . bin2hex(random_bytes(6));
        $postUrl = "https://www.tiktok.com/@instansi_tiktok/video/{$simulatedPublishId}";

        return [
            'success' => true,
            'url_post' => $postUrl,
            'external_id' => $simulatedPublishId,
            'error_message' => null,
        ];
    }
}
