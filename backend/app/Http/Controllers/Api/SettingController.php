<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SettingController extends Controller
{
    /**
     * Return all settings as key/value pairs.
     */
    public function index(): JsonResponse
    {
        $settings = Setting::all()->map(function (Setting $s) {
            return ['key' => $s->key, 'value' => $s->value];
        });
        return response()->json(['data' => $settings]);
    }

    /**
     * Update multiple settings.
     * Expected payload: { "settings": [{"key": "foo", "value": "bar"}, ...] }
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'settings' => ['required', 'array'],
            'settings.*.key' => ['required', 'string'],
            'settings.*.value' => ['nullable', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Invalid data', 'errors' => $validator->errors()], 422);
        }

        foreach ($request->input('settings') as $item) {
            Setting::updateOrCreate(['key' => $item['key']], ['value' => $item['value']]);
        }

        return response()->json(['message' => 'Pengaturan berhasil disimpan']);
    }
}
?>
