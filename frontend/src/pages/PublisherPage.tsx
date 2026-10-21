import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Globe, Video, CheckCircle2, ExternalLink, Share2, ThumbsUp,
  Save, Trash2, Calendar, Link2, PlusCircle
} from 'lucide-react';
import apiClient from '../api/client';
import type { Konten, KanalPublikasi } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';

const KANAL_ICONS: Record<string, React.ReactNode> = {
  web: <Globe className="w-5 h-5" />,
  instagram: <Share2 className="w-5 h-5" />,
  facebook: <ThumbsUp className="w-5 h-5" />,
  x: <Share2 className="w-5 h-5" />,
  tiktok: <Video className="w-5 h-5" />,
};

const KANAL_COLORS: Record<string, string> = {
  web: 'bg-sigap-50 dark:bg-sigap-900/30 text-sigap-700 dark:text-sigap-400 border-sigap-200 dark:border-sigap-800',
  instagram: 'bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-900',
  facebook: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900',
  x: 'bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  tiktok: 'bg-gray-50 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
};

interface KanalFormEntry {
  kanal_id: number;
  url_post: string;
  published_at: string;
  is_published: boolean;
}

const PublisherPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const preselectedKontenId = searchParams.get('konten_id');

  const [selectedKontenId, setSelectedKontenId] = useState<number | null>(
    preselectedKontenId ? parseInt(preselectedKontenId) : null
  );

  // Form input untuk masing-masing kanal: kanal_id -> { url_post, published_at, is_published }
  const [channelEntries, setChannelEntries] = useState<Record<number, KanalFormEntry>>({});

  const { data: approvedKonten, isLoading: isLoadingKonten } = useQuery<Konten[]>({
    queryKey: ['konten-approved-list'],
    queryFn: async () => {
      const res = await apiClient.get('/konten?per_page=100&status=disetujui');
      // Hanya tampilkan konten yang DISETUJUI — konten yang sudah terbit
      // dikelola melalui ikon "Edit Publikasi" di halaman Daftar Konten
      return (res.data.data as Konten[]).filter((k) => k.status === 'disetujui');
    },
  });

  // Fetch konten yang sudah terbit jika diakses langsung via URL param (dari ikon Edit Publikasi)
  const { data: preselectedTerbit } = useQuery<Konten | null>({
    queryKey: ['konten-terbit-preselected', preselectedKontenId],
    queryFn: async () => {
      if (!preselectedKontenId) return null;
      // Cek apakah sudah ada di approvedKonten — jika tidak, fetch manual
      const res = await apiClient.get(`/konten/${preselectedKontenId}`);
      const k = res.data.data as Konten;
      return k.status === 'terbit' ? k : null;
    },
    enabled: !!preselectedKontenId,
  });

  const { data: kanals } = useQuery<KanalPublikasi[]>({
    queryKey: ['kanals'],
    queryFn: async () => {
      const res = await apiClient.get('/kanal');
      return res.data.data;
    },
  });

  // Pilih otomatis konten pertama jika belum ada yang terpilih
  useEffect(() => {
    if (!selectedKontenId && approvedKonten && approvedKonten.length > 0) {
      setSelectedKontenId(approvedKonten[0].id);
    }
  }, [approvedKonten, selectedKontenId]);

  // selectedKonten bisa berasal dari daftar disetujui ATAU konten terbit yang diakses langsung
  const selectedKonten = approvedKonten?.find((k) => k.id === selectedKontenId)
    ?? (preselectedTerbit?.id === selectedKontenId ? preselectedTerbit : undefined);

  // Inisialisasi data form ketika memilih konten atau ketika data kanal tersedia
  useEffect(() => {
    if (kanals && selectedKonten) {
      const initial: Record<number, KanalFormEntry> = {};
      kanals.forEach((kanal) => {
        const existingPub = selectedKonten.publikasi?.find((p) => p.kanal_id === kanal.id);
        const nowLocal = new Date().toISOString().slice(0, 16);
        initial[kanal.id] = {
          kanal_id: kanal.id,
          url_post: existingPub?.url_post || '',
          published_at: existingPub?.published_at
            ? new Date(existingPub.published_at).toISOString().slice(0, 16)
            : nowLocal,
          is_published: !!existingPub || false,
        };
      });
      setChannelEntries(initial);
    }
  }, [kanals, selectedKonten]);

  const savePublicationMutation = useMutation({
    mutationFn: async () => {
      if (!selectedKontenId) return;

      // Ambil kanal yang dicentang / ditandai sudah dipublikasi
      const activePublications = Object.values(channelEntries)
        .filter((entry) => entry.is_published)
        .map((entry) => ({
          kanal_id: entry.kanal_id,
          url_post: entry.url_post.trim() || null,
          published_at: entry.published_at || null,
          status: 'berhasil',
        }));

      if (activePublications.length === 0) {
        throw new Error('Tandai minimal 1 kanal media yang sudah dipublikasikan.');
      }

      return apiClient.post(`/konten/${selectedKontenId}/publish`, {
        publications: activePublications,
      });
    },
    onSuccess: () => {
      toast.success('Pendataan publikasi konten berhasil disimpan!');
      queryClient.invalidateQueries({ queryKey: ['konten-approved-list'] });
      queryClient.invalidateQueries({ queryKey: ['konten-list'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal menyimpan data publikasi.');
    },
  });

  const deletePublikasiMutation = useMutation({
    mutationFn: (publikasiId: number) => apiClient.delete(`/publikasi/${publikasiId}`),
    onSuccess: () => {
      toast.success('Riwayat publikasi kanal berhasil dihapus.');
      queryClient.invalidateQueries({ queryKey: ['konten-approved-list'] });
      queryClient.invalidateQueries({ queryKey: ['konten-list'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menghapus data.');
    },
  });

  const updateEntry = (kanalId: number, field: keyof KanalFormEntry, value: any) => {
    setChannelEntries((prev) => ({
      ...prev,
      [kanalId]: {
        ...prev[kanalId],
        [field]: value,
      },
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pendataan & Manajemen Publikasi</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Catat link tayang & waktu terbit untuk konten yang baru disetujui. Konten berstatus Terbit dapat diperbarui datanya melalui ikon di halaman Daftar Konten.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Kolom Kiri: Daftar Konten Siap Didata */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-[700px]">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
            <h2 className="font-bold text-slate-800 dark:text-slate-200">Konten Menunggu Publikasi</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Konten disetujui yang belum didata tayangannya</p>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700 overflow-y-auto flex-1">
            {isLoadingKonten ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 h-20 animate-pulse bg-slate-50 dark:bg-slate-700/30" />
              ))
            ) : !approvedKonten?.length ? (
              <div className="py-16 text-center px-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto mb-2" />
                <p className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Semua konten sudah dipublikasi!</p>
                <p className="text-slate-400 text-xs mt-1">Tidak ada konten disetujui yang menunggu pendataan.</p>
              </div>
            ) : (
              approvedKonten.map((k) => {
                const totalPublished = k.publikasi?.length || 0;
                return (
                  <button
                    key={k.id}
                    onClick={() => {
                      setSelectedKontenId(k.id);
                      setSearchParams({ konten_id: String(k.id) });
                    }}
                    className={`w-full text-left px-5 py-4 transition flex flex-col gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/60 ${
                      selectedKontenId === k.id
                        ? 'bg-sigap-50 dark:bg-sigap-900/40 border-l-4 border-sigap-600'
                        : ''
                    }`}
                  >
                    <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm line-clamp-2">
                      {k.judul}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={k.status} />
                      <span className="text-[11px] text-slate-400">
                        {k.bidang?.nama || 'Umum'}
                      </span>
                      <span className="text-[11px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium ml-auto">
                        {totalPublished > 0 ? `${totalPublished} kanal terdata` : 'Belum terdata'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Kolom Kanan: Form Pendataan Kanal Publikasi */}
        <div className="lg:col-span-7 space-y-6">
          {selectedKonten ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs uppercase tracking-wider font-bold ${
                    selectedKonten.status === 'terbit'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-sigap-700 dark:text-sigap-400'
                  }`}>
                    {selectedKonten.status === 'terbit' ? 'Perbarui Data Publikasi' : 'Form Pencatatan Publikasi'}
                  </span>
                  <StatusBadge status={selectedKonten.status} />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
                  {selectedKonten.judul}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Penulis: <strong>{selectedKonten.user?.nama}</strong> ({selectedKonten.bidang?.nama})
                </p>
              </div>

              {/* Form Input Per Kanal */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b pb-2">
                  Kanal Publikasi Media (Centang & Masukkan Link Hasil Tayang)
                </h3>

                <div className="space-y-3">
                  {kanals?.map((kanal) => {
                    const entry = channelEntries[kanal.id] || {
                      kanal_id: kanal.id,
                      url_post: '',
                      published_at: new Date().toISOString().slice(0, 16),
                      is_published: false,
                    };

                    const existingPub = selectedKonten.publikasi?.find((p) => p.kanal_id === kanal.id);

                    return (
                      <div
                        key={kanal.id}
                        className={`rounded-2xl border-2 p-4 transition ${
                          entry.is_published
                            ? 'border-sigap-500 bg-sigap-50/20 dark:bg-sigap-900/10'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id={`check-kanal-${kanal.id}`}
                            checked={entry.is_published}
                            onChange={(e) => updateEntry(kanal.id, 'is_published', e.target.checked)}
                            className="w-4 h-4 rounded text-sigap-600 focus:ring-sigap-500 border-slate-300 cursor-pointer"
                          />
                          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${KANAL_COLORS[kanal.kode]}`}>
                            {KANAL_ICONS[kanal.kode] || <Globe className="w-5 h-5" />}
                          </div>
                          <div className="flex-1">
                            <label htmlFor={`check-kanal-${kanal.id}`} className="font-semibold text-slate-800 dark:text-slate-200 text-sm cursor-pointer block">
                              {kanal.nama}
                            </label>
                            <span className="text-[11px] text-slate-400 capitalize">{kanal.kode}</span>
                          </div>
                          {existingPub && (
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Sudah Terdata
                            </span>
                          )}
                        </div>

                        {/* Input URL & Waktu Terbit bila kanal dicentang */}
                        {entry.is_published && (
                          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 grid sm:grid-cols-12 gap-3 animate-fade-in">
                            <div className="sm:col-span-7">
                              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                                <Link2 className="w-3.5 h-3.5" /> URL Link Postingan / Berita
                              </label>
                              <input
                                type="url"
                                placeholder={`https://${kanal.kode === 'web' ? 'instansi.go.id/berita/...' : 'instagram.com/p/...'}`}
                                value={entry.url_post}
                                onChange={(e) => updateEntry(kanal.id, 'url_post', e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sigap-500"
                              />
                            </div>
                            <div className="sm:col-span-5">
                              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" /> Waktu Tayang
                              </label>
                              <input
                                type="datetime-local"
                                value={entry.published_at}
                                onChange={(e) => updateEntry(kanal.id, 'published_at', e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sigap-500"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tombol Simpan */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t">
                <button
                  type="button"
                  onClick={() => savePublicationMutation.mutate()}
                  disabled={savePublicationMutation.isPending}
                  className={`flex items-center gap-2 px-6 py-2.5 text-white font-semibold text-sm rounded-xl disabled:opacity-50 transition shadow-md ${
                    selectedKonten?.status === 'terbit'
                      ? 'bg-emerald-700 hover:bg-emerald-800 shadow-emerald-200'
                      : 'bg-sigap-700 hover:bg-sigap-800 shadow-sigap-200'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  {savePublicationMutation.isPending
                    ? 'Menyimpan...'
                    : selectedKonten?.status === 'terbit'
                      ? 'Perbarui Data Publikasi'
                      : 'Simpan Data Publikasi'
                  }
                </button>
              </div>

              {/* Riwayat Kanal yang Sudah Tercatat */}
              {selectedKonten.publikasi && selectedKonten.publikasi.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Tautan Terbit yang Sudah Tersimpan
                  </h3>
                  <div className="space-y-2">
                    {selectedKonten.publikasi.map((pub) => (
                      <div
                        key={pub.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-xs"
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                            {pub.kanal?.nama}:
                          </span>
                          {pub.url_post ? (
                            <a
                              href={pub.url_post}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sigap-600 dark:text-sigap-400 hover:underline flex items-center gap-1 truncate"
                            >
                              <span className="truncate">{pub.url_post}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-slate-400 italic">Tanpa tautan spesifik</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <span className="text-slate-400 text-[11px]">
                            {pub.published_at ? new Date(pub.published_at).toLocaleDateString('id-ID', {
                              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            }) : '-'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Hapus pencatatan kanal "${pub.kanal?.nama}" dari konten ini?`)) {
                                deletePublikasiMutation.mutate(pub.id);
                              }
                            }}
                            className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20"
                            title="Hapus data publikasi kanal ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center shadow-sm">
              <PlusCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-700 dark:text-slate-300 text-base">Pilih Konten</h3>
              <p className="text-xs text-slate-400 mt-1">Pilih konten di sebelah kiri untuk mulai mendata publikasi.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublisherPage;

