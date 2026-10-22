import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, CheckCircle2, RotateCcw, XCircle,
  Globe, AlertCircle, ExternalLink, X, Video
} from 'lucide-react';
import apiClient from '../api/client';
import type { Konten, AlurTahap } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Stepper } from '../components/Stepper';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || 'http://127.0.0.1:8000/storage';

const ActionModal: React.FC<{
  isOpen: boolean;
  type: 'approve' | 'revisi' | 'tolak';
  kontenJudul: string;
  currentTahap?: string;
  alurTahap?: AlurTahap[];
  onClose: () => void;
  onConfirm: (catatan: string, targetTahap?: string) => void;
  isPending: boolean;
}> = ({ isOpen, type, kontenJudul, currentTahap, alurTahap, onClose, onConfirm, isPending }) => {
  const [catatan, setCatatan] = useState('');
  const [targetTahap, setTargetTahap] = useState('penulis');

  if (!isOpen) return null;

  // Bangun daftar opsi target revisi (penulis asli + tahap-tahap sebelum tahap saat ini)
  const currentUrutan = alurTahap?.find((a) => a.kode_tahap === currentTahap)?.urutan ?? 999;
  const previousStages = alurTahap?.filter((a) => a.urutan < currentUrutan && a.aktif) || [];

  const configs = {
    approve: {
      title: 'Setujui Konten',
      description: `Konten "${kontenJudul}" akan diteruskan ke tahap berikutnya.`,
      placeholder: 'Catatan persetujuan (opsional)...',
      required: false,
      btnClass: 'bg-emerald-600 hover:bg-emerald-700',
      btnText: 'Setujui & Teruskan',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
    },
    revisi: {
      title: 'Kembalikan untuk Revisi',
      description: `Pilih ke siapa konten "${kontenJudul}" akan dikembalikan untuk diperbaiki.`,
      placeholder: 'Tuliskan poin-poin yang perlu diperbaiki...',
      required: true,
      btnClass: 'bg-amber-600 hover:bg-amber-700',
      btnText: 'Kirim Catatan Revisi',
      icon: <RotateCcw className="w-5 h-5 text-amber-600" />,
    },
    tolak: {
      title: 'Tolak Konten',
      description: `Konten "${kontenJudul}" akan ditolak secara permanen.`,
      placeholder: 'Jelaskan alasan penolakan konten ini...',
      required: true,
      btnClass: 'bg-rose-600 hover:bg-rose-700',
      btnText: 'Konfirmasi Penolakan',
      icon: <XCircle className="w-5 h-5 text-rose-600" />,
    },
  };

  const config = configs[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-fade-in">
        <div className="flex items-center gap-3">
          {config.icon}
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200">{config.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{config.description}</p>
          </div>
        </div>

        {type === 'revisi' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Kembalikan Revisi Ke:
            </label>
            <select
              value={targetTahap}
              onChange={(e) => setTargetTahap(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="penulis">Penulis Asli (Pembuat Konten)</option>
              {previousStages.map((st) => (
                <option key={st.kode_tahap} value={st.kode_tahap}>
                  {st.nama} ({st.role_penyetuju.toUpperCase()})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              {targetTahap === 'penulis'
                ? 'Status konten akan kembali ke Draf/Revisi penulis untuk perbaikan materi.'
                : `Konten akan dikembalikan ke peninjau tahap ${targetTahap.toUpperCase()} untuk ditinjau ulang.`}
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
            {type === 'approve' ? 'Catatan Tambahan (Opsional)' : 'Catatan / Alasan'}
          </label>
          <textarea
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder={config.placeholder}
            rows={4}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sigap-500"
          />
        </div>

        {config.required && !catatan.trim() && (
          <p className="text-xs text-rose-500 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" /> Catatan wajib diisi untuk aksi ini.
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition">
            Batal
          </button>
          <button
            onClick={() => onConfirm(catatan, type === 'revisi' ? targetTahap : undefined)}
            disabled={isPending || (config.required && !catatan.trim())}
            className={`px-5 py-2 text-sm font-semibold text-white rounded-xl disabled:opacity-50 transition ${config.btnClass}`}
          >
            {isPending ? 'Memproses...' : config.btnText}
          </button>
        </div>
      </div>
    </div>
  );
};

const KontenDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  useAuth();

  const [modal, setModal] = useState<null | 'approve' | 'revisi' | 'tolak'>(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [selectedImageModal, setSelectedImageModal] = useState<{ url: string; caption?: string } | null>(null);

  const { data: konten, isLoading, error } = useQuery<Konten>({
    queryKey: ['konten-detail', id],
    queryFn: async () => {
      const res = await apiClient.get(`/konten/${id}`);
      return res.data.data;
    },
  });

  const { data: alurTahap } = useQuery<AlurTahap[]>({
    queryKey: ['alur-tahap'],
    queryFn: async () => {
      const res = await apiClient.get('/alur-tahap');
      return res.data.data;
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ action, catatan, targetTahap }: { action: string; catatan: string; targetTahap?: string }) => {
      return apiClient.post(`/konten/${id}/${action}`, { catatan, target_tahap: targetTahap });
    },
    onSuccess: (_, vars) => {
      const messages: Record<string, string> = {
        approve: 'Konten berhasil disetujui dan diteruskan.',
        revisi: 'Catatan revisi berhasil dikirim ke pihak terkait.',
        tolak: 'Konten telah ditolak.',
        submit: 'Konten berhasil diajukan ke Kepala Bidang.',
      };
      toast.success(messages[vars.action] || 'Berhasil.');
      setModal(null);
      queryClient.invalidateQueries({ queryKey: ['konten-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['konten-list'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Terjadi kesalahan.');
      setModal(null);
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-5 h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !konten) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <p className="text-slate-500 dark:text-slate-400">Konten tidak ditemukan.</p>
      </div>
    );
  }

  const canApprove = konten.permissions?.can_approve;
  const canSubmit = konten.permissions?.can_submit;
  const canUpdate = konten.permissions?.can_update;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/konten')} className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-700 transition mt-1">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{konten.judul}</h1>
            <StatusBadge status={konten.status} tahapSaatIni={konten.tahap_saat_ini} className="shrink-0 mt-1" />
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
            <span>{konten.jenis_konten?.nama}</span>
            <span>·</span>
            <span>{konten.bidang?.nama}</span>
            <span>·</span>
            <span>Revisi ke-{konten.revisi_ke}</span>
          </div>
        </div>
      </div>

      {/* Stepper Progress */}
      {alurTahap && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm">
          <h2 className="font-bold text-slate-700 dark:text-slate-300 mb-3 text-sm">Progres Alur Persetujuan</h2>
          <Stepper
            stages={alurTahap}
            currentStage={konten.tahap_saat_ini}
            status={konten.status}
          />
        </div>
      )}

      {/* Revisi Banner */}
      {konten.status === 'revisi' && konten.persetujuan?.[0] && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">Perlu Revisi dari {konten.persetujuan[0].reviewer?.nama}</p>
            <p className="text-amber-700 text-sm mt-1">{konten.persetujuan[0].catatan}</p>
          </div>
        </div>
      )}

      {/* Grid Foto: Ukuran Ringkas & Proporsional (Tidak Memenuhi Layar) */}
      <div className="flex flex-wrap lg:flex-nowrap gap-4 items-start">
        {/* Photos Lanskap */}
        {konten.foto?.length > 0 && (
          <div className="w-full max-w-xl bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs overflow-hidden flex flex-col">
            <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Foto Berita (16:9)</span>
              <span className="text-[11px] text-slate-400">Klik untuk memperbesar</span>
            </div>
            {/* Foto Utama - Batasi tinggi & proporsional */}
            <div
              onClick={() => {
                const url = konten.foto[activePhoto]?.url?.startsWith('http')
                  ? konten.foto[activePhoto].url
                  : `${STORAGE_URL}/${konten.foto[activePhoto]?.path}`;
                setSelectedImageModal({ url, caption: konten.foto[activePhoto]?.caption });
              }}
              className="relative aspect-video max-h-[250px] sm:max-h-[270px] bg-slate-950 cursor-zoom-in group overflow-hidden flex items-center justify-center"
            >
              <img
                src={konten.foto[activePhoto]?.url?.startsWith('http') ? konten.foto[activePhoto].url : `${STORAGE_URL}/${konten.foto[activePhoto]?.path}`}
                alt={`Foto ${activePhoto + 1}`}
                className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <span className="bg-black/75 text-white text-[11px] px-3 py-1 rounded-full font-medium shadow-sm backdrop-blur-xs">
                  Perbesar foto
                </span>
              </div>
              {konten.foto[activePhoto]?.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 py-1.5">
                  <p className="text-white text-xs leading-relaxed line-clamp-1">{konten.foto[activePhoto].caption}</p>
                </div>
              )}
            </div>
            {/* Thumbnail list */}
            {konten.foto.length > 1 && (
              <div className="flex gap-2 p-2 bg-slate-50/70 dark:bg-slate-900/40 overflow-x-auto border-t border-slate-100 dark:border-slate-700">
                {konten.foto.map((f, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePhoto(i)}
                    className={`w-16 aspect-video rounded-lg overflow-hidden border-2 transition shrink-0 ${
                      i === activePhoto ? 'border-blue-600 shadow-xs scale-105' : 'border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={f.url?.startsWith('http') ? f.url : `${STORAGE_URL}/${f.path}`}
                      alt={`Thumbnail ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Foto Sosmed 1:1 */}
        {konten.foto_sosmed_url && (
          <div className="w-full sm:w-60 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs overflow-hidden flex flex-col shrink-0">
            <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Sosmed (1:1)</span>
              <span className="text-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold px-2 py-0.5 rounded-full">IG / FB</span>
            </div>
            <div
              onClick={() => setSelectedImageModal({ url: konten.foto_sosmed_url!, caption: 'Foto Media Sosial (1:1 Persegi)' })}
              className="relative aspect-square max-h-[250px] sm:max-h-[270px] bg-slate-950 cursor-zoom-in group overflow-hidden flex items-center justify-center"
            >
              <img
                src={konten.foto_sosmed_url}
                alt="Foto Khusus Media Sosial"
                className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <span className="bg-black/75 text-white text-[11px] px-3 py-1 rounded-full font-medium shadow-sm backdrop-blur-xs">
                  Perbesar foto
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tautan Video Konten jika tersedia */}
      {konten.video_url && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center shrink-0">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tautan Video Konten</h3>
                <a
                  href={konten.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1.5 mt-0.5 break-all"
                >
                  <span>{konten.video_url}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>
            </div>
            <a
              href={konten.video_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka Video</span>
            </a>
          </div>
        </div>
      )}

      {/* Content Body */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6">
        <h2 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-4">Naskah Konten</h2>
        <div
          className="prose prose-slate prose-sm max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: konten.isi }}
        />
      </div>

      {/* Informasi Publikasi & Link Tayang */}
      {konten.publikasi && konten.publikasi.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-600" />
            <h2 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Status & Tautan Publikasi</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 pt-1">
            {konten.publikasi.map((pub) => (
              <div
                key={pub.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 flex flex-col justify-between gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs capitalize">
                    {pub.kanal?.nama || 'Kanal'}
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-0.5 rounded-full font-semibold">
                    {pub.status}
                  </span>
                </div>
                {pub.url_post ? (
                  <a
                    href={pub.url_post}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sigap-600 dark:text-sigap-400 hover:underline text-xs flex items-center gap-1 truncate font-medium"
                  >
                    <span className="truncate">{pub.url_post}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                ) : (
                  <span className="text-xs text-slate-400 italic">Tanpa URL spesifik</span>
                )}
                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span>Waktu Terbit:</span>
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    {pub.published_at ? new Date(pub.published_at).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) : '-'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Row - Tombol Aksi Kompak & Proporsional */}
      {(canApprove || canSubmit || canUpdate || (konten.permissions?.can_publish && ['disetujui', 'terbit'].includes(konten.status))) && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs p-3 sm:p-3.5 flex flex-wrap items-center gap-2">
          {canUpdate && (
            <button
              onClick={() => navigate(`/konten/${konten.id}/edit`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium text-xs sm:text-sm rounded-xl transition"
            >
              <span>Edit Konten</span>
            </button>
          )}
          {canSubmit && ['draft', 'revisi'].includes(konten.status) && (
            <button
              onClick={() => actionMutation.mutate({ action: 'submit', catatan: '' })}
              disabled={actionMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm rounded-xl shadow-xs transition"
            >
              <span>Ajukan ke Kabid</span>
            </button>
          )}
          {canApprove && konten.status === 'diproses' && (
            <>
              <button
                onClick={() => setModal('approve')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs sm:text-sm rounded-xl shadow-xs transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Setujui</span>
              </button>
              <button
                onClick={() => setModal('revisi')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs sm:text-sm rounded-xl shadow-xs transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Revisi</span>
              </button>
              <button
                onClick={() => setModal('tolak')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs sm:text-sm rounded-xl shadow-xs transition"
              >
                <XCircle className="w-4 h-4" />
                <span>Tolak</span>
              </button>
            </>
          )}
          {konten.permissions?.can_publish && ['disetujui', 'terbit'].includes(konten.status) && (
            <button
              onClick={() => navigate(`/publisher?konten_id=${konten.id}`)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-white font-medium text-xs sm:text-sm rounded-xl shadow-xs transition ${
                konten.status === 'terbit'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>{konten.status === 'terbit' ? 'Perbarui Data Publikasi' : 'Catat Publikasi'}</span>
            </button>
          )}
        </div>
      )}

      {/* Timeline Riwayat */}
      {konten.persetujuan?.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5">
          <h2 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-4">Riwayat Persetujuan</h2>
          <div className="space-y-4">
            {konten.persetujuan.map((p) => (
              <div key={p.id} className="flex gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  p.aksi === 'setujui' ? 'bg-emerald-50 text-emerald-600' :
                  p.aksi === 'revisi' ? 'bg-amber-50 text-amber-600' :
                  'bg-rose-50 text-rose-600'
                }`}>
                  {p.aksi === 'setujui' ? <CheckCircle2 className="w-4 h-4" /> :
                   p.aksi === 'revisi' ? <RotateCcw className="w-4 h-4" /> :
                   <XCircle className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{p.reviewer?.nama}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      p.aksi === 'setujui' ? 'bg-emerald-50 text-emerald-700' :
                      p.aksi === 'revisi' ? 'bg-amber-50 text-amber-700' :
                      'bg-rose-50 text-rose-700'
                    }`}>
                      {p.aksi === 'setujui' ? 'Menyetujui' : p.aksi === 'revisi' ? 'Meminta Revisi' : 'Menolak'}
                    </span>
                    <span className="text-xs text-slate-400 capitalize">pada tahap {p.tahap}</span>
                    {p.target_tahap && (
                      <span className="text-[11px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium">
                        Dikembalikan ke: {p.target_tahap.toUpperCase()}
                      </span>
                    )}
                  </div>
                  {p.catatan && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 bg-slate-50 dark:bg-slate-900/50 rounded-lg px-3 py-2">{p.catatan}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(p.acted_at).toLocaleDateString('id-ID', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })} · Revisi ke-{p.revisi_ke}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {modal && (
        <ActionModal
          isOpen={true}
          type={modal}
          kontenJudul={konten.judul}
          currentTahap={konten.tahap_saat_ini}
          alurTahap={alurTahap}
          onClose={() => setModal(null)}
          onConfirm={(catatan, targetTahap) => actionMutation.mutate({ action: modal, catatan, targetTahap })}
          isPending={actionMutation.isPending}
        />
      )}

      {/* Modal Lightbox Foto Ukuran Penuh */}
      {selectedImageModal && (
        <div
          onClick={() => setSelectedImageModal(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700/60"
          >
            <div className="absolute top-3 right-3 z-10">
              <button
                onClick={() => setSelectedImageModal(null)}
                className="p-2 bg-black/60 hover:bg-black/90 text-white rounded-full transition"
                title="Tutup (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center justify-center max-h-[80vh] bg-black">
              <img
                src={selectedImageModal.url}
                alt="Pratinjau Foto"
                className="max-h-[80vh] w-auto max-w-full object-contain"
              />
            </div>
            {selectedImageModal.caption && (
              <div className="p-4 bg-slate-900 border-t border-slate-800 text-slate-200 text-sm">
                <p>{selectedImageModal.caption}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default KontenDetailPage;

