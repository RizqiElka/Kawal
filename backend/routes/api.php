<?php

use App\Http\Controllers\AlurTahapController;
use App\Http\Controllers\Api\AuthController;

use App\Http\Controllers\BidangController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\JenisKontenController;
use App\Http\Controllers\KontenController;
use App\Http\Controllers\MockPegawaiController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PublicPortalController;
use App\Http\Controllers\PublisherController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// Rute Publik (Autentikasi, Portal Berita Eksternal, dan Mock API)
Route::post('/auth/login', [AuthController::class, 'login']);
Route::get('/public/berita', [PublicPortalController::class, 'index']);
Route::get('/public/berita/{slug}', [PublicPortalController::class, 'show']);
Route::get('/mock/pegawai', [MockPegawaiController::class, 'index']);

// Rute Terproteksi Sanctum
Route::middleware('auth:sanctum')->group(function () {
    // Auth & Profil
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Notifikasi Pengguna
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);

    // Dashboard Stats
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

    // Data Master Referensi
    Route::get('/bidang', [BidangController::class, 'index']);
    Route::get('/jenis-konten', [JenisKontenController::class, 'index']);
    Route::post('/jenis-konten', [JenisKontenController::class, 'store']);
    Route::put('/jenis-konten/{jenisKonten}', [JenisKontenController::class, 'update']);
    Route::delete('/jenis-konten/{jenisKonten}', [JenisKontenController::class, 'destroy']);
    Route::get('/alur-tahap', [AlurTahapController::class, 'index']);
    Route::get('/kanal', [PublisherController::class, 'kanals']);

    // Manajemen Konten & Workflow
    Route::get('/konten', [KontenController::class, 'index']);
    Route::post('/konten', [KontenController::class, 'store']);
    Route::get('/konten/{konten}', [KontenController::class, 'show']);
    Route::post('/konten/{konten}', [KontenController::class, 'update']);
    Route::put('/konten/{konten}', [KontenController::class, 'update']);
    Route::delete('/konten/{konten}', [KontenController::class, 'destroy']);

    // Aksi Workflow Persetujuan
    Route::post('/konten/{konten}/submit', [KontenController::class, 'submit']);
    Route::post('/konten/{konten}/approve', [KontenController::class, 'approve']);
    Route::post('/konten/{konten}/revisi', [KontenController::class, 'revisi']);
    Route::post('/konten/{konten}/tolak', [KontenController::class, 'tolak']);

    // Penerbitan & Multi-Channel Publisher
    Route::post('/konten/{konten}/publish', [PublisherController::class, 'publish']);
    Route::delete('/publikasi/{publikasi}', [PublisherController::class, 'destroy']);
    Route::post('/publikasi/{publikasi}/retry', [PublisherController::class, 'retry']);

    // Manajemen Hak Akses & Role (Permission: role.kelola)
    Route::middleware('can:role.kelola')->group(function () {
        Route::get('/roles', [RoleController::class, 'index']);
        Route::post('/roles', [RoleController::class, 'store']);
        Route::put('/roles/{role}', [RoleController::class, 'update']);
        Route::delete('/roles/{role}', [RoleController::class, 'destroy']);
        Route::get('/permissions', [RoleController::class, 'permissions']);
        Route::post('/roles/{role}/permissions', [RoleController::class, 'syncPermissions']);
        Route::delete('/roles/{role}/permissions', [RoleController::class, 'revokePermissions']);
        Route::put('/alur-tahap/{alurTahap}', [AlurTahapController::class, 'update']);
        Route::put('/kanal/{kanal}', [PublisherController::class, 'updateKanal']);
    });

    // Manajemen Pengguna (Permission: pengguna.kelola)
    Route::middleware('can:pengguna.kelola')->group(function () {
        Route::get('/pengguna', [UserController::class, 'index']);
        Route::post('/pengguna', [UserController::class, 'store']);
        Route::get('/pengguna/{user}', [UserController::class, 'show']);
        Route::put('/pengguna/{user}', [UserController::class, 'update']);
        Route::delete('/pengguna/{user}', [UserController::class, 'destroy']);
        // Alias /users
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::get('/users/{user}', [UserController::class, 'show']);
        Route::put('/users/{user}', [UserController::class, 'update']);
        Route::patch('/users/{user}/toggle-active', [UserController::class, 'toggleActive']);
        Route::delete('/users/{user}', [UserController::class, 'destroy']);
    });

    // Notifikasi (alias baru yang dipakai frontend)
    Route::get('/notifikasi', [NotificationController::class, 'index']);
    Route::post('/notifikasi/{id}/baca', [NotificationController::class, 'markAsRead']);
    Route::post('/notifikasi/baca-semua', [NotificationController::class, 'markAllAsRead']);

    // Pengaturan Sistem (requires permission)
    Route::middleware('can:pengaturan.kelola')->group(function () {
        Route::get('/pengaturan', [SettingController::class, 'index']);
        Route::post('/pengaturan', [SettingController::class, 'store']);
    });

});
