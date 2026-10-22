<?php

namespace App\Http\Controllers;

use App\Models\Bidang;
use Illuminate\Http\JsonResponse;

class BidangController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Bidang::orderBy('nama')->get(),
        ]);
    }
}
