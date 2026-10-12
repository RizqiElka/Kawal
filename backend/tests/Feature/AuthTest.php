<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_user_can_login_with_email(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'login' => 'admin@sigap.go.id',
            'password' => 'password',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'data' => [
                    'user' => [
                        'id',
                        'pegawai_id',
                        'nama',
                        'email',
                        'roles',
                        'permissions',
                    ],
                    'token',
                ],
            ]);
    }

    public function test_user_can_login_with_nip(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'login' => '198001012005011001',
            'password' => 'password',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.user.email', 'admin@sigap.go.id');
    }

    public function test_login_fails_with_invalid_credentials(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'login' => 'admin@sigap.go.id',
            'password' => 'salah-password',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['login']);
    }

    public function test_inactive_user_cannot_login(): void
    {
        $user = User::where('email', 'user@sigap.go.id')->first();
        $user->update(['is_active' => false]);

        $response = $this->postJson('/api/auth/login', [
            'login' => 'user@sigap.go.id',
            'password' => 'password',
        ]);

        $response->assertStatus(403);
    }

    public function test_authenticated_user_can_access_me_endpoint_with_roles_and_permissions(): void
    {
        $user = User::where('email', 'admin@sigap.go.id')->first();

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/auth/me');

        $response->assertStatus(200)
            ->assertJsonPath('data.email', 'admin@sigap.go.id')
            ->assertJsonPath('data.roles.0', 'admin');
    }

    public function test_user_can_logout(): void
    {
        $user = User::where('email', 'admin@sigap.go.id')->first();
        $token = $user->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/auth/logout');

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Berhasil keluar dari sistem.');
    }
}
