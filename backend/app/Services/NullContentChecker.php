<?php

namespace App\Services;

use App\Contracts\ContentChecker;
use App\Models\Konten;

class NullContentChecker implements ContentChecker
{
    /**
     * Implementasi stub / null yang mengembalikan array kosong saat fitur AI dinonaktifkan.
     */
    public function check(Konten $konten): array
    {
        return [];
    }
}
