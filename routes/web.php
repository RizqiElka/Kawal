<?php

use App\Http\Controllers\SsoController;
use Illuminate\Support\Facades\Route;

Route::get('/sso/login',           [SsoController::class, 'login'])->name('sso.login');
Route::get('/sso/callback',        [SsoController::class, 'callback'])->name('sso.callback');
Route::post('/sso/logout',         [SsoController::class, 'logout'])->name('sso.logout');

// Route GET khusus untuk logout dari SPA (tidak butuh CSRF form)
Route::get('/sso/baperan-logout',  [SsoController::class, 'baperanLogout'])->name('sso.baperan.logout');

// Single Page Application (SPA) Fallback Route
Route::get('/{any}', function () {
    return view('welcome');
})->where('any', '.*');