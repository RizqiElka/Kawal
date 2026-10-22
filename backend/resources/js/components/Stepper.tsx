import React from 'react';
import { Check, X, AlertCircle, Clock } from 'lucide-react';
import type { AlurTahap } from '../types';

interface StepperProps {
  stages: AlurTahap[];
  currentStage?: string;
  status: 'draft' | 'diproses' | 'revisi' | 'ditolak' | 'disetujui' | 'terbit';
}

export const Stepper: React.FC<StepperProps> = ({ stages, currentStage, status }) => {
  // Urutan tahap: Pembuat -> [Tahapan Alur] -> Publisher
  const fullSteps = [
    { kode: 'user', nama: 'Pengajuan Staf' },
    ...stages.map((s) => ({ kode: s.kode_tahap, nama: s.nama })),
    { kode: 'publisher', nama: 'Publikasi' },
  ];

  // Temukan indeks tahap saat ini
  let activeIndex = 0;
  if (status === 'draft') {
    activeIndex = 0;
  } else if (status === 'diproses' && currentStage) {
    const foundIdx = fullSteps.findIndex((s) => s.kode === currentStage);
    activeIndex = foundIdx >= 0 ? foundIdx : 1;
  } else if (status === 'disetujui') {
    activeIndex = fullSteps.length - 1; // Tahap publisher
  } else if (status === 'terbit') {
    activeIndex = fullSteps.length; // Semua selesai
  } else if (status === 'revisi') {
    activeIndex = 0; // Kembali ke pembuat
  } else if (status === 'ditolak') {
    // Berhenti
  }

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 w-full -z-0" />

        {fullSteps.map((step, idx) => {
          let isCompleted = idx < activeIndex || status === 'terbit';
          let isCurrent = idx === activeIndex && status !== 'terbit';

          let circleClass = 'bg-white dark:bg-slate-800 border-2 border-slate-300 text-slate-400';
          let icon = <span>{idx + 1}</span>;

          if (isCompleted) {
            circleClass = 'bg-emerald-600 border-2 border-emerald-600 text-white';
            icon = <Check className="w-4 h-4 stroke-[3]" />;
          } else if (isCurrent) {
            if (status === 'revisi') {
              circleClass = 'bg-amber-500 border-2 border-amber-500 text-white animate-bounce';
              icon = <AlertCircle className="w-4 h-4" />;
            } else if (status === 'ditolak') {
              circleClass = 'bg-rose-600 border-2 border-rose-600 text-white';
              icon = <X className="w-4 h-4" />;
            } else {
              circleClass = 'bg-sigap-600 border-2 border-sigap-600 text-white ring-4 ring-sigap-100';
              icon = <Clock className="w-4 h-4 animate-spin" />;
            }
          }

          return (
            <div key={step.kode} className="relative z-10 flex flex-col items-center group">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition shadow-sm ${circleClass}`}
              >
                {icon}
              </div>
              <span
                className={`mt-2 text-xs font-medium text-center max-w-[100px] leading-tight ${
                  isCurrent ? 'text-sigap-900 font-bold' : isCompleted ? 'text-emerald-700' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {step.nama}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
