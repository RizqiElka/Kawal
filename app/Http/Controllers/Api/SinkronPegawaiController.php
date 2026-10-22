<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PegawaiApi;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;

class SinkronPegawaiController extends Controller
{
    /**
     * Trigger manual synchronization of Pegawai data from external API.
     */
    public function sinkron(): JsonResponse
    {
        try {
            Artisan::call('sigap:sinkron-pegawai');
            $output = Artisan::output();

            return response()->json([
                'success' => true,
                'message' => 'Sinkronisasi data pegawai berhasil dijalankan.',
                'detail'  => trim($output),
            ]);
        } catch (\Exception $e) {
            Log::error('Sinkronisasi pegawai gagal: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Gagal menjalankan sinkronisasi pegawai: ' . $e->getMessage(),
            ], 500);
        }
    }
}
