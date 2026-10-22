<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$user = \App\Models\User::where('email', 'kepalacoba@gmail.com')->first();
echo "User: " . $user->email . " | Roles: " . $user->getRoleNames()->join(', ') . "\n";
$req = \Illuminate\Http\Request::create('/api/konten', 'GET');
$req->setUserResolver(fn() => $user);
$res = app(\App\Http\Controllers\KontenController::class)->index($req);
$data = json_decode($res->getContent(), true);
echo "Total Konten: " . count($data['data']) . "\n";
foreach ($data['data'] as $d) {
    echo "ID: " . $d['id'] . " | " . $d['judul'] . " | Status: " . $d['status'] . " | Tahap: " . ($d['tahap_saat_ini'] ?? '-') . "\n";
}
