<?php

namespace App\Services\Publishers;

use App\Jobs\PublishContentToChannelJob;
use App\Models\Publikasi;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class ScheduledPublicationProcessor
{
    /**
     * Memproses semua publikasi terjadwal yang sudah melewati batas jadwal_at.
     */
    public static function processDue(): int
    {
        $now = Carbon::now();
        $due = Publikasi::where('status', 'terjadwal')
            ->where(function ($q) use ($now) {
                $q->whereNull('jadwal_at')
                  ->orWhere('jadwal_at', '<=', $now);
            })
            ->with(['konten', 'kanal'])
            ->get();

        $count = 0;
        foreach ($due as $pub) {
            try {
                PublishContentToChannelJob::dispatchSync($pub);
                $count++;
            } catch (\Throwable $e) {
                Log::error("Gagal memproses publikasi terjadwal #{$pub->id}: " . $e->getMessage());
            }
        }

        return $count;
    }
}
