<?php

namespace App\Services\Publishers;

use App\Contracts\ChannelPublisher;
use App\Models\Konten;
use App\Models\Publikasi;

class XPublisher implements ChannelPublisher
{
    /**
     * Adapter kerangka untuk X / Twitter API v2.
     */
    public function publish(Konten $konten, Publikasi $publikasi): array
    {
        $simulatedTweetId = '18' . random_int(100000000, 999999999);
        $postUrl = "https://x.com/instansi_official/status/{$simulatedTweetId}";

        return [
            'success' => true,
            'url_post' => $postUrl,
            'external_id' => $simulatedTweetId,
            'error_message' => null,
        ];
    }
}
