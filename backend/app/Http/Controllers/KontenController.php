<?php

namespace App\Http\Controllers;

use App\Http\Requests\Konten\StoreKontenRequest;
use App\Http\Requests\Konten\UpdateKontenRequest;
use App\Http\Resources\KontenResource;
use App\Models\Konten;
use App\Models\KontenFoto;
use App\Services\WorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class KontenController extends Controller
{
    public function __construct(
        protected WorkflowService $workflowService
    ) {}

    /**
     * Tampilkan daftar konten dengan filter dan pagination sesuai hak akses.
     */
    public function index(Request $request): JsonResponse
    {
        \App\Services\Publishers\ScheduledPublicationProcessor::processDue();

        $user = $request->user();
        $query = Konten::with(['user', 'bidang', 'jenisKonten', 'foto'])->latest();

        // Aturan Utama: Status 'draft' milik pengguna lain TIDAK BISA dilihat oleh siapapun (termasuk Editor/Admin)
        $query->where(function ($q) use ($user) {
            $q->where('user_id', $user->id)
              ->orWhere('status', '!=', 'draft');
        });

        // Batas akses data sesuai peran / role:
        // Admin, Kepala Dinas, dan Sekretaris melihat SEMUA konten lintas status/bidang
        $canSeeAll = $user->hasRole('admin') 
            || $user->hasRole('kepala') 
            || $user->hasRole('sekretaris');

        if (! $canSeeAll) {
            if ($user->hasRole('kabid')) {
                // Kabid: HANYA menampilkan konten yang sedang menunggu persetujuan Kabid
                $query->where(function ($q) use ($user) {
                    $q->where(function ($sub) {
                        $sub->where('status', 'diproses')->where('tahap_saat_ini', 'kabid');
                    })->orWhere('user_id', $user->id);
                });
            } elseif ($user->hasRole('editor')) {
                // Editor: HANYA menampilkan konten yang sedang menunggu persetujuan Editor
                $query->where(function ($q) use ($user) {
                    $q->where(function ($sub) {
                        $sub->where('status', 'diproses')->where('tahap_saat_ini', 'editor');
                    })->orWhere('user_id', $user->id);
                });
            } elseif ($user->hasRole('publisher')) {
                // Publisher: HANYA menampilkan konten yang siap publikasi / sudah terbit (disetujui & terbit)
                $query->where(function ($q) use ($user) {
                    $q->whereIn('status', ['disetujui', 'terbit'])
                      ->orWhere('user_id', $user->id);
                });
            } else {
                // User biasa (staf pembuat konten): hanya konten buatannya sendiri atau dalam bidangnya
                $query->where(function ($q) use ($user) {
                    $q->where('user_id', $user->id);
                    if ($user->bidang_id) {
                        $q->orWhere('bidang_id', $user->bidang_id);
                    }
                });
            }
        }

        // Filter status
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        // Filter jenis konten
        if ($request->filled('jenis_konten_id')) {
            $query->where('jenis_konten_id', $request->input('jenis_konten_id'));
        }

        // Filter bidang
        if ($request->filled('bidang_id')) {
            $query->where('bidang_id', $request->input('bidang_id'));
        }

        // Filter tahap saat ini
        if ($request->filled('tahap_saat_ini')) {
            $query->where('tahap_saat_ini', $request->input('tahap_saat_ini'));
        }

        // Filter pencarian
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('judul', 'like', "%{$search}%")
                    ->orWhere('isi', 'like', "%{$search}%");
            });
        }

        // Filter khusus: Butuh persetujuan saya
        if ($request->boolean('need_my_approval')) {
            $query->where('status', 'diproses');
            if ($user->hasRole('kabid')) {
                $query->where('tahap_saat_ini', 'kabid');
                if ($user->bidang_id) {
                    $query->where('bidang_id', $user->bidang_id);
                }
            } elseif ($user->hasRole('editor')) {
                $query->where('tahap_saat_ini', 'editor');
            } elseif ($user->hasRole('sekretaris')) {
                $query->where('tahap_saat_ini', 'sekretaris');
            } elseif ($user->hasRole('kepala')) {
                $query->where('tahap_saat_ini', 'kepala');
            }
        }

        $perPage = (int) $request->input('per_page', 12);
        $kontens = $query->paginate($perPage);

        return response()->json([
            'data' => KontenResource::collection($kontens->items()),
            'meta' => [
                'current_page' => $kontens->currentPage(),
                'per_page' => $kontens->perPage(),
                'total' => $kontens->total(),
                'last_page' => $kontens->lastPage(),
            ],
        ]);
    }

    /**
     * Buat konten baru (draft / langsung submit jika diinginkan).
     */
    public function store(StoreKontenRequest $request): JsonResponse
    {
        $user = $request->user();

        $konten = DB::transaction(function () use ($request, $user) {
            $slug = Str::slug($request->judul) . '-' . time();
            $bidangId = $request->input('bidang_id') ?? $user->bidang_id;

            $konten = Konten::create([
                'user_id' => $user->id,
                'bidang_id' => $bidangId,
                'jenis_konten_id' => $request->jenis_konten_id,
                'judul' => $request->judul,
                'slug' => $slug,
                'isi' => $request->isi,
                'video_url' => $request->input('video_url'),
                'status' => 'draft',
                'revisi_ke' => 0,
            ]);

            // Simpan foto sosmed HANYA jika pengguna memiliki role editor atau admin
            if ($request->hasFile('foto_sosmed') && ($user->hasRole('editor') || $user->hasRole('admin'))) {
                $sosmedPath = $request->file('foto_sosmed')->store('konten_foto_sosmed', 'public');
                $konten->update(['foto_sosmed_path' => $sosmedPath]);
            }

            // Simpan 3 foto
            $files = $request->file('foto');
            $captions = $request->input('captions', []);

            foreach ($files as $index => $file) {
                $path = $file->store('konten_foto', 'public');
                KontenFoto::create([
                    'konten_id' => $konten->id,
                    'path' => $path,
                    'urutan' => $index + 1,
                    'caption' => $captions[$index] ?? null,
                ]);
            }

            // Jika user memilih submit langsung
            if ($request->boolean('submit_now')) {
                $konten = $this->workflowService->submit($konten, $user);
            }

            return $konten;
        });

        $message = $request->boolean('submit_now')
            ? 'Konten berhasil disimpan dan diajukan ke Kepala Bidang.'
            : 'Draf konten berhasil disimpan.';

        return response()->json([
            'message' => $message,
            'data' => new KontenResource($konten->load(['user', 'bidang', 'jenisKonten', 'foto', 'persetujuan.reviewer', 'publikasi.kanal'])),
        ], 201);
    }

    /**
     * Tampilkan detail konten.
     */
    public function show(Konten $konten): JsonResponse
    {
        Gate::authorize('view', $konten);

        return response()->json([
            'data' => new KontenResource($konten->load([
                'user',
                'bidang',
                'jenisKonten',
                'foto',
                'persetujuan.reviewer',
                'publikasi.kanal',
            ])),
        ]);
    }

    /**
     * Perbarui konten draft / revisi.
     */
    public function update(UpdateKontenRequest $request, Konten $konten): JsonResponse
    {
        Gate::authorize('update', $konten);

        DB::transaction(function () use ($request, $konten) {
            $updateData = [
                'judul' => $request->judul,
                'slug' => Str::slug($request->judul) . '-' . $konten->id,
                'isi' => $request->isi,
                'video_url' => $request->input('video_url', $konten->video_url),
                'jenis_konten_id' => $request->jenis_konten_id,
                'bidang_id' => $request->input('bidang_id', $konten->bidang_id),
            ];

            // Kelola foto sosmed HANYA jika pengguna memiliki role editor atau admin
            $user = $request->user();
            if ($user->hasRole('editor') || $user->hasRole('admin')) {
                if ($request->hasFile('foto_sosmed')) {
                    if ($konten->foto_sosmed_path) {
                        Storage::disk('public')->delete($konten->foto_sosmed_path);
                    }
                    $updateData['foto_sosmed_path'] = $request->file('foto_sosmed')->store('konten_foto_sosmed', 'public');
                } elseif ($request->boolean('hapus_foto_sosmed')) {
                    if ($konten->foto_sosmed_path) {
                        Storage::disk('public')->delete($konten->foto_sosmed_path);
                    }
                    $updateData['foto_sosmed_path'] = null;
                }
            }

            $konten->update($updateData);

            // Jika ada pengunggahan 3 foto baru
            if ($request->hasFile('foto')) {
                // Hapus file lama
                foreach ($konten->foto as $oldFoto) {
                    Storage::disk('public')->delete($oldFoto->path);
                    $oldFoto->delete();
                }

                $files = $request->file('foto');
                $captions = $request->input('captions', []);
                foreach ($files as $index => $file) {
                    $path = $file->store('konten_foto', 'public');
                    KontenFoto::create([
                        'konten_id' => $konten->id,
                        'path' => $path,
                        'urutan' => $index + 1,
                        'caption' => $captions[$index] ?? null,
                    ]);
                }
            } elseif ($request->filled('captions')) {
                // Perbarui hanya caption
                $captions = $request->input('captions');
                foreach ($konten->foto as $index => $foto) {
                    if (isset($captions[$index])) {
                        $foto->update(['caption' => $captions[$index]]);
                    }
                }
            }

            if ($request->boolean('submit_now')) {
                $konten = $this->workflowService->submit($konten, $request->user());
            }
        });

        $msg = $request->boolean('submit_now')
            ? 'Konten berhasil diperbarui dan diajukan kembali ke Kepala Bidang.'
            : 'Konten berhasil diperbarui.';

        return response()->json([
            'message' => $msg,
            'data' => new KontenResource($konten->fresh(['user', 'bidang', 'jenisKonten', 'foto', 'persetujuan.reviewer', 'publikasi.kanal'])),
        ]);
    }

    /**
     * Hapus konten draft.
     */
    public function destroy(Konten $konten): JsonResponse
    {
        Gate::authorize('delete', $konten);

        foreach ($konten->foto as $foto) {
            Storage::disk('public')->delete($foto->path);
        }

        $konten->delete();

        return response()->json([
            'message' => 'Konten berhasil dihapus.',
        ]);
    }

    /**
     * Mengajukan konten ke alur persetujuan.
     */
    public function submit(Request $request, Konten $konten): JsonResponse
    {
        Gate::authorize('submit', $konten);

        $konten = $this->workflowService->submit($konten, $request->user());

        return response()->json([
            'message' => 'Konten berhasil diajukan ke Kepala Bidang.',
            'data' => new KontenResource($konten),
        ]);
    }

    /**
     * Menyetujui konten dan melanjutkan ke tahap berikutnya.
     */
    public function approve(Request $request, Konten $konten): JsonResponse
    {
        Gate::authorize('approve', $konten);

        $catatan = $request->input('catatan');
        $konten = $this->workflowService->approve($konten, $request->user(), $catatan);

        $message = $konten->status === 'disetujui'
            ? 'Konten berhasil disetujui penuh oleh seluruh pimpinan dan siap dipublikasikan.'
            : 'Persetujuan berhasil dicatat dan konten diteruskan ke tahap berikutnya.';

        return response()->json([
            'message' => $message,
            'data' => new KontenResource($konten),
        ]);
    }

    /**
     * Mengembalikan konten ke pembuat untuk direvisi.
     */
    public function revisi(Request $request, Konten $konten): JsonResponse
    {
        Gate::authorize('approve', $konten);

        $request->validate([
            'catatan' => ['required', 'string', 'min:5'],
            'target_tahap' => ['nullable', 'string', 'max:50'],
        ], [
            'catatan.required' => 'Catatan revisi wajib diisi agar pembuat dapat mengetahui perbaikan yang diperlukan.',
            'catatan.min' => 'Catatan revisi minimal 5 karakter.',
        ]);

        $konten = $this->workflowService->revisi(
            $konten,
            $request->user(),
            $request->input('catatan'),
            $request->input('target_tahap')
        );

        return response()->json([
            'message' => 'Konten berhasil dikembalikan untuk perbaikan.',
            'data' => new KontenResource($konten),
        ]);
    }

    /**
     * Menolak konten secara permanen.
     */
    public function tolak(Request $request, Konten $konten): JsonResponse
    {
        Gate::authorize('approve', $konten);

        $request->validate([
            'catatan' => ['required', 'string', 'min:5'],
        ], [
            'catatan.required' => 'Alasan penolakan konten wajib diisi.',
            'catatan.min' => 'Alasan penolakan minimal 5 karakter.',
        ]);

        $konten = $this->workflowService->tolak($konten, $request->user(), $request->input('catatan'));

        return response()->json([
            'message' => 'Konten telah ditolak dan alur persetujuan dihentikan.',
            'data' => new KontenResource($konten),
        ]);
    }
}
