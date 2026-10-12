<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KanalPublikasi extends Model
{
    use HasFactory;

    protected $table = 'kanal_publikasi';

    protected $fillable = [
        'kode',
        'nama',
        'aktif',
        'kredensial',
    ];

    protected function casts(): array
    {
        return [
            'aktif' => 'boolean',
            'kredensial' => 'encrypted:array',
        ];
    }

    public function publikasi(): HasMany
    {
        return $this->hasMany(Publikasi::class, 'kanal_id');
    }
}
