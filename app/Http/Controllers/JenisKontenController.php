<?php

namespace App\Http\Controllers;

use App\Models\JenisKonten;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class JenisKontenController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => JenisKonten::orderBy('nama', 'asc')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama' => 'required|string|max:255|unique:jenis_konten,nama',
            'wajib_cek_5w1h' => 'nullable|boolean',
        ]);

        $jenisKonten = JenisKonten::create([
            'nama' => $validated['nama'],
            'wajib_cek_5w1h' => $validated['wajib_cek_5w1h'] ?? true,
        ]);

        return response()->json([
            'message' => 'Jenis konten berhasil ditambahkan',
            'data' => $jenisKonten,
        ], 201);
    }

    public function update(Request $request, JenisKonten $jenisKonten): JsonResponse
    {
        $validated = $request->validate([
            'nama' => 'required|string|max:255|unique:jenis_konten,nama,' . $jenisKonten->id,
            'wajib_cek_5w1h' => 'nullable|boolean',
        ]);

        $jenisKonten->update($validated);

        return response()->json([
            'message' => 'Jenis konten berhasil diperbarui',
            'data' => $jenisKonten,
        ]);
    }

    public function destroy(JenisKonten $jenisKonten): JsonResponse
    {
        $jenisKonten->delete();

        return response()->json([
            'message' => 'Jenis konten berhasil dihapus',
        ]);
    }
}
