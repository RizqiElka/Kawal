<?php

return [
    /*
    |--------------------------------------------------------------------------
    | URL SIPEG (Sistem Informasi Pegawai) — sebagai SSO Provider
    |--------------------------------------------------------------------------
    | Ini adalah URL backend SIPEG (Laravel).
    | SIGAP akan redirect user ke sini untuk login, dan
    | akan memanggil API-nya untuk tukar code → token.
    */
    'sipeg_url' => env('SIPEG_URL', 'http://localhost/Sipeg_Bapperida-main/Sipeg_Bapperida-1/public'),

    /*
    |--------------------------------------------------------------------------
    | URL Callback SIGAP Backend
    |--------------------------------------------------------------------------
    | URL ini harus didaftarkan di SSO_ALLOWED_REDIRECTS di .env SIPEG.
    | SIPEG akan redirect ke URL ini setelah user berhasil login.
    */
    'sipeg_callback_url' => env('SIPEG_CALLBACK_URL', 'http://localhost:8002/sso/callback'),

    /*
    |--------------------------------------------------------------------------
    | URL Frontend SIGAP (React/Vue)
    |--------------------------------------------------------------------------
    | Setelah callback berhasil, backend SIGAP akan redirect ke sini
    | dengan membawa token SIGAP.
    */
    'frontend_url' => env('FRONTEND_URL', 'http://localhost:5173'),
];
