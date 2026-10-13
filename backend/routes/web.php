<?php

use App\Http\Controllers\SsoController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => redirect('/dashboard'));

Route::get('/sso/login',    [SsoController::class, 'login'])->name('sso.login');
Route::get('/sso/callback', [SsoController::class, 'callback'])->name('sso.callback');
Route::post('/sso/logout',  [SsoController::class, 'logout'])->name('sso.logout');


Route::get('/dashboard', function () {
    return 'Halo, ' . auth()->user()->name . ' (' . auth()->user()->email . ')';
})->middleware('auth')->name('dashboard');