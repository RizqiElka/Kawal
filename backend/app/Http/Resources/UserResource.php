<?php

namespace App\Http\Resources;

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
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
