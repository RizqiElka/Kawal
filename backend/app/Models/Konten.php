<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Konten extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'konten';

    protected $fillable = [
        'user_id',
        'bidang_id',
        'jenis_konten_id',
        'judul',
        'slug',
        'isi',
        'status',
        'tahap_saat_ini',
        'revisi_ke',
        'submitted_at',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'revisi_ke' => 'integer',
            'submitted_at' => 'datetime',
            'published_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function bidang(): BelongsTo
    {
        return $this->belongsTo(Bidang::class, 'bidang_id');
    }

    public function jenisKonten(): BelongsTo
    {
        return $this->belongsTo(JenisKonten::class, 'jenis_konten_id');
    }

    public function foto(): HasMany
    {
        return $this->hasMany(KontenFoto::class, 'konten_id')->orderBy('urutan');
    }

    public function persetujuan(): HasMany
    {
        return $this->hasMany(Persetujuan::class, 'konten_id')->orderByDesc('id');
    }

    public function aiCheckResults(): HasMany
    {
        return $this->hasMany(AiCheckResult::class, 'konten_id')->orderByDesc('id');
    }

    public function publikasi(): HasMany
    {
        return $this->hasMany(Publikasi::class, 'konten_id');
    }
}
