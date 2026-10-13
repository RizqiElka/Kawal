<?php

namespace App\Http\Requests\Konten;

use Illuminate\Foundation\Http\FormRequest;

class StoreKontenRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('konten.buat');
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
            'submit_now' => ['nullable', 'boolean'],
            'foto' => ['required', 'array', 'min:1', 'max:3'],
            'foto.*' => ['required', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'], // maks 5MB
            'captions' => ['nullable', 'array', 'max:3'],
            'captions.*' => ['nullable', 'string', 'max:255'],
            'foto_sosmed' => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp', 'max:5120'],
        ];
    }

    /**
     * Configure the validator instance with custom 16:9 aspect ratio checks.
     */
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

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'judul.required' => 'Judul konten wajib diisi.',
            'judul.max' => 'Judul konten tidak boleh lebih dari 100 karakter.',
            'jenis_konten_id.required' => 'Jenis konten wajib dipilih.',
            'jenis_konten_id.exists' => 'Jenis konten yang dipilih tidak valid.',
            'isi.required' => 'Isi konten wajib diisi.',
            'foto.required' => 'Wajib mengunggah minimal 1 foto pendukung berkas publikasi.',
            'foto.min' => 'Wajib mengunggah minimal 1 foto pendukung.',
            'foto.max' => 'Maksimal foto yang dapat diunggah adalah 3 foto.',
            'foto.*.required' => 'File foto wajib diunggah.',
            'foto.*.image' => 'File harus berupa gambar yang valid.',
            'foto.*.mimes' => 'Format foto harus berupa JPG, PNG, atau WEBP.',
            'foto.*.max' => 'Ukuran setiap foto maksimal 5 MB.',
        ];
    }
}
