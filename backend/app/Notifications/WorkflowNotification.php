<?php

namespace App\Notifications;

use App\Models\Konten;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class WorkflowNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Konten $konten,
        public string $tipe,
        public string $pesan,
        public ?string $actorNama = null,
        public ?string $catatan = null,
    ) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'konten_id' => $this->konten->id,
            'judul' => $this->konten->judul,
            'tipe' => $this->tipe,
            'pesan' => $this->pesan,
            'actor_nama' => $this->actorNama,
            'catatan' => $this->catatan,
            'tahap_saat_ini' => $this->konten->tahap_saat_ini,
            'status' => $this->konten->status,
        ];
    }
}
