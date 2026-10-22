<?php

namespace Tests\Feature;

use App\Models\Bidang;
use App\Models\JenisKonten;
use App\Models\Konten;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class KontenWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        Storage::fake('public');
    }

    public function test_user_cannot_create_konten_without_3_photos(): void
    {
        $user = User::where('email', 'user@sigap.go.id')->first();
        $jenis = JenisKonten::first();

        // Hanya upload 2 foto
        $response = $this->actingAs($user, 'sanctum')->postJson('/api/konten', [
            'judul' => 'Judul Berita Baru',
            'jenis_konten_id' => $jenis->id,
            'isi' => 'Konten paragraf berita instansi.',
            'foto' => [
                UploadedFile::fake()->image('foto1.jpg', 1600, 900),
                UploadedFile::fake()->image('foto2.jpg', 1600, 900),
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['foto']);
    }

    public function test_user_cannot_create_konten_with_non_16_9_photos(): void
    {
        $user = User::where('email', 'user@sigap.go.id')->first();
        $jenis = JenisKonten::first();

        // Foto ke-2 adalah 1:1 (persegi), bukan 16:9
        $response = $this->actingAs($user, 'sanctum')->postJson('/api/konten', [
            'judul' => 'Judul Berita Baru',
            'jenis_konten_id' => $jenis->id,
            'isi' => 'Konten paragraf berita instansi.',
            'foto' => [
                UploadedFile::fake()->image('foto1.jpg', 1600, 900),
                UploadedFile::fake()->image('foto2.jpg', 600, 600), // Non 16:9
                UploadedFile::fake()->image('foto3.jpg', 1600, 900),
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['foto.1']);
    }

    public function test_user_can_create_draft_konten_with_valid_3_photos(): void
    {
        $user = User::where('email', 'user@sigap.go.id')->first();
        $jenis = JenisKonten::first();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/konten', [
            'judul' => 'Sosialisasi Program Baru SIGAP di Ruang Command Center',
            'jenis_konten_id' => $jenis->id,
            'isi' => '<p>Pemerintah daerah meluncurkan aplikasi SIGAP.</p>',
            'foto' => [
                UploadedFile::fake()->image('foto1.jpg', 1600, 900),
                UploadedFile::fake()->image('foto2.jpg', 1280, 720),
                UploadedFile::fake()->image('foto3.jpg', 1920, 1080),
            ],
            'captions' => ['Foto suasana pembukaan', 'Foto sambutan Kepala Dinas', 'Foto peserta antusias'],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.revisi_ke', 0)
            ->assertJsonCount(3, 'data.foto');

        $this->assertDatabaseHas('konten', [
            'judul' => 'Sosialisasi Program Baru SIGAP di Ruang Command Center',
            'status' => 'draft',
        ]);
    }

    public function test_author_can_submit_draft_to_kabid(): void
    {
        $user = User::where('email', 'user@sigap.go.id')->first();
        $jenis = JenisKonten::first();

        $konten = Konten::create([
            'user_id' => $user->id,
            'bidang_id' => $user->bidang_id,
            'jenis_konten_id' => $jenis->id,
            'judul' => 'Draf Berita Terkini',
            'slug' => 'draf-berita-terkini',
            'isi' => 'Konten teks berita.',
            'status' => 'draft',
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson("/api/konten/{$konten->id}/submit");
        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'diproses')
            ->assertJsonPath('data.tahap_saat_ini', 'kabid');

        $this->assertEquals('diproses', $konten->fresh()->status);
        $this->assertEquals('kabid', $konten->fresh()->tahap_saat_ini);
    }

    public function test_kabid_different_bidang_cannot_approve_konten(): void
    {
        $authorUser = User::where('email', 'user@sigap.go.id')->first(); // Bidang IKP
        $bidangStatistik = Bidang::where('kode', 'STATISTIK')->first();

        // Buat Kabid lain di bidang Statistik
        $kabidLain = User::create([
            'pegawai_id' => '197001011990011088',
            'nama' => 'Kabid Statistik',
            'email' => 'kabid.stat@sigap.go.id',
            'password' => bcrypt('password'),
            'bidang_id' => $bidangStatistik->id,
            'is_active' => true,
        ]);
        $kabidLain->assignRole('kabid');

        $konten = Konten::create([
            'user_id' => $authorUser->id,
            'bidang_id' => $authorUser->bidang_id, // IKP
            'jenis_konten_id' => 1,
            'judul' => 'Berita Bidang IKP',
            'slug' => 'berita-ikp',
            'isi' => 'Isi berita IKP.',
            'status' => 'diproses',
            'tahap_saat_ini' => 'kabid',
        ]);

        // Kabid Statistik mencoba menyetujui konten IKP
        $response = $this->actingAs($kabidLain, 'sanctum')->postJson("/api/konten/{$konten->id}/approve", [
            'catatan' => 'Mencoba setujui beda bidang',
        ]);

        $response->assertStatus(403);
    }

    public function test_full_approval_flow_and_notifications(): void
    {
        $user = User::where('email', 'user@sigap.go.id')->first();
        $kabid = User::where('email', 'kabid@sigap.go.id')->first();
        $editor = User::where('email', 'editor@sigap.go.id')->first();
        $sekretaris = User::where('email', 'sekretaris@sigap.go.id')->first();
        $kepala = User::where('email', 'kepala@sigap.go.id')->first();

        $konten = Konten::create([
            'user_id' => $user->id,
            'bidang_id' => $user->bidang_id,
            'jenis_konten_id' => 1,
            'judul' => 'Berita Rilis Resmi Pemda',
            'slug' => 'berita-rilis-resmi-pemda',
            'isi' => 'Isi materi berita pemda.',
            'status' => 'draft',
        ]);

        // 1. Submit ke Kabid
        $this->actingAs($user, 'sanctum')->postJson("/api/konten/{$konten->id}/submit")
            ->assertStatus(200);
        $this->assertEquals('kabid', $konten->fresh()->tahap_saat_ini);

        // Notifikasi harus masuk ke Kabid
        $this->assertTrue($kabid->notifications()->where('data->konten_id', $konten->id)->exists());

        // 2. Kabid Setujui -> Maju ke Editor
        $this->actingAs($kabid, 'sanctum')->postJson("/api/konten/{$konten->id}/approve", [
            'catatan' => 'Sesuai dengan arahan pimpinan bidang',
        ])->assertStatus(200);
        $this->assertEquals('editor', $konten->fresh()->tahap_saat_ini);

        // 3. Editor Setujui -> Maju ke Sekretaris
        $this->actingAs($editor, 'sanctum')->postJson("/api/konten/{$konten->id}/approve", [
            'catatan' => 'Tata bahasa dan ejaan telah disempurnakan',
        ])->assertStatus(200);
        $this->assertEquals('sekretaris', $konten->fresh()->tahap_saat_ini);

        // 4. Sekretaris Setujui -> Maju ke Kepala
        $this->actingAs($sekretaris, 'sanctum')->postJson("/api/konten/{$konten->id}/approve")
            ->assertStatus(200);
        $this->assertEquals('kepala', $konten->fresh()->tahap_saat_ini);

        // 5. Kepala Dinas Setujui -> Selesai (status: disetujui, tahap: publisher)
        $this->actingAs($kepala, 'sanctum')->postJson("/api/konten/{$konten->id}/approve", [
            'catatan' => 'Disetujui untuk dipublikasikan secara serentak.',
        ])->assertStatus(200);

        $freshKonten = $konten->fresh();
        $this->assertEquals('disetujui', $freshKonten->status);
        $this->assertEquals('publisher', $freshKonten->tahap_saat_ini);

        // Notifikasi persetujuan penuh masuk ke Pembuat Konten
        $this->assertTrue($user->notifications()->where('data->tipe', 'disetujui')->exists());
    }

    public function test_revisi_returns_content_to_author_and_resubmit_increments_revisi_ke(): void
    {
        $user = User::where('email', 'user@sigap.go.id')->first();
        $editor = User::where('email', 'editor@sigap.go.id')->first();

        $konten = Konten::create([
            'user_id' => $user->id,
            'bidang_id' => $user->bidang_id,
            'jenis_konten_id' => 1,
            'judul' => 'Draf Artikel Ilmiah Populer',
            'slug' => 'draf-artikel',
            'isi' => 'Teks awal.',
            'status' => 'diproses',
            'tahap_saat_ini' => 'editor',
            'revisi_ke' => 0,
        ]);

        // Editor meminta revisi
        $response = $this->actingAs($editor, 'sanctum')->postJson("/api/konten/{$konten->id}/revisi", [
            'catatan' => 'Mohon tambahkan narasumber wawancara dan perbaiki paragraf 2.',
        ]);

        $response->assertStatus(200);
        $this->assertEquals('revisi', $konten->fresh()->status);
        $this->assertNull($konten->fresh()->tahap_saat_ini);

        // Author mengajukan kembali setelah revisi -> revisi_ke menjadi 1 dan mulai dari tahap pertama (kabid)
        $submitRes = $this->actingAs($user, 'sanctum')->postJson("/api/konten/{$konten->id}/submit");
        $submitRes->assertStatus(200);

        $this->assertEquals('diproses', $konten->fresh()->status);
        $this->assertEquals(1, $konten->fresh()->revisi_ke);
        $this->assertEquals('kabid', $konten->fresh()->tahap_saat_ini);
    }

    public function test_tolak_stops_the_workflow(): void
    {
        $user = User::where('email', 'user@sigap.go.id')->first();
        $kabid = User::where('email', 'kabid@sigap.go.id')->first();

        $konten = Konten::create([
            'user_id' => $user->id,
            'bidang_id' => $user->bidang_id,
            'jenis_konten_id' => 1,
            'judul' => 'Artikel Berita Sensitif',
            'slug' => 'artikel-sensitif',
            'isi' => 'Konten tidak layak.',
            'status' => 'diproses',
            'tahap_saat_ini' => 'kabid',
        ]);

        $res = $this->actingAs($kabid, 'sanctum')->postJson("/api/konten/{$konten->id}/tolak", [
            'catatan' => 'Materi ini bukan kewenangan instansi untuk dipublikasikan.',
        ]);

        $res->assertStatus(200);
        $this->assertEquals('ditolak', $konten->fresh()->status);
        $this->assertNull($konten->fresh()->tahap_saat_ini);
    }
}
