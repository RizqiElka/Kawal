<?php

namespace App\Http\Controllers;

use App\Models\Konten;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function stats(Request $request)
    {
        $user = $request->user();

        // Scope filter berdasarkan bidang / hak akses user
        $applyScope = function ($query) use ($user) {
            if (! $user->hasRole('admin') && ! $user->can('konten.lihat-semua-bidang')) {
                if ($user->hasRole('kabid')) {
                    $query->where('bidang_id', $user->bidang_id);
                } else {
                    $query->where(function ($q) use ($user) {
                        $q->where('user_id', $user->id);
                        if ($user->bidang_id) {
                            $q->orWhere('bidang_id', $user->bidang_id);
                        }
                    });
                }
            }
            return $query;
        };

        // Total konten (Draft TIDAK dihitung, hanya konten yang sudah diajukan/diproses/terbit/revisi/ditolak)
        $totalKontenQuery = Konten::where('status', '!=', 'draft');
        $totalKonten = $applyScope($totalKontenQuery)->count();

        // Menunggu persetujuan oleh user berdasarkan role
        $menungguPersetujuanQuery = Konten::where('status', 'diproses');
        if (! $user->hasRole('admin') && ! $user->can('konten.lihat-semua-bidang')) {
            if ($user->hasRole('kabid')) {
                $menungguPersetujuanQuery->where('tahap_saat_ini', 'kabid')
                    ->where('bidang_id', $user->bidang_id);
            } elseif ($user->hasRole('editor')) {
                $menungguPersetujuanQuery->where('tahap_saat_ini', 'editor');
            } elseif ($user->hasRole('sekretaris')) {
                $menungguPersetujuanQuery->where('tahap_saat_ini', 'sekretaris');
            } elseif ($user->hasRole('kepala')) {
                $menungguPersetujuanQuery->where('tahap_saat_ini', 'kepala');
            } else {
                $menungguPersetujuanQuery->where('user_id', $user->id);
            }
        }
        $menungguPersetujuan = $menungguPersetujuanQuery->count();

        // Perlu revisi
        $perluRevisiQuery = Konten::where('status', 'revisi');
        $perluRevisi = $applyScope($perluRevisiQuery)->count();

        // Telah terbit
        $telahTerbitQuery = Konten::where('status', 'terbit');
        $telahTerbit = $applyScope($telahTerbitQuery)->count();

        // Konten per bidang (top 6) - Kecualikan draft
        $kontenPerBidangQuery = Konten::select('bidang_id', DB::raw('count(*) as total'))
            ->where('status', '!=', 'draft')
            ->with('bidang:id,nama')
            ->groupBy('bidang_id')
            ->orderByDesc('total')
            ->limit(6);
        $kontenPerBidang = $applyScope($kontenPerBidangQuery)
            ->get()
            ->map(fn ($k) => [
                'bidang' => $k->bidang?->nama ?? 'Umum',
                'total'  => $k->total,
            ]);

        // Distribusi status - Kecualikan draft
        $distribusiStatusQuery = Konten::select('status', DB::raw('count(*) as total'))
            ->where('status', '!=', 'draft')
            ->groupBy('status');
        $distribusiStatus = $applyScope($distribusiStatusQuery)
            ->get()
            ->map(fn ($k) => [
                'status' => $k->status,
                'total'  => $k->total,
            ]);

        // Tren bulanan (6 bulan terakhir) - Kecualikan draft
        $trenBulananQuery = Konten::select(
            DB::raw("DATE_FORMAT(created_at, '%Y-%m') as bulan"),
            DB::raw('count(*) as total')
        )
            ->where('status', '!=', 'draft')
            ->where('created_at', '>=', now()->subMonths(6)->startOfMonth())
            ->groupBy('bulan')
            ->orderBy('bulan');
        $trenBulanan = $applyScope($trenBulananQuery)
            ->get()
            ->map(fn ($k) => [
                'bulan' => $k->bulan,
                'total' => $k->total,
            ]);

        return response()->json([
            'data' => [
                'total_konten'             => $totalKonten,
                'menunggu_persetujuan'     => $menungguPersetujuan,
                'perlu_revisi'             => $perluRevisi,
                'telah_terbit'             => $telahTerbit,
                'konten_per_bidang'        => $kontenPerBidang,
                'distribusi_status'        => $distribusiStatus,
                'tren_bulanan'             => $trenBulanan,
            ],
        ]);
    }
}
