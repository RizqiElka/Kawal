<?php

namespace App\Services\Publishers;

use App\Contracts\ChannelPublisher;
use App\Models\Konten;
use App\Models\Publikasi;

class FacebookPublisher implements ChannelPublisher
{
    /**
     * Adapter kerangka untuk Facebook Pages Graph API.
     */
    public function publish(Konten $konten, Publikasi $publikasi): array
    {
        $simulatedPostId = 'FB_' . bin2hex(random_bytes(6));
        $postUrl = "https://facebook.com/instansi/posts/{$simulatedPostId}";

        return [
            'success' => true,
            'url_post' => $postUrl,
            'external_id' => $simulatedPostId,
            'error_message' => null,
        ];
    }
}
