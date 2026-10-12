<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JenisKonten extends Model
{
    use HasFactory;

    protected $table = 'jenis_konten';

    protected $fillable = [
        'nama',
        'wajib_cek_5w1h',
    ];

    protected function casts(): array
    {
        return [
            'wajib_cek_5w1h' => 'boolean',
        ];
    }

    public function konten(): HasMany
    {
        return $this->hasMany(Konten::class, 'jenis_konten_id');
    }
}
