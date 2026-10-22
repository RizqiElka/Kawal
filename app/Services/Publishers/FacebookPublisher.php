<?php

namespace App\Services\Publishers;

use App\Contracts\ChannelPublisher;
use App\Models\Konten;
use App\Models\Publikasi;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class FacebookPublisher implements ChannelPublisher
{
    /**
     * Mempublikasikan konten secara langsung ke Halaman Facebook via Facebook Pages Graph API.
     */
    public function publish(Konten $konten, Publikasi $publikasi): array
    {
        $credentials = $publikasi->kanal->kredensial ?? [];
        $token = env('FACEBOOK_PAGE_ACCESS_TOKEN') ?: ($credentials['token'] ?? null);
        $pageId = env('FACEBOOK_PAGE_ID') ?: ($credentials['page_id'] ?? null);

        if (empty($token) || empty($pageId)) {
            return [
                'success' => false,
                'url_post' => null,
                'external_id' => null,
                'error_message' => 'Akun Facebook belum terhubung. Harap masukkan FACEBOOK_PAGE_ACCESS_TOKEN dan FACEBOOK_PAGE_ID di file backend/.env atau pengaturan kanal.',
            ];
        }

        $cleanIsi = trim(preg_replace('/\s+/', ' ', strip_tags($konten->isi)));
        $message = strip_tags($konten->judul) . "\n\n" . $cleanIsi;

        // Cek jika ada foto yang disertakan
        $imageUrl = null;
        if (!empty($konten->foto_sosmed_path)) {
            $imageUrl = url('storage/' . $konten->foto_sosmed_path);
        } else {
            $fotoPertama = $konten->foto()->first();
            if ($fotoPertama && !empty($fotoPertama->path)) {
                $imageUrl = url('storage/' . $fotoPertama->path);
            }
        }

        try {
            if ($imageUrl) {
                // Post Foto ke Page
                $endpoint = "https://graph.facebook.com/v19.0/{$pageId}/photos";
                $payload = [
                    'url' => $imageUrl,
                    'caption' => $message,
                    'access_token' => $token,
                ];
            } else {
                // Post Teks ke Page Feed
                $endpoint = "https://graph.facebook.com/v19.0/{$pageId}/feed";
                $payload = [
                    'message' => $message,
                    'access_token' => $token,
                ];
            }

            $response = Http::timeout(45)->post($endpoint, $payload);

            if (!$response->successful()) {
                $errPayload = $response->json();
                $errMsg = $errPayload['error']['message'] ?? $response->body();
                Log::error('Facebook Graph API Error: ' . $errMsg, $errPayload);

                return [
                    'success' => false,
                    'url_post' => null,
                    'external_id' => null,
                    'error_message' => "Meta/Facebook Error: {$errMsg}",
                ];
            }

            $resData = $response->json();
            $postId = $resData['id'] ?? ($resData['post_id'] ?? 'FB_POST');

            return [
                'success' => true,
                'url_post' => "https://www.facebook.com/{$postId}",
                'external_id' => (string) $postId,
                'error_message' => null,
            ];
        } catch (Throwable $e) {
            Log::error('Koneksi Facebook Graph API Gagal: ' . $e->getMessage());

            return [
                'success' => false,
                'url_post' => null,
                'external_id' => null,
                'error_message' => 'Gagal menghubungi server Meta/Facebook: ' . $e->getMessage(),
            ];
        }
    }
}
