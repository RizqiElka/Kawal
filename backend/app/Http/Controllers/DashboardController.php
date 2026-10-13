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

        // Scope filter berdasarkan peran user:
        // Admin, Kepala Dinas, dan Sekretaris melihat seluruh konten lintas bidang
        $canSeeAll = $user->hasRole('admin') 
            || $user->hasRole('kepala') 
            || $user->hasRole('sekretaris');

        $applyScope = function ($query) use ($user, $canSeeAll) {
            if (! $canSeeAll) {
                if ($user->hasRole('kabid')) {
                    $query->where(function ($q) use ($user) {
                        $q->where(function ($sub) use ($user) {
                            $sub->where('status', 'diproses')->where('tahap_saat_ini', 'kabid');
                            if ($user->bidang_id) {
                                $sub->where('bidang_id', $user->bidang_id);
                            }
                        })->orWhere('user_id', $user->id);
                    });
                } elseif ($user->hasRole('editor')) {
                    $query->where(function ($q) use ($user) {
                        $q->where(function ($sub) {
                            $sub->where('status', 'diproses')->where('tahap_saat_ini', 'editor');
                        })->orWhere('user_id', $user->id);
                    });
                } elseif ($user->hasRole('publisher')) {
                    $query->where(function ($q) use ($user) {
                        $q->whereIn('status', ['disetujui', 'terbit'])
                          ->orWhere('user_id', $user->id);
                    });
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
        // Dihitung berdasarkan lingkup yang bisa diakses user (atau seluruhnya jika admin/kepala/sekretaris)
        $totalKontenQuery = Konten::where('status', '!=', 'draft');
        if (! $canSeeAll) {
            if ($user->hasRole('kabid') || $user->hasRole('user')) {
                if ($user->bidang_id) {
                    $totalKontenQuery->where('bidang_id', $user->bidang_id);
                } else {
                    $totalKontenQuery->where('user_id', $user->id);
                }
            } elseif ($user->hasRole('editor')) {
                // Untuk editor: konten yang masuk ke editor atau dibuat editor
                $totalKontenQuery->where(function ($q) use ($user) {
                    $q->where(function ($sub) {
                        $sub->where('status', 'diproses')->where('tahap_saat_ini', 'editor');
                    })->orWhere('user_id', $user->id);
                });
            } elseif ($user->hasRole('publisher')) {
                // Untuk publisher: konten yang disetujui / terbit
                $totalKontenQuery->where(function ($q) use ($user) {
                    $q->whereIn('status', ['disetujui', 'terbit'])->orWhere('user_id', $user->id);
                });
            }
        }
        $totalKonten = $totalKontenQuery->count();

        // Menunggu persetujuan oleh user berdasarkan role
        $menungguPersetujuanQuery = Konten::where('status', 'diproses');
        if (! $canSeeAll) {
            if ($user->hasRole('kabid')) {
                $menungguPersetujuanQuery->where('tahap_saat_ini', 'kabid');
                if ($user->bidang_id) {
                    $menungguPersetujuanQuery->where('bidang_id', $user->bidang_id);
                }
            } elseif ($user->hasRole('editor')) {
                $menungguPersetujuanQuery->where('tahap_saat_ini', 'editor');
            } elseif ($user->hasRole('publisher')) {
                // Publisher tidak meninjau persetujuan workflow, jadi 0
                $menungguPersetujuanQuery->whereRaw('1 = 0');
            } else {
                $menungguPersetujuanQuery->where('user_id', $user->id);
            }
        }
        $menungguPersetujuan = $menungguPersetujuanQuery->count();

        // Perlu revisi
        $perluRevisiQuery = Konten::where('status', 'revisi');
        if (! $canSeeAll) {
            if ($user->bidang_id) {
                $perluRevisiQuery->where('bidang_id', $user->bidang_id);
            } else {
                $perluRevisiQuery->where('user_id', $user->id);
            }
        }
        $perluRevisi = $perluRevisiQuery->count();

        // Telah disetujui (siap publikasi / masuk publisher)
        $telahDisetujuiQuery = Konten::where('status', 'disetujui');
        if (! $canSeeAll && $user->bidang_id && ! $user->hasRole('publisher')) {
            $telahDisetujuiQuery->where('bidang_id', $user->bidang_id);
        }
        $telahDisetujui = $telahDisetujuiQuery->count();

        // Telah terbit (sudah dipublikasikan)
        $telahTerbitQuery = Konten::where('status', 'terbit');
        if (! $canSeeAll && $user->bidang_id && ! $user->hasRole('publisher')) {
            $telahTerbitQuery->where('bidang_id', $user->bidang_id);
        }
        $telahTerbit = $telahTerbitQuery->count();

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
                'telah_disetujui'          => $telahDisetujui,
                'telah_terbit'             => $telahTerbit,
                'konten_per_bidang'        => $kontenPerBidang,
                'distribusi_status'        => $distribusiStatus,
                'tren_bulanan'             => $trenBulanan,
            ],
        ]);
    }
}
