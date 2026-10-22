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
  web: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  instagram: 'bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-900',
  facebook: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900',
  x: 'bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  tiktok: 'bg-gray-50 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
};

interface KanalFormEntry {
  kanal_id: number;
  selected: boolean;
  url_post: string;
  published_at: string;
}

const PublisherPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const preselectedKontenId = searchParams.get('konten_id');

  const [selectedKontenId, setSelectedKontenId] = useState<number | null>(
    preselectedKontenId ? parseInt(preselectedKontenId) : null
  );

  // Form input untuk masing-masing kanal yang sudah ditayangkan
  const [channelEntries, setChannelEntries] = useState<Record<number, KanalFormEntry>>({});

  const { data: approvedKonten, isLoading: isLoadingKonten } = useQuery<Konten[]>({
    queryKey: ['konten-approved-list'],
    queryFn: async () => {
      const res = await apiClient.get('/konten?per_page=100&status=disetujui');
      return (res.data.data as Konten[]).filter((k) => k.status === 'disetujui');
    },
  });

  // Fetch konten yang sudah terbit jika diakses langsung via URL param
  const { data: preselectedTerbit } = useQuery<Konten | null>({
    queryKey: ['konten-terbit-preselected', preselectedKontenId],
    queryFn: async () => {
      if (!preselectedKontenId) return null;
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

  const selectedKonten = approvedKonten?.find((k) => k.id === selectedKontenId)
    ?? (preselectedTerbit?.id === selectedKontenId ? preselectedTerbit : undefined);

  // Inisialisasi data form ketika memilih konten atau ketika data kanal tersedia
  useEffect(() => {
    if (kanals && selectedKonten) {
      const initial: Record<number, KanalFormEntry> = {};
      const nowLocal = new Date().toISOString().slice(0, 16);

      kanals.forEach((kanal) => {
        const existingPub = selectedKonten.publikasi?.find((p) => p.kanal_id === kanal.id);
        initial[kanal.id] = {
          kanal_id: kanal.id,
          selected: !!existingPub || false,
          url_post: existingPub?.url_post || '',
          published_at: existingPub?.published_at
            ? new Date(existingPub.published_at).toISOString().slice(0, 16)
            : nowLocal,
        };
      });
      setChannelEntries(initial);
    }
  }, [kanals, selectedKonten]);

  const savePublicationMutation = useMutation({
    mutationFn: async () => {
      if (!selectedKontenId) return;

      const activePublications = Object.values(channelEntries)
        .filter((entry) => entry.selected)
        .map((entry) => ({
          kanal_id: entry.kanal_id,
          url_post: entry.url_post.trim() || null,
          published_at: entry.published_at || null,
          status: 'berhasil',
        }));

      if (activePublications.length === 0) {
        throw new Error('Pilih dan centang minimal satu kanal yang sudah ditayangkan.');
      }

      return apiClient.post(`/konten/${selectedKontenId}/publish`, {
        publications: activePublications,
      });
    },
    onSuccess: (res: any) => {
      toast.success(res?.data?.message || 'Data publikasi berhasil disimpan!');
      queryClient.invalidateQueries({ queryKey: ['konten-approved-list'] });
      queryClient.invalidateQueries({ queryKey: ['konten-list'] });
      queryClient.invalidateQueries({ queryKey: ['konten-terbit-preselected'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal menyimpan data publikasi.');
    },
  });

  const deletePublikasiMutation = useMutation({
    mutationFn: (publikasiId: number) => apiClient.delete(`/publikasi/${publikasiId}`),
    onSuccess: () => {
      toast.success('Data publikasi kanal berhasil dihapus.');
      queryClient.invalidateQueries({ queryKey: ['konten-approved-list'] });
      queryClient.invalidateQueries({ queryKey: ['konten-list'] });
      queryClient.invalidateQueries({ queryKey: ['konten-terbit-preselected'] });
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

  const selectedEntries = Object.values(channelEntries).filter((e) => e.selected);

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pendataan Publikasi Kanal</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Catat dan dokumentasikan tautan link berita/postingan yang sudah resmi tayang di masing-masing media.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Kolom Kiri: Daftar Konten Siap Terbit */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Siap Didata ({approvedKonten?.length || 0})
            </h2>
          </div>

          <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-1">
            {isLoadingKonten ? (
              <div className="p-8 text-center text-slate-400 text-sm">Memuat konten disetujui...</div>
            ) : !approvedKonten || approvedKonten.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-slate-400 text-sm">
                Belum ada konten berstatus "Disetujui" yang siap dipublikasikan.
              </div>
            ) : (
              approvedKonten.map((konten) => {
                const isSelected = konten.id === selectedKontenId;
                const pubCount = konten.publikasi?.length || 0;

                return (
                  <button
                    key={konten.id}
                    type="button"
                    onClick={() => {
                      setSelectedKontenId(konten.id);
                      setSearchParams({ konten_id: konten.id.toString() });
                    }}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-900/20 shadow-sm'
                        : 'border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                        {konten.bidang?.nama || 'Umum'}
                      </span>
                      {pubCount > 0 ? (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> {pubCount} Kanal Terdata
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Belum didata</span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2 leading-snug">
                      {konten.judul}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2.5">
                      <span>Penulis: {konten.user?.nama}</span>
                      <span>{new Date(konten.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
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
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-6 space-y-6">
              {/* Header Konten Terpilih */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs uppercase tracking-wider font-bold text-blue-600 dark:text-blue-400">
                    {selectedKonten.status === 'terbit' ? 'Perbarui Data Publikasi' : 'Pencatatan Bukti Publikasi'}
                  </span>
                  <StatusBadge status={selectedKonten.status} />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
                  {selectedKonten.judul}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Penulis: <strong>{selectedKonten.user?.nama}</strong> • Bidang: <strong>{selectedKonten.bidang?.nama}</strong>
                </p>
              </div>

              {/* Form Input Per Kanal */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Centang Kanal yang Sudah Tayang & Masukkan Tautannya
                  </h3>
                  <span className="text-xs text-slate-500">
                    {selectedEntries.length} kanal dipilih
                  </span>
                </div>

                <div className="space-y-3">
                  {kanals?.map((kanal) => {
                    const entry = channelEntries[kanal.id] || {
                      kanal_id: kanal.id,
                      selected: false,
                      url_post: '',
                      published_at: new Date().toISOString().slice(0, 16),
                    };

                    const existingPub = selectedKonten.publikasi?.find((p) => p.kanal_id === kanal.id);

                    return (
                      <div
                        key={kanal.id}
                        className={`rounded-2xl border-2 p-4 transition ${
                          entry.selected
                            ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/20'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id={`check-kanal-${kanal.id}`}
                            checked={entry.selected}
                            onChange={(e) => updateEntry(kanal.id, 'selected', e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                          />
                          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${KANAL_COLORS[kanal.kode]}`}>
                            {KANAL_ICONS[kanal.kode] || <Globe className="w-5 h-5" />}
                          </div>
                          <div className="flex-1">
                            <label htmlFor={`check-kanal-${kanal.id}`} className="font-semibold text-slate-800 dark:text-slate-200 text-sm cursor-pointer block">
                              {kanal.nama}
                            </label>
                            <span className="text-[11px] text-slate-400 capitalize">Kanal {kanal.kode}</span>
                          </div>

                          {existingPub && (
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Sudah Terdata
                            </span>
                          )}
                        </div>

                        {/* Input URL & Waktu Terbit bila kanal dicentang */}
                        {entry.selected && (
                          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 grid sm:grid-cols-12 gap-3 animate-fade-in">
                            <div className="sm:col-span-7">
                              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                                <Link2 className="w-3.5 h-3.5 text-blue-600" /> URL Link Postingan / Berita
                              </label>
                              <input
                                type="url"
                                placeholder={`https://${kanal.kode === 'web' ? 'instansi.go.id/berita/...' : 'instagram.com/p/...'}`}
                                value={entry.url_post}
                                onChange={(e) => updateEntry(kanal.id, 'url_post', e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div className="sm:col-span-5">
                              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-blue-600" /> Waktu Saat Di-Up
                              </label>
                              <input
                                type="datetime-local"
                                value={entry.published_at}
                                onChange={(e) => updateEntry(kanal.id, 'published_at', e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-700">
                <span className="text-xs text-slate-500">
                  {selectedEntries.length} kanal akan disimpan
                </span>
                <button
                  type="button"
                  onClick={() => savePublicationMutation.mutate()}
                  disabled={savePublicationMutation.isPending || selectedEntries.length === 0}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl disabled:opacity-50 transition shadow-md shadow-blue-200 dark:shadow-none"
                >
                  <Save className="w-4 h-4" />
                  {savePublicationMutation.isPending ? 'Menyimpan...' : 'Simpan Data Publikasi'}
                </button>
              </div>

              {/* Riwayat Kanal yang Sudah Tercatat */}
              {selectedKonten.publikasi && selectedKonten.publikasi.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Tautan Terbit yang Sudah Tersimpan
                  </h3>
                  <div className="space-y-2">
                    {selectedKonten.publikasi.map((pub) => (
                      <div
                        key={pub.id}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-xs"
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
                              className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate font-medium"
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
                            className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition"
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
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center shadow-xs">
              <PlusCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-700 dark:text-slate-300 text-base">Pilih Konten</h3>
              <p className="text-xs text-slate-400 mt-1">Pilih salah satu konten disetujui di sebelah kiri untuk mencatat link publikasinya.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublisherPage;
