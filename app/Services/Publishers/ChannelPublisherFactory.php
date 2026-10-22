<?php

namespace App\Services\Publishers;

use App\Contracts\ChannelPublisher;
use InvalidArgumentException;

class ChannelPublisherFactory
{
    public static function make(string $channelCode): ChannelPublisher
    {
        return match (strtolower($channelCode)) {
            'web' => app(WebPublisher::class),
            'instagram' => app(InstagramPublisher::class),
            'facebook' => app(FacebookPublisher::class),
            'x', 'twitter' => app(XPublisher::class),
            'tiktok' => app(TikTokPublisher::class),
            default => throw new InvalidArgumentException("Kanal publikasi '{$channelCode}' tidak didukung."),
        };
    }
}
