<?php

namespace App\Http\Requests\Konten;

use Illuminate\Foundation\Http\FormRequest;

class UpdateKontenRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'judul' => ['required', 'string', 'max:100'],
            'jenis_konten_id' => ['required', 'integer', 'exists:jenis_konten,id'],
            'isi' => ['required', 'string'],
            'bidang_id' => ['nullable', 'integer', 'exists:bidang,id'],
            'foto' => ['nullable', 'array', 'min:1', 'max:3'],
            'foto.*' => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
            'captions' => ['nullable', 'array', 'max:3'],
            'captions.*' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $files = $this->file('foto');
            if (is_array($files)) {
                $targetRatio = 16 / 9;
                $tolerance = 0.08;

                foreach ($files as $index => $file) {
                    if ($file && $file->isValid()) {
                        $imageInfo = @getimagesize($file->getRealPath());
                        if ($imageInfo) {
                            $width = $imageInfo[0];
                            $height = $imageInfo[1];
                            if ($height > 0) {
                                $ratio = $width / $height;
                                if (abs($ratio - $targetRatio) > $tolerance) {
                                    $fotoNomor = $index + 1;
                                    $validator->errors()->add(
                                        "foto.{$index}",
                                        "Foto ke-{$fotoNomor} harus berasio 16:9 (lanskap). Rasio saat ini terdeteksi " . round($ratio, 2) . ":1."
                                    );
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'judul.required' => 'Judul konten wajib diisi.',
            'judul.max' => 'Judul konten tidak boleh lebih dari 100 karakter.',
            'jenis_konten_id.required' => 'Jenis konten wajib dipilih.',
            'isi.required' => 'Isi konten wajib diisi.',
            'foto.max' => 'Jika mengganti foto, maksimal foto yang dapat diunggah adalah 3 foto rasio 16:9.',
        ];
    }
}
