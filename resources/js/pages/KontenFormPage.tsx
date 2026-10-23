import React, { useState, useRef, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  X, ImagePlus, AlertCircle, Send, Save, ChevronLeft, Video
} from 'lucide-react';
import apiClient from '../api/client';
import { TipTapEditor } from '../components/TipTapEditor';
import { CropperModal } from '../components/CropperModal';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import type { JenisKonten, Konten } from '../types';

const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || '/storage';

const MAX_TITLE = 100;

const kontenSchema = z.object({
  judul: z.string().min(5, 'Judul minimal 5 karakter').max(MAX_TITLE, `Judul maksimal ${MAX_TITLE} karakter`),
  jenis_konten_id: z.string().min(1, 'Jenis konten wajib dipilih'),
  isi: z.string().min(1, 'Isi konten wajib diisi'),
  video_url: z.string().max(500).optional(),
});

type KontenFormData = z.infer<typeof kontenSchema>;

interface PhotoSlot {
  file: File | null;
  blob: Blob | null;
  preview: string | null;
  caption: string;
}

const KontenFormPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const toast = useToast();
  const { user, hasRole } = useAuth();
  const isEditorOrAdmin = hasRole('editor') || hasRole('admin');
  const queryClient = useQueryClient();

  const [photos, setPhotos] = useState<PhotoSlot[]>([
    { file: null, blob: null, preview: null, caption: '' },
    { file: null, blob: null, preview: null, caption: '' },
    { file: null, blob: null, preview: null, caption: '' },
  ]);
  const [fotoSosmed, setFotoSosmed] = useState<{ blob: Blob | null; preview: string | null; deleteExisting?: boolean }>({
    blob: null,
    preview: null,
    deleteExisting: false,
  });

  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState<string | null>(null);
  const [cropperMode, setCropperMode] = useState<'berita' | 'sosmed'>('berita');
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null]);
  const sosmedInputRef = useRef<HTMLInputElement | null>(null);

  const { data: jenisKontenList } = useQuery<JenisKonten[]>({
    queryKey: ['jenis-konten'],
    queryFn: async () => {
      const res = await apiClient.get('/jenis-konten');
      return res.data.data;
    },
  });

  const { data: existingKonten } = useQuery<Konten>({
    queryKey: ['konten-detail', id],
    queryFn: async () => {
      const res = await apiClient.get(`/konten/${id}`);
      return res.data.data;
    },
    enabled: isEdit,
  });

  // Populate foto dari data existing saat mode edit
  useEffect(() => {
    if (existingKonten?.foto && existingKonten.foto.length > 0) {
      setPhotos((prev) => {
        const next = [...prev];
        existingKonten.foto.forEach((f, i) => {
          if (i < 3) {
            const previewUrl = f.url?.startsWith('http') ? f.url : `${STORAGE_URL}/${f.path}`;
            next[i] = { file: null, blob: null, preview: previewUrl, caption: f.caption || '' };
          }
        });
        return next;
      });
    }

    if (existingKonten?.foto_sosmed_url || existingKonten?.foto_sosmed_path) {
      const url = existingKonten.foto_sosmed_url || (
        existingKonten.foto_sosmed_path?.startsWith('http')
          ? existingKonten.foto_sosmed_path
          : `${STORAGE_URL}/${existingKonten.foto_sosmed_path}`
      );
      setFotoSosmed({ blob: null, preview: url, deleteExisting: false });
    }
  }, [existingKonten]);

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<KontenFormData>({
    resolver: zodResolver(kontenSchema),
    defaultValues: {
      judul: existingKonten?.judul || '',
      jenis_konten_id: existingKonten?.jenis_konten_id?.toString() || '',
      isi: existingKonten?.isi || '',
      video_url: existingKonten?.video_url || '',
    },
    values: existingKonten ? {
      judul: existingKonten.judul,
      jenis_konten_id: existingKonten.jenis_konten_id.toString(),
      isi: existingKonten.isi,
      video_url: existingKonten.video_url || '',
    } : undefined,
  });

  const judulValue = watch('judul', '');

  const mutation = useMutation({
    mutationFn: async ({ data, submitNow }: { data: KontenFormData; submitNow: boolean }) => {
      const formData = new FormData();
      formData.append('judul', data.judul);
      formData.append('jenis_konten_id', data.jenis_konten_id);
      formData.append('isi', data.isi);
      formData.append('video_url', data.video_url?.trim() || '');
      if (user?.bidang_id) {
        formData.append('bidang_id', String(user.bidang_id));
      }
      if (submitNow) formData.append('submit_now', '1');

      const filledPhotos = photos.filter((p) => p.blob);
      if (!isEdit && filledPhotos.length < 1) {
        throw new Error('Wajib mengisi minimal 1 foto pendukung utama');
      }

      photos.forEach((p, i) => {
        if (p.blob) {
          formData.append(`foto[${i}]`, p.blob, `foto_${i + 1}.jpg`);
        }
        formData.append(`captions[${i}]`, p.caption);
      });

      // Foto Sosmed (Hanya dikirim jika user adalah Editor atau Admin)
      if (isEditorOrAdmin) {
        if (fotoSosmed.blob) {
          formData.append('foto_sosmed', fotoSosmed.blob, 'foto_sosmed.jpg');
        } else if (fotoSosmed.deleteExisting) {
          formData.append('hapus_foto_sosmed', '1');
        }
      }

      if (isEdit) {
        return apiClient.post(`/konten/${id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        return apiClient.post('/konten', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
    },
    onSuccess: (_, vars) => {
      const msg = vars.submitNow
        ? 'Konten berhasil dikirim ke Kepala Bidang!'
        : `Draf konten berhasil ${isEdit ? 'diperbarui' : 'disimpan'}.`;
      toast.success(msg);
      queryClient.invalidateQueries({ queryKey: ['konten-list'] });
      navigate('/konten');
    },
    onError: (err: any) => {
      const errData = err?.response?.data;
      if (errData?.errors) {
        const firstErr = Object.values(errData.errors)[0] as string[];
        toast.error(firstErr[0] || 'Validasi gagal.');
      } else {
        toast.error(err?.message || 'Terjadi kesalahan.');
      }
    },
  });

  const handleFileSelect = (index: number, file: File) => {
    if (file.size > 1 * 1024 * 1024) {
      toast.error('Ukuran file foto maksimal 1 MB.');
      if (fileInputRefs.current[index]) fileInputRefs.current[index].value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      setCurrentPhotoIndex(index);
      setCropperMode('berita');
      setCropperImageSrc(src);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSosmedFileSelect = (file: File) => {
    if (file.size > 1 * 1024 * 1024) {
      toast.error('Ukuran file foto media sosial maksimal 1 MB.');
      if (sosmedInputRef.current) sosmedInputRef.current.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      setCropperMode('sosmed');
      setCropperImageSrc(src);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    if (cropperMode === 'sosmed') {
      setFotoSosmed({ blob, preview: url, deleteExisting: false });
    } else {
      setPhotos((prev) => {
        const next = [...prev];
        next[currentPhotoIndex] = { ...next[currentPhotoIndex], blob, preview: url };
        return next;
      });
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const next = [...prev];
      next[index] = { file: null, blob: null, preview: null, caption: '' };
      return next;
    });
    if (fileInputRefs.current[index]) {
      fileInputRefs.current[index]!.value = '';
    }
  };

  const removeFotoSosmed = () => {
    setFotoSosmed({ blob: null, preview: null, deleteExisting: true });
    if (sosmedInputRef.current) {
      sosmedInputRef.current.value = '';
    }
  };

  const photosReady = isEdit
    ? true
    : photos.some((p) => p.blob !== null || p.preview !== null);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/konten')} className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{isEdit ? 'Edit Konten' : 'Buat Konten Baru'}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Isi semua bagian dan unggah minimal 1 foto berrasio 16:9 untuk dapat diajukan.</p>
        </div>
      </div>

      {/* Revisi Banner */}
      {existingKonten?.status === 'revisi' && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50 rounded-2xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">Konten ini dikembalikan untuk direvisi</p>
            {existingKonten.persetujuan?.[0]?.catatan && (
              <p className="text-amber-700 dark:text-amber-400 text-sm mt-1">
                <strong>Catatan:</strong> {existingKonten.persetujuan[0].catatan}
              </p>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit((data) => mutation.mutate({ data, submitNow: false }))}>
        <div className="space-y-5">
          {/* Judul */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
            <h2 className="font-bold text-slate-800 dark:text-slate-200">Informasi Dasar</h2>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Judul Konten</label>
                <span className={`text-xs font-mono ${judulValue.length > MAX_TITLE - 10 ? 'text-rose-500' : 'text-slate-400 dark:text-slate-400'}`}>
                  {judulValue.length}/{MAX_TITLE}
                </span>
              </div>
              <input
                {...register('judul')}
                id="input-judul"
                placeholder="Tuliskan judul berita atau informasi yang menarik perhatian..."
                className={`w-full px-4 py-3 rounded-xl border text-sm placeholder-slate-400 dark:placeholder-slate-500 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sigap-500 focus:border-transparent transition ${
                  errors.judul ? 'border-rose-400 bg-rose-50 dark:bg-rose-900/20' : 'border-slate-300 dark:border-slate-600'
                }`}
              />
              {errors.judul && (
                <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">{errors.judul.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Jenis Konten</label>
              <select
                {...register('jenis_konten_id')}
                id="select-jenis-konten"
                className={`w-full px-4 py-3 rounded-xl border text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-sigap-500 focus:border-transparent transition ${
                  errors.jenis_konten_id ? 'border-rose-400' : 'border-slate-300 dark:border-slate-600'
                }`}
              >
                <option value="" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">-- Pilih Jenis Konten --</option>
                {jenisKontenList?.map((j) => (
                  <option key={j.id} value={j.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">{j.nama}</option>
                ))}
              </select>
              {errors.jenis_konten_id && (
                <p className="mt-1.5 text-xs text-rose-600 font-medium">{errors.jenis_konten_id.message}</p>
              )}
            </div>
          </div>

          {/* Foto 3x */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-slate-800 dark:text-slate-200">Foto Pendukung (Portal Berita / Lanskap 16:9)</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Wajib unggah minimal 1 foto (maksimal 3). Sistem akan membantu memotong ke rasio 16:9 (lanskap).
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                  Format yang didukung: JPG, JPEG, PNG, WEBP (Maksimal 1 MB per foto).
                </p>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                photosReady ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
              }`}>
                {photos.filter((p) => p.blob || p.preview).length}/3 Foto
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {photos.map((photo, i) => (
                <div key={i} className="space-y-2">
                  <div
                    className={`relative aspect-video rounded-xl overflow-hidden border-2 border-dashed cursor-pointer transition ${
                      photo.preview ? 'border-transparent' : 'border-slate-300 dark:border-slate-600 hover:border-sigap-400 dark:hover:border-sigap-500 bg-slate-50 dark:bg-slate-900/50'
                    }`}
                    onClick={() => !photo.preview && fileInputRefs.current[i]?.click()}
                  >
                    {photo.preview ? (
                      <>
                        <img src={photo.preview} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                          className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <div className="absolute bottom-1.5 left-1.5">
                          <span className="text-xs bg-black/60 text-white px-2 py-0.5 rounded-full">16:9</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full gap-1.5 p-2">
                        <ImagePlus className="w-7 h-7 text-slate-300" />
                        <span className="text-xs text-slate-400 text-center">Foto {i + 1}</span>
                      </div>
                    )}
                    <input
                      ref={(el) => { fileInputRefs.current[i] = el; }}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(i, file);
                      }}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder={`Keterangan foto ${i + 1}`}
                    value={photo.caption}
                    onChange={(e) => setPhotos((prev) => {
                      const next = [...prev];
                      next[i] = { ...next[i], caption: e.target.value };
                      return next;
                    })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sigap-400 placeholder-slate-300 dark:placeholder-slate-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Tautan Video Konten (Basis Link) */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 text-sm">
                  <Video className="w-4 h-4 text-rose-500" />
                  <span>Tautan Video Konten</span>
                  <span className="text-xs font-normal text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">Basis Link (Opsional)</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Masukkan link video pendukung dari YouTube, TikTok, Reels, atau Google Drive.
                </p>
              </div>
            </div>

            <div className="pt-1">
              <input
                type="url"
                placeholder="https://www.youtube.com/watch?v=... atau https://www.tiktok.com/@..."
                {...register('video_url')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Kolom Khusus: Foto Sosmed (1:1 Persegi) - KHUSUS ROLE EDITOR / ADMIN */}
          {isEditorOrAdmin && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span>Foto Media Sosial (1:1 Persegi)</span>
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-200">Editor</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Foto persegi untuk kanal Instagram, Facebook, dan media sosial (Rasio 1:1).
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                    Format yang didukung: JPG, JPEG, PNG, WEBP (Maksimal 1 MB).
                  </p>
                </div>
              </div>

              <div className="max-w-xs">
                <div
                  className={`relative aspect-square rounded-2xl overflow-hidden border-2 border-dashed cursor-pointer transition ${
                    fotoSosmed.preview ? 'border-transparent' : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 bg-slate-50 dark:bg-slate-900/50'
                  }`}
                  onClick={() => !fotoSosmed.preview && sosmedInputRef.current?.click()}
                >
                  {fotoSosmed.preview ? (
                    <>
                      <img src={fotoSosmed.preview} alt="Foto Sosmed" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeFotoSosmed(); }}
                        className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition"
                        title="Hapus foto sosmed"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-2 left-2">
                        <span className="text-xs bg-black/60 text-white px-2.5 py-1 rounded-full font-medium">1:1 Sosmed</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-2 p-4 text-center">
                      <ImagePlus className="w-10 h-10 text-slate-300" />
                      <div>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">Pilih Foto Sosmed</span>
                        <span className="text-[11px] text-slate-400">Rasio 1:1 Persegi</span>
                      </div>
                    </div>
                  )}
                  <input
                    ref={sosmedInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleSosmedFileSelect(file);
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Isi Konten */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-3">
            <h2 className="font-bold text-slate-800 dark:text-slate-200">Isi Konten</h2>
            <Controller
              control={control}
              name="isi"
              render={({ field }) => (
                <TipTapEditor
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Tulis naskah berita atau informasi di sini..."
                />
              )}
            />
            {errors.isi && (
              <p className="text-xs text-rose-600 font-medium">{errors.isi.message}</p>
            )}
          </div>

          {/* Action Buttons */}
          {(() => {
            // Editor mengedit konten yang sedang diproses: hanya tampilkan Simpan Perubahan
            const isEditorEditingDiproses = isEdit && existingKonten?.status === 'diproses';
            return (
              <div className="flex items-center justify-end gap-3 pb-6">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  id="btn-simpan-draf"
                  disabled={mutation.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60 transition"
                >
                  {mutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isEditorEditingDiproses ? 'Simpan Perubahan' : 'Simpan Draf'}
                </button>
                {!isEditorEditingDiproses && (
                  <button
                    type="button"
                    id="btn-kirim-kabid"
                    disabled={mutation.isPending || !photosReady}
                    onClick={handleSubmit((data) => mutation.mutate({ data, submitNow: true }))}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-sigap-700 rounded-xl hover:bg-sigap-800 disabled:opacity-60 disabled:cursor-not-allowed transition shadow-md shadow-sigap-200"
                  >
                    {mutation.isPending ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Kirim ke Kabid
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      </form>

      <CropperModal
        isOpen={cropperOpen}
        imageSrc={cropperImageSrc}
        aspectRatio={cropperMode === 'sosmed' ? 1 : 16 / 9}
        title={cropperMode === 'sosmed' ? 'Sesuaikan Rasio Foto Sosmed (1:1)' : 'Sesuaikan Rasio Foto (16:9)'}
        description={
          cropperMode === 'sosmed'
            ? 'Potong gambar ke bentuk persegi (1:1) untuk media sosial (Instagram, Facebook, X, dsb).'
            : 'Geser atau perbesar gambar agar sesuai standar publikasi lanskap instansi.'
        }
        onClose={() => setCropperOpen(false)}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
};

export default KontenFormPage;

