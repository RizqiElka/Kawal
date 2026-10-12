<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KontenFoto extends Model
{
    use HasFactory;

    protected $table = 'konten_foto';

    protected $fillable = [
        'konten_id',
        'path',
        'urutan',
        'caption',
    ];

    protected function casts(): array
    {
        return [
            'urutan' => 'integer',
        ];
    }

    public function konten(): BelongsTo
    {
        return $this->belongsTo(Konten::class, 'konten_id');
    }
}
