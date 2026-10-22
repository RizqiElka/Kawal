<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiCheckResult extends Model
{
    use HasFactory;

    protected $table = 'ai_check_results';

    protected $fillable = [
        'konten_id',
        'revisi_ke',
        'skor',
        'hasil',
        'saran',
        'model',
        'status',
        'isi_hash',
    ];

    protected function casts(): array
    {
        return [
            'revisi_ke' => 'integer',
            'skor' => 'integer',
            'hasil' => 'array',
        ];
    }

    public function konten(): BelongsTo
    {
        return $this->belongsTo(Konten::class, 'konten_id');
    }
}
