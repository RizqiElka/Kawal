<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MockPegawaiController extends Controller
{
    /**
     * Mock endpoint API Kepegawaian untuk pengujian lokal.
     */
    public function index(Request $request): JsonResponse
    {
        $token = $request->bearerToken();
        $expectedKey = env('PEGAWAI_API_KEY', 'mock-sigap-secret-token');

        if ($token !== $expectedKey) {
            return response()->json([
                'message' => 'Token API Kepegawaian tidak valid atau tidak disertakan.',
            ], 401);
        }

        $mockData = [
            [
                'pegawai_id' => '198001012005011001',
                'nama' => 'Administrator SIGAP',
                'email' => 'admin@sigap.go.id',
                'kode_bidang' => 'SEKRETARIAT',
                'jabatan' => 'Pranata Komputer Ahli Muda',
            ],
            [
                'pegawai_id' => '199502152020121002',
                'nama' => 'Ahmad Staf IKP',
                'email' => 'user@sigap.go.id',
                'kode_bidang' => 'IKP',
                'jabatan' => 'Pengelola Konten Informasi',
            ],
            [
                'pegawai_id' => '197505102000031003',
                'nama' => 'Budi Kepala Bidang IKP',
                'email' => 'kabid@sigap.go.id',
                'kode_bidang' => 'IKP',
                'jabatan' => 'Kepala Bidang IKP',
            ],
            [
                'pegawai_id' => '198808202012012004',
                'nama' => 'Citra Redaksi Editor',
                'email' => 'editor@sigap.go.id',
                'kode_bidang' => 'SEKRETARIAT',
                'jabatan' => 'Editor Publikasi',
            ],
            [
                'pegawai_id' => '197203121998031005',
                'nama' => 'Dedi Sekretaris Dinas',
                'email' => 'sekretaris@sigap.go.id',
                'kode_bidang' => 'SEKRETARIAT',
                'jabatan' => 'Sekretaris Dinas',
            ],
            [
                'pegawai_id' => '196801011993031006',
                'nama' => 'Dr. Eko Kepala Dinas',
                'email' => 'kepala@sigap.go.id',
                'kode_bidang' => 'SEKRETARIAT',
                'jabatan' => 'Kepala Dinas',
            ],
            [
                'pegawai_id' => '199207072018011007',
                'nama' => 'Fani Tim Publikasi',
                'email' => 'publisher@sigap.go.id',
                'kode_bidang' => 'IKP',
                'jabatan' => 'Pranata Humas Publikasi',
            ],
            [
                'pegawai_id' => '199604122021031010',
                'nama' => 'Gita Pranata Humas E-Gov',
                'email' => 'gita.egov@sigap.go.id',
                'kode_bidang' => 'EGOV',
                'jabatan' => 'Pranata Humas Ahli Pertama',
            ],
        ];

        return response()->json([
            'status' => 'success',
            'data' => $mockData,
        ]);
    }
}
