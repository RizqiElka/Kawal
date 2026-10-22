<?php

namespace App\Services\Publishers;

use App\Contracts\ChannelPublisher;
use App\Models\Konten;
use App\Models\Publikasi;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class InstagramPublisher implements ChannelPublisher
{
    /**
     * Mempublikasikan konten secara langsung ke Instagram via Instagram Graph API resmi.
     */
    public function publish(Konten $konten, Publikasi $publikasi): array
    {
        $credentials = $publikasi->kanal->kredensial ?? [];
        $token = env('INSTAGRAM_ACCESS_TOKEN') ?: ($credentials['token'] ?? null);
        $accountId = env('INSTAGRAM_ACCOUNT_ID') ?: ($credentials['account_id'] ?? null);

        // Validasi ketersediaan kredensial API
        if (empty($token) || empty($accountId)) {
            return [
                'success' => false,
                'url_post' => null,
                'external_id' => null,
                'error_message' => 'Akun Instagram belum terhubung. Harap masukkan INSTAGRAM_ACCESS_TOKEN dan INSTAGRAM_ACCOUNT_ID di file backend/.env atau pengaturan kanal.',
            ];
        }

        // Tentukan URL foto yang akan diunggah ke Instagram (Instagram mewajibkan minimal 1 media gambar)
        $imageUrl = null;
        if (!empty($konten->foto_sosmed_path)) {
            $imageUrl = url('storage/' . $konten->foto_sosmed_path);
        } else {
            $fotoPertama = $konten->foto()->first();
            if ($fotoPertama && !empty($fotoPertama->path)) {
                $imageUrl = url('storage/' . $fotoPertama->path);
            }
        }

        if (empty($imageUrl)) {
            return [
                'success' => false,
                'url_post' => null,
                'external_id' => null,
                'error_message' => 'Konten tidak memiliki foto. Instagram mewajibkan minimal satu foto untuk dipublikasikan.',
            ];
        }

        // Susun Caption Instagram (Judul + Cuplikan Narasi)
        $cleanIsi = trim(preg_replace('/\s+/', ' ', strip_tags($konten->isi)));
        $caption = strip_tags($konten->judul) . "\n\n" . mb_substr($cleanIsi, 0, 1800);

        try {
            // LANGKAH 1: Buat Media Container di Meta
            $containerResponse = Http::timeout(45)->post("https://graph.facebook.com/v19.0/{$accountId}/media", [
                'image_url' => $imageUrl,
                'caption' => $caption,
                'access_token' => $token,
            ]);

            if (!$containerResponse->successful()) {
                $errPayload = $containerResponse->json();
                $errMsg = $errPayload['error']['message'] ?? $containerResponse->body();
                Log::error('Instagram Graph API Error (Create Container): ' . $errMsg, $errPayload);

                return [
                    'success' => false,
                    'url_post' => null,
                    'external_id' => null,
                    'error_message' => "Meta/Instagram Error: {$errMsg}",
                ];
            }

            $containerId = $containerResponse->json()['id'] ?? null;
            if (!$containerId) {
                return [
                    'success' => false,
                    'url_post' => null,
                    'external_id' => null,
                    'error_message' => 'Gagal mendapatkan ID Media Container dari Meta.',
                ];
            }

            // Tunggu 3 detik agar proses container siap di server Meta
            sleep(3);

            // LANGKAH 2: Terbitkan Media Container ke Feed Instagram
            $publishResponse = Http::timeout(45)->post("https://graph.facebook.com/v19.0/{$accountId}/media_publish", [
                'creation_id' => $containerId,
                'access_token' => $token,
            ]);

            if (!$publishResponse->successful()) {
                $errPayload = $publishResponse->json();
                $errMsg = $errPayload['error']['message'] ?? $publishResponse->body();
                Log::error('Instagram Graph API Error (Publish): ' . $errMsg, $errPayload);

                return [
                    'success' => false,
                    'url_post' => null,
                    'external_id' => null,
                    'error_message' => "Meta/Instagram Publish Error: {$errMsg}",
                ];
            }

            $mediaId = $publishResponse->json()['id'] ?? $containerId;

            // LANGKAH 3: Ambil Permalink Postingan yang baru saja tayang
            $permalinkRes = Http::timeout(15)->get("https://graph.facebook.com/v19.0/{$mediaId}", [
                'fields' => 'permalink',
                'access_token' => $token,
            ]);

            $postUrl = $permalinkRes->json()['permalink'] ?? "https://www.instagram.com/p/{$mediaId}";

            return [
                'success' => true,
                'url_post' => $postUrl,
                'external_id' => (string) $mediaId,
                'error_message' => null,
            ];
        } catch (Throwable $e) {
            Log::error('Koneksi Instagram Graph API Gagal: ' . $e->getMessage());

            return [
                'success' => false,
                'url_post' => null,
                'external_id' => null,
                'error_message' => 'Gagal menghubungi server Meta/Instagram: ' . $e->getMessage(),
            ];
        }
    }
}
