<?php

namespace App\Console\Commands;

use App\Services\Publishers\ScheduledPublicationProcessor;
use Illuminate\Console\Command;

class ProcessScheduledPublications extends Command
{
    /**
     * Nama dan signature perintah console.
     *
     * @var string
     */
    protected $signature = 'publikasi:proses-terjadwal';

    /**
     * Deskripsi perintah console.
     *
     * @var string
     */
    protected $description = 'Proses semua konten dan kanal publikasi yang sudah mencapai jadwal tayangnya';

    /**
     * Eksekusi perintah console.
     */
    public function handle(): int
    {
        $this->info('Memeriksa publikasi terjadwal...');
        $count = ScheduledPublicationProcessor::processDue();

        if ($count > 0) {
            $this->info("Berhasil memproses {$count} publikasi terjadwal.");
        } else {
            $this->comment('Tidak ada publikasi terjadwal yang jatuh tempo saat ini.');
        }

        return Command::SUCCESS;
    }
}
