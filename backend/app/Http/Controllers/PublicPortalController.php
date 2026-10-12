<?php

namespace App\Http\Controllers;

use App\Http\Resources\KontenResource;
use App\Models\Konten;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicPortalController extends Controller
{
    /**
     * Tampilkan daftar konten yang telah resmi terbit untuk publik web.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Konten::where('status', 'terbit')
            ->with(['user', 'bidang', 'jenisKonten', 'foto'])
            ->latest('published_at');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('judul', 'like', "%{$search}%")
                    ->orWhere('isi', 'like', "%{$search}%");
            });
        }

        if ($request->filled('bidang_id')) {
            $query->where('bidang_id', $request->input('bidang_id'));
        }

        if ($request->filled('jenis_konten_id')) {
            $query->where('jenis_konten_id', $request->input('jenis_konten_id'));
        }

        $items = $query->paginate(9);

        return response()->json([
            'data' => KontenResource::collection($items->items()),
            'meta' => [
                'current_page' => $items->currentPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
                'last_page' => $items->lastPage(),
            ],
        ]);
    }

    /**
     * Detail berita publik berdasarkan slug.
     */
    public function show(string $slug): JsonResponse
    {
        $konten = Konten::where('slug', $slug)
            ->where('status', 'terbit')
            ->with(['user', 'bidang', 'jenisKonten', 'foto', 'publikasi.kanal'])
            ->firstOrFail();

        return response()->json([
            'data' => new KontenResource($konten),
        ]);
    }
}
