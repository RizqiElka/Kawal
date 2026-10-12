import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, CheckCircle2, RotateCcw, XCircle,
  Globe, AlertCircle
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
  onClose: () => void;
  onConfirm: (catatan: string) => void;
  isPending: boolean;
}> = ({ isOpen, type, kontenJudul, onClose, onConfirm, isPending }) => {
  const [catatan, setCatatan] = useState('');

  if (!isOpen) return null;

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
      description: `Konten "${kontenJudul}" akan dikembalikan ke penulis.`,
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
        <textarea
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder={config.placeholder}
          rows={4}
          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sigap-500"
        />
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
            onClick={() => onConfirm(catatan)}
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
    mutationFn: async ({ action, catatan }: { action: string; catatan: string }) => {
      return apiClient.post(`/konten/${id}/${action}`, { catatan });
    },
    onSuccess: (_, vars) => {
      const messages: Record<string, string> = {
        approve: 'Konten berhasil disetujui dan diteruskan.',
        revisi: 'Catatan revisi berhasil dikirim ke penulis.',
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

      {/* Photos */}
      {konten.foto?.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="relative aspect-video">
            <img
              src={konten.foto[activePhoto]?.url?.startsWith('http') ? konten.foto[activePhoto].url : `${STORAGE_URL}/${konten.foto[activePhoto]?.path}`}
              alt={`Foto ${activePhoto + 1}`}
              className="w-full h-full object-cover"
            />
            {konten.foto[activePhoto]?.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 px-4 py-3">
                <p className="text-white text-sm">{konten.foto[activePhoto].caption}</p>
              </div>
            )}
          </div>
          <div className="flex gap-2 p-3">
            {konten.foto.map((f, i) => (
              <button
                key={i}
                onClick={() => setActivePhoto(i)}
                className={`flex-1 aspect-video rounded-xl overflow-hidden border-2 transition ${
                  i === activePhoto ? 'border-sigap-600' : 'border-transparent opacity-60 hover:opacity-80'
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
        </div>
      )}

      {/* Content Body */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-6">
        <h2 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-4">Naskah Konten</h2>
        <div
          className="prose prose-slate prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: konten.isi }}
        />
      </div>

      {/* Action Row */}
      {(canApprove || canSubmit || canUpdate) && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-5 flex flex-wrap gap-3">
          {canUpdate && (
            <button
              onClick={() => navigate(`/konten/${konten.id}/edit`)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm rounded-xl hover:bg-slate-200 transition"
            >
              Edit Konten
            </button>
          )}
          {canSubmit && ['draft', 'revisi'].includes(konten.status) && (
            <button
              onClick={() => actionMutation.mutate({ action: 'submit', catatan: '' })}
              disabled={actionMutation.isPending}
              className="flex items-center gap-2 px-4 py-2.5 bg-sigap-700 text-white font-semibold text-sm rounded-xl hover:bg-sigap-800 transition shadow-sm"
            >
              Ajukan ke Kabid
            </button>
          )}
          {canApprove && konten.status === 'diproses' && (
            <>
              <button
                onClick={() => setModal('approve')}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-semibold text-sm rounded-xl hover:bg-emerald-700 transition"
              >
                <CheckCircle2 className="w-4 h-4" /> Setujui
              </button>
              <button
                onClick={() => setModal('revisi')}
                className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white font-semibold text-sm rounded-xl hover:bg-amber-600 transition"
              >
                <RotateCcw className="w-4 h-4" /> Revisi
              </button>
              <button
                onClick={() => setModal('tolak')}
                className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white font-semibold text-sm rounded-xl hover:bg-rose-700 transition"
              >
                <XCircle className="w-4 h-4" /> Tolak
              </button>
            </>
          )}
          {konten.permissions?.can_publish && ['disetujui', 'terbit'].includes(konten.status) && (
            <button
              onClick={() => navigate(`/publisher?konten_id=${konten.id}`)}
              className="flex items-center gap-2 px-4 py-2.5 bg-sigap-900 text-white font-semibold text-sm rounded-xl hover:bg-sigap-950 transition"
            >
              <Globe className="w-4 h-4" /> Publikasikan
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
                  </div>
                  {p.catatan && (
                    <p className="text-sm text-slate-600 mt-1 bg-slate-50 dark:bg-slate-900/50 rounded-lg px-3 py-2">{p.catatan}</p>
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
          onClose={() => setModal(null)}
          onConfirm={(catatan) => actionMutation.mutate({ action: modal, catatan })}
          isPending={actionMutation.isPending}
        />
      )}
    </div>
  );
};

export default KontenDetailPage;
