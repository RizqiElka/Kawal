<?php

namespace App\Http\Resources;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sipeg_user_id' => $this->sipeg_user_id,
            'nip' => $this->nip,
            'pegawai_id' => $this->nip ?? $this->pegawai_id,
            'nama' => $this->nama,
            'email' => $this->email,
            'jabatan' => $this->jabatan,
            'is_active' => (bool) $this->is_active,
            'bidang_id' => $this->bidang_id,
            'bidang' => $this->whenLoaded('bidang', function () {
                return $this->bidang ? [
                    'id' => $this->bidang->id,
                    'nama' => $this->bidang->nama,
                    'kode' => $this->bidang->kode,
                ] : null;
            }, function () {
                return $this->bidang ? [
                    'id' => $this->bidang->id,
                    'nama' => $this->bidang->nama,
                    'kode' => $this->bidang->kode,
                ] : null;
            }),
            'roles' => $this->getRoleNames(),
            'permissions' => $this->getAllPermissions()->pluck('name')->values(),
            'last_synced_at' => $this->last_synced_at instanceof \DateTimeInterface
                ? $this->last_synced_at->format('c')
                : ($this->last_synced_at ? (string) $this->last_synced_at : null),
            'created_at' => $this->created_at instanceof \DateTimeInterface
                ? $this->created_at->format('c')
                : ($this->created_at ? (string) $this->created_at : null),
        ];
    }
}
