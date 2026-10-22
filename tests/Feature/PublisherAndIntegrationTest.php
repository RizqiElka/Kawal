<?php

namespace Tests\Feature;

use App\Jobs\PublishContentToChannelJob;
use App\Models\KanalPublikasi;
use App\Models\Konten;
use App\Models\Publikasi;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class PublisherAndIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_publisher_can_publish_content_to_channels(): void
    {
        Queue::fake();

        $publisher = User::where('email', 'publisher@sigap.go.id')->first();
        $author = User::where('email', 'user@sigap.go.id')->first();

        $konten = Konten::create([
            'user_id' => $author->id,
            'bidang_id' => $author->bidang_id,
            'jenis_konten_id' => 1,
            'judul' => 'Konten Siap Terbit',
            'slug' => 'konten-siap-terbit',
            'isi' => 'Konten resmi disetujui.',
            'status' => 'disetujui',
            'tahap_saat_ini' => 'publisher',
        ]);

        $webKanal = KanalPublikasi::where('kode', 'web')->first();
        $igKanal = KanalPublikasi::where('kode', 'instagram')->first();

        $response = $this->actingAs($publisher, 'sanctum')->postJson("/api/konten/{$konten->id}/publish", [
            'channels' => [
                ['kanal_id' => $webKanal->id],
                ['kanal_id' => $igKanal->id],
            ],
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('publikasi', [
            'konten_id' => $konten->id,
            'kanal_id' => $webKanal->id,
        ]);

        Queue::assertPushed(PublishContentToChannelJob::class, 2);
    }

    public function test_publishing_job_execution_marks_content_as_terbit(): void
    {
        $author = User::where('email', 'user@sigap.go.id')->first();
        $konten = Konten::create([
            'user_id' => $author->id,
            'bidang_id' => $author->bidang_id,
            'jenis_konten_id' => 1,
            'judul' => 'Berita Pembangunan Gedung Baru',
            'slug' => 'berita-pembangunan-gedung-baru',
            'isi' => 'Gedung baru telah diresmikan.',
            'status' => 'disetujui',
        ]);

        $webKanal = KanalPublikasi::where('kode', 'web')->first();
        $publikasi = Publikasi::create([
            'konten_id' => $konten->id,
            'kanal_id' => $webKanal->id,
            'status' => 'menunggu',
        ]);

        // Jalankan Job secara sinkron
        $job = new PublishContentToChannelJob($publikasi);
        $job->handle();

        $publikasi->refresh();
        $this->assertEquals('berhasil', $publikasi->status);
        $this->assertNotNull($publikasi->url_post);

        $konten->refresh();
        $this->assertEquals('terbit', $konten->status);

        // Uji rute publik
        $publicRes = $this->getJson("/api/public/berita/{$konten->slug}");
        $publicRes->assertStatus(200)
            ->assertJsonPath('data.judul', 'Berita Pembangunan Gedung Baru');
    }

    public function test_mock_pegawai_api_and_artisan_sync_command(): void
    {
        Http::fake([
            '*/api/mock/pegawai' => Http::response([
                'status' => 'success',
                'data' => [
                    [
                        'pegawai_id' => '199999992025011999',
                        'nama' => 'Pegawai Baru Dari API',
                        'email' => 'pegawai.api@sigap.go.id',
                        'kode_bidang' => 'IKP',
                        'jabatan' => 'Analis Informasi',
                    ],
                ],
            ], 200),
        ]);

        $this->artisan('pegawai:sinkron')
            ->assertExitCode(0);

        $this->assertDatabaseHas('users', [
            'pegawai_id' => '199999992025011999',
            'nama' => 'Pegawai Baru Dari API',
            'email' => 'pegawai.api@sigap.go.id',
        ]);
    }
}
