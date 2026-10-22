<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== DAFTAR SEMUA KONTEN TERBARU ===\n";
$kontens = \App\Models\Konten::with(['user', 'bidang'])->latest()->get();
foreach ($kontens as $k) {
    $penulis = $k->user ? $k->user->email : 'null';
    $bidangPenulis = ($k->user && $k->user->bidang_id) ? $k->user->bidang_id : 'null';
    $bidangKonten = $k->bidang ? $k->bidang->nama . " (ID: {$k->bidang_id})" : 'null';
    echo "ID: {$k->id} | Judul: {$k->judul}\n";
    echo "  -> Status: '{$k->status}' | Tahap Saat Ini: '{$k->tahap_saat_ini}'\n";
    echo "  -> Penulis: {$penulis} (User ID: {$k->user_id}, User Bidang ID: {$bidangPenulis})\n";
    echo "  -> Bidang Konten: {$bidangKonten}\n";
    echo "  -> Dibuat: {$k->created_at}\n\n";
}
