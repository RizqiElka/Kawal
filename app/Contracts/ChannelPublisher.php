<?php

namespace App\Contracts;

use App\Models\Konten;
use App\Models\Publikasi;

interface ChannelPublisher
{
    /**
     * Mempublikasikan konten ke kanal tertentu.
     * Mengembalikan array dengan keys:
     * - 'success': bool
     * - 'url_post': ?string
     * - 'external_id': ?string
     * - 'error_message': ?string
     *
     * @return array{success: bool, url_post: ?string, external_id: ?string, error_message: ?string}
     */
    public function publish(Konten $konten, Publikasi $publikasi): array;
}
