<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Persetujuan extends Model
{
    use HasFactory;

    protected $table = 'persetujuan';

    protected $fillable = [
        'konten_id',
        'tahap',
        'reviewer_id',
        'aksi',
        'catatan',
        'revisi_ke',
        'acted_at',
    ];

    protected function casts(): array
    {
        return [
            'revisi_ke' => 'integer',
            'acted_at' => 'datetime',
        ];
    }

    public function konten(): BelongsTo
    {
        return $this->belongsTo(Konten::class, 'konten_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }
}
