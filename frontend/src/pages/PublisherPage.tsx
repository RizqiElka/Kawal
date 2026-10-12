import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Globe, Video, CheckCircle2, XCircle, RotateCcw, Calendar, ExternalLink, Share2, ThumbsUp } from 'lucide-react';
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

const PublisherPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const preselectedKontenId = searchParams.get('konten_id');

  const [selectedKontenId, setSelectedKontenId] = useState<number | null>(
    preselectedKontenId ? parseInt(preselectedKontenId) : null
  );
  const [selectedChannels, setSelectedChannels] = useState<Set<number>>(new Set());
  const [jadwalAt, setJadwalAt] = useState<Record<number, string>>({});

  const { data: readyKonten } = useQuery<Konten[]>({
    queryKey: ['konten-ready-publish'],
    queryFn: async () => {
      const res = await apiClient.get('/konten?status=disetujui&per_page=50');
      return res.data.data;
    },
  });

  const { data: kanals } = useQuery<KanalPublikasi[]>({
    queryKey: ['kanals'],
    queryFn: async () => {
      const res = await apiClient.get('/kanal');
      return res.data.data;
    },
  });

  const selectedKonten = readyKonten?.find((k) => k.id === selectedKontenId);

  const publishMutation = useMutation({
    mutationFn: async () => {
      const channels = Array.from(selectedChannels).map((kanalId) => ({
        kanal_id: kanalId,
        jadwal_at: jadwalAt[kanalId] || null,
      }));
      return apiClient.post(`/konten/${selectedKontenId}/publish`, { channels });
    },
    onSuccess: () => {
      toast.success('Tugas publikasi berhasil dikirim ke antrean!');
      queryClient.invalidateQueries({ queryKey: ['konten-ready-publish'] });
      setSelectedChannels(new Set());
      setJadwalAt({});
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal memulai proses publikasi.');
    },
  });

  const toggleChannel = (id: number) => {
    setSelectedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Halaman Publikasi</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Pilih konten yang telah disetujui, pilih kanal tujuan, dan atur jadwal publikasi.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Pilih Konten */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="font-bold text-slate-800 dark:text-slate-200">Konten Siap Terbit</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Status: Disetujui oleh Kepala Dinas</p>
          </div>

          {!readyKonten?.length ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">Belum ada konten yang siap diterbitkan.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-96 overflow-y-auto">
              {readyKonten.map((k) => (
                <button
                  key={k.id}
                  onClick={() => setSelectedKontenId(k.id)}
                  className={`w-full text-left px-5 py-4 transition hover:bg-slate-50 dark:hover:bg-slate-700/60 ${
                    selectedKontenId === k.id ? 'bg-sigap-50 dark:bg-sigap-900/30 border-l-4 border-sigap-600' : ''
                  }`}
                >
                  <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">{k.judul}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={k.status} />
                    <span className="text-xs text-slate-400">{k.bidang?.nama}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Pilih Kanal */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="font-bold text-slate-800 dark:text-slate-200">Pilih Kanal Publikasi</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Pilih satu atau lebih kanal tujuan</p>
          </div>

          <div className="p-5 space-y-3">
            {kanals?.filter(k => k.aktif).map((kanal) => {
              const isSelected = selectedChannels.has(kanal.id);
              return (
                <div
                  key={kanal.id}
                  className={`rounded-xl border-2 p-4 transition cursor-pointer ${
                    isSelected ? 'border-sigap-600 bg-sigap-50 dark:bg-sigap-900/20' : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                  }`}
                  onClick={() => toggleChannel(kanal.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${KANAL_COLORS[kanal.kode] || 'bg-slate-50 dark:bg-slate-900/50 text-slate-600 border-slate-200 dark:border-slate-700'}`}>
                      {KANAL_ICONS[kanal.kode] || <Globe className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{kanal.nama}</div>
                      <div className="text-xs text-slate-400 capitalize">{kanal.kode}</div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 transition ${
                      isSelected ? 'bg-sigap-600 border-sigap-600' : 'border-slate-300 dark:border-slate-500'
                    } flex items-center justify-center`}>
                      {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        type="datetime-local"
                        value={jadwalAt[kanal.id] || ''}
                        onChange={(e) => setJadwalAt((prev) => ({ ...prev, [kanal.id]: e.target.value }))}
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sigap-500"
                        placeholder="Jadwal (biarkan kosong untuk segera)"
                      />
                      <span className="text-xs text-slate-400">(opsional)</span>
                    </div>
                  )}
                </div>
              );
            })}

            <button
              onClick={() => publishMutation.mutate()}
              disabled={!selectedKontenId || selectedChannels.size === 0 || publishMutation.isPending}
              className="w-full py-3 bg-sigap-700 text-white font-semibold text-sm rounded-xl hover:bg-sigap-800 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md shadow-sigap-200"
            >
              {publishMutation.isPending ? 'Memproses...' : `Publikasikan ke ${selectedChannels.size} Kanal`}
            </button>
          </div>
        </div>
      </div>

      {/* Riwayat Publikasi */}
      {selectedKonten?.publikasi && selectedKonten.publikasi.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="font-bold text-slate-800 dark:text-slate-200">Status Publikasi Saat Ini</h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {selectedKonten.publikasi.map((pub) => (
              <div key={pub.id} className="px-5 py-4 flex items-center gap-4">
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${KANAL_COLORS[pub.kanal?.kode || 'web']}`}>
                  {KANAL_ICONS[pub.kanal?.kode || 'web']}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-800 dark:text-slate-200 text-sm">{pub.kanal?.nama}</div>
                  {pub.pesan_error && (
                    <p className="text-xs text-rose-500 mt-0.5">{pub.pesan_error}</p>
                  )}
                  {pub.url_post && (
                    <a href={pub.url_post} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-sigap-600 hover:underline flex items-center gap-1 mt-0.5">
                      <ExternalLink className="w-3 h-3" /> Lihat Posting
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {pub.status === 'berhasil' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  {pub.status === 'gagal' && <XCircle className="w-4 h-4 text-rose-600" />}
                  {pub.status === 'menunggu' && <RotateCcw className="w-4 h-4 text-amber-500 animate-spin" />}
                  <span className={`text-xs font-semibold capitalize px-2 py-0.5 rounded-full ${
                    pub.status === 'berhasil' ? 'bg-emerald-50 text-emerald-700' :
                    pub.status === 'gagal' ? 'bg-rose-50 text-rose-700' :
                    'bg-amber-50 text-amber-700'
                  }`}>
                    {pub.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PublisherPage;
