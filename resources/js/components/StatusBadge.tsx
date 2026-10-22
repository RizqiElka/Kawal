import React from 'react';

interface StatusBadgeProps {
  status: 'draft' | 'diproses' | 'revisi' | 'ditolak' | 'disetujui' | 'terbit';
  tahapSaatIni?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, tahapSaatIni, className = '' }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'draft':
        return {
          bg: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
          dot: 'bg-slate-400',
          label: 'Draf',
        };
      case 'diproses':
        const stageName = tahapSaatIni ? `Menunggu (${tahapSaatIni.toUpperCase()})` : 'Diproses';
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500 animate-pulse',
          label: stageName,
        };
      case 'revisi':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          dot: 'bg-rose-500',
          label: 'Perlu Revisi',
        };
      case 'ditolak':
        return {
          bg: 'bg-red-100 text-red-900 border-red-300',
          dot: 'bg-red-600',
          label: 'Ditolak',
        };
      case 'disetujui':
        return {
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          dot: 'bg-blue-500',
          label: 'Disetujui (Siap Terbit)',
        };
      case 'terbit':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
          label: 'Telah Terbit',
        };
      default:
        return {
          bg: 'bg-slate-100 dark:bg-slate-700 text-slate-600 border-slate-200 dark:border-slate-700',
          dot: 'bg-slate-400',
          label: status,
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};
