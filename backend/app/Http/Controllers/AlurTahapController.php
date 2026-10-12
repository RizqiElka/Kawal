<?php

namespace App\Http\Controllers;

use App\Models\AlurTahap;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AlurTahapController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => AlurTahap::orderBy('urutan')->get(),
        ]);
    }

    public function update(Request $request, AlurTahap $alurTahap): JsonResponse
    {
        $validated = $request->validate([
            'nama' => ['required', 'string', 'max:100'],
            'urutan' => ['required', 'integer'],
            'aktif' => ['boolean'],
        ]);

        $alurTahap->update($validated);

        return response()->json([
            'message' => 'Tahapan alur persetujuan berhasil diperbarui.',
            'data' => $alurTahap,
        ]);
    }
}
