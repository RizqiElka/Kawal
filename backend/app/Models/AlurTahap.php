<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AlurTahap extends Model
{
    use HasFactory;

    protected $table = 'alur_tahap';

    protected $fillable = [
        'urutan',
        'kode_tahap',
        'nama',
        'role_penyetuju',
        'aktif',
    ];

    protected function casts(): array
    {
        return [
            'urutan' => 'integer',
            'aktif' => 'boolean',
        ];
    }
}
