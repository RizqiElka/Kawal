<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RoleAndUserTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_user_without_permission_cannot_access_role_management(): void
    {
        $user = User::where('email', 'user@sigap.go.id')->first();

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/roles');
        $response->assertStatus(403);
    }

    public function test_admin_can_list_roles_and_permissions(): void
    {
        $admin = User::where('email', 'admin@sigap.go.id')->first();

        $response = $this->actingAs($admin, 'sanctum')->getJson('/api/roles');
        $response->assertStatus(200)
            ->assertJsonStructure(['data', 'system_roles']);

        $permResponse = $this->actingAs($admin, 'sanctum')->getJson('/api/permissions');
        $permResponse->assertStatus(200)
            ->assertJsonStructure(['data', 'grouped']);
    }

    public function test_admin_can_create_custom_role_and_sync_permissions(): void
    {
        $admin = User::where('email', 'admin@sigap.go.id')->first();

        $createRes = $this->actingAs($admin, 'sanctum')->postJson('/api/roles', [
            'name' => 'auditor',
            'permissions' => ['konten.lihat', 'dashboard.lihat-semua'],
        ]);

        $createRes->assertStatus(201)
            ->assertJsonPath('data.name', 'auditor');

        $role = Role::where('name', 'auditor')->first();
        $this->assertNotNull($role);

        // Sync permissions
        $syncRes = $this->actingAs($admin, 'sanctum')->postJson("/api/roles/{$role->id}/permissions", [
            'permissions' => ['konten.lihat'],
        ]);

        $syncRes->assertStatus(200);
        $this->assertTrue($role->fresh()->hasPermissionTo('konten.lihat'));
        $this->assertFalse($role->fresh()->hasPermissionTo('dashboard.lihat-semua'));
    }

    public function test_system_role_cannot_be_deleted(): void
    {
        $admin = User::where('email', 'admin@sigap.go.id')->first();
        $editorRole = Role::where('name', 'editor')->first();

        $response = $this->actingAs($admin, 'sanctum')->deleteJson("/api/roles/{$editorRole->id}");
        $response->assertStatus(422)
            ->assertJsonPath('message', 'Role bawaan sistem tidak boleh dihapus.');
    }

    public function test_admin_can_create_and_update_user_with_roles(): void
    {
        $admin = User::where('email', 'admin@sigap.go.id')->first();

        $createRes = $this->actingAs($admin, 'sanctum')->postJson('/api/users', [
            'pegawai_id' => '199912312025011099',
            'nama' => 'Test Operator Baru',
            'email' => 'operator.baru@sigap.go.id',
            'password' => 'secret123',
            'roles' => ['user'],
        ]);

        $createRes->assertStatus(201)
            ->assertJsonPath('data.email', 'operator.baru@sigap.go.id');

        $newUser = User::where('email', 'operator.baru@sigap.go.id')->first();

        // Update user: tambahkan role publisher
        $updateRes = $this->actingAs($admin, 'sanctum')->putJson("/api/users/{$newUser->id}", [
            'pegawai_id' => '199912312025011099',
            'nama' => 'Test Operator Terupdate',
            'email' => 'operator.baru@sigap.go.id',
            'roles' => ['user', 'publisher'],
        ]);

        $updateRes->assertStatus(200);
        $this->assertTrue($newUser->fresh()->hasRole('publisher'));
    }

    public function test_admin_can_toggle_user_active_status(): void
    {
        $admin = User::where('email', 'admin@sigap.go.id')->first();
        $user = User::where('email', 'user@sigap.go.id')->first();

        $this->assertTrue($user->is_active);

        $res = $this->actingAs($admin, 'sanctum')->patchJson("/api/users/{$user->id}/toggle-active");
        $res->assertStatus(200);

        $this->assertFalse($user->fresh()->is_active);
    }

    public function test_user_cannot_deactivate_themselves(): void
    {
        $admin = User::where('email', 'admin@sigap.go.id')->first();

        $res = $this->actingAs($admin, 'sanctum')->patchJson("/api/users/{$admin->id}/toggle-active");
        $res->assertStatus(422)
            ->assertJsonPath('message', 'Anda tidak dapat menonaktifkan akun Anda sendiri.');
    }
}
