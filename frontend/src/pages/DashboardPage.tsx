import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Clock, AlertTriangle,
  Globe, TrendingUp, ArrowRight, Eye, BarChart3
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import type { Konten } from '../types';

interface DashboardStats {
  total_konten: number;
  menunggu_persetujuan: number;
  perlu_revisi: number;
  telah_terbit: number;
  konten_per_bidang: { bidang: string; total: number }[];
  distribusi_status: { status: string; total: number }[];
  tren_bulanan: { bulan: string; total: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#94a3b8',
  diproses: '#f59e0b',
  revisi: '#f87171',
  ditolak: '#ef4444',
  disetujui: '#3b82f6',
  terbit: '#10b981',
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draf',
  diproses: 'Diproses',
  revisi: 'Revisi',
  ditolak: 'Ditolak',
  disetujui: 'Disetujui',
  terbit: 'Terbit',
};

const SkeletonCard = () => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 animate-pulse">
    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-3" />
    <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-16" />
  </div>
);

const DashboardPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard/stats');
      return res.data.data;
    },
  });

  const { data: recentKonten, isLoading: kontenLoading } = useQuery<Konten[]>({
    queryKey: ['dashboard-recent'],
    queryFn: async () => {
      const res = await apiClient.get('/konten?per_page=8');
      return res.data.data;
    },
  });

  const statCards = [
    {
      label: 'Total Konten Diajukan',
      value: stats?.total_konten ?? 0,
      icon: <FileText className="w-5 h-5" />,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30',
      border: 'border-blue-100 dark:border-blue-900/50',
    },
    {
      label: 'Menunggu Persetujuan',
      value: stats?.menunggu_persetujuan ?? 0,
      icon: <Clock className="w-5 h-5" />,
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30',
      border: 'border-amber-100 dark:border-amber-900/50',
    },
    {
      label: 'Perlu Direvisi',
      value: stats?.perlu_revisi ?? 0,
      icon: <AlertTriangle className="w-5 h-5" />,
      color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30',
      border: 'border-rose-100 dark:border-rose-900/50',
    },
    {
      label: 'Telah Diterbitkan',
      value: stats?.telah_terbit ?? 0,
      icon: <Globe className="w-5 h-5" />,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30',
      border: 'border-emerald-100 dark:border-emerald-900/50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Selamat datang, {user?.nama?.split(' ')[0]} 
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Ringkasan aktivitas konten instansi {user?.bidang?.nama ? `bidang ${user.bidang.nama}` : ''} hari ini.
          </p>
        </div>
        {hasPermission('konten.buat') && (
          <button
            onClick={() => navigate('/konten/buat')}
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-sigap-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-sigap-200 hover:bg-sigap-800 transition"
          >
            <FileText className="w-4 h-4" />
            Buat Konten Baru
          </button>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : statCards.map((card) => (
              <div
                key={card.label}
                className={`bg-white dark:bg-slate-800 rounded-2xl p-5 border ${card.border} shadow-sm hover:shadow-md transition`}
              >
                <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center mb-3`}>
                  {card.icon}
                </div>
                <div className="text-3xl font-extrabold text-slate-900 dark:text-white mb-0.5">{card.value}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{card.label}</div>
              </div>
            ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Bar Chart: Konten per Bidang */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-5 h-5 text-sigap-600 dark:text-sigap-400" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Konten per Bidang</h3>
          </div>
          {statsLoading ? (
            <div className="h-48 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats?.konten_per_bidang || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="bidang" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="total" fill="#0252a2" radius={[6, 6, 0, 0]} name="Konten" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Donut: Distribusi Status */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-sigap-600 dark:text-sigap-400" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Distribusi Status</h3>
          </div>
          {statsLoading ? (
            <div className="h-48 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={stats?.distribusi_status || []}
                  dataKey="total"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {stats?.distribusi_status?.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [value, STATUS_LABEL[String(name)] || name]}
                  contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0' }}
                />
                <Legend
                  formatter={(value) => STATUS_LABEL[value] || value}
                  iconSize={10}
                  wrapperStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Content Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-sigap-600 dark:text-sigap-400" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Konten Terbaru</h3>
          </div>
          <button
            onClick={() => navigate('/konten')}
            className="text-sigap-600 text-sm font-medium flex items-center gap-1 hover:text-sigap-800 transition"
          >
            Lihat Semua <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {kontenLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !recentKonten || recentKonten.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-slate-200 dark:text-slate-700 dark:text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">Belum ada konten yang dibuat.</p>
            {hasPermission('konten.buat') && (
              <button
                onClick={() => navigate('/konten/buat')}
                className="mt-3 text-sigap-600 text-sm font-semibold hover:underline"
              >
                Buat konten pertama Anda →
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide bg-slate-50 dark:bg-slate-900/50">
                  <th className="px-5 py-3 text-left font-semibold">Judul</th>
                  <th className="px-5 py-3 text-left font-semibold">Jenis</th>
                  <th className="px-5 py-3 text-left font-semibold">Penulis</th>
                  <th className="px-5 py-3 text-left font-semibold">Status</th>
                  <th className="px-5 py-3 text-left font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {recentKonten.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition">
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-800 dark:text-slate-200 text-sm truncate max-w-xs">{k.judul}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">
                        {new Date(k.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-full font-medium">
                        {k.jenis_konten?.nama || '-'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-sigap-400 to-sigap-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {k.user?.nama?.charAt(0)}
                        </div>
                        <span className="text-sm text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{k.user?.nama}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={k.status} tahapSaatIni={k.tahap_saat_ini} />
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => navigate(`/konten/${k.id}`)}
                        className="text-sigap-600 hover:text-sigap-800 transition"
                        title="Lihat Detail"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
