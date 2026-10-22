<?php

namespace App\Contracts;

use App\Models\Konten;

interface ContentChecker
{
    /**
     * Memeriksa konten untuk kelayakan publikasi (misal kelengkapan 5W1H).
     *
     * @return array<string, mixed>
     */
    public function check(Konten $konten): array;
}
