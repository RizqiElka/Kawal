<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Publikasi extends Model
{
    use HasFactory;

    protected $table = 'publikasi';

    protected $fillable = [
        'konten_id',
        'kanal_id',
        'status',
        'jadwal_at',
        'published_at',
        'url_post',
        'external_id',
        'percobaan',
        'pesan_error',
    ];

    protected function casts(): array
    {
        return [
            'jadwal_at' => 'datetime',
            'published_at' => 'datetime',
            'percobaan' => 'integer',
        ];
    }

    public function konten(): BelongsTo
    {
        return $this->belongsTo(Konten::class, 'konten_id');
    }

    public function kanal(): BelongsTo
    {
        return $this->belongsTo(KanalPublikasi::class, 'kanal_id');
    }
}
