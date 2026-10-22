<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

class KontenResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();

        return [
            'id' => $this->id,
            'judul' => $this->judul,
            'slug' => $this->slug,
            'isi' => $this->isi,
            'status' => $this->status,
            'tahap_saat_ini' => $this->tahap_saat_ini,
            'revisi_ke' => $this->revisi_ke,
            'submitted_at' => $this->submitted_at?->toISOString(),
            'published_at' => $this->published_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'user_id' => $this->user_id,
            'user' => $this->user ? [
                'id' => $this->user->id,
                'nama' => $this->user->nama,
                'email' => $this->user->email,
                'jabatan' => $this->user->jabatan,
            ] : null,
            'bidang_id' => $this->bidang_id,
            'bidang' => $this->bidang ? [
                'id' => $this->bidang->id,
                'nama' => $this->bidang->nama,
                'kode' => $this->bidang->kode,
            ] : null,
            'jenis_konten_id' => $this->jenis_konten_id,
            'jenis_konten' => $this->jenisKonten ? [
                'id' => $this->jenisKonten->id,
                'nama' => $this->jenisKonten->nama,
                'wajib_cek_5w1h' => (bool) $this->jenisKonten->wajib_cek_5w1h,
            ] : null,
            'foto_sosmed_path' => $this->foto_sosmed_path,
            'foto_sosmed_url' => $this->foto_sosmed_path
                ? (str_starts_with($this->foto_sosmed_path, 'http') ? $this->foto_sosmed_path : Storage::disk('public')->url($this->foto_sosmed_path))
                : null,
            'video_url' => $this->video_url,
            'foto' => $this->foto->map(function ($f) {
                return [
                    'id' => $f->id,
                    'path' => $f->path,
                    'url' => str_starts_with($f->path, 'http') ? $f->path : Storage::disk('public')->url($f->path),
                    'urutan' => $f->urutan,
                    'caption' => $f->caption,
                ];
            }),
            'persetujuan' => $this->persetujuan->map(function ($p) {
                return [
                    'id' => $p->id,
                    'tahap' => $p->tahap,
                    'aksi' => $p->aksi,
                    'target_tahap' => $p->target_tahap,
                    'catatan' => $p->catatan,
                    'revisi_ke' => $p->revisi_ke,
                    'acted_at' => $p->acted_at?->toISOString(),
                    'reviewer' => $p->reviewer ? [
                        'id' => $p->reviewer->id,
                        'nama' => $p->reviewer->nama,
                        'jabatan' => $p->reviewer->jabatan,
                    ] : null,
                ];
            }),
            'publikasi' => $this->publikasi->map(function ($pub) {
                return [
                    'id' => $pub->id,
                    'kanal_id' => $pub->kanal_id,
                    'kanal' => $pub->kanal ? [
                        'id' => $pub->kanal->id,
                        'kode' => $pub->kanal->kode,
                        'nama' => $pub->kanal->nama,
                    ] : null,
                    'status' => $pub->status,
                    'jadwal_at' => $pub->jadwal_at?->toISOString(),
                    'published_at' => $pub->published_at?->toISOString(),
                    'url_post' => $pub->url_post,
                    'external_id' => $pub->external_id,
                    'percobaan' => $pub->percobaan,
                    'pesan_error' => $pub->pesan_error,
                ];
            }),
            'permissions' => $user ? [
                'can_update' => Gate::forUser($user)->allows('update', $this->resource),
                'can_submit' => Gate::forUser($user)->allows('submit', $this->resource),
                'can_approve' => Gate::forUser($user)->allows('approve', $this->resource),
                'can_publish' => Gate::forUser($user)->allows('publish', $this->resource),
                'can_delete' => Gate::forUser($user)->allows('delete', $this->resource),
            ] : [],
        ];
    }
}
